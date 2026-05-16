"""Voice-driven trip planning: STT → Gemini parse → structured fields."""
import json
import logging

from fastapi import APIRouter, File, HTTPException, UploadFile

from models.schemas import TranscribeResponse
from services import gemini_client, stt_client
from utils.prompts import build_voice_parse_prompt

log = logging.getLogger("kupe.voice")
router = APIRouter(prefix="/api/voice", tags=["voice"])


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(audio: UploadFile = File(...)) -> TranscribeResponse:
    try:
        data = await audio.read()
        if not data:
            raise HTTPException(status_code=400, detail="Empty audio")
        stt = await stt_client.transcribe(data, mime_hint=audio.content_type or "audio/webm")
    except Exception as exc:
        log.warning("STT failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"STT error: {exc}")

    transcript = stt.get("transcript", "").strip()
    language = stt.get("language", "en")
    parsed: dict = {}
    if transcript:
        parsed_json = await gemini_client.generate_json(
            build_voice_parse_prompt(transcript),
            grounding=False,
        )
        if isinstance(parsed_json, dict) and "error" not in parsed_json:
            parsed = parsed_json
    return TranscribeResponse(transcript=transcript, language=language, parsed=parsed)
