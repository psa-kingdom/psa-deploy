from fastapi import FastAPI, APIRouter, HTTPException, Request
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
from datetime import datetime, timezone

from backend.core.config import settings

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


# ---------- Existing Models (Frozen & Preserved) ----------
class NewsletterSubscription(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    source: Optional[str] = "website"
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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ContactCreate(BaseModel):
    name: str
    company: Optional[str] = None
    designation: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    service_of_interest: Optional[str] = None
    message: str


# ---------- Existing Public Routes ----------
@api_router.get("/")
async def root():
    return {"firm": "P Suman & Associates", "status": "operational"}


@api_router.post("/newsletter", response_model=NewsletterSubscription)
async def subscribe_newsletter(payload: NewsletterCreate):
    existing = await db.newsletter_subscriptions.find_one({"email": payload.email})
    if existing:
        # Idempotent — return existing
        existing["created_at"] = datetime.fromisoformat(existing["created_at"]) if isinstance(existing.get("created_at"), str) else existing.get("created_at")
        existing.pop("_id", None)
        return NewsletterSubscription(**existing)

    sub = NewsletterSubscription(email=payload.email, source=payload.source or "website")
    doc = sub.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.newsletter_subscriptions.insert_one(doc)
    return sub


@api_router.get("/newsletter", response_model=List[NewsletterSubscription])
async def list_newsletter_subscriptions():
    rows = await db.newsletter_subscriptions.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for r in rows:
        if isinstance(r.get("created_at"), str):
            r["created_at"] = datetime.fromisoformat(r["created_at"])
    return rows


@api_router.post("/contact", response_model=ContactSubmission)
async def submit_contact(payload: ContactCreate):
    sub = ContactSubmission(**payload.model_dump())
    doc = sub.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.contact_submissions.insert_one(doc)
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
        webhooks,
        unsubscribe
    )
except ImportError:
    from routes import (
        admin_auth,
        admin_campaigns,
        admin_templates,
        admin_logs,
        webhooks,
        unsubscribe
    )

api_router.include_router(admin_auth.router)
api_router.include_router(admin_campaigns.router)
api_router.include_router(admin_templates.router)
api_router.include_router(admin_logs.router)
api_router.include_router(webhooks.router)
api_router.include_router(unsubscribe.router)

app.include_router(api_router)

# CORS middleware is registered above (before api_router) for correct preflight handling.

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
