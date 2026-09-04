from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import sys
import logging
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))
if str(ROOT_DIR.parent) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR.parent))

# Ensure 'backend' namespace is always available even if executed directly inside the backend directory
try:
    import backend
except ImportError:
    import types
    backend_pkg = types.ModuleType("backend")
    backend_pkg.__path__ = [str(ROOT_DIR)]
    sys.modules["backend"] = backend_pkg

from dotenv import load_dotenv
load_dotenv(ROOT_DIR / '.env')

from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import asyncio
import uuid
import re
import secrets
from datetime import datetime, timezone, timedelta

from backend.core.config import settings
from backend.models.email import OutboxJob, OutboxJobStatus
from backend.services.email.renderer import render_final_email, interpolate_variables
from backend.services.email.templates import (
    get_contact_acknowledgement_fragment,
    get_newsletter_welcome_fragment
)

mongo_url = settings.MONGO_URL
client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=2500)
db = client[settings.DB_NAME]

app = FastAPI(title="P Suman & Associates API")
api_router = APIRouter(prefix="/api")

# ---------- CORS Middleware ----------
# Must be registered before routers so preflight OPTIONS requests are handled.
# allow_credentials=True requires explicit origins or scoped allow_origin_regex.
_cors_origins = settings.cors_origins_list
if not _cors_origins:
    _cors_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_cors_origins,
    allow_origin_regex=settings.PSA_VERCEL_PREVIEW_REGEX,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
    expose_headers=["Content-Type"],
)

# Worker reference
outbox_worker = None


