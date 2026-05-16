"""Cloud Translation API v3 wrapper.

Translates itinerary text into MS / AR / ZH / EN for the multilingual demo.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Optional

from google.cloud import translate_v3 as translate

from config import get_settings

log = logging.getLogger("kupe.translate")
_client: Optional[translate.TranslationServiceClient] = None


def get_client() -> translate.TranslationServiceClient:
    global _client
    if _client is None:
        _client = translate.TranslationServiceClient()
    return _client


def _parent() -> str:
    s = get_settings()
    return f"projects/{s.gcp_project_id}/locations/global"


async def translate_text(text: str, target: str, source: str | None = None) -> dict:
    """target: 2-letter code (ms, ar, zh, en)."""
    def _op() -> dict:
        request = {
            "parent": _parent(),
            "contents": [text],
            "mime_type": "text/plain",
            "target_language_code": target,
        }
        if source:
            request["source_language_code"] = source
        resp = get_client().translate_text(request=request)
        if not resp.translations:
            return {"translated": text, "target": target}
        t = resp.translations[0]
        return {
            "translated": t.translated_text,
            "target": target,
            "detected_source": (t.detected_language_code or None),
        }
    return await asyncio.to_thread(_op)


async def translate_batch(texts: list[str], target: str, source: str | None = None) -> list[str]:
    def _op() -> list[str]:
        request = {
            "parent": _parent(),
            "contents": texts,
            "mime_type": "text/plain",
            "target_language_code": target,
        }
        if source:
            request["source_language_code"] = source
        resp = get_client().translate_text(request=request)
        return [t.translated_text for t in resp.translations]
    return await asyncio.to_thread(_op)
