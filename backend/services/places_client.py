"""Google Maps Places API (New) wrapper.

- Autocomplete is FREE when a session token is paired with the eventual
  Details call. We accept the same token from the frontend.
- Details responses are cached in Firestore `place_cache/{place_id}` to avoid
  paying for the same place twice.
- Field masks are strict (Basic tier) to minimise cost.
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
    "userRatingCount,websiteUri,photos.name"
)


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
