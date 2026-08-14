"""
Audience extraction, normalization, deduplication, file import (CSV/XLSX),
suppression filtering, and campaign-level exclusions.

V1 eligible sources:
  - newsletter_subscriptions  (explicit website opt-in)
  - manual                    (admin-entered / bulk-pasted / imported email list)
  - combined                  (newsletter + manual deduplicated)

contact_submissions are NOT eligible for marketing campaigns.
"""

import io
import re
import csv
from typing import List, Dict, Any, Set, Optional, Tuple
from motor.motor_asyncio import AsyncIOMotorDatabase
from backend.models.email import TargetFilter

EMAIL_REGEX = re.compile(r"^[\w\.\+\-]+@[a-zA-Z0-9\.\-]+\.[a-zA-Z]{2,}$")
_CLEAN_SURROUNDING = re.compile(r"^[\s\"'<>\[\]\(\);,.]+|[\s\"'<>\[\]\(\);,.]+$")
_EMAIL_COL_PATTERNS = re.compile(r"^(e[-_]?mail([-_]?(address|id))?|mail|contact[-_]?(email)?|recipient)$", re.IGNORECASE)


def is_valid_email(email: str) -> bool:
    if not email or not isinstance(email, str):
        return False
    clean = _CLEAN_SURROUNDING.sub("", email.strip().lower())
    return bool(EMAIL_REGEX.match(clean))


def clean_email_token(token: str) -> str:
    """
    Cleans surrounding punctuation, quotes, angles, and normalizes casing.
    """
    if not token or not isinstance(token, str):
        return ""
    cleaned = _CLEAN_SURROUNDING.sub("", token.strip().lower())
    return cleaned


def parse_manual_emails(raw: List[str]) -> List[str]:
    """
    Accepts a list of raw strings that may each contain one or multiple emails
    (comma/semicolon/newline/tab/space separated). Returns a flat list of cleaned tokens.
    """
    result = []
    for entry in raw:
        if not entry:
            continue
        parts = re.split(r"[,;\n\r\t\s]+", str(entry))
        for part in parts:
            cleaned = clean_email_token(part)
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
            valid_tokens.append(clean_email_token(token))
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


