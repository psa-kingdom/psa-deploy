import json
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException, status, Header
from typing import Optional
from svix.webhooks import Webhook, WebhookVerificationError
from motor.motor_asyncio import AsyncIOMotorDatabase
from backend.core.config import settings
from backend.models.email import RecipientStatus, EmailSuppression

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

def get_db() -> AsyncIOMotorDatabase:
    from backend.server import db
    return db

@router.post("/resend")
async def handle_resend_webhook(
    request: Request,
    svix_id: Optional[str] = Header(None, alias="svix-id"),
    svix_timestamp: Optional[str] = Header(None, alias="svix-timestamp"),
    svix_signature: Optional[str] = Header(None, alias="svix-signature")
):
    """
    Receives and processes cryptographically verified Resend webhook events.
    """
    payload_bytes = await request.body()

    # Verify signature if secret is configured
    if settings.RESEND_WEBHOOK_SECRET:
        if not (svix_id and svix_timestamp and svix_signature):
            raise HTTPException(status_code=401, detail="Missing required Svix signature headers")
        try:
            wh = Webhook(settings.RESEND_WEBHOOK_SECRET)
            headers = {
                "svix-id": svix_id,
                "svix-timestamp": svix_timestamp,
                "svix-signature": svix_signature
            }
            wh.verify(payload_bytes, headers)
        except WebhookVerificationError as e:
            logger.warning(f"Resend webhook signature verification failed: {e}")
            raise HTTPException(status_code=401, detail="Invalid webhook signature")
    else:
        logger.info("RESEND_WEBHOOK_SECRET not configured; accepting webhook payload in unverified mode.")

    try:
        event = json.loads(payload_bytes.decode("utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid JSON payload: {exc}")

    event_id = event.get("id") or svix_id
    event_type = event.get("type")
    data = event.get("data", {})
    email_id = data.get("email_id")
    recipient_email = (data.get("to") or [""])[0] if isinstance(data.get("to"), list) else data.get("to")

    from backend.server import db

    # Idempotency check on webhook event
    if event_id:
        existing_event = await db.webhook_events.find_one({"event_id": event_id})
        if existing_event:
            return {"status": "ignored", "reason": "duplicate_event"}
        await db.webhook_events.insert_one({
            "event_id": event_id,
            "event_type": event_type,
            "payload": event,
            "processed_at": datetime.now(timezone.utc)
        })

    now = datetime.now(timezone.utc)

    # Process status transition
    if event_type == "email.delivered":
        if email_id:
            await db.campaign_recipients.update_one(
                {"resend_message_id": email_id},
                {"$set": {"status": RecipientStatus.DELIVERED.value, "delivered_at": now}}
            )
    elif event_type in ("email.bounced", "email.complained"):
        reason = "bounce" if event_type == "email.bounced" else "complaint"
        if email_id:
            await db.campaign_recipients.update_one(
                {"resend_message_id": email_id},
                {"$set": {"status": RecipientStatus.BOUNCED.value}}
            )
        # Register in suppressions
        if recipient_email:
            clean_email = recipient_email.strip().lower()
            existing_sup = await db.email_suppressions.find_one({"email": clean_email})
            if not existing_sup:
                supp = EmailSuppression(email=clean_email, reason=reason, created_at=now)
                await db.email_suppressions.insert_one(supp.model_dump())

    return {"status": "processed", "event_type": event_type}
