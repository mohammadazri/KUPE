"""Linkage entity endpoints."""
from fastapi import APIRouter, HTTPException

from services import firestore_client as fs

router = APIRouter(prefix="/api/linkages", tags=["linkages"])


@router.get("/{linkage_id}")
async def get_linkage(linkage_id: str) -> dict:
    doc = await fs.get("linkages", linkage_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Linkage not found")
    biz = await fs.get("businesses", doc["business_id"]) if doc.get("business_id") else None
    return {"linkage": doc, "business": biz}
