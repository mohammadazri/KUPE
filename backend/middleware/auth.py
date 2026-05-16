"""Firebase ID-token verification middleware.

Public routes (no token required): /, /health, /docs, /openapi.json, /redoc.
Every other route requires `Authorization: Bearer <id_token>` from Firebase Auth.
The verified UID is attached to `request.state.uid`.
"""
import logging
from typing import Iterable

import firebase_admin
from firebase_admin import auth as fb_auth
from firebase_admin import credentials
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from config import get_settings

log = logging.getLogger("kupe.auth")

PUBLIC_PATHS: tuple[str, ...] = (
    "/",
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/favicon.ico",
)


def _init_firebase() -> None:
    """Initialise firebase-admin once. Uses Application Default Credentials.

    On Cloud Run the runtime service account is auto-attached.
    Locally, GOOGLE_APPLICATION_CREDENTIALS env var must point to a JSON key.
    """
    if firebase_admin._apps:
        return
    settings = get_settings()
    try:
        firebase_admin.initialize_app(
            credentials.ApplicationDefault(),
            {"projectId": settings.firebase_project_id},
        )
        log.info("firebase-admin initialised (project=%s)", settings.firebase_project_id)
    except Exception as exc:
        log.warning("firebase-admin init failed: %s — auth will fail closed", exc)


_init_firebase()


def _is_public(path: str, public: Iterable[str] = PUBLIC_PATHS) -> bool:
    return any(path == p or path.startswith(p + "/") for p in public)


class FirebaseAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if _is_public(path) or request.method == "OPTIONS":
            return await call_next(request)

        auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
        if not auth_header or not auth_header.lower().startswith("bearer "):
            # In dev allow anonymous so devs can hit the API without sign-in
            if get_settings().is_dev:
                request.state.uid = "dev-anonymous"
                request.state.email = "dev@kupe.local"
                return await call_next(request)
            return JSONResponse(
                {"detail": "Missing Authorization Bearer token"}, status_code=401
            )

        token = auth_header.split(" ", 1)[1].strip()
        try:
            decoded = fb_auth.verify_id_token(token, check_revoked=False)
            request.state.uid = decoded["uid"]
            request.state.email = decoded.get("email", "")
        except Exception as exc:
            log.warning("token verify failed: %s", exc)
            return JSONResponse({"detail": "Invalid or expired token"}, status_code=401)

        return await call_next(request)
