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
    _test_recipient_override: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Core resilient email sender.
    1. In non-production mode, enforces final safety guard against real recipient delivery.
    2. Sends via Resend (or Mock provider if RESEND_API_KEY is not set).
    3. Records attempt in email_attempts collection.

    Defense layers (test mode):
    - Layer 1: Campaign confirm blocked in admin_campaigns.py (prevents outbox job creation)
    - Layer 2: provider.py final guard — if a real RESEND_API_KEY is present and
               EMAIL_ENVIRONMENT != production, block any delivery to addresses that
               don't match the configured test recipient.

    The _test_recipient_override parameter allows the test-send endpoint to pass
    the pre-validated test recipient so the final guard is coherent.
    """
    clean_to = to.strip().lower()
    from_email = sender or settings.RESEND_FROM_EMAIL
    reply_to_email = reply_to or settings.RESEND_REPLY_TO

    # ---------- Final Safety Guard (non-production) ----------
    # Only applies when a real API key is configured. Without a key, the mock
    # provider activates, so no real emails can leave regardless.
    if settings.EMAIL_ENVIRONMENT != "production" and settings.RESEND_API_KEY:
        # Determine the configured test recipient
        if _test_recipient_override:
            test_recipient = _test_recipient_override.strip().lower()
        elif db is not None:
            # Lazy import to avoid circular dependency
            from backend.routes.admin_campaigns import _get_test_recipient
            test_recipient = await _get_test_recipient(db)
        else:
            test_recipient = settings.EMAIL_TEST_RECIPIENT.strip().lower()

        if clean_to != test_recipient:
            logger.error(
                "[FINAL SAFETY GUARD] BLOCKED non-test-recipient delivery. "
                "to=%s, test_recipient=%s, env=%s",
                clean_to, test_recipient, settings.EMAIL_ENVIRONMENT
            )
            attempt_record_data = {
                "job_id": job_id,
                "campaign_id": campaign_id,
                "recipient_email": clean_to,
                "provider": "blocked_safety_guard",
                "resend_id": None,
                "status": "blocked_test_mode",
                "status_code": None,
                "response_time_ms": 0,
                "error_message": f"Blocked by test mode safety guard. Only {test_recipient} may receive email in {settings.EMAIL_ENVIRONMENT} mode.",
            }
            if db is not None:
                try:
                    await db.email_attempts.insert_one(attempt_record_data)
                except Exception:
                    pass
            return {
                "success": False,
                "status": "blocked_test_mode",
                "resend_id": None,
                "error": f"Blocked by test mode safety guard. Only {test_recipient} may receive email in {settings.EMAIL_ENVIRONMENT} mode.",
                "response_time_ms": 0,
            }

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

    # ---------- Provider Dispatch ----------
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
            # Mock Provider — no real emails sent. Used when RESEND_API_KEY is absent.
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

    # ---------- Record Attempt in Database ----------
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
