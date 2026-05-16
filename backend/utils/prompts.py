"""Prompt templates for Gemini calls.

We anonymise traveller data (no names/emails sent to the model) and instruct the
model to NEVER guess on hard constraints — those are verified deterministically
in `services/constraint_solver.py` before the prompt is even sent.
"""
from typing import Iterable

SYSTEM_INSTRUCTION = """You are KUPE's Linkage Engine — an AI orchestrator that
matches travellers to local businesses as PROGRAMMABLE RELATIONSHIPS (called
"linkages").

Rules you must follow:
1. Every business in `candidates` has ALREADY been pre-filtered to pass hard
   constraints (Halal certification, wheelchair accessibility, dietary). Do NOT
   second-guess hard constraints — trust the pre-filter.
2. Rank candidates by: constraint compliance > proximity (when given) > rating
   > novelty (avoid repeating the same business across slots) > price fit.
3. Output strict JSON matching the supplied schema. Never include markdown,
   commentary, or prose outside the JSON.
4. Provide concrete reasoning that names the deciding factor ("400m from prev
   stop", "4.5★ rating", "matches 'family_friendly' tag").
5. Confidence is your self-rated 0-1 belief. Strength is the user-business fit
   0-1. Be honest — low numbers when the candidate is a weak match.
6. NEVER invent a business_id. Only use IDs from the provided `candidates` list.
"""


def build_generate_prompt(
    traveler_profile: dict,
    candidates: list[dict],
    days: int,
    city: str,
    start_date: str,
) -> str:
    return (
        f"Plan a {days}-day trip in {city} starting {start_date}.\n\n"
        f"Anonymised traveller profile:\n"
        f"- constraints: {traveler_profile.get('constraints', [])}\n"
        f"- preferences: {traveler_profile.get('preferences', [])}\n"
        f"- pace: {traveler_profile.get('pace', 'moderate')}\n"
        f"- budget: {traveler_profile.get('budget', 'mid')}\n"
        f"- party_size: {traveler_profile.get('party_size', 1)}\n\n"
        f"Candidate businesses per slot (all already pre-filtered for hard constraints):\n"
        f"{candidates}\n\n"
        f"Pick exactly ONE business per slot from that slot's candidates list. NEVER reuse the "
        f"same business_id across slots within this day.\n\n"
        f'Return JSON of exactly this shape (top-level key MUST be "slots"):\n'
        f'{{\n'
        f'  "slots": [\n'
        f'    {{"time": "08:30", "type": "breakfast", "business_id": "<id>", '
        f'"confidence": 0.0-1.0, "strength": 0.0-1.0, "reasoning": "<one sentence>"}},\n'
        f'    {{"time": "10:30", "type": "attraction", "business_id": "<id>", ...}},\n'
        f'    {{"time": "12:30", "type": "lunch", ...}},\n'
        f'    {{"time": "14:30", "type": "afternoon", ...}},\n'
        f'    {{"time": "19:00", "type": "dinner", ...}}\n'
        f'  ]\n'
        f'}}\n'
        f"business_id values MUST be ids from the supplied candidates lists. Output JSON only."
    )


def build_heal_prompt(
    broken_slot: dict,
    prev_slot: dict | None,
    next_slot: dict | None,
    candidates: list[dict],
    constraints: Iterable[str],
) -> str:
    return (
        f"A linkage in the itinerary has broken. Pick the BEST replacement.\n\n"
        f"Broken slot: {broken_slot}\n"
        f"Previous slot: {prev_slot}\n"
        f"Next slot: {next_slot}\n"
        f"Hard constraints to maintain: {list(constraints)}\n\n"
        f"Available replacement candidates (pre-filtered, satisfy hard constraints):\n"
        f"{candidates}\n\n"
        f"Optimise for (in order): same type, proximity to neighbour slots, "
        f"comparable rating, novelty.\n\n"
        f"Return JSON of exactly this shape — top-level keys only, no wrappers:\n"
        f'{{"business_id":"<id from candidates>", "confidence":0.0-1.0, '
        f'"strength":0.0-1.0, "reasoning":"<one sentence naming the deciding factor>"}}\n'
        f"Output JSON only."
    )


def build_voice_parse_prompt(transcript: str) -> str:
    return (
        f"The user spoke this request:\n\n"
        f'"{transcript}"\n\n'
        f"Extract travel-planning fields and return JSON with keys: "
        f'constraints (list of: "halal", "wheelchair_accessible", "vegetarian", '
        f'"vegan", "gluten_free", "nut_free", "budget", "family_friendly"), '
        f'preferences (list of free-text tags like "outdoor", "cultural"), '
        f'pace ("relaxed"|"moderate"|"adventurous"), '
        f'budget ("budget"|"mid"|"premium"), '
        f'party_size (int), notes (string).\n'
        f"If a field cannot be inferred, omit it. Return ONLY valid JSON."
    )