# ---------- Existing Models (Frozen & Preserved, Extended for Transactional Autoresponders) ----------
class NewsletterSubscription(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    source: Optional[str] = "website"
    unsubscribe_token: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    unsubscribed: bool = False
    unsubscribed_at: Optional[datetime] = None
    reactivated_at: Optional[datetime] = None
    welcome_email_status: Optional[str] = None
    resend_message_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class NewsletterCreate(BaseModel):
    email: EmailStr
    source: Optional[str] = "website"


class ContactSubmission(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    company: Optional[str] = None
    designation: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    service_of_interest: Optional[str] = None
    message: str
    # Inquiry management fields — backward-compatible (defaults apply to existing docs)
    source: str = "website_contact"  # website_contact | future: calcom_meeting | newsletter | etc.
    status: str = "new"              # new | contacted | qualified | converted | closed
    notes: Optional[str] = None      # Admin-only internal notes
    acknowledgement_status: Optional[str] = None
    resend_message_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ContactCreate(BaseModel):
    name: str
    company: Optional[str] = None
    designation: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    service_of_interest: Optional[str] = None
    message: str
    source: str = "website_contact"  # defaults to website contact form


# ---------- Existing Public Routes ----------
@api_router.get("/")
async def root():
    return {"firm": "P Suman & Associates", "status": "operational"}


@api_router.post("/newsletter", response_model=NewsletterSubscription)
async def subscribe_newsletter(payload: NewsletterCreate):
    clean_email = payload.email.strip().lower()
    existing = await db.newsletter_subscriptions.find_one({"email": clean_email})
    now = datetime.now(timezone.utc)

    if existing:
        # Check if already active
        if not existing.get("unsubscribed"):
            # Idempotent — return existing without re-sending welcome email
            existing["created_at"] = (
                datetime.fromisoformat(existing["created_at"])
                if isinstance(existing.get("created_at"), str)
                else existing.get("created_at")
            )
            existing.pop("_id", None)
            return NewsletterSubscription(**existing)

        # Previously unsubscribed -> reactivate
        token = existing.get("unsubscribe_token") or secrets.token_urlsafe(32)
        await db.newsletter_subscriptions.update_one(
            {"email": clean_email},
            {
                "$set": {
                    "unsubscribed": False,
                    "unsubscribe_token": token,
                    "reactivated_at": now.isoformat(),
                    "welcome_email_status": "queued",
                }
            }
        )
        # Remove from suppressions
        try:
            await db.email_suppressions.delete_one({"email": clean_email})
        except Exception:
            pass

        existing["unsubscribed"] = False
        existing["unsubscribe_token"] = token
        existing["welcome_email_status"] = "queued"
        existing["created_at"] = (
            datetime.fromisoformat(existing["created_at"])
            if isinstance(existing.get("created_at"), str)
            else existing.get("created_at")
        )
        existing.pop("_id", None)
        sub = NewsletterSubscription(**existing)
    else:
        token = secrets.token_urlsafe(32)
        sub = NewsletterSubscription(
            email=clean_email,
            source=payload.source or "website",
            unsubscribe_token=token,
            welcome_email_status="queued",
            created_at=now,
        )
        doc = sub.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        await db.newsletter_subscriptions.insert_one(doc)

    # Queue Newsletter Welcome Email (Asynchronous Outbox Job)
    try:
        tpl_doc = await db.email_templates_studio.find_one({"template_id": "newsletter_welcome"})
        template_version = tpl_doc.get("version", 1) if tpl_doc else 1
        system_template_revision = tpl_doc.get("system_template_revision", 2) if tpl_doc else 2
        subject_raw = (tpl_doc.get("published_subject") if tpl_doc else None) or "Welcome to PSA Insights — P Suman & Associates"
        fragment_html = (tpl_doc.get("published_body_html") if tpl_doc else None) or get_newsletter_welcome_fragment()
        apply_wrapper = tpl_doc.get("apply_wrapper", True) if tpl_doc else True

        unsub_url = f"{settings.BACKEND_URL}/api/unsubscribe?email={clean_email}&token={sub.unsubscribe_token}"
        vars_map = {"unsubscribe_url": unsub_url}

        tpl_preheader = (tpl_doc.get("published_preheader") if tpl_doc else None) or "Welcome to executive tax & audit intelligence"
        tpl_sender = (
            f"{tpl_doc['sender_name']} <{tpl_doc['sender_email']}>"
            if tpl_doc and tpl_doc.get("sender_name") and tpl_doc.get("sender_email")
            else settings.RESEND_FROM_EMAIL
        )
        tpl_reply_to = (tpl_doc.get("reply_to") if tpl_doc else None) or settings.RESEND_REPLY_TO
        tpl_tags = [
            {"name": "type", "value": "transactional"},
            {"name": "template", "value": "newsletter_welcome"}
        ]

        rendered_html, rendered_text = render_final_email(
            body_html=fragment_html,
            variables=vars_map,
            unsubscribe_url=unsub_url,
            apply_wrapper=apply_wrapper,
            preheader=tpl_preheader,
            escape_variables=True,
        )
        rendered_subject = interpolate_variables(subject_raw, vars_map, escape_html=False)
        rendered_subject = re.sub(r"[\r\n]+", " ", rendered_subject).strip()

        job = OutboxJob(
            job_type="transactional",
            transactional_type="newsletter_welcome",
            source_entity_type="newsletter_subscription",
            source_entity_id=sub.id,
            template_id="newsletter_welcome",
            template_version=template_version,
            system_template_revision=system_template_revision,
            recipient_email=clean_email,
            subject=rendered_subject,
            preheader=tpl_preheader,
            rendered_html=rendered_html,
            rendered_text=rendered_text,
            sender=tpl_sender,
            reply_to=tpl_reply_to,
            tags=tpl_tags,
            idempotency_key=f"newsletter-welcome/{sub.id}",
            status=OutboxJobStatus.PENDING,
        )
        job_doc = job.model_dump()
        await db.outbox_jobs.insert_one(job_doc)
        logger.info("[NEWSLETTER WELCOME] Queued welcome job %s for %s", job.job_id, clean_email)
    except Exception as exc:
        logger.error("[NEWSLETTER WELCOME] Failed to queue welcome job for %s: %s", clean_email, exc, exc_info=True)
        await db.newsletter_subscriptions.update_one(
            {"id": sub.id},
            {"$set": {"welcome_email_status": "queue_failed"}}
        )
        sub.welcome_email_status = "queue_failed"

    return sub


@api_router.get("/newsletter", response_model=List[NewsletterSubscription])
async def list_newsletter_subscriptions():
    rows = await db.newsletter_subscriptions.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for r in rows:
        if isinstance(r.get("created_at"), str):
            r["created_at"] = datetime.fromisoformat(r["created_at"])
        if isinstance(r.get("unsubscribed_at"), str):
            r["unsubscribed_at"] = datetime.fromisoformat(r["unsubscribed_at"])
        if isinstance(r.get("reactivated_at"), str):
            r["reactivated_at"] = datetime.fromisoformat(r["reactivated_at"])
    return rows


@api_router.post("/contact", response_model=ContactSubmission)
async def submit_contact(payload: ContactCreate):
    clean_email = payload.email.strip().lower()
    now = datetime.now(timezone.utc)

    # Rate limiting & Anti-abuse Cooldown:
    # Check if an inquiry with identical email was received in the last 60 seconds
    cooldown_cutoff = (now - timedelta(seconds=60)).isoformat()
    recent_dup = await db.contact_submissions.find_one({
        "email": clean_email,
        "created_at": {"$gte": cooldown_cutoff}
    })

    # Always persist inquiry FIRST — customer submission is primary
    sub = ContactSubmission(
        name=payload.name,
        company=payload.company,
        designation=payload.designation,
        email=clean_email,
        phone=payload.phone,
        service_of_interest=payload.service_of_interest,
        message=payload.message,
        source=payload.source or "website_contact",
        status="new",
        acknowledgement_status="suppressed_cooldown" if recent_dup else "queued",
        created_at=now,
    )
    doc = sub.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.contact_submissions.insert_one(doc)

    if recent_dup:
        logger.info(
            "[CONTACT INQUIRY] Suppressed duplicate acknowledgement for %s (cooldown active)",
            clean_email
        )
        return sub

    # Queue Contact Acknowledgement Email (Asynchronous Outbox Job)
    try:
        tpl_doc = await db.email_templates_studio.find_one({"template_id": "contact_acknowledgement"})
        template_version = tpl_doc.get("version", 1) if tpl_doc else 1
        system_template_revision = tpl_doc.get("system_template_revision", 2) if tpl_doc else 2
        subject_raw = (tpl_doc.get("published_subject") if tpl_doc else None) or "Inquiry Received — P Suman & Associates"
        fragment_html = (tpl_doc.get("published_body_html") if tpl_doc else None) or get_contact_acknowledgement_fragment()
        apply_wrapper = tpl_doc.get("apply_wrapper", True) if tpl_doc else True

        clean_name = re.sub(r"[\r\n]+", " ", payload.name).strip()
        clean_service = re.sub(r"[\r\n]+", " ", payload.service_of_interest or "General Advisory").strip()
        clean_company = re.sub(r"[\r\n]+", " ", payload.company or "Not specified").strip()
        vars_map = {
            "name": clean_name,
            "service_of_interest": clean_service,
            "company": clean_company,
        }

        tpl_preheader = (tpl_doc.get("published_preheader") if tpl_doc else None) or "We have received your advisory inquiry."
        tpl_sender = (
            f"{tpl_doc['sender_name']} <{tpl_doc['sender_email']}>"
            if tpl_doc and tpl_doc.get("sender_name") and tpl_doc.get("sender_email")
            else settings.RESEND_FROM_EMAIL
        )
        tpl_reply_to = (tpl_doc.get("reply_to") if tpl_doc else None) or settings.RESEND_REPLY_TO
        tpl_tags = [
            {"name": "type", "value": "transactional"},
            {"name": "template", "value": "contact_acknowledgement"}
        ]

        rendered_html, rendered_text = render_final_email(
            body_html=fragment_html,
            variables=vars_map,
            apply_wrapper=apply_wrapper,
            preheader=tpl_preheader,
            escape_variables=True,
        )
        rendered_subject = interpolate_variables(subject_raw, vars_map, escape_html=False)
        rendered_subject = re.sub(r"[\r\n]+", " ", rendered_subject).strip()

        job = OutboxJob(
            job_type="transactional",
            transactional_type="contact_acknowledgement",
            source_entity_type="contact_submission",
            source_entity_id=sub.id,
            template_id="contact_acknowledgement",
            template_version=template_version,
            system_template_revision=system_template_revision,
            recipient_email=clean_email,
            recipient_name=clean_name,
            subject=rendered_subject,
            preheader=tpl_preheader,
            rendered_html=rendered_html,
            rendered_text=rendered_text,
            sender=tpl_sender,
            reply_to=tpl_reply_to,
            tags=tpl_tags,
            idempotency_key=f"contact-acknowledgement/{sub.id}",
            status=OutboxJobStatus.PENDING,
        )
        job_doc = job.model_dump()
        await db.outbox_jobs.insert_one(job_doc)
        logger.info("[CONTACT INQUIRY] Queued acknowledgement job %s for %s", job.job_id, clean_email)
    except Exception as exc:
        logger.error("[CONTACT INQUIRY] Failed to queue acknowledgement for %s: %s", clean_email, exc, exc_info=True)
        await db.contact_submissions.update_one(
            {"id": sub.id},
            {"$set": {"acknowledgement_status": "queue_failed"}}
        )
        sub.acknowledgement_status = "queue_failed"

    return sub


@api_router.get("/contact", response_model=List[ContactSubmission])
async def list_contact_submissions():
    rows = await db.contact_submissions.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for r in rows:
        if isinstance(r.get("created_at"), str):
            r["created_at"] = datetime.fromisoformat(r["created_at"])
    return rows


# ---------- Mount Email Management Subsystem Routers ----------
try:
    from backend.routes import (
        admin_auth,
        admin_campaigns,
        admin_templates,
        admin_logs,
        admin_inquiries,
        admin_insights,
        webhooks,
        unsubscribe
    )
except ImportError:
    from routes import (
        admin_auth,
        admin_campaigns,
        admin_templates,
        admin_logs,
        admin_inquiries,
        admin_insights,
        webhooks,
        unsubscribe
    )

@api_router.post("/admin/auth/login")
async def api_admin_login(payload: admin_auth.AdminLoginRequest, request: Request, response: Response):
    return await admin_auth.admin_login(payload, request, response)


@api_router.get("/admin/auth/me")
async def api_admin_me(session: dict = Depends(admin_auth.require_admin_session)):
    return await admin_auth.admin_me(session)


@api_router.post("/admin/auth/logout")
async def api_admin_logout(request: Request, response: Response):
    return await admin_auth.admin_logout(request, response)


@api_router.get("/admin/communication/analytics")
async def api_get_communication_analytics(
    period: str = Query("7d", description="Metrics period: 7d or 30d"),
    refresh: bool = Query(False, description="Force refresh cache"),
    session: dict = Depends(admin_auth.require_admin_session)
):
    from backend.services.email.analytics import get_email_analytics
    return await get_email_analytics(db, period=period, force_refresh=refresh)


api_router.include_router(admin_campaigns.router)
api_router.include_router(admin_templates.router)
api_router.include_router(admin_logs.router)
api_router.include_router(admin_inquiries.router)
api_router.include_router(admin_insights.admin_router)
api_router.include_router(admin_insights.public_router)
api_router.include_router(webhooks.router)
api_router.include_router(unsubscribe.router)

app.include_router(api_router)


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    from fastapi.openapi.utils import get_openapi
    openapi_schema = get_openapi(
        title=app.title,
        version="0.1.0",
        description="PSA Backend API",
        routes=app.routes,
    )
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ---------- Lifecycle Events ----------
@app.on_event("startup")
async def startup_event():
    global outbox_worker

    logger.info(f"STARTUP: Total registered app.routes = {len(app.routes)}")
    for r in app.routes:
        logger.info(f"  REGISTERED: {getattr(r, 'path', '')} [{getattr(r, 'methods', '')}]")

    async def init_indexes():
        try:
            await db.email_campaigns.create_index("campaign_id", unique=True)
            await db.campaign_recipients.create_index([("campaign_id", 1), ("email", 1)], unique=True)
            await db.campaign_recipients.create_index("unsubscribe_token", unique=True)
            await db.campaign_recipients.create_index("resend_message_id")
            await db.outbox_jobs.create_index("job_id", unique=True)
            await db.outbox_jobs.create_index("idempotency_key", unique=True)
            await db.outbox_jobs.create_index([("status", 1), ("next_attempt_at", 1)])
            await db.email_suppressions.create_index("email", unique=True)
            await db.webhook_events.create_index("event_id", unique=True)
            # Inquiry management indexes
            await db.contact_submissions.create_index("status")
            await db.contact_submissions.create_index("source")
            await db.contact_submissions.create_index("created_at")
            # Insights CMS indexes
            await db.insights.create_index("slug", unique=True)
            await db.insights.create_index("status")
            await db.insights.create_index("category")
            await db.insights.create_index("created_at")

            # Seed initial insights if collection is empty
            insights_count = await db.insights.count_documents({})
            if insights_count == 0:
                try:
                    try:
                        from backend.data.initial_insights import INITIAL_INSIGHTS
                    except ImportError:
                        from data.initial_insights import INITIAL_INSIGHTS
                    
                    seed_docs = []
                    now_utc = datetime.now(timezone.utc)
                    for item in INITIAL_INSIGHTS:
                        doc = dict(item)
                        doc["id"] = str(uuid.uuid4())
                        doc["status"] = "published"
                        doc["published_at"] = now_utc
                        doc["created_at"] = now_utc
                        doc["updated_at"] = now_utc
                        seed_docs.append(doc)
                    if seed_docs:
                        await db.insights.insert_many(seed_docs)
                        logger.info(f"Seeded {len(seed_docs)} initial insights articles into database.")
                except Exception as seed_err:
                    logger.warning(f"Note on initial insights seeding: {seed_err}")

            logger.info("Database indexes initialized successfully.")
        except Exception as exc:
            logger.warning(f"Note on startup index initialization: {exc}")

    asyncio.create_task(init_indexes())

    # Start Async Outbox Worker with configured safe dispatch rate (default 2.0/s)
    from backend.services.email.worker import OutboxWorker
    outbox_worker = OutboxWorker(db=db, dispatch_rate_per_sec=settings.EMAIL_DISPATCH_RATE_PER_SEC)
    outbox_worker.start()


@app.on_event("shutdown")
async def shutdown_event():
    global outbox_worker
    if outbox_worker:
        await outbox_worker.stop()
    client.close()
    logger.info("Application shutdown complete.")
