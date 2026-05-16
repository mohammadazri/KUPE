"""Cloud Vision: halal logo detection in user-supplied photos."""
from fastapi import APIRouter, HTTPException

from models.schemas import VisionHalalRequest, VisionHalalResponse
from services import vision_client

router = APIRouter(prefix="/api/vision", tags=["vision"])


@router.post("/halal-logo", response_model=VisionHalalResponse)
async def halal_logo(req: VisionHalalRequest) -> VisionHalalResponse:
    if not (req.image_base64 or req.image_url):
        raise HTTPException(status_code=400, detail="image_base64 or image_url required")
    try:
        res = await vision_client.detect_halal(req.image_base64, req.image_url)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Vision error: {exc}")
    return VisionHalalResponse(**res)
