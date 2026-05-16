"""Admin / analytics endpoints feeding the Dashboard page."""
from collections import Counter

from fastapi import APIRouter

from services import firestore_client as fs
from services import gemini_client

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats")
async def stats() -> dict:
    trips = await fs.list_all("trips", limit=500)
    linkages = await fs.list_all("linkages", limit=2000)
    businesses = await fs.list_all("businesses", limit=500)

    healed = [l for l in linkages if l.get("healed_from")]
    verified = [l for l in linkages if l.get("status") == "verified"]
    avg_conf = sum(l.get("confidence", 0) for l in linkages) / max(len(linkages), 1)

    biz_score = Counter()
    for l in linkages:
        bid = l.get("business_id")
        if bid:
            biz_score[bid] += 1

    leaderboard = []
    for bid, count in biz_score.most_common(10):
        bdoc = next((b for b in businesses if (b.get("_id") == bid or b.get("id") == bid)), None)
        if bdoc:
            leaderboard.append({
                "id": bid,
                "name": bdoc.get("name", "?"),
                "type": bdoc.get("type", "?"),
                "linkage_count": count,
                "rating": bdoc.get("rating", 0),
            })

    return {
        "total_trips": len(trips),
        "total_linkages": len(linkages),
        "total_businesses": len(businesses),
        "verified_linkages": len(verified),
        "healed_linkages": len(healed),
        "self_heal_rate": (len(healed) / max(len(linkages), 1)),
        "avg_confidence": round(avg_conf, 3),
        "leaderboard": leaderboard,
    }


@router.get("/blueprints")
async def blueprints() -> list[dict]:
    trips = await fs.query_where(
        "trips",
        filters=[("blueprint_eligible", "==", True)],
        limit=50,
    )
    return [{
        "id": t.get("_id") or t.get("id"),
        "constraint_profile": t.get("constraint_profile", []),
        "preferences": t.get("preferences", []),
        "avg_satisfaction": t.get("satisfaction_score", 0),
        "city": t.get("city"),
    } for t in trips]


@router.get("/health/vertex")
async def vertex_health() -> dict:
    """Tiny call to confirm Gemini model reachability — surfaced on Dashboard."""
    return await gemini_client.health_check()
