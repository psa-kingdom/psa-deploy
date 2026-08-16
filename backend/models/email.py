from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid

def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)

def generate_uuid() -> str:
    return str(uuid.uuid4())

class CampaignType(str, Enum):
    ANNOUNCEMENT = "announcement"
    NEWSLETTER = "newsletter"
    TRANSACTIONAL = "transactional"

class CampaignStatus(str, Enum):
    DRAFT = "draft"
    REVIEWING = "reviewing"
    CONFIRMED = "confirmed"
    SENDING = "sending"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    FAILED = "failed"

class RecipientStatus(str, Enum):
    QUEUED = "queued"
    DISPATCHED = "dispatched"
    DELIVERED = "delivered"
    BOUNCED = "bounced"
    COMPLAINED = "complained"
    SKIPPED_ALLOWLIST = "skipped_allowlist"
    SKIPPED_SUPPRESSION = "skipped_suppression"
    CANCELLED = "cancelled"

class OutboxJobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class TargetFilter(BaseModel):
    source: str = "newsletter_subscriptions"  # "newsletter_subscriptions", "manual", "combined"
    custom_emails: Optional[List[str]] = None  # used when source is "manual" or "combined"
    excluded_emails: Optional[List[str]] = None  # campaign-level exclusions

# --- Studio Templates ---
class EmailTemplateStudio(BaseModel):
    model_config = ConfigDict(extra="ignore")
    template_id: str
    name: str
    category: str = "announcement"  # announcement | transactional | newsletter
    description: Optional[str] = ""
    published_subject: Optional[str] = ""
    published_body_html: Optional[str] = ""
    draft_subject: Optional[str] = ""
    draft_body_html: Optional[str] = ""
    has_pending_draft: bool = False
    version: int = 1
    apply_wrapper: bool = True
    variables: List[str] = Field(default_factory=lambda: ["name", "company", "unsubscribe_url"])
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)

class TemplateVersionHistory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    version_id: str = Field(default_factory=generate_uuid)
    template_id: str
    version_number: int
    subject: str
    body_html: str
    apply_wrapper: bool = True
    created_by: str = "admin"
    created_at: datetime = Field(default_factory=get_utc_now)

class TemplateCreate(BaseModel):
    template_id: str
    name: str
    category: str = "announcement"
    description: Optional[str] = ""
    subject: str
    body_html: str
    apply_wrapper: bool = True
    variables: Optional[List[str]] = None

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    subject: Optional[str] = None
    body_html: Optional[str] = None
    apply_wrapper: Optional[bool] = None
    publish_immediately: bool = False

class TemplatePreviewRequest(BaseModel):
    subject: str
    body_html: str
    apply_wrapper: bool = True
    recipient_name: Optional[str] = "Valued Client"
    recipient_company: Optional[str] = "Acme Corp"
    recipient_email: Optional[str] = "client@example.com"

class SendMode(str, Enum):
    TEST = "test"
    PRODUCTION = "production"

# --- Campaigns ---
class CampaignCreate(BaseModel):
    title: str
    campaign_type: CampaignType = CampaignType.ANNOUNCEMENT
    template_id: Optional[str] = None
    send_mode: SendMode = SendMode.TEST
    subject: str
    body_html: str
    apply_wrapper: bool = True
    sender_email: Optional[str] = None
    reply_to: Optional[str] = None
    target_filter: TargetFilter = Field(default_factory=TargetFilter)

class CampaignConfirm(BaseModel):
    exact_recipient_count: int
    idempotency_key: str
    send_mode: Optional[SendMode] = None

class EmailCampaign(BaseModel):
    model_config = ConfigDict(extra="ignore")
    campaign_id: str = Field(default_factory=generate_uuid)
    title: str
    campaign_type: CampaignType = CampaignType.ANNOUNCEMENT
    template_id: Optional[str] = None
    send_mode: SendMode = SendMode.TEST
    status: CampaignStatus = CampaignStatus.DRAFT
    subject: str
    body_html: str
    body_text: Optional[str] = ""
    apply_wrapper: bool = True
    sender_email: str
    reply_to: str
    target_filter: TargetFilter
    frozen_recipient_count: int = 0
    dispatched_count: int = 0
    delivered_count: int = 0
    bounced_count: int = 0
    failed_count: int = 0
    idempotency_key: Optional[str] = None
    created_by: str = "admin"
    confirmed_by: Optional[str] = None
    created_at: datetime = Field(default_factory=get_utc_now)
    confirmed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class CampaignRecipient(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=generate_uuid)
    campaign_id: str
    email: EmailStr
    name: Optional[str] = None
    company: Optional[str] = None
    source: str
    source_id: Optional[str] = None
    status: RecipientStatus = RecipientStatus.QUEUED
    resend_message_id: Optional[str] = None
    unsubscribe_token: str = Field(default_factory=generate_uuid)
    error_message: Optional[str] = None
    dispatched_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=get_utc_now)

# --- Outbox & Attempts ---
class OutboxJob(BaseModel):
    model_config = ConfigDict(extra="ignore")
    job_id: str = Field(default_factory=generate_uuid)
    campaign_id: Optional[str] = None
    recipient_id: Optional[str] = None
    recipient_email: EmailStr
    recipient_name: Optional[str] = None
    subject: str
    rendered_html: str
    rendered_text: str
    sender: str
    reply_to: str
    status: OutboxJobStatus = OutboxJobStatus.PENDING
    attempts: int = 0
    max_attempts: int = 3
    next_attempt_at: datetime = Field(default_factory=get_utc_now)
    idempotency_key: str
    error_details: Optional[str] = None
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)

class EmailAttempt(BaseModel):
    model_config = ConfigDict(extra="ignore")
    attempt_id: str = Field(default_factory=generate_uuid)
    job_id: Optional[str] = None
    campaign_id: Optional[str] = None
    recipient_email: str
    provider: str = "resend"
    resend_id: Optional[str] = None
    status: str  # sent | failed | skipped_allowlist | skipped_suppression
    status_code: Optional[int] = None
    response_time_ms: int = 0
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=get_utc_now)

class EmailSuppression(BaseModel):
    model_config = ConfigDict(extra="ignore")
    email: EmailStr
    reason: str = "unsubscribe"  # unsubscribe | bounce | complaint
    source_campaign_id: Optional[str] = None
    created_at: datetime = Field(default_factory=get_utc_now)

class TestSendRequest(BaseModel):
    __test__ = False
    recipient_email: EmailStr
    subject: str
    body_html: str
    template_id: Optional[str] = None
    apply_wrapper: bool = True
    recipient_name: Optional[str] = "Test User"
    recipient_company: Optional[str] = "Test Company"

class AudienceEstimateResponse(BaseModel):
    source: str
    raw_count: int
    deduplicated_count: int
    suppressed_count: int
    excluded_count: Optional[int] = 0
    net_target_count: int
    sample_recipients: List[Dict[str, Any]]
    entered_count: Optional[int] = 0
    invalid_count: Optional[int] = 0
    duplicate_count: Optional[int] = 0


class FileImportResponse(BaseModel):
    filename: str
    total_rows: int
    email_column: Optional[str] = None
    entered_count: int
    valid_count: int
    invalid_count: int
    duplicate_count: int
    suppressed_count: int
    net_count: int
    valid_emails: List[str]
    invalid_samples: List[str]

