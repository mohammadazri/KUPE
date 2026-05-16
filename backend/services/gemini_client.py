"""Vertex AI Gemini client wrapper.

Uses the unified `google-genai` SDK in Vertex AI mode so every call bills
against the GCP credit. Forces structured JSON output and exposes Google
Search grounding with a dynamic threshold.
"""
from __future__ import annotations

import json
import logging
from typing import Optional

from google import genai
from google.genai import types

from config import get_settings
from utils.prompts import SYSTEM_INSTRUCTION

log = logging.getLogger("kupe.gemini")
_client: Optional[genai.Client] = None


def get_client() -> genai.Client:
    global _client
    if _client is None:
        settings = get_settings()
        _client = genai.Client(
            vertexai=True,
            project=settings.gcp_project_id,
            location=settings.vertex_location,
        )
        log.info(
            "Vertex AI Gemini client ready (project=%s, location=%s, model=%s)",
            settings.gcp_project_id,
            settings.vertex_location,
            settings.gemini_model,
        )
    return _client


def _build_config(
    response_schema: dict | None,
    grounding: bool,
    thinking_budget: int | None = 0,
) -> types.GenerateContentConfig:
    settings = get_settings()
    cfg_kwargs: dict = {
        "response_mime_type": "application/json",
        "system_instruction": SYSTEM_INSTRUCTION,
        "temperature": 0.4,
    }
    # Disable extended thinking by default — saves 30-60s per call on 2.5-flash/pro
    if thinking_budget is not None:
        try:
            cfg_kwargs["thinking_config"] = types.ThinkingConfig(thinking_budget=thinking_budget)
        except (AttributeError, TypeError):
            # Older SDK or model that doesn't accept ThinkingConfig — silently skip
            pass
    if response_schema is not None:
        cfg_kwargs["response_schema"] = response_schema
    if grounding and settings.enable_grounding:
        cfg_kwargs["tools"] = [types.Tool(google_search=types.GoogleSearch())]
    return types.GenerateContentConfig(**cfg_kwargs)


async def generate_json(
    prompt: str,
    *,
    response_schema: dict | None = None,
    grounding: bool = False,
    thinking_budget: int | None = 0,
) -> dict:
    """Run a one-shot prompt → JSON. Returns parsed dict.

    thinking_budget=0 (default) disables extended thinking for fast responses.
    Pass None to skip the field entirely (let the model decide).

    On any failure (timeout, schema mismatch, model unavailable) returns a dict
    with `{"error": "..."}` so the caller can fall back to deterministic logic.
    """
    settings = get_settings()
    client = get_client()
    config = _build_config(response_schema, grounding, thinking_budget=thinking_budget)
    try:
        resp = await client.aio.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config=config,
        )
        text = (resp.text or "").strip()
        if not text:
            return {"error": "empty response"}
        return json.loads(text)
    except json.JSONDecodeError as exc:
        log.warning("Gemini returned non-JSON: %s", exc)
        return {"error": f"json_decode: {exc}"}
    except Exception as exc:
        log.exception("Gemini call failed: %s", exc)
        return {"error": str(exc)}


async def health_check() -> dict:
    """Cheap call used by /api/admin/stats to confirm Vertex AI reachability."""
    try:
        client = get_client()
        settings = get_settings()
        # Minimal token call
        resp = await client.aio.models.generate_content(
            model=settings.gemini_model,
            contents="Reply with the JSON {\"ok\": true}.",
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.0,
            ),
        )
        return {"ok": True, "model": settings.gemini_model, "sample": resp.text}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}
