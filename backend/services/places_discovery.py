"""Live Google Places discovery, keyed to a trip's city + constraints.

Replaces the seeded-only candidate pool with real Places API results so the
engine can recommend businesses anywhere in the world — the location-agnostic
pillar from the ideation doc.

Caching strategy (cost-bounded):
- `places_discovered/{place_id}`        — mapped Business doc, 90-day implicit TTL
- `places_discovered_index/{slug}:{t}`  — list of place_ids for a (city, type), 24h freshness

The engine integrates by treating discovered Businesses identically to seeded
ones; only the `source` field and `constraint_checks[].method` distinguish them.
"""
from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Optional

from models.schemas import Business, ConstraintKey
from services import firestore_client as fs
from services import places_client
from services.constraint_solver import passes_hard_constraints
from services.place_mapper import map_to_business, negative_halal_signal_for_business

log = logging.getLogger("kupe.discovery")

# 24h freshness for the index, in seconds.
INDEX_TTL_S = 24 * 60 * 60

# Discovery radius per city (metres). 10km covers a spread-out destination —
# Penang Island (Georgetown ↔ Batu Ferringhi ~14km) or Klang Valley
# (KLCC ↔ Mid Valley ~7km) — without dragging in adjacent cities.
DISCOVERY_RADIUS_M = 10000

# Map KUPE bucket types → Google Places New included types.
# Each entry is a list because some buckets resolve to multiple Place types.
_BUCKET_TO_PLACES_TYPES: dict[str, list[str]] = {
    "restaurant": ["restaurant"],
    "cafe": ["cafe", "bakery"],
    "attraction": ["tourist_attraction", "park", "museum"],
    "shopping": ["shopping_mall"],
}

# How many results to request per Places type. 20 is Google's per-call max.
RESULTS_PER_TYPE = 20


def _city_slug(city: str) -> str:
    return "".join(ch.lower() if ch.isalnum() else "-" for ch in city.strip()).strip("-") or "unknown"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _index_key(city_slug: str, place_type: str) -> str:
    return f"{city_slug}:{place_type}"


def _index_is_fresh(index_doc: Optional[dict]) -> bool:
    if not index_doc or not index_doc.get("cached_at"):
        return False
    try:
        cached = datetime.fromisoformat(index_doc["cached_at"])
    except Exception:
        return False
    age = (datetime.now(timezone.utc) - cached).total_seconds()
    return age < INDEX_TTL_S


async def _hydrate_business_from_cache(place_id: str) -> Optional[Business]:
    doc = await fs.get("places_discovered", place_id)
    if not doc:
        return None
    try:
        # Drop any Firestore-only sidecar fields before instantiating.
        return Business(**{k: v for k, v in doc.items() if not k.startswith("_") and k != "cached_at"})
    except Exception as exc:
        log.warning("places_discovered/%s malformed, skipping: %s", place_id, exc)
        return None


def _derive_meta_from_business(biz: Business) -> dict:
    """Recover halal-inference meta for a cached Business.

    A restaurant/cafe is "ambiguous" when it has no positive halal evidence
    (cached `constraints_met.halal.certified == False`) AND no negative
    signal. Those candidates go to Gemini for inference; everything else is
    already settled by the deterministic mapper logic.
    """
    if biz.type not in {"restaurant", "cafe"}:
        return {"ambiguous_halal": False, "halal_evidence": None, "negative_halal_signal": False}
    halal_match = biz.constraints_met.halal.certified
    negative = negative_halal_signal_for_business(biz)
    return {
        "ambiguous_halal": (not halal_match) and (not negative),
        "halal_evidence": biz.constraints_met.halal.body if halal_match else None,
        "negative_halal_signal": negative,
    }


async def _persist_business(biz: Business) -> None:
    if not biz.place_id:
        return
    payload = biz.model_dump()
    payload["cached_at"] = _now_iso()
    await fs.set_("places_discovered", biz.place_id, payload)


