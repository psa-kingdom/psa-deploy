from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from backend.core.auth import get_current_admin
from backend.core.config import settings
from backend.models.email import (
    CampaignCreate,
    CampaignConfirm,
    EmailCampaign,
    CampaignRecipient,
    OutboxJob,
    TargetFilter,
    AudienceEstimateResponse,
    FileImportResponse,
    TestSendRequest,
    CampaignStatus,
    OutboxJobStatus,
    RecipientStatus,
    generate_uuid,
    get_utc_now
)
from backend.services.email.audience import (
    extract_and_deduplicate_audience,
    get_suppressed_emails,
    parse_recipient_file,
    clean_email_token
)
from backend.services.email.renderer import render_base_layout, interpolate_variables, html_to_plain_text
from backend.services.email.provider import send_email_via_provider
import re
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/communication", tags=["Admin Campaigns"])

# ---------- Helpers ----------

_EMAIL_REGEX = re.compile(r"^[\w\.\+\-]+@[a-zA-Z0-9\.\-]+\.[a-zA-Z]{2,}$")

def _normalize_email(raw: str) -> str:
    return raw.strip().lower()

def _is_valid_email(email: str) -> bool:
    return bool(_EMAIL_REGEX.match(email))

def get_db() -> AsyncIOMotorDatabase:
    from backend.server import db
    return db


# ---------- Admin Settings (test recipient) ----------

class AdminSettingsUpdate(BaseModel):
    test_recipient: str


async def _get_test_recipient(db: AsyncIOMotorDatabase) -> str:
    """
    Returns the configured test recipient email.

    Priority:
    1. admin_settings collection in DB (set via admin UI)
    2. EMAIL_TEST_RECIPIENT env var
    3. empty string (caller must handle)
    """
    doc = await db.admin_settings.find_one({"key": "test_recipient"}, {"_id": 0})
    if doc and doc.get("value"):
        return _normalize_email(doc["value"])
    if settings.EMAIL_TEST_RECIPIENT:
        return _normalize_email(settings.EMAIL_TEST_RECIPIENT)
    return ""


@router.get("/settings", dependencies=[Depends(get_current_admin)])
async def get_admin_settings(db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Returns current admin communication settings.
    Currently: test_recipient email.
    """
    test_recipient = await _get_test_recipient(db)
    return {
        "test_recipient": test_recipient,
    }


@router.put("/settings", dependencies=[Depends(get_current_admin)])
async def update_admin_settings(
    payload: AdminSettingsUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Updates admin communication settings (test_recipient).
    Validates and normalizes the email address server-side.
    """
    raw = payload.test_recipient.strip()
    if not raw:
        # Allow clearing the test recipient
        await db.admin_settings.update_one(
            {"key": "test_recipient"},
            {"$set": {"key": "test_recipient", "value": "", "updated_at": get_utc_now()}},
            upsert=True
        )
        return {"test_recipient": ""}

    normalized = _normalize_email(raw)
    if not _is_valid_email(normalized):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid email address: '{raw}'. Please enter a valid email."
        )

    await db.admin_settings.update_one(
        {"key": "test_recipient"},
        {"$set": {"key": "test_recipient", "value": normalized, "updated_at": get_utc_now()}},
        upsert=True
    )
    logger.info("Test recipient updated to: %s", normalized)
    return {"test_recipient": normalized}


# ---------- Environment ----------

