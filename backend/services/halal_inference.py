"""Batched Gemini halal inference for ambiguous Google-discovered restaurants.

Only invoked when the trip's constraint list includes `halal`. One Gemini call
per discovery cycle covers every ambiguous candidate, so cost is bounded.

The output is fed back into each `Business.constraints_met.halal` so the
constraint solver treats it like any other check — except `body` will read
`"ai_inferred:gemini"`, which the UI surfaces as an amber "AI-inferred" badge.
"""
from __future__ import annotations

import logging
from typing import Iterable, Optional

from services import gemini_client

log = logging.getLogger("kupe.halal_inference")


# Countries where halal food is the local norm. In these markets, restaurants
# are expected to serve halal unless the name/cuisine explicitly says otherwise
# (pork specialty, bar, izakaya, etc.). Names taken from Google Places'
# typical `formattedAddress` country segment — match case-insensitively.
_MUSLIM_MAJORITY_COUNTRIES = frozenset({
    "malaysia", "indonesia", "brunei", "brunei darussalam",
    "united arab emirates", "uae",
    "saudi arabia", "ksa",
    "oman", "qatar", "kuwait", "bahrain", "yemen",
    "egypt", "jordan", "lebanon", "syria", "iraq", "palestine",
    "turkey", "türkiye",
    "pakistan", "bangladesh", "maldives",
    "iran", "afghanistan",
    "morocco", "tunisia", "algeria", "libya", "mauritania",
    "azerbaijan", "uzbekistan", "kazakhstan", "kyrgyzstan",
    "tajikistan", "turkmenistan",
    "albania", "kosovo", "bosnia and herzegovina",
    "somalia", "djibouti", "senegal", "mali", "niger", "chad",
    "sudan", "gambia", "the gambia", "comoros", "sierra leone",
    "guinea", "burkina faso", "nigeria",
})


def _country_from_address(address: Optional[str]) -> Optional[str]:
    """Google's formattedAddress is comma-separated, country last."""
    if not address:
        return None
    last = address.rsplit(",", 1)[-1].strip()
    return last or None


def _region_default(address: Optional[str]) -> str:
    country = _country_from_address(address)
    if country and country.lower() in _MUSLIM_MAJORITY_COUNTRIES:
        return "muslim_majority"
    return "other"


PROMPT_TEMPLATE = """You are a Halal-compliance assistant for Muslim travelers.

For EACH restaurant below, decide whether it is plausibly halal-friendly. Each
candidate carries an `address` and a precomputed `region_default` that you MUST
use as your prior.

DECISION RULES:

region_default = "muslim_majority"
  (Malaysia, Indonesia, Brunei, UAE, Saudi Arabia, Turkey, Pakistan, Egypt, etc.)
  Local norm is halal. DEFAULT halal=true with confidence 0.75-0.85.
  Return halal=false ONLY when one of these negative signals is present:
    • Name/types mention pork, bacon, ham, bak kut teh, char siu, siu yuk,
      lechon, or other pork-specialty food
    • Name/types include bar, pub, brewery, izakaya, wine bar, cocktail bar,
      sake, beer hall
    • Review explicitly says "not halal", "pork is the specialty", or
      describes alcohol as the main draw
  IMPORTANT: in these regions, Western/Japanese/Chinese cuisine names alone
  are NOT a negative signal. Chains and Mamak-style stalls adapt to halal
  norms; a "sushi" or "burger" place in Malaysia is almost always halal.

region_default = "other"
  Default halal=false with confidence 0.7. Return halal=true ONLY with explicit
  positive signals:
    • Name/types include halal, muslim-friendly, mamak, nasi kandar, kebab,
      biryani, tandoori, shawarma, falafel, middle-eastern, turkish, persian
    • Editorial or review mentions halal certification

CONFIDENCE GUIDANCE:
  0.9+  : explicit positive (name match, halal in review) OR strong negative
          (pork in name, bar/pub type)
  0.75  : region-default decision with no contrary signal
  <0.6  : reserved for genuinely conflicting signals

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
            "address": c.get("address"),
            "region_default": _region_default(c.get("address")),
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
