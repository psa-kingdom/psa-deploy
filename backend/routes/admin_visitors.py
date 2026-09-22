"""
Visitor tracking router for PSA website.
Provides:
  - POST /api/track/visit: logs an anonymous visitor pageview/session
  - GET /api/admin/analytics/visitors: returns total unique visitors, total visits, and daily breakdown for last n days
"""

import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Request, Response, Query
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorDatabase
from backend.core.auth import get_current_admin

router = APIRouter(prefix="", tags=["Visitor Analytics"])

class VisitPayload(BaseModel):
    path: str = "/"
    referrer: Optional[str] = None
    session_id: Optional[str] = None

def get_db(request: Request) -> AsyncIOMotorDatabase:
    return request.app.state.db

@router.post("/track/visit")
async def track_visit(payload: VisitPayload, request: Request, response: Response, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Tracks an anonymous website visitor.
    Uses session_id from payload, or cookie 'psa_vid', or creates a new one.
    """
    cookie_vid = request.cookies.get("psa_vid")
    vid = payload.session_id or cookie_vid or str(uuid.uuid4())

    if not cookie_vid:
        response.set_cookie(
            key="psa_vid",
            value=vid,
            max_age=365 * 24 * 3600,
            httponly=False,
            samesite="lax"
        )

    now = datetime.now(timezone.utc)
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "")

    doc = {
        "vid": vid,
        "path": payload.path,
        "referrer": payload.referrer or "",
        "ip": ip,
        "user_agent": ua,
        "created_at": now,
        "date_str": now.strftime("%Y-%m-%d")
    }

    await db["site_visitors"].insert_one(doc)
    return {"status": "ok", "vid": vid}


@router.get("/admin/analytics/visitors", dependencies=[Depends(get_current_admin)])
async def get_visitor_analytics(
    days: int = Query(default=30, ge=1, le=1825),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Returns visitor analytics aggregated for the past `days` days.
    """
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)

    match_stage = {"$match": {"created_at": {"$gte": start_date}}}
    
    pipeline = [
        match_stage,
        {
            "$group": {
                "_id": "$date_str",
                "visits": {"$sum": 1},
                "unique_visitors": {"$addToSet": "$vid"}
            }
        },
        {"$sort": {"_id": 1}}
    ]

    results = await db["site_visitors"].aggregate(pipeline).to_list(length=2000)
    date_map = {r["_id"]: {"visits": r["visits"], "visitors": len(r["unique_visitors"])} for r in results}

    daily = []
    total_visits = 0

    for d in range(days):
        day_dt = (now - timedelta(days=(days - 1 - d)))
        day_str = day_dt.strftime("%Y-%m-%d")
        day_data = date_map.get(day_str, {"visits": 0, "visitors": 0})
        daily.append({
            "date": day_str,
            "displayDate": day_dt.strftime("%b %d"),
            "visits": day_data["visits"],
            "visitors": day_data["visitors"]
        })
        total_visits += day_data["visits"]

    distinct_vids = await db["site_visitors"].distinct("vid", {"created_at": {"$gte": start_date}})
    unique_visitors = len(distinct_vids)

    all_time_unique = len(await db["site_visitors"].distinct("vid"))
    all_time_visits = await db["site_visitors"].count_documents({})

    return {
        "days": days,
        "unique_visitors": unique_visitors,
        "total_visits": total_visits,
        "all_time_unique": all_time_unique,
        "all_time_visits": all_time_visits,
        "daily": daily
    }
