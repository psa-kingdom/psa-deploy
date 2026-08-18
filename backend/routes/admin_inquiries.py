"""
Admin Inquiries Router — Phase 03

Provides authenticated admin endpoints for managing website-generated enquiries
stored in the contact_submissions collection.

Inquiry Status Workflow:
    new → contacted → qualified → converted → closed

Source taxonomy (V1, extensible):
    website_contact  — Contact page form (Phase 01)
    (future: calcom_meeting, newsletter_lead, etc.)

All endpoints require a valid admin session cookie via get_current_admin.
"""

import logging
import re
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from backend.core.auth import get_current_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/inquiries", tags=["Admin Inquiries"])

VALID_STATUSES = {"new", "contacted", "qualified", "converted", "closed"}


# ---------- DB dependency ----------

def get_db() -> AsyncIOMotorDatabase:
    from backend.server import db
    return db


# ---------- Pydantic models ----------

class InquiryStatusUpdate(BaseModel):
    status: str


class InquiryNotesUpdate(BaseModel):
    notes: Optional[str] = None


# ---------- Helpers ----------

def _normalise_doc(doc: dict) -> dict:
    """
    Ensures all required fields have sensible defaults for documents
    created before Phase 03 (which lacked source/status/notes).
    """
    doc.pop("_id", None)
    # Backward compat defaults
    if not doc.get("source"):
        doc["source"] = "website_contact"
    if not doc.get("status"):
        doc["status"] = "new"
    # Normalise created_at to ISO string for consistent serialisation
    ca = doc.get("created_at")
    if isinstance(ca, datetime):
        doc["created_at"] = ca.isoformat()
    return doc


# ---------- Endpoints ----------

@router.get("/stats", dependencies=[Depends(get_current_admin)])
async def get_inquiry_stats(db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Returns total count and per-status breakdown of all enquiries.
    Treats missing/null status as 'new' for aggregate purposes.
    """
    total = await db.contact_submissions.count_documents({})

    # Count per explicit status value
    status_counts = {}
    for s in VALID_STATUSES:
        status_counts[s] = await db.contact_submissions.count_documents({"status": s})

    # Documents with no status field (legacy) → counted as 'new'
    no_status = await db.contact_submissions.count_documents(
        {"$or": [{"status": {"$exists": False}}, {"status": None}, {"status": ""}]}
    )
    status_counts["new"] = status_counts.get("new", 0) + no_status

    return {
        "total": total,
        "by_status": status_counts,
    }


@router.get("", dependencies=[Depends(get_current_admin)])
async def list_inquiries(
    q: Optional[str] = Query(None, description="Search name, email, or company"),
    status: Optional[str] = Query(None, description="Filter by status"),
    source: Optional[str] = Query(None, description="Filter by source"),
    limit: int = Query(50, le=200),
    skip: int = Query(0),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    List enquiries with optional search and filter.
    Documents lacking a status field are treated as 'new'.
    """
    filter_query: dict = {}

    if status:
        if status not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status. Valid: {sorted(VALID_STATUSES)}")
        if status == "new":
            # Include legacy docs that have no status field
            filter_query["$or"] = [
                {"status": "new"},
                {"status": {"$exists": False}},
                {"status": None},
                {"status": ""},
            ]
        else:
            filter_query["status"] = status

    if source:
        filter_query["source"] = source

    if q and q.strip():
        term = q.strip()
        regex = {"$regex": re.escape(term), "$options": "i"}
        search_clause = {"$or": [{"name": regex}, {"email": regex}, {"company": regex}]}
        if "$or" in filter_query:
            # Combine existing $or (status) with search via $and
            filter_query = {"$and": [filter_query, search_clause]}
        else:
            filter_query.update(search_clause)

    docs = (
        await db.contact_submissions.find(filter_query, {"_id": 0})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )

    return [_normalise_doc(d) for d in docs]


@router.get("/{inquiry_id}", dependencies=[Depends(get_current_admin)])
async def get_inquiry(inquiry_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Retrieve a single enquiry by its id field.
    """
    doc = await db.contact_submissions.find_one({"id": inquiry_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    return _normalise_doc(doc)


@router.patch("/{inquiry_id}/status", dependencies=[Depends(get_current_admin)])
async def update_inquiry_status(
    inquiry_id: str,
    payload: InquiryStatusUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Update the status of a single enquiry. Persists immediately.
    """
    new_status = payload.status.strip().lower()
    if new_status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{new_status}'. Valid values: {sorted(VALID_STATUSES)}",
        )

    result = await db.contact_submissions.update_one(
        {"id": inquiry_id},
        {"$set": {"status": new_status, "status_updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Inquiry not found")

    doc = await db.contact_submissions.find_one({"id": inquiry_id}, {"_id": 0})
    return _normalise_doc(doc)


@router.patch("/{inquiry_id}/notes", dependencies=[Depends(get_current_admin)])
async def update_inquiry_notes(
    inquiry_id: str,
    payload: InquiryNotesUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Update admin notes on an enquiry. Notes are internal only.
    """
    result = await db.contact_submissions.update_one(
        {"id": inquiry_id},
        {"$set": {"notes": payload.notes}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Inquiry not found")

    doc = await db.contact_submissions.find_one({"id": inquiry_id}, {"_id": 0})
    return _normalise_doc(doc)
