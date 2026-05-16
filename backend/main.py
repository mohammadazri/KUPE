"""KUPE FastAPI entry point."""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from middleware.auth import FirebaseAuthMiddleware
from routers import admin, businesses, linkages, places, translate, trips, vision, voice

settings = get_settings()
logging.basicConfig(level=settings.log_level)
log = logging.getLogger("kupe")

app = FastAPI(
    title="KUPE Linkage Engine",
    description="AI-powered relationship graph for constraint-aware tourism",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(FirebaseAuthMiddleware)

app.include_router(trips.router)
app.include_router(linkages.router)
app.include_router(businesses.router)
app.include_router(places.router)
app.include_router(voice.router)
app.include_router(translate.router)
app.include_router(vision.router)
app.include_router(admin.router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "kupe-backend", "env": settings.app_env}


@app.get("/")
async def root() -> dict:
    return {
        "service": "KUPE Linkage Engine",
        "docs": "/docs",
        "health": "/health",
    }


@app.on_event("startup")
async def on_startup() -> None:
    log.info("KUPE starting (env=%s, model=%s)", settings.app_env, settings.gemini_model)
