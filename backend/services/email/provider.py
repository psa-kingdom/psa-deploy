import asyncio
import logging
import re
import time
import uuid
from typing import Optional, Dict, Any, List
import resend
from backend.core.config import settings
from backend.models.email import EmailAttempt

logger = logging.getLogger(__name__)

if settings.RESEND_API_KEY:
    resend.api_key = settings.RESEND_API_KEY


def sanitize_tags(tags: Optional[List[Dict[str, str]]]) -> List[Dict[str, str]]:
    """
    Sanitizes Resend outgoing email tags.
    - Limits to max 10 tags.
    - Enforces ASCII alphanumeric, dash, and underscore keys (max 256 chars).
    - Enforces max 256 chars for values.
    - SCRUBS PII: Drops tags containing email addresses, @ symbols, or phone number patterns.
    """
    if not tags:
        return []
    cleaned = []
    pii_patterns = [
        re.compile(r"@", re.IGNORECASE),
        re.compile(r"\b\d{10,16}\b"),
        re.compile(r"\+?\d{1,3}[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}"),
    ]
    tag_name_pattern = re.compile(r"^[a-zA-Z0-9_-]+$")

    for t in tags[:10]:
        if not isinstance(t, dict):
            continue
        name = str(t.get("name", "")).strip()[:256]
        value = str(t.get("value", "")).strip()[:256]

        if not name or not tag_name_pattern.match(name):
            continue

        # Check for PII in value
        if any(pat.search(value) for pat in pii_patterns):
            logger.warning("[TAG SANITIZER] Stripped tag '%s' containing potential PII", name)
            continue

        cleaned.append({"name": name, "value": value})
    return cleaned


def clean_email_list(emails: Optional[List[str]]) -> List[str]:
    """Validates and cleans a list of email addresses."""
    if not emails:
        return []
    cleaned = []
    for e in emails:
        if not e or not isinstance(e, str):
            continue
        clean = re.sub(r"[\r\n]+", "", e).strip().lower()
        if "@" in clean and "." in clean and len(clean) >= 5:
            cleaned.append(clean)
    # Deduplicate while preserving order, max 5
    seen = set()
    result = []
    for em in cleaned:
        if em not in seen:
            seen.add(em)
            result.append(em)
    return result[:5]


async def send_email_via_provider(
    to: str,
    subject: str,
    html: str,
    text: Optional[str] = None,
    sender: Optional[str] = None,
    reply_to: Optional[str] = None,
    cc: Optional[List[str]] = None,
    bcc: Optional[List[str]] = None,
    tags: Optional[List[Dict[str, str]]] = None,
    campaign_id: Optional[str] = None,
    job_id: Optional[str] = None,
    db: Optional[Any] = None,
    _test_recipient_override: Optional[str] = None,
    is_production_dispatch: bool = False,
    idempotency_key: Optional[str] = None,
    job_type: Optional[str] = None,
    transactional_type: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Core resilient email sender.
    1. Unless is_production_dispatch is True, enforces final safety guard against real recipient delivery.
    2. Enforces CC/BCC safety: in test mode, blocks/drops CC/BCC targets not matching the test recipient.
    3. Scrubs PII from tags.
    4. Sends via Resend (or Mock provider if RESEND_API_KEY is not set).
    5. Records attempt in email_attempts collection.
    """
    clean_to = to.strip().lower()
    from_email = sender or settings.RESEND_FROM_EMAIL
    reply_to_email = reply_to or settings.RESEND_REPLY_TO
    clean_cc = clean_email_list(cc)
    clean_bcc = clean_email_list(bcc)
    sanitized_tags = sanitize_tags(tags)

    # ---------- Final Safety Guard (for test sends and non-production dispatches) ----------
    # If this is NOT an authorized production dispatch, enforce delivery strictly to the test recipient.
    if not is_production_dispatch and settings.RESEND_API_KEY:
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
                "to=%s, test_recipient=%s, is_production_dispatch=%s",
                clean_to, test_recipient, is_production_dispatch
            )
            attempt_record_data = {
                "job_id": job_id,
                "campaign_id": campaign_id,
                "job_type": job_type,
                "transactional_type": transactional_type,
                "subject": subject,
                "recipient_email": clean_to,
                "provider": "blocked_safety_guard",
                "resend_id": None,
                "status": "blocked_test_mode",
                "status_code": None,
                "response_time_ms": 0,
                "tags": sanitized_tags,
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

        # In non-production dispatch, ensure CC/BCC does not send to third parties
        clean_cc = [e for e in clean_cc if e == test_recipient]
        clean_bcc = [e for e in clean_bcc if e == test_recipient]

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
            resend.api_key = settings.RESEND_API_KEY
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
            if clean_cc:
                params["cc"] = clean_cc
            if clean_bcc:
                params["bcc"] = clean_bcc
            if sanitized_tags:
                params["tags"] = sanitized_tags

            # Call Resend SDK with native Idempotency-Key support if key is provided
            if idempotency_key:
                options = {"idempotency_key": str(idempotency_key)}
                response = await asyncio.to_thread(resend.Emails.send, params, options)
            else:
                response = await asyncio.to_thread(resend.Emails.send, params)

            if isinstance(response, dict):
                resend_id = response.get("id")
            elif hasattr(response, "id"):
                resend_id = getattr(response, "id")
            elif hasattr(response, "__getitem__"):
                try:
                    resend_id = response["id"]
                except Exception:
                    resend_id = str(response)
            else:
                resend_id = str(response)

            status = "sent"
            status_code = 200
        else:
            # Mock Provider — no real emails sent. Used when RESEND_API_KEY is absent.
            await asyncio.sleep(0.05)  # Simulate network latency
            resend_id = f"mock_re_{uuid.uuid4().hex[:16]}"
            status = "sent"
            status_code = 200
            logger.info(
                "[MOCK EMAIL SENT] To: %s | CC: %s | BCC: %s | Tags: %s | Subject: %s | MockID: %s",
                clean_to, clean_cc, clean_bcc, sanitized_tags, subject, resend_id
            )

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
            job_type=job_type,
            transactional_type=transactional_type,
            subject=subject,
            recipient_email=clean_to,
            provider="resend" if settings.RESEND_API_KEY else "mock",
            resend_id=resend_id,
            status=status,
            status_code=status_code,
            response_time_ms=elapsed_ms,
            tags=sanitized_tags,
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
