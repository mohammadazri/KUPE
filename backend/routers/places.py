"""Google Maps Places API proxy.

Frontend never holds the server key. Autocomplete is paired with a session
token to keep it free; Details responses are cached in Firestore.
"""
from fastapi import APIRouter, Query

from services import places_client

router = APIRouter(prefix="/api/places", tags=["places"])


@router.get("/autocomplete")
async def autocomplete(
    q: str = Query(min_length=1),
    session: str = Query(min_length=8, description="Frontend session token"),
    region: str = "MY",
) -> dict:
    return await places_client.autocomplete(q, session, region)


@router.get("/details/{place_id}")
async def details(place_id: str, session: str | None = None) -> dict:
    return await places_client.details(place_id, session)
