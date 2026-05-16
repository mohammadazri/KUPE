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


def explain_checks(biz: Business, required: list[ConstraintKey]) -> list[ConstraintCheck]:
    """Produce per-constraint audit rows. Always passes (because pre-filtered)
    but the method and source body are populated so the UI can display them."""
    checks: list[ConstraintCheck] = []
    cm = biz.constraints_met
    for c in required:
        if c == ConstraintKey.HALAL:
            checks.append(
                ConstraintCheck(
                    constraint="halal",
                    passed=cm.halal.certified,
                    method=f"cert:{cm.halal.body}" if cm.halal.body else "deterministic",
                    note=cm.halal.body,
                )
            )
        elif c == ConstraintKey.WHEELCHAIR:
            checks.append(
                ConstraintCheck(
                    constraint="wheelchair_accessible",
                    passed=cm.accessibility.wheelchair,
                    method="deterministic",
                    note=cm.accessibility.notes,
                )
            )
        elif c == ConstraintKey.VEGETARIAN:
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
