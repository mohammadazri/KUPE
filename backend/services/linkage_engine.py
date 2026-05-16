"""KUPE Linkage Engine — the brain.

Flow:
1. Pull traveller profile.
2. Pull candidate businesses (active) and pre-filter against HARD constraints.
3. Call Gemini for ranked picks per time-slot (structured output).
4. Materialise each pick as a `Linkage` entity with deterministic audit checks.
5. Persist trip + linkages + audit log.
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
import time
from datetime import date, timedelta
from typing import Iterable

from models.schemas import (
    Business,
    GenerateTripRequest,
    ItineraryDay,
    ItinerarySlot,
    Linkage,
    LinkageStatus,
    LinkageType,
    Trip,
    TripDates,
)
from services import firestore_client as fs
from services import gemini_client
from services.constraint_solver import (
    explain_checks,
    filter_candidates,
)
from utils.ethical_ai import log_decision
from utils.prompts import build_generate_prompt

log = logging.getLogger("kupe.engine")


# Default slot template
SLOT_TEMPLATE: list[tuple[str, str, LinkageType]] = [
    ("08:30", "breakfast", LinkageType.MEAL_ASSIGNMENT),
    ("10:30", "attraction", LinkageType.ATTRACTION),
    ("12:30", "lunch", LinkageType.MEAL_ASSIGNMENT),
    ("14:30", "afternoon", LinkageType.ATTRACTION),
    ("19:00", "dinner", LinkageType.MEAL_ASSIGNMENT),
]


def _anon_uid(uid: str) -> str:
    return "anon_" + hashlib.sha256(uid.encode()).hexdigest()[:10]


def _slot_type_to_business_types(slot_type: str) -> list[str]:
    if slot_type in {"breakfast", "lunch", "dinner"}:
        return ["restaurant", "cafe"]
    if slot_type in {"attraction", "morning", "afternoon"}:
        return ["attraction", "shopping", "cultural", "park"]
    return ["restaurant", "attraction", "cafe", "shopping"]


async def load_businesses() -> list[Business]:
    """Load all active businesses from Firestore. Falls back to seed file in dev."""
    rows = await fs.query_where("businesses", filters=[("active", "==", True)], limit=500)
    out: list[Business] = []
    for r in rows:
        try:
            out.append(Business(**{k: v for k, v in r.items() if not k.startswith("_")}))
        except Exception as exc:
            log.warning("skipping malformed business doc: %s", exc)
    if not out:
        log.warning("No businesses found in Firestore — engine will return empty results")
    return out


def _days_between(start: str, end: str) -> int:
    s = date.fromisoformat(start)
    e = date.fromisoformat(end)
    return max(1, (e - s).days + 1)


async def generate_trip(req: GenerateTripRequest, traveler_uid: str) -> dict:
    """Generate a full trip. Returns dict with trip, linkages, businesses."""
    started = time.perf_counter()
    days = _days_between(req.start_date, req.end_date)

    businesses = await load_businesses()
    pre_filtered = filter_candidates(businesses, req.constraints)
    log.info(
        "Engine: %d total → %d pass hard constraints %s",
        len(businesses),
        len(pre_filtered),
        [c.value for c in req.constraints],
    )

    trip = Trip(
        traveler_id=traveler_uid,
        city=req.city,
        dates=TripDates(start=req.start_date, end=req.end_date),
        constraint_profile=req.constraints,
        preferences=req.preferences,
        pace=req.pace,
        budget=req.budget,
    )

    # 1. Build prompts in parallel: for each day, pre-pick candidate pools.
    # We do NOT exclude across days here — that produces partial overlap by design,
    # then we dedup ACROSS days after Gemini responds.
    day_payloads: list[tuple[int, str, list[dict]]] = []
    for day_idx in range(days):
        d_iso = (date.fromisoformat(req.start_date) + timedelta(days=day_idx)).isoformat()
        slot_candidates_payload: list[dict] = []
        for time_str, slot_type, _ltype in SLOT_TEMPLATE:
            biz_types = _slot_type_to_business_types(slot_type)
            cands = [b for b in pre_filtered if b.type in biz_types][:5]
            slot_candidates_payload.append({
                "time": time_str,
                "type": slot_type,
                "candidates": [_summarise_for_prompt(b) for b in cands],
            })
        day_payloads.append((day_idx, d_iso, slot_candidates_payload))

    profile = {
        "constraints": [c.value for c in req.constraints],
        "preferences": req.preferences,
        "pace": req.pace.value,
        "budget": req.budget.value,
        "party_size": req.party_size,
    }

    # 2. Fire ALL Gemini calls in parallel — biggest single speedup.
    async def _one_day(d_iso: str, payload: list[dict]) -> dict:
        prompt = build_generate_prompt(
            traveler_profile=profile,
            candidates=payload,
            days=1,
            city=req.city,
            start_date=d_iso,
        )
        return await gemini_client.generate_json(prompt, grounding=False, thinking_budget=0)

    gemini_results = await asyncio.gather(
        *[_one_day(d_iso, payload) for _, d_iso, payload in day_payloads],
        return_exceptions=False,
    )

    # 3. Materialise sequentially so cross-day used_ids dedup works
    used_ids: set[str] = set()
    itinerary_days: list[ItineraryDay] = []
    linkages: list[Linkage] = []
    fallback_used = False

    for (day_idx, d_iso, slot_candidates_payload), gemini_result in zip(day_payloads, gemini_results):
        slots_for_day = _materialise_day(
            gemini_result=gemini_result,
            template=SLOT_TEMPLATE,
            slot_candidates=slot_candidates_payload,
            all_pre_filtered=pre_filtered,
            used_ids=used_ids,
        )

        day_slots: list[ItinerarySlot] = []
        for slot_data in slots_for_day:
            biz: Business | None = slot_data["business"]
            time_str = slot_data["time"]
            slot_type = slot_data["type"]
            ltype: LinkageType = slot_data["ltype"]
            if biz is None:
                day_slots.append(ItinerarySlot(time=time_str, type=slot_type, status=LinkageStatus.PENDING))
                continue

            used_ids.add(biz.id)
            linkage = Linkage(
                trip_id=trip.id,
                traveler_id=_anon_uid(traveler_uid),
                business_id=biz.id,
                type=ltype,
                status=LinkageStatus.VERIFIED,
                constraint_checks=explain_checks(biz, req.constraints),
                confidence=slot_data["confidence"],
                strength=slot_data["strength"],
                reasoning=slot_data["reasoning"],
            )
            linkages.append(linkage)
            day_slots.append(ItinerarySlot(
                time=time_str,
                type=slot_type,
                linkage_id=linkage.id,
                business_id=biz.id,
                business_name=biz.name,
                status=LinkageStatus.VERIFIED,
            ))

            await log_decision(
                fs,
                trip_id=trip.id,
                linkage=linkage,
                chosen=biz,
                rejected=[b for b in pre_filtered if b.id != biz.id][:5],
                traveler_uid_anon=_anon_uid(traveler_uid),
            )

        itinerary_days.append(ItineraryDay(day=day_idx + 1, date=d_iso, slots=day_slots))
        if isinstance(gemini_result, dict) and "error" in gemini_result:
            fallback_used = True

    trip.itinerary = itinerary_days

    # Persist
    await fs.set_("trips", trip.id, trip.model_dump())
    for link in linkages:
        await fs.set_("linkages", link.id, link.model_dump())

    ms = int((time.perf_counter() - started) * 1000)
    log.info("Trip %s generated in %dms (linkages=%d, fallback=%s)", trip.id, ms, len(linkages), fallback_used)

    return {
        "trip": trip,
        "linkages": linkages,
        "businesses": [b for b in pre_filtered if b.id in used_ids],
        "generation_ms": ms,
        "fallback_used": fallback_used,
    }


def _summarise_for_prompt(b: Business) -> dict:
    return {
        "id": b.id,
        "name": b.name,
        "type": b.type,
        "tags": b.tags[:6],
        "rating": b.rating,
        "avg_spend_myr": b.avg_spend_myr,
        "lat": b.location.lat,
        "lng": b.location.lng,
    }


def _extract_gemini_picks(gemini_result: dict) -> list[dict]:
    """Find the slot-pick array inside any of the shapes Gemini returns.

    Gemini drifts between these shapes; we accept all of them:
      {"slots": [...]}
      {"days": [{"slots": [...]}]}
      {"days": [{"linkages": [...]}]}
      {"itinerary": {"days": [{"linkages": [...]}]}}
      {"itinerary": {"days": [{"slots": [...]}]}}
    """
    if not isinstance(gemini_result, dict):
        return []
    # Drill into optional `itinerary` wrapper
    root = gemini_result.get("itinerary", gemini_result) if isinstance(gemini_result.get("itinerary"), dict) else gemini_result
    if isinstance(root.get("slots"), list):
        return root["slots"]
    days = root.get("days")
    if isinstance(days, list) and days and isinstance(days[0], dict):
        return days[0].get("slots") or days[0].get("linkages") or []
    return []


def _slot_key(pick: dict) -> tuple[str, str]:
    """Normalise Gemini's slot identifier — it may use time/type OR start_time/slot_type."""
    t = pick.get("time") or pick.get("start_time") or ""
    s = pick.get("type") or pick.get("slot_type") or ""
    return (str(t), str(s))


