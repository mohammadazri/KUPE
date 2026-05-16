"""Idempotent seed loader.

Usage (from `backend/`):
    python -m utils.seed_loader

Reads data/seed/businesses_kl.json from the repo root and upserts each row
into the `businesses` Firestore collection, keyed by `id`.
"""
from __future__ import annotations

import json
import logging
import os
import sys
from pathlib import Path

# Ensure backend root is importable when run as a script
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from services import firestore_client as fs  # noqa: E402

log = logging.getLogger("kupe.seed")
logging.basicConfig(level=logging.INFO)


def _load_json() -> list[dict]:
    repo_root = BACKEND_DIR.parent
    seed_file = repo_root / "data" / "seed" / "businesses_kl.json"
    if not seed_file.exists():
        raise FileNotFoundError(f"Seed file missing: {seed_file}")
    return json.loads(seed_file.read_text(encoding="utf-8"))


async def run() -> None:
    rows = _load_json()
    log.info("Loading %d businesses → Firestore", len(rows))
    written = 0
    for row in rows:
        bid = row["id"]
        await fs.set_("businesses", bid, row, merge=True)
        written += 1
    log.info("Seed complete (%d rows)", written)


if __name__ == "__main__":
    import asyncio

    asyncio.run(run())
