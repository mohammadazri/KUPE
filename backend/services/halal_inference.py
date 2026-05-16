"""Batched Gemini halal inference for ambiguous Google-discovered restaurants.

Only invoked when the trip's constraint list includes `halal`. One Gemini call
per discovery cycle covers every ambiguous candidate, so cost is bounded.

The output is fed back into each `Business.constraints_met.halal` so the
constraint solver treats it like any other check — except `body` will read
`"ai_inferred:gemini"`, which the UI surfaces as an amber "AI-inferred" badge.
"""
from __future__ import annotations

import logging
from typing import Iterable

from services import gemini_client

log = logging.getLogger("kupe.halal_inference")


PROMPT_TEMPLATE = """You are a Halal-compliance assistant for Muslim travelers.

For EACH restaurant below, decide whether it is plausibly halal-friendly based on
its name, types, editorial summary, and a sample review. A place is halal-likely if:
- Its name or types explicitly indicate halal (e.g., halal, muslim-friendly, mamak,
  nasi kandar, kebab, biryani, tandoori, shawarma, Middle-Eastern cuisine).
- Its editorial summary or review mentions halal certification or Muslim-friendly food.
- It serves a cuisine that is traditionally halal (e.g., Turkish, Middle-Eastern,
  Indonesian/Malay vegetarian-leaning).

A place is NOT halal-likely if:
- It is a bar, pub, izakaya, brewery, or alcohol-focused venue.
- It primarily serves pork or non-halal meats (bak kut teh, char siu, ham, bacon).
- It is a Western-style steakhouse or seafood place without explicit halal claims.

When in doubt, default to FALSE — false positives erode user trust.

Return ONLY a JSON object of this exact shape (no extra commentary):
{
  "results": [
    {"place_id": "<id>", "halal": true|false, "confidence": 0.0-1.0, "reason": "<short>"}
  ]
}

Candidates:
"""


async def infer_batch(candidates: list[dict]) -> dict[str, dict]:
    """Run a single Gemini call to classify ambiguous restaurants.

    Returns {place_id: {"halal": bool, "confidence": float, "reason": str}}.
    On any failure returns {} so callers fall back to the deterministic default
    (halal=False for ambiguous places, which is the safe option).
    """
    if not candidates:
        return {}

    # Keep payload small — Gemini chews fewer tokens, faster + cheaper.
    compact = [
        {
            "place_id": c.get("place_id"),
            "name": c.get("name"),
            "types": (c.get("types") or [])[:6],
            "editorial_summary": (c.get("editorial_summary") or "")[:200],
            "top_review": (c.get("top_review") or "")[:200],
        }
        for c in candidates
        if c.get("place_id")
    ]

    if not compact:
        return {}

    import json as _json
    prompt = PROMPT_TEMPLATE + _json.dumps(compact, ensure_ascii=False)

    result = await gemini_client.generate_json(prompt, grounding=False, thinking_budget=0)
    if not isinstance(result, dict) or result.get("error"):
        log.warning("Halal inference Gemini call failed: %s", result)
        return {}

    rows = result.get("results")
    if not isinstance(rows, list):
        log.warning("Halal inference returned unexpected shape: keys=%s", list(result.keys()))
        return {}

    out: dict[str, dict] = {}
    for row in rows:
        if not isinstance(row, dict):
            continue
        pid = row.get("place_id")
        if not pid:
            continue
        out[pid] = {
            "halal": bool(row.get("halal")),
            "confidence": float(row.get("confidence") or 0.0),
            "reason": str(row.get("reason") or "")[:200],
        }

    log.info("Halal inference: %d candidates → %d classifications (%d halal-likely)",
             len(compact), len(out), sum(1 for v in out.values() if v["halal"]))
    return out


def apply_inference_to_businesses(
    businesses: Iterable,
    inference: dict[str, dict],
) -> list:
    """Mutate each Business's constraints_met.halal based on inference results.

    Businesses whose place_id is NOT in `inference` are left untouched (they
    either had deterministic results or weren't sent for inference). Returns
    the same iterable as a list for convenience.
    """
    out = []
    for biz in businesses:
        pid = getattr(biz, "place_id", None)
        if pid and pid in inference:
            verdict = inference[pid]
            biz.constraints_met.halal.certified = verdict["halal"]
            if verdict["halal"]:
                biz.constraints_met.halal.body = "ai_inferred:gemini"
            else:
                biz.constraints_met.halal.body = None
        out.append(biz)
    return out
