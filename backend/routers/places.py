"""Google Maps Places API proxy.

Frontend never holds the server key. Autocomplete is paired with a session
token to keep it free; Details responses are cached in Firestore.
`/discover-nearby` returns mapped KUPE Businesses for a slot's lat/lng,
powering the "swap to another nearby option" UX on the itinerary.
"""
from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from models.schemas import ConstraintKey
from services import places_client, places_discovery

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


@router.get("/geocode")
async def geocode(city: str = Query(min_length=1)) -> dict:
    """Resolve a free-text city to coordinates via Places searchText (cached forever)."""
    return await places_client.geocode_city(city)


class DiscoverNearbyRequest(BaseModel):
    lat: float
    lng: float
    bucket_type: str = "restaurant"  # one of: restaurant, cafe, attraction, shopping
    constraints: list[ConstraintKey] = Field(default_factory=list)
    radius_m: float = 2500
    max_results: int = 10
    city_label: str = "nearby"  # used as cache key namespace


@router.post("/discover-nearby")
async def discover_nearby(req: DiscoverNearbyRequest) -> dict:
    """Discover alternative nearby Businesses for a single slot.

    Used by the "find another option" UI on each itinerary slot. Cached via
    the same places_discovered/places_discovered_index machinery used by
    trip generation.
    """
    businesses, _ambiguous = await places_discovery.discover_for_trip(
        city=req.city_label,
        lat=req.lat,
        lng=req.lng,
        bucket_types=[req.bucket_type],
        constraints=req.constraints,
    )
    return {
        "count": len(businesses),
        "businesses": [b.model_dump() for b in businesses[: req.max_results]],
    }