@router.get("/campaigns/environment", dependencies=[Depends(get_current_admin)])
async def get_email_environment(db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Returns the current email environment and test recipient configuration.
    Used by the frontend to display the environment banner and test mode UI.
    """
    test_recipient = await _get_test_recipient(db)
    return {
        "email_environment": settings.EMAIL_ENVIRONMENT,
        "test_recipient": test_recipient,
    }


# ---------- Audience Estimate & File Import ----------

async def _compute_audience_estimate(target_filter: TargetFilter, db: AsyncIOMotorDatabase) -> AudienceEstimateResponse:
    valid_sources = ("newsletter_subscriptions", "manual", "combined")
    if target_filter.source not in valid_sources:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid source '{target_filter.source}'. Valid sources: {', '.join(valid_sources)}"
        )

    from backend.services.email.audience import analyze_manual_recipients
    suppressed_set = await get_suppressed_emails(db)

    # Compute audience with and without exclusions to accurately derive excluded_count
    pre_exclusion_filter = TargetFilter(
        source=target_filter.source,
        custom_emails=target_filter.custom_emails,
        excluded_emails=None
    )
    pre_recipients = await extract_and_deduplicate_audience(db, pre_exclusion_filter)
    recipients = await extract_and_deduplicate_audience(db, target_filter)
    excluded_count = max(0, len(pre_recipients) - len(recipients))

    newsletter_count = 0
    if target_filter.source in ("newsletter_subscriptions", "combined"):
        newsletter_count = await db.newsletter_subscriptions.count_documents({})

    manual_analysis = {"entered_count": 0, "invalid_count": 0, "duplicate_count": 0, "suppressed_count": 0}
    if target_filter.source in ("manual", "combined") and target_filter.custom_emails:
        manual_analysis = analyze_manual_recipients(
            [str(e) for e in target_filter.custom_emails],
            suppressed_set=suppressed_set
        )

    raw_count = newsletter_count + manual_analysis["entered_count"]

    # Calculate actual suppressed count among matching audience
    suppressed_in_audience = 0
    if target_filter.source in ("newsletter_subscriptions", "combined"):
        subs = await db.newsletter_subscriptions.find({}, {"email": 1}).to_list(10000)
        sub_emails = {s.get("email", "").strip().lower() for s in subs if s.get("email")}
        suppressed_in_audience += len(sub_emails.intersection(suppressed_set))
    if target_filter.source in ("manual", "combined"):
        suppressed_in_audience += manual_analysis["suppressed_count"]

    return AudienceEstimateResponse(
        source=target_filter.source,
        raw_count=raw_count,
        deduplicated_count=len(pre_recipients),
        suppressed_count=suppressed_in_audience,
        excluded_count=excluded_count,
        net_target_count=len(recipients),
        sample_recipients=recipients[:25],
        entered_count=manual_analysis["entered_count"],
        invalid_count=manual_analysis["invalid_count"],
        duplicate_count=manual_analysis["duplicate_count"]
    )


@router.get("/campaigns/estimate", response_model=AudienceEstimateResponse, dependencies=[Depends(get_current_admin)])
async def estimate_audience_get(
    source: str = Query("newsletter_subscriptions"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Returns estimated raw, deduplicated, suppressed, and net recipient count for target filter (GET query).
    """
    return await _compute_audience_estimate(TargetFilter(source=source), db)


@router.post("/campaigns/estimate", response_model=AudienceEstimateResponse, dependencies=[Depends(get_current_admin)])
async def estimate_audience_post(
    target_filter: TargetFilter,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Returns authoritative estimated raw, deduplicated, suppressed, excluded, and net recipient count
    including custom manual emails with breakdown metrics (POST body).
    """
    return await _compute_audience_estimate(target_filter, db)


@router.post("/recipients/parse-file", response_model=FileImportResponse, dependencies=[Depends(get_current_admin)])
async def parse_recipients_file_endpoint(
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Parses an uploaded CSV or XLSX file in memory, auto-detects the email column,
    and returns authoritative recipient metrics without persisting files on disk.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    ext = file.filename.lower().split(".")[-1] if "." in file.filename else ""
    if ext not in ("csv", "xlsx", "xls", "txt"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '.{ext}'. Please upload a CSV (.csv) or Excel (.xlsx) file."
        )

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum allowed file size is 10MB.")

    suppressed_set = await get_suppressed_emails(db)
    result = parse_recipient_file(content, file.filename, suppressed_set=suppressed_set)
    return FileImportResponse(**result)


# ---------- Campaign CRUD ----------

@router.get("/campaigns", response_model=List[EmailCampaign], dependencies=[Depends(get_current_admin)])
async def list_campaigns(db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    List all email campaigns sorted by creation date descending.
    """
    campaigns = await db.email_campaigns.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [EmailCampaign(**c) for c in campaigns]

@router.get("/campaigns/{campaign_id}", response_model=EmailCampaign, dependencies=[Depends(get_current_admin)])
async def get_campaign(campaign_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Get detailed information for a single campaign.
    """
    campaign = await db.email_campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return EmailCampaign(**campaign)

@router.post("/campaigns", response_model=EmailCampaign, dependencies=[Depends(get_current_admin)])
async def create_campaign(payload: CampaignCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Creates a new campaign, extracts the target audience, and creates an immutable frozen recipient snapshot.
    """
    # 1. Extract and deduplicate audience
    recipients_data = await extract_and_deduplicate_audience(db, payload.target_filter)
    if not recipients_data:
        raise HTTPException(status_code=400, detail="Target audience selection produced 0 valid recipients.")

    campaign_id = generate_uuid()
    now = get_utc_now()

    sender = payload.sender_email or settings.RESEND_FROM_EMAIL
    reply_to = payload.reply_to or settings.RESEND_REPLY_TO
    plain_text = html_to_plain_text(payload.body_html)

    # 2. Build Campaign Object
    campaign = EmailCampaign(
        campaign_id=campaign_id,
        title=payload.title,
        campaign_type=payload.campaign_type,
        template_id=payload.template_id,
        status=CampaignStatus.REVIEWING,
        subject=payload.subject,
        body_html=payload.body_html,
        body_text=plain_text,
        sender_email=sender,
        reply_to=reply_to,
        target_filter=payload.target_filter,
        frozen_recipient_count=len(recipients_data),
        created_at=now
    )

    # 3. Snapshot Recipients
    recipient_docs = []
    for r in recipients_data:
        rec_obj = CampaignRecipient(
            campaign_id=campaign_id,
            email=r["email"],
            name=r.get("name"),
            company=r.get("company"),
            source=r["source"],
            source_id=r.get("source_id"),
            status=RecipientStatus.QUEUED,
            created_at=now
        )
        recipient_docs.append(rec_obj.model_dump())

    # Insert into database atomically
    await db.email_campaigns.insert_one(campaign.model_dump())
    if recipient_docs:
        await db.campaign_recipients.insert_many(recipient_docs)

    return campaign

@router.post("/campaigns/{campaign_id}/confirm", response_model=EmailCampaign, dependencies=[Depends(get_current_admin)])
async def confirm_and_dispatch_campaign(
    campaign_id: str,
    payload: CampaignConfirm,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Two-step confirmation:
    1. Verifies exact recipient count typed by the user matches the frozen snapshot count.
    2. Validates idempotency key to prevent double confirmation.
    3. Generates Outbox Jobs for the async worker and transitions campaign to 'SENDING'.
    """
    campaign = await db.email_campaigns.find_one({"campaign_id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if campaign["status"] != CampaignStatus.REVIEWING.value:
        raise HTTPException(
            status_code=400,
            detail=f"Campaign cannot be confirmed from status '{campaign['status']}'. Must be 'reviewing'."
        )

    # Safety Check 1: Exact count confirmation
    if payload.exact_recipient_count != campaign["frozen_recipient_count"]:
        raise HTTPException(
            status_code=400,
            detail=f"Count mismatch! Provided count ({payload.exact_recipient_count}) does not match frozen count ({campaign['frozen_recipient_count']})."
        )

    # Safety Check 2: Idempotency check
    existing_key = await db.email_campaigns.find_one({"idempotency_key": payload.idempotency_key})
    if existing_key and existing_key["campaign_id"] != campaign_id:
        raise HTTPException(status_code=409, detail="Idempotency key already used for another campaign.")

    now = get_utc_now()

    # Test Mode Guard — Defense-in-Depth
    # In development/staging, campaign dispatch to real audience is blocked.
    # Use the Test Send button in Communication Center to verify email content.
    # Switch EMAIL_ENVIRONMENT=production on Railway to enable real dispatches.
    if settings.is_test_mode:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Campaign dispatch is disabled in {settings.EMAIL_ENVIRONMENT.upper()} mode. "
                "Switch EMAIL_ENVIRONMENT=production on Railway to enable production campaigns. "
                "Use 'Send Test' in the Communication Center to verify email content."
            )
        )

    recipients = await db.campaign_recipients.find({"campaign_id": campaign_id}).to_list(10000)
    outbox_docs = []

    for rec in recipients:
        unsub_url = f"{settings.BACKEND_URL}/api/unsubscribe?token={rec['unsubscribe_token']}&email={rec['email']}"
        vars_map = {
            "name": rec.get("name") or "Valued Partner",
            "company": rec.get("company") or "",
            "email": rec["email"],
            "unsubscribe_url": unsub_url,
            "year": datetime.now(timezone.utc).year
        }

        rendered_subject = interpolate_variables(campaign["subject"], vars_map)
        rendered_body = interpolate_variables(campaign["body_html"], vars_map)
        full_html = render_base_layout(rendered_body, unsubscribe_url=unsub_url)
        plain_text = html_to_plain_text(full_html)

        job = OutboxJob(
            campaign_id=campaign_id,
            recipient_id=rec["id"],
            recipient_email=rec["email"],
            recipient_name=rec.get("name"),
            subject=rendered_subject,
            rendered_html=full_html,
            rendered_text=plain_text,
            sender=campaign["sender_email"],
            reply_to=campaign["reply_to"],
            idempotency_key=f"{campaign_id}_{rec['email']}",
            created_at=now,
            updated_at=now
        )
        outbox_docs.append(job.model_dump())

    if outbox_docs:
        await db.outbox_jobs.insert_many(outbox_docs)

    # Update Campaign status to SENDING
    await db.email_campaigns.update_one(
        {"campaign_id": campaign_id},
        {
            "$set": {
                "status": CampaignStatus.SENDING.value,
                "idempotency_key": payload.idempotency_key,
                "confirmed_at": now,
                "confirmed_by": "admin"
            }
        }
    )

    updated = await db.email_campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    return EmailCampaign(**updated)

@router.post("/campaigns/{campaign_id}/cancel", response_model=EmailCampaign, dependencies=[Depends(get_current_admin)])
async def cancel_campaign(campaign_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Cancels undispatched jobs for an active campaign immediately.
    """
    campaign = await db.email_campaigns.find_one({"campaign_id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    now = get_utc_now()
    # Mark campaign as CANCELLED
    await db.email_campaigns.update_one(
        {"campaign_id": campaign_id},
        {"$set": {"status": CampaignStatus.CANCELLED.value, "updated_at": now}}
    )

    # Cancel pending outbox jobs
    await db.outbox_jobs.update_many(
        {"campaign_id": campaign_id, "status": OutboxJobStatus.PENDING.value},
        {"$set": {"status": OutboxJobStatus.CANCELLED.value, "updated_at": now}}
    )

    # Mark queued recipients as cancelled
    await db.campaign_recipients.update_many(
        {"campaign_id": campaign_id, "status": RecipientStatus.QUEUED.value},
        {"$set": {"status": RecipientStatus.CANCELLED.value}}
    )

    updated = await db.email_campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    return EmailCampaign(**updated)


@router.post("/campaigns/test-send", dependencies=[Depends(get_current_admin)])
async def send_test_email(payload: TestSendRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Dispatches a single test email ONLY to the configured server-side test recipient.

    The frontend-supplied recipient_email is IGNORED in test mode — the server
    always enforces delivery to the configured test recipient only.

    If no test recipient is configured, returns 400 with a clear error.
    """
    if not settings.is_test_mode:
        raise HTTPException(
            status_code=400,
            detail="Test send is only available in development/staging environments."
        )

    # Server-side enforcement: always use the configured test recipient
    configured_recipient = await _get_test_recipient(db)
    if not configured_recipient:
        raise HTTPException(
            status_code=400,
            detail=(
                "No test recipient configured. "
                "Go to Communication Center → Test Mode and set a test recipient email first."
            )
        )

    if not _is_valid_email(configured_recipient):
        raise HTTPException(
            status_code=500,
            detail=f"Configured test recipient '{configured_recipient}' is not a valid email. Please update it."
        )

    vars_map = {
        "name": payload.recipient_name or "Test User",
        "company": payload.recipient_company or "Test Co",
        "email": configured_recipient,
        "unsubscribe_url": f"{settings.BACKEND_URL}/api/unsubscribe?token=test_token&email={configured_recipient}",
        "year": datetime.now(timezone.utc).year
    }

    rendered_subject = interpolate_variables(payload.subject, vars_map)
    rendered_body = interpolate_variables(payload.body_html, vars_map)
    full_html = render_base_layout(rendered_body, unsubscribe_url=vars_map["unsubscribe_url"])
    plain_text = html_to_plain_text(full_html)

    result = await send_email_via_provider(
        to=configured_recipient,
        subject=rendered_subject,
        html=full_html,
        text=plain_text,
        db=db,
        _test_recipient_override=configured_recipient,  # Coherent with provider's final guard
    )

    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Test send failed"))

    logger.info("Test email dispatched to configured recipient: %s", configured_recipient)
    return {
        "status": "success",
        "message": f"Test email sent to configured test recipient: {configured_recipient}",
        "recipient": configured_recipient,
        "resend_id": result.get("resend_id"),
        "response_time_ms": result.get("response_time_ms")
    }

@router.get("/campaigns/{campaign_id}/recipients", response_model=List[CampaignRecipient], dependencies=[Depends(get_current_admin)])
async def get_campaign_recipients(
    campaign_id: str,
    skip: int = 0,
    limit: int = 50,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Paginated list of recipients for a campaign.
    """
    recipients = await db.campaign_recipients.find(
        {"campaign_id": campaign_id},
        {"_id": 0}
    ).skip(skip).limit(limit).to_list(limit)
    return [CampaignRecipient(**r) for r in recipients]
