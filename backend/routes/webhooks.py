import json
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException, status, Header, Depends
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
    svix_signature: Optional[str] = Header(None, alias="svix-signature"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Receives and processes cryptographically verified Resend webhook events.
    Fails closed in production if RESEND_WEBHOOK_SECRET is unconfigured.
    """
    payload_bytes = await request.body()
    is_production = settings.EMAIL_ENVIRONMENT == "production"

    # Verify signature
    if settings.RESEND_WEBHOOK_SECRET:
        if not (svix_id and svix_timestamp and svix_signature):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing required Svix signature headers"
            )
        try:
            wh = Webhook(settings.RESEND_WEBHOOK_SECRET)
            headers = {
                "svix-id": svix_id,
                "svix-timestamp": svix_timestamp,
                "svix-signature": svix_signature
            }
            wh.verify(payload_bytes, headers)
        except (WebhookVerificationError, Exception) as e:
            logger.warning("Resend webhook signature verification failed: %s", e)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook signature"
            )

    elif is_production:
        # Strict security constraint: fail closed in production when secret is absent
        logger.error(
            "[SECURITY] RESEND_WEBHOOK_SECRET is not configured in production. "
            "Rejecting webhook processing to prevent unverified event ingestion."
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook signature verification secret is not configured on the server."
        )
    else:
        logger.info(
            "RESEND_WEBHOOK_SECRET not configured; accepting webhook payload in unverified mode "
            "(development/test mode only)."
        )

    try:
        event = json.loads(payload_bytes.decode("utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid JSON payload: {exc}")

    # Canonical delivery identity: prefer Svix delivery message identifier from header, fallback to payload event ID
    event_id = svix_id or event.get("id")
    event_type = event.get("type")
    data = event.get("data", {})
    email_id = data.get("email_id")
    recipient_email = (data.get("to") or [""])[0] if isinstance(data.get("to"), list) else data.get("to")

    # Idempotency check on webhook event
    if event_id:
        existing_event = await db.webhook_events.find_one({"event_id": event_id})
        if existing_event:
            logger.info("Ignoring duplicate webhook event: %s", event_id)
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
        # Register in suppressions idempotently
        if recipient_email:
            clean_email = recipient_email.strip().lower()
            existing_sup = await db.email_suppressions.find_one({"email": clean_email})
            if not existing_sup:
                supp = EmailSuppression(email=clean_email, reason=reason, created_at=now)
                await db.email_suppressions.insert_one(supp.model_dump())

    return {"status": "processed", "event_type": event_type}

