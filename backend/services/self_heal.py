"""Self-heal logic — re-runs the linkage engine for a single slot.

This is the demo wow-feature. Given a broken linkage, find the best
replacement that maintains the trip's hard constraints and is similar in type.
"""
from __future__ import annotations

import logging
from typing import Optional

from models.schemas import (
    Business,
    ConstraintKey,
    Linkage,
    LinkageStatus,
    Trip,
)
from services import firestore_client as fs
from services import gemini_client
from services.constraint_solver import explain_checks, filter_candidates
from services.linkage_engine import _anon_uid, _slot_type_to_business_types, load_businesses
from utils.ethical_ai import log_decision
from utils.prompts import build_heal_prompt

log = logging.getLogger("kupe.heal")


async def heal_slot(
    trip_id: str,
    slot_index: int,
    day_index: int,
    *,
    reason: str = "Business closed (demo)",
    traveler_uid: str,
) -> dict:
    """Heal one slot. Returns {old_linkage, new_linkage, new_business, reasoning}."""
    trip_doc = await fs.get("trips", trip_id)
    if not trip_doc:
        raise ValueError(f"Trip {trip_id} not found")
    trip = Trip(**trip_doc)

    if day_index >= len(trip.itinerary):
        raise ValueError(f"day_index {day_index} out of range")
    day = trip.itinerary[day_index]
    if slot_index >= len(day.slots):
        raise ValueError(f"slot_index {slot_index} out of range")

    broken_slot = day.slots[slot_index]
    if not broken_slot.linkage_id:
        raise ValueError("Slot has no linkage to heal")

    old_doc = await fs.get("linkages", broken_slot.linkage_id)
    if not old_doc:
        raise ValueError("Old linkage missing")
    old_linkage = Linkage(**old_doc)

    # Mark old broken
    old_linkage.status = LinkageStatus.BROKEN
    old_linkage.outcome = reason
    await fs.set_("linkages", old_linkage.id, old_linkage.model_dump())

    # Find replacement candidates
    all_biz = await load_businesses()
    used_ids = {s.business_id for d in trip.itinerary for s in d.slots if s.business_id}
    exclude = used_ids | {old_linkage.business_id}

    allowed_types = _slot_type_to_business_types(broken_slot.type)
    pre_filtered = filter_candidates(all_biz, trip.constraint_profile, exclude_ids=exclude)
    pre_filtered = [b for b in pre_filtered if b.type in allowed_types]

    if not pre_filtered:
        raise ValueError("No replacement candidates available")

    prev_slot = day.slots[slot_index - 1] if slot_index > 0 else None
    next_slot = day.slots[slot_index + 1] if slot_index + 1 < len(day.slots) else None

    prompt = build_heal_prompt(
        broken_slot={
            "time": broken_slot.time,
            "type": broken_slot.type,
            "business_name": broken_slot.business_name,
        },
        prev_slot=prev_slot.model_dump() if prev_slot else None,
        next_slot=next_slot.model_dump() if next_slot else None,
        candidates=[{
            "id": b.id,
            "name": b.name,
            "type": b.type,
            "tags": b.tags[:5],
            "rating": b.rating,
            "lat": b.location.lat,
            "lng": b.location.lng,
        } for b in pre_filtered[:8]],
        constraints=[c.value for c in trip.constraint_profile],
    )

    result = await gemini_client.generate_json(prompt, grounding=False, thinking_budget=0)

    chosen: Optional[Business] = None
    confidence = 0.6
    strength = 0.6
    reasoning = "Greedy heal fallback: highest-rated matching candidate"

    # Drill into common wrapper shapes Gemini drifts into
    inner = result if isinstance(result, dict) else {}
    for key in ("replacement", "linkage", "pick", "selection", "heal"):
        if isinstance(inner.get(key), dict):
            inner = inner[key]
            break

    bid = (inner.get("business_id") or inner.get("id")) if isinstance(inner, dict) else None
    if bid:
        match = next((b for b in pre_filtered if b.id == bid), None)
        if match:
            chosen = match
            confidence = float(inner.get("confidence") or 0.85)
            strength = float(inner.get("strength") or 0.85)
            reasoning = str(inner.get("reasoning") or reasoning)

    if chosen is None:
        chosen = max(pre_filtered, key=lambda b: b.rating)

    new_linkage = Linkage(
        trip_id=trip.id,
        traveler_id=_anon_uid(traveler_uid),
        business_id=chosen.id,
        type=old_linkage.type,
        status=LinkageStatus.HEALED,
        constraint_checks=explain_checks(chosen, trip.constraint_profile),
        confidence=confidence,
        strength=strength,
        reasoning=reasoning,
        healed_from=old_linkage.id,
    )
    await fs.set_("linkages", new_linkage.id, new_linkage.model_dump())

    # Update trip itinerary slot
    trip.itinerary[day_index].slots[slot_index].linkage_id = new_linkage.id
    trip.itinerary[day_index].slots[slot_index].business_id = chosen.id
    trip.itinerary[day_index].slots[slot_index].business_name = chosen.name
    trip.itinerary[day_index].slots[slot_index].status = LinkageStatus.HEALED
    await fs.set_("trips", trip.id, trip.model_dump())

    await log_decision(
        fs,
        trip_id=trip.id,
        linkage=new_linkage,
        chosen=chosen,
        rejected=[b for b in pre_filtered if b.id != chosen.id][:5],
        traveler_uid_anon=_anon_uid(traveler_uid),
    )

    log.info("Trip %s slot d%d/s%d healed: %s → %s", trip.id, day_index, slot_index, old_linkage.business_id, chosen.id)

    return {
        "old_linkage": old_linkage,
        "new_linkage": new_linkage,
        "new_business": chosen,
        "reasoning": reasoning,
    }
