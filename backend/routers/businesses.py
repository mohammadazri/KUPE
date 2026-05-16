"""Business CRUD + 'toggle active' (powers the self-heal demo)."""
from fastapi import APIRouter, HTTPException

from services import firestore_client as fs

router = APIRouter(prefix="/api/businesses", tags=["businesses"])


@router.get("")
async def list_businesses(active_only: bool = True) -> list[dict]:
    if active_only:
        return await fs.query_where("businesses", filters=[("active", "==", True)], limit=500)
    return await fs.list_all("businesses", limit=500)


@router.get("/{biz_id}")
async def get_business(biz_id: str) -> dict:
    doc = await fs.get("businesses", biz_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Business not found")
    return doc


@router.patch("/{biz_id}/toggle")
async def toggle_business(biz_id: str) -> dict:
    doc = await fs.get("businesses", biz_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Business not found")
    new_active = not bool(doc.get("active", True))
    await fs.update("businesses", biz_id, {"active": new_active})
    return {"id": biz_id, "active": new_active}
