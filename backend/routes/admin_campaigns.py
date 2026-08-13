from fastapi import APIRouter, Depends, HTTPException, status, Query
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
    TestSendRequest,
    CampaignStatus,
    OutboxJobStatus,
    RecipientStatus,
    generate_uuid,
    get_utc_now
)
from backend.services.email.audience import extract_and_deduplicate_audience, get_suppressed_emails
from backend.services.email.renderer import render_base_layout, interpolate_variables, html_to_plain_text
from backend.services.email.provider import send_email_via_provider

router = APIRouter(prefix="/admin/communication/campaigns", tags=["Admin Campaigns"])

def get_db() -> AsyncIOMotorDatabase:
    # Will be set in server.py or retrieved from app.state
    from backend.server import db
    return db

@router.get("/environment", dependencies=[Depends(get_current_admin)])
async def get_email_environment():
    """
    Returns the current email environment and allowlist configuration.
    Used by the frontend to display the environment banner.
    """
    return {
        "email_environment": settings.EMAIL_ENVIRONMENT,
        "allowlist_count": len(settings.test_allowlist_emails),
        "allowlist_emails": settings.test_allowlist_emails if settings.is_test_mode else [],
    }

@router.get("/estimate", response_model=AudienceEstimateResponse, dependencies=[Depends(get_current_admin)])
async def estimate_audience(source: str = Query("newsletter_subscriptions"), db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Returns estimated raw, deduplicated, suppressed, and net recipient count for target filter.

    V1 supported sources: newsletter_subscriptions | manual | combined
    contact_submissions is NOT a valid source.
    """
    valid_sources = ("newsletter_subscriptions", "manual", "combined")
    if source not in valid_sources:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid source '{source}'. Valid sources: {', '.join(valid_sources)}"
        )

    target_filter = TargetFilter(source=source)
    recipients = await extract_and_deduplicate_audience(db, target_filter)
    suppressed_set = await get_suppressed_emails(db)

    raw_count = 0
    if source in ("newsletter_subscriptions", "combined"):
        raw_count += await db.newsletter_subscriptions.count_documents({})

    return AudienceEstimateResponse(
        source=source,
        raw_count=raw_count,
        deduplicated_count=len(recipients),
        suppressed_count=len(suppressed_set),
        net_target_count=len(recipients),
        sample_recipients=recipients[:5]
    )

@router.get("", response_model=List[EmailCampaign], dependencies=[Depends(get_current_admin)])
async def list_campaigns(db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    List all email campaigns sorted by creation date descending.
    """
    campaigns = await db.email_campaigns.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [EmailCampaign(**c) for c in campaigns]

@router.get("/{campaign_id}", response_model=EmailCampaign, dependencies=[Depends(get_current_admin)])
async def get_campaign(campaign_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Get detailed information for a single campaign.
    """
    campaign = await db.email_campaigns.find_one({"campaign_id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return EmailCampaign(**campaign)

@router.post("", response_model=EmailCampaign, dependencies=[Depends(get_current_admin)])
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

@router.post("/{campaign_id}/confirm", response_model=EmailCampaign, dependencies=[Depends(get_current_admin)])
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

    # Generate Outbox Jobs from frozen snapshot
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

@router.post("/{campaign_id}/cancel", response_model=EmailCampaign, dependencies=[Depends(get_current_admin)])
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

@router.post("/test-send", dependencies=[Depends(get_current_admin)])
async def send_test_email(payload: TestSendRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Dispatches a single test email strictly to an allowlisted recipient.
    """
    clean_to = payload.recipient_email.strip().lower()
    allowlist = settings.test_allowlist_emails

    if clean_to not in allowlist:
        raise HTTPException(
            status_code=400,
            detail=f"Recipient '{clean_to}' is not in the server test allowlist ({', '.join(allowlist)})."
        )

    vars_map = {
        "name": payload.recipient_name or "Test User",
        "company": payload.recipient_company or "Test Co",
        "email": clean_to,
        "unsubscribe_url": f"{settings.BACKEND_URL}/api/unsubscribe?token=test_token&email={clean_to}",
        "year": datetime.now(timezone.utc).year
    }

    rendered_subject = interpolate_variables(payload.subject, vars_map)
    rendered_body = interpolate_variables(payload.body_html, vars_map)
    full_html = render_base_layout(rendered_body, unsubscribe_url=vars_map["unsubscribe_url"])
    plain_text = html_to_plain_text(full_html)

    result = await send_email_via_provider(
        to=clean_to,
        subject=rendered_subject,
        html=full_html,
        text=plain_text,
        db=db
    )

    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Test send failed"))

    return {
        "status": "success",
        "message": f"Test email sent successfully to {clean_to}",
        "resend_id": result.get("resend_id"),
        "response_time_ms": result.get("response_time_ms")
    }

@router.get("/{campaign_id}/recipients", response_model=List[CampaignRecipient], dependencies=[Depends(get_current_admin)])
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
