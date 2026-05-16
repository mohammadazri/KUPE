"""Pydantic models for KUPE.

These double as Gemini structured-output schemas — keep them flat and JSON-friendly.
"""
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import uuid4

from pydantic import BaseModel, Field


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _uid(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:10]}"


# ---------- Constraints ----------

class ConstraintKey(str, Enum):
    HALAL = "halal"
    WHEELCHAIR = "wheelchair_accessible"
    VEGETARIAN = "vegetarian"
    VEGAN = "vegan"
    GLUTEN_FREE = "gluten_free"
    NUT_FREE = "nut_free"
    BUDGET = "budget"
    FAMILY_FRIENDLY = "family_friendly"


class Pace(str, Enum):
    RELAXED = "relaxed"
    MODERATE = "moderate"
    ADVENTUROUS = "adventurous"


class BudgetTier(str, Enum):
    BUDGET = "budget"
    MID = "mid"
    PREMIUM = "premium"


# ---------- Business ----------

class Location(BaseModel):
    lat: float
    lng: float


class HalalCert(BaseModel):
    certified: bool = False
    body: Optional[str] = None  # e.g. "JAKIM"


class AccessibilityInfo(BaseModel):
    wheelchair: bool = False
    notes: Optional[str] = None


class ConstraintsMet(BaseModel):
    halal: HalalCert = Field(default_factory=HalalCert)
    accessibility: AccessibilityInfo = Field(default_factory=AccessibilityInfo)
    vegetarian: bool = False
    vegan: bool = False
    gluten_free: bool = False
    nut_free: bool = False


class Business(BaseModel):
    id: str = Field(default_factory=lambda: _uid("biz"))
    name: str
    type: str  # restaurant | attraction | hotel | shopping | cafe
    location: Location
    tags: list[str] = Field(default_factory=list)
    constraints_met: ConstraintsMet = Field(default_factory=ConstraintsMet)
    photos: list[str] = Field(default_factory=list)
    address: Optional[str] = None
    rating: float = 0.0
    user_rating_count: int = 0
    avg_spend_myr: float = 0.0
    linkage_score: float = 0.0
    success_rate: float = 0.0
    active: bool = True
    place_id: Optional[str] = None  # Google Places ID if available
    source: str = "seed"  # "seed" | "google_places"
    opening_hours: Optional[dict] = None  # currentOpeningHours payload from Places
    editorial_summary: Optional[str] = None
    top_review: Optional[str] = None


# ---------- Linkage ----------

class ConstraintCheck(BaseModel):
    constraint: str
    passed: bool
    method: str  # "deterministic" | "ai_verified" | "jakim_db"
    note: Optional[str] = None


class LinkageStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    BROKEN = "broken"
    HEALED = "healed"


class LinkageType(str, Enum):
    MEAL_ASSIGNMENT = "meal_assignment"
    ATTRACTION = "attraction"
    LODGING = "lodging"
    SHOPPING = "shopping"
    LEISURE = "leisure"


class Linkage(BaseModel):
    id: str = Field(default_factory=lambda: _uid("link"))
    trip_id: str
    traveler_id: str
    business_id: str
    type: LinkageType
    status: LinkageStatus = LinkageStatus.VERIFIED
    constraint_checks: list[ConstraintCheck] = Field(default_factory=list)
    strength: float = 0.0
    confidence: float = 0.0
    reasoning: str = ""
    outcome: Optional[str] = None
    healed_from: Optional[str] = None
    created_at: str = Field(default_factory=_now)


# ---------- Trip ----------

class TripDates(BaseModel):
    start: str  # YYYY-MM-DD
    end: str


class ItinerarySlot(BaseModel):
    time: str  # "09:00"
    type: str  # breakfast | lunch | dinner | attraction | rest
    linkage_id: Optional[str] = None
    business_id: Optional[str] = None
    business_name: Optional[str] = None
    status: LinkageStatus = LinkageStatus.PENDING
    notes: Optional[str] = None


class ItineraryDay(BaseModel):
    day: int
    date: str
    slots: list[ItinerarySlot] = Field(default_factory=list)


class TravelerProfile(BaseModel):
    traveler_id: str
    constraints: list[ConstraintKey] = Field(default_factory=list)
    preferences: list[str] = Field(default_factory=list)
    pace: Pace = Pace.MODERATE
    budget: BudgetTier = BudgetTier.MID
    party_size: int = 1
    notes: Optional[str] = None


class Trip(BaseModel):
    id: str = Field(default_factory=lambda: _uid("trip"))
    traveler_id: str
    city: str
    location: Optional[Location] = None  # Geocoded city center for self-heal re-discovery
    dates: TripDates
    constraint_profile: list[ConstraintKey] = Field(default_factory=list)
    preferences: list[str] = Field(default_factory=list)
    pace: Pace = Pace.MODERATE
    budget: BudgetTier = BudgetTier.MID
    itinerary: list[ItineraryDay] = Field(default_factory=list)
    satisfaction_score: Optional[float] = None
    blueprint_eligible: bool = False
    created_at: str = Field(default_factory=_now)


# ---------- Request / Response shapes ----------

class GenerateTripRequest(BaseModel):
    city: str = "Kuala Lumpur"
    lat: Optional[float] = None  # If frontend resolved via Places autocomplete, skip server geocoding
    lng: Optional[float] = None
    start_date: str
    end_date: str
    constraints: list[ConstraintKey] = Field(default_factory=list)
    preferences: list[str] = Field(default_factory=list)
    pace: Pace = Pace.MODERATE
    budget: BudgetTier = BudgetTier.MID
    party_size: int = 1
    notes: Optional[str] = None


class GenerateTripResponse(BaseModel):
    trip: Trip
    linkages: list[Linkage]
    businesses: list[Business]
    model: str
    generation_ms: int
    fallback_used: bool = False


class HealRequest(BaseModel):
    reason: Optional[str] = "Business closed (demo)"


class HealResponse(BaseModel):
    old_linkage: Linkage
    new_linkage: Linkage
    new_business: Business
    reasoning: str


# ---------- Gemini structured output schemas ----------

class GeminiSlotPick(BaseModel):
    """Schema Gemini fills in for one slot."""
    business_id: str
    confidence: float = Field(ge=0.0, le=1.0)
    strength: float = Field(ge=0.0, le=1.0)
    reasoning: str


class GeminiDayPlan(BaseModel):
    day: int
    date: str
    slots: list[dict]  # {time, type, business_id, confidence, strength, reasoning}


class GeminiItineraryResponse(BaseModel):
    days: list[GeminiDayPlan]


class GeminiHealResponse(BaseModel):
    business_id: str
    confidence: float
    strength: float
    reasoning: str


# ---------- Voice / Translation ----------

class TranscribeResponse(BaseModel):
    transcript: str
    language: str
    parsed: dict


class TranslateRequest(BaseModel):
    text: str
    target: str  # "ms" | "ar" | "zh" | "en"
    source: Optional[str] = None


class TranslateResponse(BaseModel):
    translated: str
    target: str
    detected_source: Optional[str] = None


class VisionHalalRequest(BaseModel):
    image_base64: Optional[str] = None
    image_url: Optional[str] = None


class VisionHalalResponse(BaseModel):
    halal_detected: bool
    confidence: float
    matched_logos: list[str]
    raw_labels: list[str]
