"""Trip generation, retrieval, healing, and rating."""
from fastapi import APIRouter, HTTPException, Request

from models.schemas import (
    GenerateTripRequest,
    GenerateTripResponse,
    HealRequest,
    HealResponse,
    Trip,
)
from services import firestore_client as fs
from services import linkage_engine, self_heal
from config import get_settings

router = APIRouter(prefix="/api/trips", tags=["trips"])


@router.post("/generate", response_model=GenerateTripResponse)
async def generate_trip(req: GenerateTripRequest, request: Request) -> GenerateTripResponse:
    uid = getattr(request.state, "uid", "dev-anonymous")
    result = await linkage_engine.generate_trip(req, traveler_uid=uid)
    return GenerateTripResponse(
        trip=result["trip"],
        linkages=result["linkages"],
        businesses=result["businesses"],
        model=get_settings().gemini_model,
        generation_ms=result["generation_ms"],
        fallback_used=result["fallback_used"],
    )


@router.get("/{trip_id}")
async def get_trip(trip_id: str) -> dict:
    doc = await fs.get("trips", trip_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Trip not found")
    trip = Trip(**doc)
    linkage_ids = [s.linkage_id for d in trip.itinerary for s in d.slots if s.linkage_id]
    linkages = []
    for lid in linkage_ids:
        l = await fs.get("linkages", lid)
        if l:
            linkages.append(l)
    business_ids = {s.business_id for d in trip.itinerary for s in d.slots if s.business_id}
    businesses = []
    for bid in business_ids:
        b = await fs.get("businesses", bid)
        if b:
            businesses.append(b)
    return {"trip": doc, "linkages": linkages, "businesses": businesses}


@router.post("/{trip_id}/heal/{day_index}/{slot_index}", response_model=HealResponse)
async def heal_trip_slot(
    trip_id: str, day_index: int, slot_index: int, req: HealRequest, request: Request
) -> HealResponse:
    uid = getattr(request.state, "uid", "dev-anonymous")
    try:
        result = await self_heal.heal_slot(
            trip_id=trip_id,
            slot_index=slot_index,
            day_index=day_index,
            reason=req.reason or "Business closed (demo)",
            traveler_uid=uid,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return HealResponse(
        old_linkage=result["old_linkage"],
        new_linkage=result["new_linkage"],
        new_business=result["new_business"],
        reasoning=result["reasoning"],
    )


@router.post("/{trip_id}/rate")
async def rate_trip(trip_id: str, score: float) -> dict:
    doc = await fs.get("trips", trip_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Trip not found")
    score = max(0.0, min(5.0, float(score)))
    await fs.update("trips", trip_id, {
        "satisfaction_score": score,
        "blueprint_eligible": score >= 4.5,
    })
    return {"ok": True, "satisfaction_score": score}
