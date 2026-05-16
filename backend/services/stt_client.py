"""Speech-to-Text (Chirp 2) wrapper.

Accepts an audio blob (webm/opus from the browser MediaRecorder) and returns
the transcript plus the detected language. Tuned for Malaysian English /
Bahasa Malaysia / Mandarin.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Optional

from google.cloud import speech_v2 as speech

from config import get_settings

log = logging.getLogger("kupe.stt")
_client: Optional[speech.SpeechClient] = None


def get_client() -> speech.SpeechClient:
    global _client
    if _client is None:
        _client = speech.SpeechClient()
    return _client


def _recognizer_path() -> str:
    s = get_settings()
    # Use the default global recognizer (no extra resource setup needed).
    return f"projects/{s.gcp_project_id}/locations/global/recognizers/_"


async def transcribe(audio_bytes: bytes, mime_hint: str = "audio/webm") -> dict:
    def _op() -> dict:
        cfg = speech.RecognitionConfig(
            auto_decoding_config=speech.AutoDetectDecodingConfig(),
            language_codes=["en-MY", "ms-MY", "en-US", "zh-CN"],
            model="chirp_2",
            features=speech.RecognitionFeatures(enable_automatic_punctuation=True),
        )
        request = speech.RecognizeRequest(
            recognizer=_recognizer_path(),
            config=cfg,
            content=audio_bytes,
        )
        resp = get_client().recognize(request=request)
        if not resp.results:
            return {"transcript": "", "language": "en"}
        # Stitch alternatives across results
        parts = []
        lang = "en"
        for r in resp.results:
            if r.alternatives:
                parts.append(r.alternatives[0].transcript)
                if r.language_code:
                    lang = r.language_code
        return {"transcript": " ".join(parts).strip(), "language": lang}
    return await asyncio.to_thread(_op)
