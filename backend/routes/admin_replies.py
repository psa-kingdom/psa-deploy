import asyncio
import logging
import re
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
import resend

from backend.core.auth import get_current_admin
from backend.core.config import settings
from backend.models.email import EmailReply, EmailReplyCreate, get_utc_now
from backend.routes.webhooks import normalize_subject

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/communication/replies", tags=["Admin Email Replies"])


def get_db(request: Request) -> AsyncIOMotorDatabase:
    if hasattr(request.app.state, "db") and request.app.state.db is not None:
        return request.app.state.db
    try:
        from backend.server import db
        return db
    except Exception:
        pass
    try:
        from server import db
        return db
    except Exception:
        pass
    return None


def _format_datetime_utc(val):
    """Ensures datetime objects and ISO strings are serialized with explicit UTC timezone."""
    if val is None:
        return None
    if isinstance(val, datetime):
        if val.tzinfo is None:
            val = val.replace(tzinfo=timezone.utc)
        return val.isoformat()
    if isinstance(val, str) and val.strip():
        s = val.strip()
        if not s.endswith("Z") and "+" not in s and "-" not in s[10:]:
            return s + "Z"
        return s
    return val


def _serialize_reply(doc: Optional[dict]) -> Optional[dict]:
    if not doc:
        return doc
    clean = dict(doc)
    clean.pop("_id", None)
    if "received_at" in clean:
        clean["received_at"] = _format_datetime_utc(clean.get("received_at"))
    return clean


