"""Map a Google Places (new) response object to KUPE's `Business` shape.

Deterministic constraint inference lives here:
- wheelchair_accessible: read `accessibilityOptions.wheelchairAccessibleEntrance`
- vegetarian: read `servesVegetarianFood`
- halal: name regex + types check (sets `body="ai_inferred:name_match"`)

Anything not derivable here defaults to False. Halal ambiguous cases (no
match + no negative signal) are surfaced via `ambiguous_halal=True` so the
discovery layer can batch them into a single Gemini call.
"""
from __future__ import annotations

import re
from typing import Optional

from models.schemas import (
    AccessibilityInfo,
    Business,
    ConstraintsMet,
    HalalCert,
    Location,
)


# Type-bucket map: Google's primary type → KUPE bucket used by engine SLOT_TEMPLATE.
_TYPE_BUCKETS: dict[str, str] = {
    "restaurant": "restaurant",
    "cafe": "cafe",
    "bakery": "cafe",
    "coffee_shop": "cafe",
    "tourist_attraction": "attraction",
    "park": "attraction",
    "museum": "attraction",
    "art_gallery": "attraction",
    "amusement_park": "attraction",
    "zoo": "attraction",
    "aquarium": "attraction",
    "historical_landmark": "attraction",
    "place_of_worship": "attraction",
    "cultural_center": "attraction",
    "shopping_mall": "shopping",
    "department_store": "shopping",
    "market": "shopping",
    "store": "shopping",
    "lodging": "hotel",
    "hotel": "hotel",
}

_PRICE_LEVEL_TO_MYR: dict[str, float] = {
    "PRICE_LEVEL_FREE": 0.0,
    "PRICE_LEVEL_INEXPENSIVE": 20.0,
    "PRICE_LEVEL_MODERATE": 50.0,
    "PRICE_LEVEL_EXPENSIVE": 120.0,
    "PRICE_LEVEL_VERY_EXPENSIVE": 250.0,
}

# Strong positive signals for halal inference based on name.
_HALAL_POSITIVE = re.compile(
    r"\b(halal|muslim[- ]?friendly|nasi[ -]?kandar|mamak|tandoori|kebab|shawarma|"
    r"biryani|warung|nasi[ -]?lemak|mee[ -]?goreng|teh[ -]?tarik|kopitiam)\b",
    re.IGNORECASE,
)

# Strong negative signals — these places are almost certainly NOT halal.
_HALAL_NEGATIVE = re.compile(
    r"\b(pork|bbq[ -]?pork|bak[ -]?kut[ -]?teh|char[ -]?siu|siu[ -]?yuk|"
    r"pub|brewery|brewpub|wine[ -]?bar|cocktail|izakaya|sake|"
    r"ham[ -]?and[ -]?cheese)\b",
    re.IGNORECASE,
)

# Place types that strongly imply non-halal.
_NEGATIVE_TYPES = {"bar", "night_club", "pub", "wine_bar", "liquor_store"}


def _bucket_type(place: dict) -> str:
    primary = place.get("primaryType")
    if primary and primary in _TYPE_BUCKETS:
        return _TYPE_BUCKETS[primary]
    for t in place.get("types") or []:
        if t in _TYPE_BUCKETS:
            return _TYPE_BUCKETS[t]
    return "attraction"  # safe fallback so type filtering still includes it


def _spend(price_level: Optional[str]) -> float:
    if not price_level:
        return 40.0
    return _PRICE_LEVEL_TO_MYR.get(price_level, 40.0)


def _photo_names(place: dict) -> list[str]:
    photos = place.get("photos") or []
    return [p["name"] for p in photos if isinstance(p, dict) and p.get("name")]


def _top_review_text(place: dict) -> Optional[str]:
    reviews = place.get("reviews") or []
    if not reviews:
        return None
    first = reviews[0]
    if not isinstance(first, dict):
        return None
    text_obj = first.get("text") or {}
    text = text_obj.get("text") if isinstance(text_obj, dict) else text_obj
    if not text:
        return None
    # Truncate to keep BusinessCard tidy
    return (text[:280] + "…") if len(text) > 280 else text


