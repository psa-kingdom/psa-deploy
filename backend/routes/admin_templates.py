from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from backend.core.auth import get_current_admin
from backend.models.email import (
    EmailTemplateStudio,
    TemplateVersionHistory,
    TemplateCreate,
    TemplateUpdate,
    TemplatePreviewRequest,
    generate_uuid,
    get_utc_now
)
from backend.services.email.renderer import render_final_email, interpolate_variables, html_to_plain_text
from backend.services.email.templates import (
    get_independence_day_campaign_html,
    get_independence_day_template,
    get_contact_acknowledgement_template,
    get_newsletter_welcome_template
)

router = APIRouter(prefix="/admin/communication/templates", tags=["Admin Templates"])

def get_db() -> AsyncIOMotorDatabase:
    from backend.server import db
    return db

async def seed_default_templates_if_empty(db: AsyncIOMotorDatabase):
    count = await db.email_templates_studio.count_documents({})
    if count > 0:
        return

    now = get_utc_now()
    # 1. Independence Day — clean inner HTML without hardcoded outer wrapper
    html_id = get_independence_day_campaign_html()
    subj_id = "Happy Independence Day — P Suman & Associates"
    t1 = EmailTemplateStudio(
        template_id="independence_day_2026",
        name="Independence Day 2026 Greetings",
        category="announcement",
        description="Formal Independence Day corporate greetings for clients and partners.",
        published_subject=subj_id,
        published_body_html=html_id,
        draft_subject=subj_id,
        draft_body_html=html_id,
        apply_wrapper=True,
        has_pending_draft=False,
        version=1,
        created_at=now,
        updated_at=now
    )

    # 2. Contact Acknowledgement
    subj_ack, html_ack, _ = get_contact_acknowledgement_template({"name": "{{name}}", "service_of_interest": "{{service_of_interest}}"})
    t2 = EmailTemplateStudio(
        template_id="contact_acknowledgement",
        name="Contact Inquiry Acknowledgment",
        category="transactional",
        description="Instant confirmation sent upon inquiry form submission.",
        published_subject=subj_ack,
        published_body_html=html_ack,
        draft_subject=subj_ack,
        draft_body_html=html_ack,
        apply_wrapper=True,
        has_pending_draft=False,
        version=1,
        created_at=now,
        updated_at=now
    )

    # 3. Newsletter Welcome
    subj_news, html_news, _ = get_newsletter_welcome_template({"unsubscribe_url": "{{unsubscribe_url}}"})
    t3 = EmailTemplateStudio(
        template_id="newsletter_welcome",
        name="Newsletter Welcome & Insights",
        category="newsletter",
        description="Welcome email for new PSA Insights subscribers.",
        published_subject=subj_news,
        published_body_html=html_news,
        draft_subject=subj_news,
        draft_body_html=html_news,
        apply_wrapper=True,
        has_pending_draft=False,
        version=1,
        created_at=now,
        updated_at=now
    )

    await db.email_templates_studio.insert_many([t1.model_dump(), t2.model_dump(), t3.model_dump()])

@router.get("", response_model=List[EmailTemplateStudio], dependencies=[Depends(get_current_admin)])
async def list_templates(db: AsyncIOMotorDatabase = Depends(get_db)):
    await seed_default_templates_if_empty(db)
    templates = await db.email_templates_studio.find({}, {"_id": 0}).sort("created_at", 1).to_list(100)
    return [EmailTemplateStudio(**t) for t in templates]

