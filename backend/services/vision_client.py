"""Cloud Vision wrapper — used to detect halal certification logos in photos.

We call both logo_detection (matches known brand logos) and label_detection
(broader content tags) and combine them.
"""
from __future__ import annotations

import asyncio
import base64
import logging
from typing import Optional

from google.cloud import vision

log = logging.getLogger("kupe.vision")
_client: Optional[vision.ImageAnnotatorClient] = None

HALAL_LOGO_HINTS = {
    "jakim",
    "halal",
    "halal certification",
    "majlis ugama islam",
    "muis",
    "halal logo",
}


def get_client() -> vision.ImageAnnotatorClient:
    global _client
    if _client is None:
        _client = vision.ImageAnnotatorClient()
    return _client


def _build_image(image_base64: str | None, image_url: str | None) -> vision.Image:
    if image_base64:
        # Strip any data URL prefix
        raw = image_base64.split(",", 1)[-1]
        return vision.Image(content=base64.b64decode(raw))
    if image_url:
        return vision.Image(source=vision.ImageSource(image_uri=image_url))
    raise ValueError("Either image_base64 or image_url is required")


async def detect_halal(image_base64: str | None = None, image_url: str | None = None) -> dict:
    def _op() -> dict:
        img = _build_image(image_base64, image_url)
        client = get_client()
        # Logo detection
        logos = client.logo_detection(image=img).logo_annotations
        labels = client.label_detection(image=img).label_annotations
        matched = []
        for l in logos:
            if any(h in l.description.lower() for h in HALAL_LOGO_HINTS):
                matched.append(f"{l.description} (logo {l.score:.2f})")
        for lab in labels:
            if any(h in lab.description.lower() for h in HALAL_LOGO_HINTS):
                matched.append(f"{lab.description} (label {lab.score:.2f})")
        confidence = 0.0
        if matched:
            confidence = max([l.score for l in logos if any(h in l.description.lower() for h in HALAL_LOGO_HINTS)] + [0.0])
            confidence = max(confidence, max([lab.score for lab in labels if any(h in lab.description.lower() for h in HALAL_LOGO_HINTS)] + [0.0]))
        return {
            "halal_detected": bool(matched),
            "confidence": float(confidence),
            "matched_logos": matched,
            "raw_labels": [l.description for l in labels[:10]],
        }
    return await asyncio.to_thread(_op)
