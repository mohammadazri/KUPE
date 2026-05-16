"""Ethical AI audit + transparency logger.

Every linkage decision is recorded to Firestore `audit_log/` for later bias
review. Travellers are referenced by anonymised UID only — no names or emails
ever reach this collection.
"""
import logging
from datetime import datetime, timezone
from typing import Iterable

from models.schemas import Business, Linkage

log = logging.getLogger("kupe.ethical")


async def log_decision(
    firestore_client,
    *,
    trip_id: str,
    linkage: Linkage,
    chosen: Business,
    rejected: Iterable[Business] = (),
    traveler_uid_anon: str,
) -> None:
    """Append one decision row to Firestore audit_log.

    Args:
        firestore_client: async Firestore client wrapper (services.firestore_client)
        trip_id: parent trip id
        linkage: the linkage object that was created
        chosen: the business that was selected
        rejected: a sample (top N) of other candidates that were not selected
        traveler_uid_anon: SHA256-prefixed anonymous identifier for the traveller
    """
    rejected_sample = [
        {"id": r.id, "name": r.name, "rating": r.rating, "tags": r.tags[:5]}
        for r in list(rejected)[:5]
    ]
    audit = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "trip_id": trip_id,
        "linkage_id": linkage.id,
        "traveler_uid_anon": traveler_uid_anon,
        "chosen": {
            "id": chosen.id,
            "name": chosen.name,
            "rating": chosen.rating,
            "tags": chosen.tags[:5],
        },
        "rejected_sample": rejected_sample,
        "reasoning": linkage.reasoning,
        "constraint_checks": [c.model_dump() for c in linkage.constraint_checks],
        "confidence": linkage.confidence,
        "strength": linkage.strength,
    }
    try:
        await firestore_client.add("audit_log", audit)
    except Exception as exc:  # never let audit logging break a request
        log.warning("audit_log write failed: %s", exc)