@router.get("/{template_id}", response_model=EmailTemplateStudio, dependencies=[Depends(get_current_admin)])
async def get_template(template_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    t = await db.email_templates_studio.find_one({"template_id": template_id}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    return EmailTemplateStudio(**t)

@router.post("", response_model=EmailTemplateStudio, dependencies=[Depends(get_current_admin)])
async def create_template(payload: TemplateCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    existing = await db.email_templates_studio.find_one({"template_id": payload.template_id})
    if existing:
        raise HTTPException(status_code=409, detail="Template ID already exists")

    now = get_utc_now()
    template = EmailTemplateStudio(
        template_id=payload.template_id,
        name=payload.name,
        category=payload.category,
        description=payload.description,
        published_subject=payload.subject,
        published_body_html=payload.body_html,
        draft_subject=payload.subject,
        draft_body_html=payload.body_html,
        apply_wrapper=payload.apply_wrapper,
        has_pending_draft=False,
        version=1,
        variables=payload.variables or ["name", "company", "unsubscribe_url"],
        created_at=now,
        updated_at=now
    )
    await db.email_templates_studio.insert_one(template.model_dump())
    return template

@router.put("/{template_id}", response_model=EmailTemplateStudio, dependencies=[Depends(get_current_admin)])
async def update_template(
    template_id: str,
    payload: TemplateUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    template = await db.email_templates_studio.find_one({"template_id": template_id})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    now = get_utc_now()
    update_data = {"updated_at": now}

    if payload.name is not None:
        update_data["name"] = payload.name
    if payload.description is not None:
        update_data["description"] = payload.description
    if payload.subject is not None:
        update_data["draft_subject"] = payload.subject
        update_data["has_pending_draft"] = True
    if payload.body_html is not None:
        update_data["draft_body_html"] = payload.body_html
        update_data["has_pending_draft"] = True
    if payload.apply_wrapper is not None:
        update_data["apply_wrapper"] = payload.apply_wrapper

    effective_wrapper = payload.apply_wrapper if payload.apply_wrapper is not None else template.get("apply_wrapper", True)

    if payload.publish_immediately:
        # Create Version History Snapshot
        new_version = template.get("version", 1) + 1
        subj_to_pub = payload.subject if payload.subject is not None else template.get("draft_subject") or template.get("published_subject")
        body_to_pub = payload.body_html if payload.body_html is not None else template.get("draft_body_html") or template.get("published_body_html")

        history_entry = TemplateVersionHistory(
            template_id=template_id,
            version_number=new_version,
            subject=subj_to_pub,
            body_html=body_to_pub,
            apply_wrapper=effective_wrapper,
            created_at=now
        )
        await db.template_version_history.insert_one(history_entry.model_dump())

        update_data["published_subject"] = subj_to_pub
        update_data["published_body_html"] = body_to_pub
        update_data["draft_subject"] = subj_to_pub
        update_data["draft_body_html"] = body_to_pub
        update_data["has_pending_draft"] = False
        update_data["version"] = new_version

    await db.email_templates_studio.update_one({"template_id": template_id}, {"$set": update_data})
    updated = await db.email_templates_studio.find_one({"template_id": template_id}, {"_id": 0})
    return EmailTemplateStudio(**updated)

@router.post("/{template_id}/publish", response_model=EmailTemplateStudio, dependencies=[Depends(get_current_admin)])
async def publish_template(template_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    template = await db.email_templates_studio.find_one({"template_id": template_id})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    now = get_utc_now()
    new_version = template.get("version", 1) + 1
    subj_to_pub = template.get("draft_subject") or template.get("published_subject")
    body_to_pub = template.get("draft_body_html") or template.get("published_body_html")
    apply_wrapper = template.get("apply_wrapper", True)

    history_entry = TemplateVersionHistory(
        template_id=template_id,
        version_number=new_version,
        subject=subj_to_pub,
        body_html=body_to_pub,
        apply_wrapper=apply_wrapper,
        created_at=now
    )
    await db.template_version_history.insert_one(history_entry.model_dump())

    update_data = {
        "published_subject": subj_to_pub,
        "published_body_html": body_to_pub,
        "draft_subject": subj_to_pub,
        "draft_body_html": body_to_pub,
        "has_pending_draft": False,
        "version": new_version,
        "updated_at": now
    }
    await db.email_templates_studio.update_one({"template_id": template_id}, {"$set": update_data})
    updated = await db.email_templates_studio.find_one({"template_id": template_id}, {"_id": 0})
    return EmailTemplateStudio(**updated)

@router.post("/preview", dependencies=[Depends(get_current_admin)])
async def preview_template(payload: TemplatePreviewRequest):
    """
    Renders preview using the canonical render_final_email pipeline.
    """
    vars_map = {
        "name": payload.recipient_name or "Valued Client",
        "company": payload.recipient_company or "Acme Corp",
        "email": payload.recipient_email or "client@example.com",
        "unsubscribe_url": "https://psumanassociates.com/unsubscribe?sample=true",
        "year": datetime.now(timezone.utc).year
    }
    rendered_subj = interpolate_variables(payload.subject, vars_map)
    full_html, plain_text = render_final_email(
        body_html=payload.body_html,
        variables=vars_map,
        unsubscribe_url=vars_map["unsubscribe_url"]
    )

    return {
        "subject": rendered_subj,
        "html": full_html,
        "plain_text": plain_text
    }

@router.delete("/{template_id}/draft", response_model=EmailTemplateStudio, dependencies=[Depends(get_current_admin)])
async def discard_draft(template_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    template = await db.email_templates_studio.find_one({"template_id": template_id})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    now = get_utc_now()
    pub_subj = template.get("published_subject", "")
    pub_body = template.get("published_body_html", "")

    update_data = {
        "draft_subject": pub_subj,
        "draft_body_html": pub_body,
        "has_pending_draft": False,
        "updated_at": now
    }
    await db.email_templates_studio.update_one({"template_id": template_id}, {"$set": update_data})
    updated = await db.email_templates_studio.find_one({"template_id": template_id}, {"_id": 0})
    return EmailTemplateStudio(**updated)
