"""Centralised app configuration via Pydantic Settings."""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # GCP
    gcp_project_id: str = "project-8835c3ba-ad0b-4e0b-b56"
    vertex_location: str = "us-central1"
    gemini_model: str = "gemini-2.5-pro"

    # Firebase
    firebase_project_id: str = "project-8835c3ba-ad0b-4e0b-b56"

    # Maps
    maps_server_key: str = ""

    # CORS
    allowed_origins: str = "http://localhost:5173"

    # App
    app_env: str = "development"
    log_level: str = "INFO"
    enable_grounding: bool = True
    dynamic_grounding_threshold: float = 0.3

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def is_dev(self) -> bool:
        return self.app_env.lower() == "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()