@router.get("/stats", dependencies=[Depends(get_current_admin)])
async def get_replies_stats(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Returns aggregated stats on email replies received:
    - Total reply count
    - Unique subjects count
    - Breakdown grouped by email subject
    - Most recent replies feed
    """
    if db is None:
        return {
            "total_replies": 0,
            "unique_subjects_count": 0,
            "by_subject": [],
            "recent_replies": []
        }

    try:
        total_replies = await db.email_replies.count_documents({})

        # Aggregation by clean_subject
        pipeline = [
            {
                "$group": {
                    "_id": "$clean_subject",
                    "clean_subject": {"$first": "$clean_subject"},
                    "sample_raw_subject": {"$first": "$subject"},
                    "reply_count": {"$sum": 1},
                    "latest_reply_at": {"$max": "$received_at"},
                    "first_reply_at": {"$min": "$received_at"},
                    "senders": {"$addToSet": "$sender_email"},
                    "campaign_id": {"$first": "$campaign_id"},
                    "campaign_title": {"$first": "$campaign_title"},
                }
            },
            {"$sort": {"reply_count": -1, "latest_reply_at": -1}},
            {"$limit": 100}
        ]

        by_subject_docs = await db.email_replies.aggregate(pipeline).to_list(100)

        # Clean documents for JSON serialization
        by_subject = []
        for doc in by_subject_docs:
            clean_sub = doc.get("clean_subject") or doc.get("_id") or "No Subject"
            # Filter None and limit senders sample to max 8
            raw_senders = doc.get("senders") or []
            senders = [s for s in raw_senders if s][:8]
            by_subject.append({
                "clean_subject": clean_sub,
                "sample_raw_subject": doc.get("sample_raw_subject") or clean_sub,
                "reply_count": doc.get("reply_count", 0),
                "latest_reply_at": _format_datetime_utc(doc.get("latest_reply_at")),
                "first_reply_at": _format_datetime_utc(doc.get("first_reply_at")),
                "senders": senders,
                "unique_senders_count": len(senders),
                "campaign_id": doc.get("campaign_id"),
                "campaign_title": doc.get("campaign_title"),
            })

        # Recent 15 replies across all subjects
        recent_docs = await db.email_replies.find(
            {}, {"_id": 0}
        ).sort("received_at", -1).limit(15).to_list(15)

        return {
            "total_replies": total_replies,
            "unique_subjects_count": len(by_subject),
            "by_subject": by_subject,
            "recent_replies": [_serialize_reply(d) for d in recent_docs]
        }
    except Exception as e:
        logger.error("Error generating email replies stats: %s", e, exc_info=True)
        return {
            "total_replies": 0,
            "unique_subjects_count": 0,
            "by_subject": [],
            "recent_replies": []
        }


@router.get("", dependencies=[Depends(get_current_admin)])
async def list_replies(
    request: Request,
    subject: Optional[str] = Query(None, description="Filter by subject or clean subject"),
    sender: Optional[str] = Query(None, description="Filter by sender email"),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Lists individual replies received, optionally filtered by subject or sender."""
    if db is None:
        return {"replies": []}

    query = {}
    if subject:
        clean = normalize_subject(subject)
        query["$or"] = [
            {"clean_subject": {"$regex": f"^{re.escape(clean)}$", "$options": "i"}},
            {"subject": {"$regex": re.escape(subject), "$options": "i"}}
        ]
    if sender:
        query["sender_email"] = {"$regex": re.escape(sender.strip()), "$options": "i"}

    items = await db.email_replies.find(query, {"_id": 0}).sort("received_at", -1).limit(limit).to_list(limit)
    return {"replies": [_serialize_reply(d) for d in items]}


@router.post("", dependencies=[Depends(get_current_admin)])
async def create_manual_or_test_reply(
    payload: EmailReplyCreate,
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Logs or simulates an incoming email reply.
    Useful for testing the dashboard or recording replies tracked through custom channels.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")

    raw_subject = payload.subject.strip()
    clean_subj = normalize_subject(raw_subject)

    # Check for matched campaign
    campaign_id = payload.campaign_id
    campaign_title = None

    if not campaign_id and clean_subj:
        campaign = await db.email_campaigns.find_one({
            "subject": {"$regex": f"^{re.escape(clean_subj)}$", "$options": "i"}
        })
        if campaign:
            campaign_id = campaign.get("campaign_id")
            campaign_title = campaign.get("title")
    elif campaign_id:
        campaign = await db.email_campaigns.find_one({"campaign_id": campaign_id})
        if campaign:
            campaign_title = campaign.get("title")

    reply = EmailReply(
        sender_email=payload.sender_email.strip().lower(),
        sender_name=payload.sender_name,
        recipient_email=payload.recipient_email or "contact@psumanassociates.com",
        subject=raw_subject,
        clean_subject=clean_subj,
        campaign_id=campaign_id,
        campaign_title=campaign_title,
        snippet=payload.snippet or "",
        received_at=get_utc_now(),
        source="simulation" if not payload.campaign_id else "manual"
    )

    await db.email_replies.insert_one(reply.model_dump())
    return {"success": True, "reply": reply.model_dump()}


@router.post("/sync", dependencies=[Depends(get_current_admin)])
async def sync_replies_from_resend(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Directly pulls inbound received emails from Resend Receiving API
    (resend.Emails.Receiving.list()) and idempotently ingests them into MongoDB.
    This provides an instant manual/automated sync without requiring public webhooks.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")

    if not settings.RESEND_API_KEY:
        raise HTTPException(
            status_code=400,
            detail="RESEND_API_KEY is not configured on the server."
        )

    resend.api_key = settings.RESEND_API_KEY

    try:
        # Fetch remote list from Resend Receiving API
        response = await asyncio.to_thread(resend.Emails.Receiving.list)
        remote_items = response.get("data", []) if isinstance(response, dict) else getattr(response, "data", [])
    except Exception as exc:
        logger.error("Failed to query Resend Receiving API: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=502,
            detail=f"Failed to communicate with Resend Receiving API: {exc}"
        )

    synced_count = 0
    already_existing_count = 0

    for item in remote_items:
        # Item may be dict, Pydantic model, or class instance
        item_dict = item if isinstance(item, dict) else (item.__dict__ if hasattr(item, "__dict__") else {})
        email_id = item_dict.get("id") or getattr(item, "id", None) or item_dict.get("email_id") or getattr(item, "email_id", None)
        if not email_id:
            continue

        raw_subject = item_dict.get("subject") or getattr(item, "subject", "No Subject") or "No Subject"
        clean_subj = normalize_subject(raw_subject)

        sender_raw = item_dict.get("from") or getattr(item, "from", "") or getattr(item, "from_address", "") or ""
        sender_name = None
        sender_email = str(sender_raw).strip()
        if "<" in sender_raw and ">" in sender_raw:
            match = re.match(r"^(.*?)\s*<([^>]+)>", sender_raw)
            if match:
                sender_name = match.group(1).strip().strip('"')
                sender_email = match.group(2).strip()

        to_val = item_dict.get("to") or getattr(item, "to", None) or []
        if isinstance(to_val, list) and to_val:
            recipient_email = to_val[0]
        elif isinstance(to_val, str) and to_val:
            recipient_email = to_val
        else:
            recipient_email = "contact@psumanassociates.com"

        # Check existing record
        existing = await db.email_replies.find_one({"email_id": email_id})

        # Fetch detail snippet / body if missing
        snippet = existing.get("snippet", "") if existing else ""
        body_text = existing.get("body_text", "") if existing else ""
        body_html = existing.get("body_html", "") if existing else ""

        if not body_text and not body_html and not snippet:
            try:
                full_detail = await asyncio.to_thread(resend.Emails.Receiving.get, email_id)
                full_dict = full_detail if isinstance(full_detail, dict) else (full_detail.__dict__ if hasattr(full_detail, "__dict__") else {})
                body_text = full_dict.get("text") or getattr(full_detail, "text", "") or ""
                body_html = full_dict.get("html") or getattr(full_detail, "html", "") or ""
                raw_text = body_text or body_html or ""
                clean_text = re.sub(r"<[^>]+>", " ", raw_text)
                clean_text = re.sub(r"\s+", " ", clean_text).strip()
                snippet = clean_text[:297] + ("..." if len(clean_text) > 297 else "")
            except Exception as e:
                logger.warning("Could not fetch detail for email_id %s: %s", email_id, e)

        # Parse date
        received_at = get_utc_now()
        created_str = item_dict.get("created_at") or getattr(item, "created_at", None)
        if created_str:
            try:
                received_at = datetime.fromisoformat(str(created_str).replace("Z", "+00:00"))
            except Exception:
                pass
        elif existing and existing.get("received_at"):
            received_at = existing.get("received_at")

        # Attempt to match to an existing campaign
        campaign_id = existing.get("campaign_id") if existing else None
        campaign_title = existing.get("campaign_title") if existing else None
        if not campaign_id and clean_subj:
            campaign = await db.email_campaigns.find_one({
                "subject": {"$regex": f"^{re.escape(clean_subj)}$", "$options": "i"}
            })
            if campaign:
                campaign_id = campaign.get("campaign_id")
                campaign_title = campaign.get("title")

        reply_record = EmailReply(
            email_id=email_id,
            sender_email=sender_email.lower().strip() if sender_email else "unknown",
            sender_name=sender_name,
            recipient_email=recipient_email,
            subject=raw_subject,
            clean_subject=clean_subj,
            campaign_id=campaign_id,
            campaign_title=campaign_title,
            snippet=snippet,
            body_text=body_text,
            body_html=body_html,
            received_at=received_at,
            source="resend_sync"
        )
        
        doc_data = reply_record.model_dump()
        if existing and existing.get("reply_id"):
            doc_data["reply_id"] = existing["reply_id"]

        await db.email_replies.update_one(
            {"email_id": email_id},
            {"$set": doc_data},
            upsert=True
        )
        if existing:
            already_existing_count += 1
        else:
            synced_count += 1
        logger.info(
            "[SYNC INGESTED] ID: %s | From: %s | Subj: %s",
            email_id, sender_email, clean_subj
        )

    return {
        "success": True,
        "synced_count": synced_count,
        "already_existing_count": already_existing_count,
        "total_remote_received": len(remote_items),
        "message": (
            f"Successfully synced {synced_count} new replies from Resend."
            if synced_count > 0
            else (
                "Resend Receiving mailbox is currently empty. Incoming replies sent to "
                "updates@updates.psumanassociates.com will appear here once received."
                if len(remote_items) == 0
                else f"All {len(remote_items)} remote emails are already up-to-date in database."
            )
        )
    }


@router.get("/{reply_id}/content", dependencies=[Depends(get_current_admin)])
async def get_reply_content(
    reply_id: str,
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Fetches the full message body for an email reply.
    If not already stored in DB, queries Resend Receiving API on demand.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")

    reply = await db.email_replies.find_one({"reply_id": reply_id})
    if not reply:
        raise HTTPException(status_code=404, detail="Reply not found")

    body_text = reply.get("body_text") or ""
    body_html = reply.get("body_html") or ""
    email_id = reply.get("email_id")

    # If body is missing but we have an email_id from Resend, fetch on demand
    if not body_text and not body_html and email_id and settings.RESEND_API_KEY:
        try:
            resend.api_key = settings.RESEND_API_KEY
            full_detail = await asyncio.to_thread(resend.Emails.Receiving.get, email_id)
            full_dict = full_detail if isinstance(full_detail, dict) else (full_detail.__dict__ if hasattr(full_detail, "__dict__") else {})
            body_text = full_dict.get("text") or getattr(full_detail, "text", "") or ""
            body_html = full_dict.get("html") or getattr(full_detail, "html", "") or ""
            
            # Compute updated snippet if missing
            raw_text = body_text or body_html or ""
            clean_text = re.sub(r"<[^>]+>", " ", raw_text)
            clean_text = re.sub(r"\s+", " ", clean_text).strip()
            snippet = clean_text[:297] + ("..." if len(clean_text) > 297 else "")

            # Persist back to MongoDB
            update_fields = {
                "body_text": body_text,
                "body_html": body_html,
            }
            if snippet and not reply.get("snippet"):
                update_fields["snippet"] = snippet

            await db.email_replies.update_one(
                {"reply_id": reply_id},
                {"$set": update_fields}
            )
        except Exception as exc:
            logger.warning("Failed on-demand fetch from Resend for %s: %s", email_id, exc)

    return {
        "reply_id": reply_id,
        "email_id": email_id,
        "sender_email": reply.get("sender_email"),
        "sender_name": reply.get("sender_name"),
        "recipient_email": reply.get("recipient_email"),
        "subject": reply.get("subject"),
        "received_at": _format_datetime_utc(reply.get("received_at")),
        "snippet": reply.get("snippet"),
        "body_text": body_text,
        "body_html": body_html,
    }


@router.delete("/{reply_id}", dependencies=[Depends(get_current_admin)])
async def delete_reply(
    reply_id: str,
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Deletes a reply record by ID."""
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")

    result = await db.email_replies.delete_one({"reply_id": reply_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reply record not found")

    return {"success": True, "message": "Reply deleted"}
