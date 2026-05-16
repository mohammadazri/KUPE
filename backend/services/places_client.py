"""Google Maps Places API (New) wrapper.

- Autocomplete is FREE when a session token is paired with the eventual
  Details call. We accept the same token from the frontend.
- Details responses are cached in Firestore `place_cache/{place_id}` to avoid
  paying for the same place twice.
- searchText / searchNearby / geocode_city back the live discovery pipeline.
- Field masks are strict to minimise cost (Basic SKU tier).
"""
from __future__ import annotations

import logging
from typing import Optional

import httpx

from config import get_settings
from services import firestore_client as fs

log = logging.getLogger("kupe.places")

PLACES_BASE = "https://places.googleapis.com/v1"

DETAILS_FIELD_MASK = (
    "id,displayName,location,rating,types,formattedAddress,internationalPhoneNumber,"
    "userRatingCount,websiteUri,photos.name,currentOpeningHours,editorialSummary,reviews"
)

# Field mask for nearby/text search responses — every field costs money under the
# Advanced SKU, so we list only what the mapper actually needs.
SEARCH_FIELD_MASK = (
    "places.id,places.displayName,places.location,places.rating,places.userRatingCount,"
    "places.types,places.primaryType,places.formattedAddress,places.priceLevel,"
    "places.photos.name,places.accessibilityOptions,places.servesVegetarianFood,"
    "places.currentOpeningHours.openNow,places.currentOpeningHours.weekdayDescriptions,"
    "places.editorialSummary,places.reviews.text,places.reviews.rating"
)

# Lightweight mask for geocoding — just enough to anchor a city.
GEOCODE_FIELD_MASK = "places.id,places.displayName,places.location,places.formattedAddress"


def _server_key() -> str:
    return get_settings().maps_server_key


async def autocomplete(query: str, session_token: str, region: str = "MY") -> dict:
    if not _server_key():
        return {"suggestions": [], "error": "MAPS_SERVER_KEY not set"}
    url = f"{PLACES_BASE}/places:autocomplete"
    payload = {
        "input": query,
        "regionCode": region,
        "sessionToken": session_token,
        "languageCode": "en",
    }
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": _server_key(),
    }
    async with httpx.AsyncClient(timeout=10) as http:
        resp = await http.post(url, json=payload, headers=headers)
    return resp.json()


async def details(place_id: str, session_token: str | None = None) -> dict:
    cached = await fs.get("place_cache", place_id)
    if cached:
        return cached

    if not _server_key():
        return {"error": "MAPS_SERVER_KEY not set"}
    url = f"{PLACES_BASE}/places/{place_id}"
    headers = {
        "X-Goog-Api-Key": _server_key(),
        "X-Goog-FieldMask": DETAILS_FIELD_MASK,
    }
    params = {}
    if session_token:
        params["sessionToken"] = session_token
    async with httpx.AsyncClient(timeout=10) as http:
        resp = await http.get(url, headers=headers, params=params)
    data = resp.json()
    if "error" not in data:
        await fs.set_("place_cache", place_id, data)
    return data


async def search_nearby(
    lat: float,
    lng: float,
    included_types: list[str],
    *,
    radius_m: float = 3000,
    max_results: int = 10,
) -> dict:
    """POST places:searchNearby with a circular locationRestriction.

    `included_types` accepts Places "Table A" type strings (e.g. ["restaurant"]).
    Limit each call to ONE type for predictable cost; the discovery layer
    iterates types and caches per-type.
    """
    if not _server_key():
        return {"places": [], "error": "MAPS_SERVER_KEY not set"}
    url = f"{PLACES_BASE}/places:searchNearby"
    payload = {
        "includedTypes": included_types,
        "maxResultCount": max(1, min(20, max_results)),
        "locationRestriction": {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": float(radius_m),
            }
        },
        "languageCode": "en",
    }
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": _server_key(),
        "X-Goog-FieldMask": SEARCH_FIELD_MASK,
    }
    async with httpx.AsyncClient(timeout=15) as http:
        resp = await http.post(url, json=payload, headers=headers)
    try:
        return resp.json()
    except Exception as exc:
        log.warning("searchNearby parse failed: %s", exc)
        return {"places": [], "error": str(exc)}


async def search_text(
    query: str,
    *,
    lat: float | None = None,
    lng: float | None = None,
    radius_m: float = 5000,
    included_type: str | None = None,
    max_results: int = 10,
    region: str | None = None,
) -> dict:
    """POST places:searchText, optionally biased to a circle around (lat, lng)."""
    if not _server_key():
        return {"places": [], "error": "MAPS_SERVER_KEY not set"}
    url = f"{PLACES_BASE}/places:searchText"
    payload: dict = {
        "textQuery": query,
        "maxResultCount": max(1, min(20, max_results)),
        "languageCode": "en",
    }
    if region:
        payload["regionCode"] = region
    if included_type:
        payload["includedType"] = included_type
    if lat is not None and lng is not None:
        payload["locationBias"] = {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": float(radius_m),
            }
        }
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": _server_key(),
        "X-Goog-FieldMask": SEARCH_FIELD_MASK,
    }
    async with httpx.AsyncClient(timeout=15) as http:
        resp = await http.post(url, json=payload, headers=headers)
    try:
        return resp.json()
    except Exception as exc:
        log.warning("searchText parse failed: %s", exc)
        return {"places": [], "error": str(exc)}


def _city_slug(city: str) -> str:
    return "".join(ch.lower() if ch.isalnum() else "-" for ch in city.strip()).strip("-") or "unknown"


async def geocode_city(city: str) -> dict:
    """Resolve a free-text city name to (lat, lng, formatted_address) via Places searchText.

    Cached forever in Firestore `geocoded_cities/{slug}` — cities don't move.
    Returns {"lat", "lng", "formatted_address", "place_id", "error?"}.
    """
    slug = _city_slug(city)
    cached = await fs.get("geocoded_cities", slug)
    if cached and not cached.get("error"):
        return cached

    if not _server_key():
        return {"error": "MAPS_SERVER_KEY not set"}

    url = f"{PLACES_BASE}/places:searchText"
    payload = {"textQuery": city, "maxResultCount": 1, "languageCode": "en"}
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": _server_key(),
        "X-Goog-FieldMask": GEOCODE_FIELD_MASK,
    }
    async with httpx.AsyncClient(timeout=15) as http:
        resp = await http.post(url, json=payload, headers=headers)
    try:
        data = resp.json()
    except Exception as exc:
        return {"error": f"geocode parse failed: {exc}"}

    places = data.get("places") or []
    if not places:
        return {"error": f"no geocoding result for city '{city}'"}

    p = places[0]
    loc = p.get("location") or {}
    result = {
        "lat": float(loc.get("latitude", 0.0)),
        "lng": float(loc.get("longitude", 0.0)),
        "formatted_address": p.get("formattedAddress"),
        "place_id": p.get("id"),
        "display_name": (p.get("displayName") or {}).get("text"),
    }
    await fs.set_("geocoded_cities", slug, result)
    return result