def _materialise_day(
    *,
    gemini_result: dict,
    template: list[tuple[str, str, LinkageType]],
    slot_candidates: list[dict],
    all_pre_filtered: list[Business],
    used_ids: set[str],
) -> list[dict]:
    """Turn Gemini's response into per-slot dicts.

    Falls back to greedy rating-sorted picks if Gemini fails or returns
    malformed data. Always returns one entry per template slot.
    Tracks day-local picks so fallback never repeats a business within the day.
    """
    by_id = {b.id: b for b in all_pre_filtered}
    gemini_picks = _extract_gemini_picks(gemini_result)
    picked_today: set[str] = set()  # dedup within this day's selection loop

    out: list[dict] = []
    for idx, (time_str, slot_type, ltype) in enumerate(template):
        pick: Business | None = None
        confidence = 0.5
        strength = 0.5
        reasoning = "Greedy fallback (Gemini unavailable)"

        # 1. Try to match Gemini's pick: by (time, type), by time alone, by type alone, then by index
        gpick = None
        for cand in gemini_picks:
            k_time, k_type = _slot_key(cand)
            if k_time == time_str and k_type == slot_type:
                gpick = cand
                break
        if gpick is None:
            for cand in gemini_picks:
                k_time, _ = _slot_key(cand)
                if k_time == time_str:
                    gpick = cand
                    break
        if gpick is None:
            for cand in gemini_picks:
                _, k_type = _slot_key(cand)
                if k_type == slot_type:
                    gpick = cand
                    break
        if gpick is None and idx < len(gemini_picks):
            gpick = gemini_picks[idx]

        if isinstance(gpick, dict):
            bid = gpick.get("business_id") or gpick.get("id")
            if bid in by_id and bid not in used_ids and bid not in picked_today:
                pick = by_id[bid]
                confidence = float(gpick.get("confidence") or 0.85)
                strength = float(gpick.get("strength") or 0.85)
                reasoning = str(gpick.get("reasoning") or "Selected by AI ranker")

        # 2. Greedy fallback — must NOT pick anything already picked today
        if pick is None:
            allowed_types = _slot_type_to_business_types(slot_type)
            options = [
                b for b in all_pre_filtered
                if b.type in allowed_types
                and b.id not in used_ids
                and b.id not in picked_today
            ]
            options.sort(key=lambda b: b.rating, reverse=True)
            if options:
                pick = options[0]
                reasoning = (
                    f"Selected by deterministic fallback: highest-rated "
                    f"{pick.type} ({pick.rating}★) matching constraints"
                )

        if pick:
            picked_today.add(pick.id)

        out.append({
            "time": time_str,
            "type": slot_type,
            "ltype": ltype,
            "business": pick,
            "confidence": max(0.0, min(1.0, confidence)),
            "strength": max(0.0, min(1.0, strength)),
            "reasoning": reasoning,
        })

    return out
