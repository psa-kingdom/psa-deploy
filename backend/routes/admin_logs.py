from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from backend.core.auth import get_current_admin
from backend.models.email import EmailAttempt

router = APIRouter(prefix="/admin/communication/logs", tags=["Admin Logs"])

def get_db() -> AsyncIOMotorDatabase:
    from backend.server import db
    return db

@router.get("", response_model=List[EmailAttempt], dependencies=[Depends(get_current_admin)])
async def list_email_attempts(
    campaign_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    recipient: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    skip: int = Query(0),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Search and paginate historical email attempts.
    """
    filter_query = {}
    if campaign_id:
        filter_query["campaign_id"] = campaign_id
    if status:
        filter_query["status"] = status
    if recipient:
        filter_query["recipient_email"] = {"$regex": recipient.strip().lower(), "$options": "i"}

    logs = await db.email_attempts.find(
        filter_query,
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    return [EmailAttempt(**l) for l in logs]

@router.get("/stats", dependencies=[Depends(get_current_admin)])
async def get_email_stats(db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Aggregates real, evidence-backed email delivery stats.
    """
    total_attempts = await db.email_attempts.count_documents({})
    sent_count = await db.email_attempts.count_documents({"status": "sent"})
    failed_count = await db.email_attempts.count_documents({"status": "failed"})
    skipped_count = await db.email_attempts.count_documents({"status": "skipped_allowlist"})
    suppressed_count = await db.email_suppressions.count_documents({})
    total_campaigns = await db.email_campaigns.count_documents({})

    return {
        "total_attempts": total_attempts,
        "sent_count": sent_count,
        "failed_count": failed_count,
        "skipped_count": skipped_count,
        "suppressed_count": suppressed_count,
        "total_campaigns": total_campaigns
    }
