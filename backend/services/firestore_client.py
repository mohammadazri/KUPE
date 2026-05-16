"""Thin async-friendly wrapper over google-cloud-firestore.

The sync client is wrapped in `asyncio.to_thread` so FastAPI handlers can
`await` without blocking. Keeps the rest of the codebase free of coupling
to the underlying SDK shape.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any, Optional

from google.cloud import firestore

from config import get_settings

log = logging.getLogger("kupe.firestore")
_client: Optional[firestore.Client] = None


def get_client() -> firestore.Client:
    global _client
    if _client is None:
        settings = get_settings()
        _client = firestore.Client(project=settings.gcp_project_id)
        log.info("Firestore client initialised (project=%s)", settings.gcp_project_id)
    return _client


# ---------- thin async helpers ----------

async def get(collection: str, doc_id: str) -> Optional[dict]:
    def _op():
        snap = get_client().collection(collection).document(doc_id).get()
        return snap.to_dict() if snap.exists else None
    return await asyncio.to_thread(_op)


async def set_(collection: str, doc_id: str, data: dict, merge: bool = False) -> None:
    def _op():
        get_client().collection(collection).document(doc_id).set(data, merge=merge)
    await asyncio.to_thread(_op)


async def add(collection: str, data: dict) -> str:
    def _op():
        ref = get_client().collection(collection).document()
        ref.set(data)
        return ref.id
    return await asyncio.to_thread(_op)


async def update(collection: str, doc_id: str, data: dict) -> None:
    def _op():
        get_client().collection(collection).document(doc_id).update(data)
    await asyncio.to_thread(_op)


async def query_where(
    collection: str,
    filters: list[tuple[str, str, Any]] | None = None,
    limit: int = 200,
) -> list[dict]:
    """Run a Firestore query with simple equality/in filters.

    filters: list of (field, op, value) e.g. ("active", "==", True)
    """
    def _op():
        col = get_client().collection(collection)
        q = col
        for field, op, value in filters or []:
            q = q.where(filter=firestore.FieldFilter(field, op, value))
        q = q.limit(limit)
        return [d.to_dict() | {"_id": d.id} for d in q.stream()]
    return await asyncio.to_thread(_op)


async def list_all(collection: str, limit: int = 500) -> list[dict]:
    def _op():
        return [d.to_dict() | {"_id": d.id} for d in get_client().collection(collection).limit(limit).stream()]
    return await asyncio.to_thread(_op)
