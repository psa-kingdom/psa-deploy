from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="P Suman & Associates API")
api_router = APIRouter(prefix="/api")


# ---------- Models ----------
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


# ---------- Routes ----------
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


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
