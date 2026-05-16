"""Business CRUD + 'toggle active' (powers the self-heal demo).

Reads look in both `businesses` (seeded JAKIM-grade pool) and
`places_discovered` (live Google Places cache, keyed by Google place_id).
"""
from fastapi import APIRouter, HTTPException

from services import firestore_client as fs

router = APIRouter(prefix="/api/businesses", tags=["businesses"])


def _strip_internal(doc: dict) -> dict:
    return {k: v for k, v in doc.items() if not k.startswith("_") and k != "cached_at"}


async def _fetch_business_any_collection(biz_id: str) -> dict | None:
    """Look up a business in `businesses` first, then `places_discovered`."""
    doc = await fs.get("businesses", biz_id)
    if doc:
        return _strip_internal(doc)
    # Discovered businesses use Business.id="gp_<place_id>"; the doc is keyed by place_id.
    if biz_id.startswith("gp_"):
        place_id = biz_id[3:]
        doc = await fs.get("places_discovered", place_id)
        if doc:
            return _strip_internal(doc)
    return None


@router.get("")
async def list_businesses(active_only: bool = True) -> list[dict]:
    if active_only:
        return await fs.query_where("businesses", filters=[("active", "==", True)], limit=500)
    return await fs.list_all("businesses", limit=500)


@router.get("/{biz_id}")
async def get_business(biz_id: str) -> dict:
    doc = await _fetch_business_any_collection(biz_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Business not found")
    return doc


@router.patch("/{biz_id}/toggle")
async def toggle_business(biz_id: str) -> dict:
    """Toggle for seeded businesses only — the self-heal demo's 'close shop' trigger."""
    doc = await fs.get("businesses", biz_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Seeded business not found (toggle only works on seeded pool)")
    new_active = not bool(doc.get("active", True))
    await fs.update("businesses", biz_id, {"active": new_active})
    return {"id": biz_id, "active": new_active}
