"""
Audience extraction, normalization, deduplication, and suppression filtering.

V1 eligible sources:
  - newsletter_subscriptions  (explicit website opt-in)
  - manual                    (admin-entered or pasted email list)
  - combined                  (newsletter + manual deduplicated)

contact_submissions are NOT eligible for marketing campaigns.
"""

import re
from typing import List, Dict, Any, Set, Optional, Tuple
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
    (comma/semicolon/newline separated). Returns a flat, normalized list of non-empty tokens.
    """
    result = []
    for entry in raw:
        if not entry:
            continue
        parts = re.split(r"[,;\n\r\s]+", str(entry))
        for part in parts:
            cleaned = part.strip().lower()
            if cleaned:
                result.append(cleaned)
    return result


def analyze_manual_recipients(raw_entries: List[str], suppressed_set: Optional[Set[str]] = None) -> Dict[str, Any]:
    """
    Analyzes raw manual recipient entries and produces authoritative metrics:
    - entered_count: total raw tokens entered
    - valid_count: valid email addresses before deduplication
    - invalid_count: invalid tokens
    - invalid_samples: sample of invalid tokens (max 5)
    - duplicate_count: count of duplicate valid occurrences removed
    - suppressed_count: count of unique valid emails that are suppressed
    - net_sendable: list of unique, valid, non-suppressed normalized email strings
    """
    suppressed = suppressed_set or set()
    tokens = parse_manual_emails(raw_entries)
    entered_count = len(tokens)

    valid_tokens = []
    invalid_samples = []
    invalid_count = 0

    for token in tokens:
        if is_valid_email(token):
            valid_tokens.append(token)
        else:
            invalid_count += 1
            if len(invalid_samples) < 5:
                invalid_samples.append(token)

    valid_count = len(valid_tokens)

    # Deduplicate while tracking duplicates
    seen = set()
    unique_valid = []
    duplicate_count = 0

    for email in valid_tokens:
        if email in seen:
            duplicate_count += 1
        else:
            seen.add(email)
            unique_valid.append(email)

    # Filter suppressions
    net_sendable = [e for e in unique_valid if e not in suppressed]
    suppressed_count = len(unique_valid) - len(net_sendable)

    return {
        "entered_count": entered_count,
        "valid_count": valid_count,
        "invalid_count": invalid_count,
        "invalid_samples": invalid_samples,
        "duplicate_count": duplicate_count,
        "suppressed_count": suppressed_count,
        "net_sendable": net_sendable,
        "net_count": len(net_sendable)
    }


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
        analysis = analyze_manual_recipients(
            [str(e) for e in target_filter.custom_emails],
            suppressed_set=suppressed_set
        )
        for email in analysis["net_sendable"]:
            if email not in seen_emails:
                seen_emails.add(email)
                recipients.append({
                    "email": email,
                    "name": None,
                    "company": None,
                    "source": "manual",
                    "source_id": None
                })

    return recipients
