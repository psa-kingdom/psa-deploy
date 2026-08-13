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
    1. Checks environment & server-side test allowlist.
    2. Sends via Resend (or Mock if no key / test mode).
    3. Records attempt in email_attempts collection.
    """
    clean_to = to.strip().lower()
    from_email = sender or settings.RESEND_FROM_EMAIL
    reply_to_email = reply_to or settings.RESEND_REPLY_TO

    # --- Server-Side Safety Guard & Environment Isolation ---
    if settings.EMAIL_ENVIRONMENT != "production":
        allowlist = settings.test_allowlist_emails
        if clean_to not in allowlist:
            logger.warning(
                f"[SAFETY GUARD] Blocking email to {clean_to} because EMAIL_ENVIRONMENT={settings.EMAIL_ENVIRONMENT} "
                f"and recipient is not in allowlist: {allowlist}"
            )
            attempt_record = EmailAttempt(
                job_id=job_id,
                campaign_id=campaign_id,
                recipient_email=clean_to,
                provider="mock_guard",
                resend_id=None,
                status="skipped_allowlist",
                status_code=None,
                response_time_ms=0,
                error_message=f"Blocked by server allowlist in {settings.EMAIL_ENVIRONMENT} mode."
            )
            if db is not None:
                await db.email_attempts.insert_one(attempt_record.model_dump())
            return {
                "success": False,
                "status": "skipped_allowlist",
                "resend_id": None,
                "error": "Recipient blocked by server environment allowlist."
            }

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
            # Mock Provider for Local Dev / Testing
            await asyncio.sleep(0.05)  # Simulate network latency
            resend_id = f"mock_re_{uuid.uuid4().hex[:16]}"
            status = "sent"
            status_code = 200
            logger.info(f"[MOCK EMAIL SENT] To: {clean_to} | Subject: {subject} | MockID: {resend_id}")

    except Exception as exc:
        status = "failed"
        error_msg = str(exc)
        logger.error(f"[EMAIL SEND ERROR] Failed sending to {clean_to}: {exc}", exc_info=True)

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
            logger.error(f"Failed to record email attempt in database: {db_exc}")

    return {
        "success": status == "sent",
        "status": status,
        "resend_id": resend_id,
        "error": error_msg,
        "response_time_ms": elapsed_ms,
    }
