"""
Admin & Public Insights Routes — Phase 04

Provides:
- Public endpoints for fetching published Insights articles.
- Authenticated admin endpoints for managing (Create, Read, Update, Delete, Publish/Archive) Insights.
"""

import logging
import re
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from backend.core.auth import get_current_admin
from backend.models.insight import (
    Insight,
    InsightCreate,
    InsightUpdate,
    InsightStatusUpdate,
    InsightStatsResponse,
    InsightStatus,
    generate_uuid,
    get_utc_now,
)

logger = logging.getLogger(__name__)

# Admin router mounted at /api/admin/insights
admin_router = APIRouter(prefix="/admin/insights", tags=["Admin Insights"])

# Public router mounted at /api/insights
public_router = APIRouter(prefix="/insights", tags=["Public Insights"])


def get_db() -> AsyncIOMotorDatabase:
    from backend.server import db
    return db


def _slugify(text: str) -> str:
    """Generates a clean URL slug from title."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    text = re.sub(r"^-+|-+$", "", text)
    return text or "insight"


# ---------- Public Endpoints ----------

@public_router.get("", response_model=List[Insight])
async def list_published_insights(
    category: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    skip: int = Query(0),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Returns list of published insights for the public website.
    """
    query: dict = {"status": "published"}
    if category and category != "All":
        query["category"] = category

    docs = (
        await db.insights.find(query, {"_id": 0})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )
    return [Insight(**d) for d in docs]


@public_router.get("/{slug}", response_model=Insight)
async def get_published_insight_by_slug(
    slug: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Returns a single published insight by slug for the public article view.
    """
    doc = await db.insights.find_one({"slug": slug, "status": "published"}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Article not found")
    return Insight(**doc)


# ---------- Admin Endpoints ----------

@admin_router.get("/stats", response_model=InsightStatsResponse, dependencies=[Depends(get_current_admin)])
async def get_insights_stats(db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Returns total count and per-status breakdown of insights.
    """
    total = await db.insights.count_documents({})
    published_count = await db.insights.count_documents({"status": "published"})
    draft_count = await db.insights.count_documents({"status": "draft"})
    archived_count = await db.insights.count_documents({"status": "archived"})

    return InsightStatsResponse(
        total=total,
        published_count=published_count,
        draft_count=draft_count,
        archived_count=archived_count,
    )


@admin_router.get("", response_model=List[Insight], dependencies=[Depends(get_current_admin)])
async def list_admin_insights(
    q: Optional[str] = Query(None, description="Search title, excerpt or author"),
    status: Optional[str] = Query(None, description="Filter by status (draft, published, archived)"),
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(50, le=200),
    skip: int = Query(0),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    List all insights for admin management with search and filters.
    """
    query: dict = {}
    if status and status != "all":
        query["status"] = status
    if category and category != "All":
        query["category"] = category

    if q and q.strip():
        term = q.strip()
        regex = {"$regex": re.escape(term), "$options": "i"}
        search_clause = {"$or": [{"title": regex}, {"excerpt": regex}, {"author": regex}, {"slug": regex}]}
        if query:
            query = {"$and": [query, search_clause]}
        else:
            query = search_clause

    docs = (
        await db.insights.find(query, {"_id": 0})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )
    return [Insight(**d) for d in docs]


@admin_router.get("/{insight_id}", response_model=Insight, dependencies=[Depends(get_current_admin)])
async def get_insight_by_id(
    insight_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Retrieve single insight by its id for editing.
    """
    doc = await db.insights.find_one({"id": insight_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Insight not found")
    return Insight(**doc)


@admin_router.post("", response_model=Insight, dependencies=[Depends(get_current_admin)])
async def create_insight(
    payload: InsightCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Create a new insight article in draft or published status.
    """
    slug = (payload.slug or "").strip() or _slugify(payload.title)
    # Ensure unique slug
    existing = await db.insights.find_one({"slug": slug})
    if existing:
        slug = f"{slug}-{generate_uuid()[:6]}"

    now = get_utc_now()
    published_at = now if payload.status == InsightStatus.PUBLISHED else None

    insight = Insight(
        id=generate_uuid(),
        slug=slug,
        title=payload.title.strip(),
        category=payload.category,
        excerpt=payload.excerpt.strip(),
        image=payload.image,
        date=payload.date or now.strftime("%B %Y"),
        read_time=payload.read_time or "5 min read",
        author=payload.author or "CA Prem Suman",
        body=payload.body,
        toc=payload.toc or [],
        status=payload.status,
        published_at=published_at,
        created_at=now,
        updated_at=now,
    )

    doc = insight.model_dump()
    await db.insights.insert_one(doc)
    doc.pop("_id", None)
    return Insight(**doc)


@admin_router.put("/{insight_id}", response_model=Insight, dependencies=[Depends(get_current_admin)])
async def update_insight(
    insight_id: str,
    payload: InsightUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Update an existing insight article.
    """
    existing = await db.insights.find_one({"id": insight_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Insight not found")

    update_dict: dict = {"updated_at": get_utc_now()}

    if payload.title is not None:
        update_dict["title"] = payload.title.strip()
    if payload.slug is not None:
        new_slug = _slugify(payload.slug)
        # Check if slug taken by another doc
        slug_check = await db.insights.find_one({"slug": new_slug, "id": {"$ne": insight_id}})
        if slug_check:
            raise HTTPException(status_code=400, detail="Slug already in use by another article")
        update_dict["slug"] = new_slug
    if payload.category is not None:
        update_dict["category"] = payload.category
    if payload.excerpt is not None:
        update_dict["excerpt"] = payload.excerpt.strip()
    if payload.image is not None:
        update_dict["image"] = payload.image
    if payload.date is not None:
        update_dict["date"] = payload.date
    if payload.read_time is not None:
        update_dict["read_time"] = payload.read_time
    if payload.author is not None:
        update_dict["author"] = payload.author
    if payload.body is not None:
        update_dict["body"] = payload.body
    if payload.toc is not None:
        update_dict["toc"] = [t.model_dump() for t in payload.toc]
    if payload.status is not None:
        update_dict["status"] = payload.status
        if payload.status == InsightStatus.PUBLISHED and not existing.get("published_at"):
            update_dict["published_at"] = get_utc_now()

    await db.insights.update_one({"id": insight_id}, {"$set": update_dict})
    updated_doc = await db.insights.find_one({"id": insight_id}, {"_id": 0})
    return Insight(**updated_doc)


@admin_router.patch("/{insight_id}/status", response_model=Insight, dependencies=[Depends(get_current_admin)])
async def update_insight_status(
    insight_id: str,
    payload: InsightStatusUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Toggle publication status (draft / published / archived).
    """
    existing = await db.insights.find_one({"id": insight_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Insight not found")

    now = get_utc_now()
    update_dict = {"status": payload.status, "updated_at": now}
    if payload.status == InsightStatus.PUBLISHED and not existing.get("published_at"):
        update_dict["published_at"] = now

    await db.insights.update_one({"id": insight_id}, {"$set": update_dict})
    updated_doc = await db.insights.find_one({"id": insight_id}, {"_id": 0})
    return Insight(**updated_doc)


@admin_router.delete("/{insight_id}", dependencies=[Depends(get_current_admin)])
async def delete_insight(
    insight_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Permanently delete an insight article.
    """
    result = await db.insights.delete_one({"id": insight_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Insight not found")
    return {"message": "Insight deleted successfully", "id": insight_id}
