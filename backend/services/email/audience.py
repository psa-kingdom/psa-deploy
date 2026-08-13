"""
Audience extraction, normalization, deduplication, and suppression filtering.

V1 eligible sources:
  - newsletter_subscriptions  (explicit website opt-in)
  - manual_recipients         (admin-entered or pasted email list)

contact_submissions are NOT eligible for marketing campaigns.
Future eligibility would require explicit opt-in consent tracked per record.
"""

import re
from typing import List, Dict, Any, Set, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from backend.models.email import TargetFilter

EMAIL_REGEX = re.compile(r"^[\w\.\+\-]+@[a-zA-Z0-9\.\-]+\.[a-zA-Z]{2,}$")


def is_valid_email(email: str) -> bool:
    if not email or not isinstance(email, str):
        return False
    return bool(EMAIL_REGEX.match(email.strip()))


def parse_manual_emails(raw: List[str]) -> List[str]:
    """
    Accepts a list of raw strings that may each contain one or multiple emails
    (comma/semicolon/newline separated). Returns a flat, normalized list.
    """
    result = []
    for entry in raw:
        # Split by common delimiters: comma, semicolon, newline, space
        parts = re.split(r"[,;\n\r\s]+", str(entry))
        for part in parts:
            cleaned = part.strip().lower()
            if cleaned:
                result.append(cleaned)
    return result


async def get_suppressed_emails(db: AsyncIOMotorDatabase) -> Set[str]:
    """
    Returns set of suppressed / unsubscribed email addresses.
    """
    suppressions = await db.email_suppressions.find({}, {"email": 1, "_id": 0}).to_list(10000)
    return {s["email"].strip().lower() for s in suppressions if s.get("email")}


async def extract_and_deduplicate_audience(
    db: AsyncIOMotorDatabase,
    target_filter: TargetFilter
) -> List[Dict[str, Any]]:
    """
    Extracts, normalizes, deduplicates, and filters audience against suppressions.

    Supported sources (V1):
      - "newsletter_subscriptions"  → from DB collection
      - "manual"                    → from target_filter.custom_emails (admin-entered)
      - "combined"                  → newsletter + manual, deduplicated

    Returns list of recipient dicts: [{email, name, source, source_id}]
    """
    suppressed_set = await get_suppressed_emails(db)
    seen_emails: Set[str] = set()
    recipients: List[Dict[str, Any]] = []

    source = target_filter.source

    # --- Newsletter Subscriptions ---
    if source in ("newsletter_subscriptions", "combined"):
        subs = await db.newsletter_subscriptions.find({}).to_list(10000)
        for s in subs:
            email = s.get("email", "").strip().lower()
            if is_valid_email(email) and email not in seen_emails and email not in suppressed_set:
                seen_emails.add(email)
                recipients.append({
                    "email": email,
                    "name": None,
                    "company": None,
                    "source": "newsletter_subscriptions",
                    "source_id": str(s.get("_id") or s.get("id") or "")
                })

    # --- Manual Recipients ---
    if source in ("manual", "combined") and target_filter.custom_emails:
        raw_emails = parse_manual_emails([str(e) for e in target_filter.custom_emails])
        for email in raw_emails:
            if is_valid_email(email) and email not in seen_emails and email not in suppressed_set:
                seen_emails.add(email)
                recipients.append({
                    "email": email,
                    "name": None,
                    "company": None,
                    "source": "manual",
                    "source_id": None
                })

    return recipients
