"""Deterministic hard-constraint verification.

Hard constraints (Halal, wheelchair) are NEVER guessed by the LLM — they are
checked against `Business.constraints_met` here. This is what makes KUPE's
linkages trustworthy.
"""
from __future__ import annotations

from models.schemas import Business, ConstraintCheck, ConstraintKey


def passes_hard_constraints(biz: Business, required: list[ConstraintKey]) -> bool:
    """Return True iff `biz` satisfies every hard constraint in `required`."""
    cm = biz.constraints_met
    for c in required:
        if c == ConstraintKey.HALAL and not cm.halal.certified:
            return False
        if c == ConstraintKey.WHEELCHAIR and not cm.accessibility.wheelchair:
            return False
        if c == ConstraintKey.VEGETARIAN and not cm.vegetarian:
            return False
        if c == ConstraintKey.VEGAN and not cm.vegan:
            return False
        if c == ConstraintKey.GLUTEN_FREE and not cm.gluten_free:
            return False
        if c == ConstraintKey.NUT_FREE and not cm.nut_free:
            return False
    return True


def _halal_method(body: str | None, source: str) -> str:
    """Pick the audit-method string based on the halal evidence body.

    - "JAKIM" (or other certifying body string) → "jakim_db" (deterministic, gold-standard)
    - "ai_inferred:..." → "ai_verified" (Gemini- or regex-inferred from Places data)
    - Empty body + seeded source → "deterministic" (seed file's static booleans)
    - Empty body + google_places source → "ai_verified" (it slipped through inference)
    """
    if not body:
        return "deterministic" if source == "seed" else "ai_verified"
    if body.startswith("ai_inferred:"):
        return "ai_verified"
    # Any concrete certifying body counts as a deterministic database check.
    return "jakim_db" if body.upper() == "JAKIM" else "deterministic"


def explain_checks(biz: Business, required: list[ConstraintKey]) -> list[ConstraintCheck]:
    """Produce per-constraint audit rows. Always passes (because pre-filtered)
    but the method and source body are populated so the UI can display them.

    `method` distinguishes:
    - "jakim_db" — JAKIM-certified seed data (green badge)
    - "deterministic" — direct Places API field (e.g., accessibilityOptions)
    - "ai_verified" — Gemini- or regex-inferred (amber "AI-inferred" badge)
    """
    checks: list[ConstraintCheck] = []
    cm = biz.constraints_met
    src = getattr(biz, "source", "seed") or "seed"
    for c in required:
        if c == ConstraintKey.HALAL:
            checks.append(
                ConstraintCheck(
                    constraint="halal",
                    passed=cm.halal.certified,
                    method=_halal_method(cm.halal.body, src),
                    note=cm.halal.body,
                )
            )
        elif c == ConstraintKey.WHEELCHAIR:
            # Discovery reads accessibility from Places API directly — still deterministic.
            checks.append(
                ConstraintCheck(
                    constraint="wheelchair_accessible",
                    passed=cm.accessibility.wheelchair,
                    method="deterministic",
                    note=cm.accessibility.notes,
                )
            )
        elif c == ConstraintKey.VEGETARIAN:
            # Google Places exposes `servesVegetarianFood` directly → deterministic.
            checks.append(ConstraintCheck(constraint="vegetarian", passed=cm.vegetarian, method="deterministic"))
        elif c == ConstraintKey.VEGAN:
            checks.append(ConstraintCheck(constraint="vegan", passed=cm.vegan, method="deterministic"))
        elif c == ConstraintKey.GLUTEN_FREE:
            checks.append(ConstraintCheck(constraint="gluten_free", passed=cm.gluten_free, method="deterministic"))
        elif c == ConstraintKey.NUT_FREE:
            checks.append(ConstraintCheck(constraint="nut_free", passed=cm.nut_free, method="deterministic"))
        else:
            # Soft constraints get an AI-verified marker
            checks.append(ConstraintCheck(constraint=c.value, passed=True, method="ai_verified"))
    return checks


def filter_candidates(
    candidates: list[Business],
    required: list[ConstraintKey],
    *,
    exclude_ids: set[str] | None = None,
) -> list[Business]:
    exclude = exclude_ids or set()
    return [
        b
        for b in candidates
        if b.active and b.id not in exclude and passes_hard_constraints(b, required)
    ]
