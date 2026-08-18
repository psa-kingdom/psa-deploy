from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid

def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)

def generate_uuid() -> str:
    return str(uuid.uuid4())

class InsightStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"

class TocItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    label: str
    level: Optional[int] = 2

class Insight(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=generate_uuid)
    slug: str
    title: str
    category: str = "Audit & Assurance"
    excerpt: str
    image: Optional[str] = None
    date: Optional[str] = None
    read_time: Optional[str] = "5 min read"
    author: Optional[str] = "CA Prem Suman"
    body: str = ""
    toc: Optional[List[TocItem]] = Field(default_factory=list)
    status: InsightStatus = InsightStatus.DRAFT
    published_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)

class InsightCreate(BaseModel):
    title: str
    slug: Optional[str] = None
    category: str = "Audit & Assurance"
    excerpt: str
    image: Optional[str] = None
    date: Optional[str] = None
    read_time: Optional[str] = "5 min read"
    author: Optional[str] = "CA Prem Suman"
    body: str = ""
    toc: Optional[List[TocItem]] = Field(default_factory=list)
    status: InsightStatus = InsightStatus.DRAFT

class InsightUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    category: Optional[str] = None
    excerpt: Optional[str] = None
    image: Optional[str] = None
    date: Optional[str] = None
    read_time: Optional[str] = None
    author: Optional[str] = None
    body: Optional[str] = None
    toc: Optional[List[TocItem]] = None
    status: Optional[InsightStatus] = None

class InsightStatusUpdate(BaseModel):
    status: InsightStatus

class InsightStatsResponse(BaseModel):
    total: int
    published_count: int
    draft_count: int
    archived_count: int