async def _discover_one_type(
    *,
    city_slug: str,
    place_type: str,
    lat: float,
    lng: float,
) -> tuple[list[Business], list[dict]]:
    """Discover (or load from cache) one Places type for a city.

    Returns (businesses, metas) where each meta carries inference hints
    (e.g. `ambiguous_halal`) keyed by `business.place_id` via the same index.
    Order of `businesses` and `metas` is aligned.
    """
    index_doc = await fs.get("places_discovered_index", _index_key(city_slug, place_type))

    if _index_is_fresh(index_doc):
        place_ids = index_doc.get("place_ids") or []
        # Hydrate from per-place cache. Skip places that mysteriously vanished.
        results = await asyncio.gather(*[_hydrate_business_from_cache(pid) for pid in place_ids])
        businesses = [b for b in results if b is not None]
        # Re-derive ambiguous_halal from cached Business so the halal inference
        # batch still re-evaluates cached restaurants (the cache stores the
        # original mapper verdict, not the post-inference one).
        metas = [_derive_meta_from_business(b) for b in businesses]
        log.info("Discovery cache HIT %s:%s → %d businesses", city_slug, place_type, len(businesses))
        return businesses, metas

    # Cache miss — call Places API.
    log.info("Discovery cache MISS %s:%s — calling Places API", city_slug, place_type)
    raw = await places_client.search_nearby(
        lat=lat,
        lng=lng,
        included_types=[place_type],
        radius_m=DISCOVERY_RADIUS_M,
        max_results=RESULTS_PER_TYPE,
    )

    if raw.get("error"):
        log.warning("searchNearby error for %s:%s: %s", city_slug, place_type, raw["error"])
        return [], []

    places = raw.get("places") or []
    businesses: list[Business] = []
    metas: list[dict] = []
    persist_tasks: list = []

    for place in places:
        try:
            biz, meta = map_to_business(place)
        except Exception as exc:
            log.warning("map_to_business failed for place %s: %s", place.get("id"), exc)
            continue
        businesses.append(biz)
        metas.append(meta)
        persist_tasks.append(_persist_business(biz))

    # Persist all discovered businesses in parallel.
    if persist_tasks:
        await asyncio.gather(*persist_tasks, return_exceptions=True)

    # Write index doc so the next 24h hits cache.
    await fs.set_(
        "places_discovered_index",
        _index_key(city_slug, place_type),
        {
            "city_slug": city_slug,
            "place_type": place_type,
            "place_ids": [b.place_id for b in businesses if b.place_id],
            "cached_at": _now_iso(),
            "result_count": len(businesses),
        },
    )

    return businesses, metas


async def discover_for_trip(
    *,
    city: str,
    lat: float,
    lng: float,
    bucket_types: list[str],
    constraints: list[ConstraintKey],
) -> tuple[list[Business], list[dict]]:
    """Discover live businesses for a trip.

    `bucket_types` is the KUPE-side type list (e.g. ["restaurant","cafe","attraction","shopping"]).
    Returns (businesses, ambiguous_halal_candidates) where the second list contains
    minimal dicts for ambiguous halal restaurants the caller can pass to Gemini.
    Constraint pre-filtering is applied here so the engine sees a clean pool.
    """
    started = time.perf_counter()
    city_slug = _city_slug(city)

    # Resolve bucket → Places types, deduped.
    places_types: list[str] = []
    seen: set[str] = set()
    for bucket in bucket_types:
        for ptype in _BUCKET_TO_PLACES_TYPES.get(bucket, []):
            if ptype not in seen:
                seen.add(ptype)
                places_types.append(ptype)

    if not places_types:
        return [], []

    # Discover every type in parallel — they share no state.
    per_type_results = await asyncio.gather(
        *[
            _discover_one_type(city_slug=city_slug, place_type=ptype, lat=lat, lng=lng)
            for ptype in places_types
        ]
    )

    # Flatten and dedup by place_id (a place can match multiple types e.g. cafe+restaurant).
    by_pid: dict[str, Business] = {}
    meta_by_pid: dict[str, dict] = {}
    for businesses, metas in per_type_results:
        for biz, meta in zip(businesses, metas):
            if biz.place_id and biz.place_id not in by_pid:
                by_pid[biz.place_id] = biz
                meta_by_pid[biz.place_id] = meta

    all_businesses = list(by_pid.values())

    # Pre-filter against hard constraints — engine pool should be clean.
    # If halal is required, we KEEP ambiguous restaurants for now and let the
    # caller (linkage_engine) batch-infer via Gemini before final filtering.
    halal_required = ConstraintKey.HALAL in constraints
    ambiguous_for_inference: list[dict] = []
    pre_filtered: list[Business] = []

    for biz in all_businesses:
        meta = meta_by_pid.get(biz.place_id or "", {})
        if halal_required and meta.get("ambiguous_halal") and biz.type in {"restaurant", "cafe"}:
            # Stash for batched Gemini inference; don't filter out yet.
            ambiguous_for_inference.append({
                "place_id": biz.place_id,
                "name": biz.name,
                "types": biz.tags,
                "editorial_summary": biz.editorial_summary,
                "top_review": biz.top_review,
                "address": biz.address,
            })
            pre_filtered.append(biz)
            continue

        if passes_hard_constraints(biz, constraints):
            pre_filtered.append(biz)

    ms = int((time.perf_counter() - started) * 1000)
    log.info(
        "Discovery %s: %d places types, %d unique businesses, %d pass pre-filter, %d ambiguous halal (%dms)",
        city, len(places_types), len(all_businesses), len(pre_filtered), len(ambiguous_for_inference), ms,
    )

    return pre_filtered, ambiguous_for_inference
