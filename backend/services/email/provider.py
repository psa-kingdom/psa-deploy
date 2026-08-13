import asyncio
import logging
import time
import uuid
from typing import Optional, Dict, Any
import resend
from backend.core.config import settings
from backend.models.email import EmailAttempt

logger = logging.getLogger(__name__)

if settings.RESEND_API_KEY:
    resend.api_key = settings.RESEND_API_KEY


async def send_email_via_provider(
    to: str,
    subject: str,
    html: str,
    text: Optional[str] = None,
    sender: Optional[str] = None,
    reply_to: Optional[str] = None,
    campaign_id: Optional[str] = None,
    job_id: Optional[str] = None,
    db: Optional[Any] = None,
) -> Dict[str, Any]:
    """
    Core resilient email sender.
    1. Sends via Resend (or Mock provider if RESEND_API_KEY is not set).
    2. Records attempt in email_attempts collection.

    Test recipient enforcement is handled upstream:
    - For test sends: admin_campaigns.py /test-send endpoint validates and substitutes the recipient.
    - For bulk campaigns: caller ensures recipient list is correct for the environment.

    In development/staging mode the mock provider is active by default (no real emails sent
    unless RESEND_API_KEY is explicitly configured).
    """
    clean_to = to.strip().lower()
    from_email = sender or settings.RESEND_FROM_EMAIL
    reply_to_email = reply_to or settings.RESEND_REPLY_TO

    if settings.EMAIL_ENVIRONMENT != "production":
        logger.info(
            "[%s MODE] Dispatching to: %s | Subject: %s",
            settings.EMAIL_ENVIRONMENT.upper(),
            clean_to,
            subject[:60],
        )

    start_time = time.time()
    resend_id = None
    status = "failed"
    status_code = None
    error_msg = None

    # --- Provider Dispatch ---
    try:
        if settings.RESEND_API_KEY and not settings.RESEND_API_KEY.startswith("mock"):
            params = {
                "from": from_email,
                "to": [clean_to],
                "subject": subject,
                "html": html,
            }
            if text:
                params["text"] = text
            if reply_to_email:
                params["reply_to"] = reply_to_email

            # Call Resend SDK in async threadpool
            response = await asyncio.to_thread(resend.Emails.send, params)
            resend_id = response.get("id") if isinstance(response, dict) else getattr(response, "id", str(response))
            status = "sent"
            status_code = 200
        else:
            # Mock Provider — no real emails sent
            await asyncio.sleep(0.05)  # Simulate network latency
            resend_id = f"mock_re_{uuid.uuid4().hex[:16]}"
            status = "sent"
            status_code = 200
            logger.info("[MOCK EMAIL SENT] To: %s | Subject: %s | MockID: %s", clean_to, subject, resend_id)

    except Exception as exc:
        status = "failed"
        error_msg = str(exc)
        logger.error("[EMAIL SEND ERROR] Failed sending to %s: %s", clean_to, exc, exc_info=True)

    elapsed_ms = int((time.time() - start_time) * 1000)

    # --- Record Attempt in Database ---
    if db is not None:
        attempt_record = EmailAttempt(
            job_id=job_id,
            campaign_id=campaign_id,
            recipient_email=clean_to,
            provider="resend" if settings.RESEND_API_KEY else "mock",
            resend_id=resend_id,
            status=status,
            status_code=status_code,
            response_time_ms=elapsed_ms,
            error_message=error_msg,
        )
        try:
            await db.email_attempts.insert_one(attempt_record.model_dump())
        except Exception as db_exc:
            logger.error("Failed to record email attempt in database: %s", db_exc)

    return {
        "success": status == "sent",
        "status": status,
        "resend_id": resend_id,
        "error": error_msg,
        "response_time_ms": elapsed_ms,
    }
