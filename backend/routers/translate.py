"""Cloud Translation API proxy."""
from fastapi import APIRouter, HTTPException

from models.schemas import TranslateRequest, TranslateResponse
from services import translation_client

router = APIRouter(prefix="/api/translate", tags=["translate"])


@router.post("", response_model=TranslateResponse)
async def translate(req: TranslateRequest) -> TranslateResponse:
    if req.target not in {"en", "ms", "ar", "zh", "zh-CN", "ta", "id"}:
        raise HTTPException(status_code=400, detail=f"Unsupported target: {req.target}")
    res = await translation_client.translate_text(req.text, req.target, req.source)
    return TranslateResponse(**res)


@router.post("/batch")
async def translate_batch(texts: list[str], target: str, source: str | None = None) -> list[str]:
    return await translation_client.translate_batch(texts, target, source)