def parse_recipient_file(
    file_bytes: bytes,
    filename: str,
    suppressed_set: Optional[Set[str]] = None
) -> Dict[str, Any]:
    """
    Parses an uploaded CSV or XLSX file in memory, automatically detects
    the email column, and returns an authoritative analysis of valid/invalid/duplicate recipients.
    """
    ext = filename.lower().split(".")[-1] if "." in filename else ""
    raw_emails: List[str] = []
    total_rows = 0
    detected_col_name: Optional[str] = None

    if ext == "csv":
        try:
            text = file_bytes.decode("utf-8-sig", errors="replace")
        except Exception:
            text = file_bytes.decode("latin-1", errors="replace")

        # Sniff delimiter (comma, semicolon, tab)
        lines = [l for l in text.splitlines() if l.strip()]
        if not lines:
            return {
                "filename": filename,
                "total_rows": 0,
                "email_column": None,
                "entered_count": 0,
                "valid_count": 0,
                "invalid_count": 0,
                "duplicate_count": 0,
                "suppressed_count": 0,
                "net_count": 0,
                "valid_emails": [],
                "invalid_samples": []
            }

        # Try csv.Sniffer
        delimiter = ","
        try:
            sample = "\n".join(lines[:10])
            sniffer = csv.Sniffer()
            dialect = sniffer.sniff(sample, delimiters=",;\t|")
            delimiter = dialect.delimiter
        except Exception:
            if ";" in lines[0] and "," not in lines[0]:
                delimiter = ";"
            elif "\t" in lines[0]:
                delimiter = "\t"

        reader = csv.reader(lines, delimiter=delimiter)
        all_rows = list(reader)
        if not all_rows:
            return {
                "filename": filename,
                "total_rows": 0,
                "email_column": None,
                "entered_count": 0,
                "valid_count": 0,
                "invalid_count": 0,
                "duplicate_count": 0,
                "suppressed_count": 0,
                "net_count": 0,
                "valid_emails": [],
                "invalid_samples": []
            }

        headers = [h.strip() for h in all_rows[0]]
        email_col_idx = -1

        # Check header row for email column pattern
        for idx, h in enumerate(headers):
            if _EMAIL_COL_PATTERNS.match(h):
                email_col_idx = idx
                detected_col_name = h
                break

        start_row_idx = 1 if email_col_idx != -1 else 0

        # If no header matched, inspect single column or scan first 5 rows
        if email_col_idx == -1:
            if len(headers) == 1:
                email_col_idx = 0
                detected_col_name = "Column 1"
                # If first row itself is valid email, start from row 0, else 1
                start_row_idx = 0 if is_valid_email(headers[0]) else 1
            else:
                # Count valid emails in each column of first 10 rows
                col_scores = [0] * len(headers)
                for r in all_rows[:10]:
                    for c_idx, val in enumerate(r):
                        if c_idx < len(col_scores) and is_valid_email(str(val)):
                            col_scores[c_idx] += 1
                max_score = max(col_scores) if col_scores else 0
                if max_score > 0:
                    email_col_idx = col_scores.index(max_score)
                    detected_col_name = headers[email_col_idx] if email_col_idx < len(headers) else f"Column {email_col_idx+1}"
                    start_row_idx = 0 if is_valid_email(headers[email_col_idx]) else 1
                else:
                    email_col_idx = 0
                    detected_col_name = headers[0] if headers else "Column 1"

        data_rows = all_rows[start_row_idx:]
        total_rows = len(data_rows)
        for r in data_rows:
            if email_col_idx < len(r):
                val = r[email_col_idx].strip()
                if val:
                    raw_emails.append(val)

    elif ext in ("xlsx", "xls"):
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(file_bytes), read_only=True, data_only=True)
        sheet = wb.active
        all_rows = list(sheet.iter_rows(values_only=True))
        if not all_rows:
            return {
                "filename": filename,
                "total_rows": 0,
                "email_column": None,
                "entered_count": 0,
                "valid_count": 0,
                "invalid_count": 0,
                "duplicate_count": 0,
                "suppressed_count": 0,
                "net_count": 0,
                "valid_emails": [],
                "invalid_samples": []
            }

        headers = [str(h).strip() if h is not None else "" for h in all_rows[0]]
        email_col_idx = -1

        for idx, h in enumerate(headers):
            if _EMAIL_COL_PATTERNS.match(h):
                email_col_idx = idx
                detected_col_name = h
                break

        start_row_idx = 1 if email_col_idx != -1 else 0

        if email_col_idx == -1:
            if len(headers) == 1:
                email_col_idx = 0
                detected_col_name = "Column 1"
                start_row_idx = 0 if is_valid_email(headers[0]) else 1
            else:
                col_scores = [0] * len(headers)
                for r in all_rows[:10]:
                    for c_idx, val in enumerate(r):
                        if c_idx < len(col_scores) and val and is_valid_email(str(val)):
                            col_scores[c_idx] += 1
                max_score = max(col_scores) if col_scores else 0
                if max_score > 0:
                    email_col_idx = col_scores.index(max_score)
                    detected_col_name = headers[email_col_idx] if email_col_idx < len(headers) else f"Column {email_col_idx+1}"
                    start_row_idx = 0 if is_valid_email(headers[email_col_idx]) else 1
                else:
                    email_col_idx = 0
                    detected_col_name = headers[0] if headers else "Column 1"

        data_rows = all_rows[start_row_idx:]
        total_rows = len(data_rows)
        for r in data_rows:
            if email_col_idx < len(r) and r[email_col_idx] is not None:
                val = str(r[email_col_idx]).strip()
                if val:
                    raw_emails.append(val)
    else:
        # Fallback to plain text line-by-line parsing
        text = file_bytes.decode("utf-8", errors="replace")
        lines = [l.strip() for l in text.splitlines() if l.strip()]
        total_rows = len(lines)
        detected_col_name = "Text Lines"
        raw_emails = lines

    analysis = analyze_manual_recipients(raw_emails, suppressed_set=suppressed_set)

    return {
        "filename": filename,
        "total_rows": total_rows,
        "email_column": detected_col_name,
        "entered_count": analysis["entered_count"],
        "valid_count": analysis["valid_count"],
        "invalid_count": analysis["invalid_count"],
        "duplicate_count": analysis["duplicate_count"],
        "suppressed_count": analysis["suppressed_count"],
        "net_count": analysis["net_count"],
        "valid_emails": analysis["net_sendable"],
        "invalid_samples": analysis["invalid_samples"]
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
    Extracts, normalizes, deduplicates, and filters audience against suppressions
    and campaign-level exclusions.

    Supported sources (V1):
      - "newsletter_subscriptions"  → from DB collection
      - "manual"                    → from target_filter.custom_emails (admin-entered / imported)
      - "combined"                  → newsletter + manual, deduplicated

    Returns list of recipient dicts: [{email, name, company, source, source_id}]
    """
    suppressed_set = await get_suppressed_emails(db)

    # Build normalized exclusion set
    excluded_set: Set[str] = set()
    if target_filter.excluded_emails:
        for e in target_filter.excluded_emails:
            cleaned = clean_email_token(str(e))
            if cleaned:
                excluded_set.add(cleaned)

    seen_emails: Set[str] = set()
    recipients: List[Dict[str, Any]] = []

    source = target_filter.source

    # --- Newsletter Subscriptions ---
    if source in ("newsletter_subscriptions", "combined"):
        subs = await db.newsletter_subscriptions.find({}).to_list(10000)
        for s in subs:
            email = clean_email_token(s.get("email", ""))
            if is_valid_email(email) and email not in seen_emails and email not in suppressed_set and email not in excluded_set:
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
            if email not in seen_emails and email not in excluded_set:
                seen_emails.add(email)
                recipients.append({
                    "email": email,
                    "name": None,
                    "company": None,
                    "source": "manual",
                    "source_id": None
                })

    return recipients