def _editorial(place: dict) -> Optional[str]:
    es = place.get("editorialSummary")
    if isinstance(es, dict):
        return es.get("text")
    return None


def _opening_hours(place: dict) -> Optional[dict]:
    oh = place.get("currentOpeningHours")
    if not isinstance(oh, dict):
        return None
    return {
        "open_now": oh.get("openNow"),
        "weekday_descriptions": oh.get("weekdayDescriptions"),
    }


def _has_negative_halal_signal(place: dict) -> bool:
    name = (place.get("displayName") or {}).get("text", "") or ""
    if _HALAL_NEGATIVE.search(name):
        return True
    types = set(place.get("types") or [])
    if types & _NEGATIVE_TYPES:
        return True
    return False


def negative_halal_signal_for_business(biz: Business) -> bool:
    """Re-derive the negative halal signal from a cached Business.

    The cache-hit path in places_discovery doesn't have the raw place dict,
    so it can't reuse `_has_negative_halal_signal`. The check is the same:
    name regex + place-types intersection (cached as Business.tags).
    """
    if _HALAL_NEGATIVE.search(biz.name or ""):
        return True
    tags = set(biz.tags or [])
    if tags & _NEGATIVE_TYPES:
        return True
    return False


def _deterministic_halal(place: dict) -> tuple[bool, Optional[str]]:
    """Returns (is_halal, evidence_string)."""
    name = (place.get("displayName") or {}).get("text", "") or ""
    types = place.get("types") or []
    if "muslim_friendly_restaurant" in types:
        return True, "type:muslim_friendly_restaurant"
    m = _HALAL_POSITIVE.search(name)
    if m:
        return True, f"name_match:{m.group(0).lower()}"
    return False, None


def map_to_business(place: dict) -> tuple[Business, dict]:
    """Map a Place dict to a Business plus inference metadata.

    Returns (business, meta) where meta = {"ambiguous_halal": bool, "halal_evidence": str|None}.
    """
    pid = place.get("id")
    if not pid:
        raise ValueError("Place dict missing 'id'")

    loc = place.get("location") or {}
    name = (place.get("displayName") or {}).get("text") or "(unnamed)"
    bucket = _bucket_type(place)

    # Deterministic constraints
    wheelchair = bool((place.get("accessibilityOptions") or {}).get("wheelchairAccessibleEntrance"))
    vegetarian = bool(place.get("servesVegetarianFood"))
    halal_match, halal_evidence = _deterministic_halal(place)
    negative_halal = _has_negative_halal_signal(place)

    halal_cert = HalalCert(
        certified=halal_match,
        body=f"ai_inferred:{halal_evidence}" if halal_match else None,
    )
    accessibility = AccessibilityInfo(
        wheelchair=wheelchair,
        notes="From Google Places accessibilityOptions" if wheelchair else None,
    )

    constraints_met = ConstraintsMet(
        halal=halal_cert,
        accessibility=accessibility,
        vegetarian=vegetarian,
        # Vegan / gluten_free / nut_free are not exposed by Places — leave False.
    )

    biz = Business(
        id=f"gp_{pid}",
        name=name,
        type=bucket,
        location=Location(
            lat=float(loc.get("latitude", 0.0)),
            lng=float(loc.get("longitude", 0.0)),
        ),
        tags=[t for t in (place.get("types") or [])[:6]],
        constraints_met=constraints_met,
        photos=_photo_names(place),
        address=place.get("formattedAddress"),
        rating=float(place.get("rating") or 0.0),
        user_rating_count=int(place.get("userRatingCount") or 0),
        avg_spend_myr=_spend(place.get("priceLevel")),
        active=True,
        place_id=pid,
        source="google_places",
        opening_hours=_opening_hours(place),
        editorial_summary=_editorial(place),
        top_review=_top_review_text(place),
    )

    # Halal is "ambiguous" if it's a food-serving place with no positive AND no negative signal.
    food_like = bucket in {"restaurant", "cafe"}
    ambiguous_halal = food_like and (not halal_match) and (not negative_halal)

    meta = {
        "ambiguous_halal": ambiguous_halal,
        "halal_evidence": halal_evidence,
        "negative_halal_signal": negative_halal,
    }
    return biz, meta
