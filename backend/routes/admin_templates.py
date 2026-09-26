import re
import uuid
import inspect
from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from backend.core.auth import get_current_admin
from backend.core.config import settings
from backend.models.email import (
    EmailTemplateStudio,
    TemplateVersionHistory,
    TemplateCreate,
    TemplateUpdate,
    TemplatePreviewRequest,
    get_utc_now
)
from backend.services.email.renderer import (
    render_final_email,
    interpolate_variables,
    check_html_compatibility,
    validate_template_variables
)
from backend.services.email.templates import (
    get_blank_corporate_template_html,
    get_independence_day_campaign_html,
    get_contact_acknowledgement_fragment,
    get_newsletter_welcome_fragment,
    get_advance_tax_alert_html,
    get_itr_checklist_html,
    get_monthly_tax_digest_html,
    get_festive_greetings_html,
)

router = APIRouter(prefix="/admin/communication/templates", tags=["Admin Templates"])

def get_db() -> AsyncIOMotorDatabase:
    from backend.server import db
    return db

# Approved sender identities allowlist (Task 8 & 9)
APPROVED_SENDER_IDENTITIES = [
    {"name": "P Suman & Associates", "email": "info@psuman.com", "role": "General & Advisory Inquiries"},
    {"name": "P Suman & Associates", "email": "info@psumanassociates.com", "role": "General Corporate Inquiries"},
    {"name": "P Suman & Associates", "email": "updates@updates.psumanassociates.com", "role": "Default Corporate Broadcast"},
    {"name": "PSA Advisory", "email": "advisory@updates.psumanassociates.com", "role": "Regulatory & Tax Advisory"},
    {"name": "PSA Insights", "email": "insights@updates.psumanassociates.com", "role": "Thought Leadership & Newsletter"},
    {"name": "PSA Client Support", "email": "contact@updates.psumanassociates.com", "role": "Inquiry Acknowledgements"},
]

def _is_approved_sender_email(email_str: str) -> bool:
    if not email_str:
        return True  # fallback to default is allowed
    clean = email_str.strip().lower()
    approved = [s["email"].lower() for s in APPROVED_SENDER_IDENTITIES]
    # Also allow if matches configured RESEND_FROM_EMAIL
    if "@" in settings.RESEND_FROM_EMAIL:
        from_email_clean = settings.RESEND_FROM_EMAIL
        if "<" in from_email_clean and ">" in from_email_clean:
            from_email_clean = from_email_clean.split("<")[1].split(">")[0]
        approved.append(from_email_clean.strip().lower())

    # Allow verified corporate domain patterns
    allowed_domains = ["psumanassociates.com", "updates.psumanassociates.com", "psuman.com", "resend.dev"]
    domain = clean.split("@")[-1] if "@" in clean else ""
    if domain in allowed_domains:
        return True

    return clean in approved


SYSTEM_TEMPLATES_DEFINITIONS = {
    "advance_tax_alert": {
        "name": "Advance Tax Quarterly Alert",
        "category": "compliance",
        "subcategory": "Advance Tax Due Dates",
        "occasions": [
            "Q1 (June 15) — 15% Installment",
            "Q2 (September 15) — 45% Installment",
            "Q3 (December 15) — 75% Installment",
            "Q4 (March 15) — 100% Installment",
        ],
        "description": "Statutory reminder for advance tax quarterly installments with interest penalty warnings under Sec 234B/C.",
        "subject": "Advance Tax Due Date Alert — Mandatory Installment Notice",
        "preheader": "Formal statutory reminder for upcoming advance tax quarterly installment.",
        "get_fragment": get_advance_tax_alert_html,
        "variables": ["name", "company", "unsubscribe_url"]
    },
    "itr_checklist_reminder": {
        "name": "ITR Filing & Document Checklist Request",
        "category": "taxation",
        "subcategory": "Annual Tax Compliance",
        "occasions": [
            "Individual & Salaried (Due July 31)",
            "Corporate & Business Entities (Due October 31)",
            "Tax Audit & Transfer Pricing (Due November 30)",
            "Belated & Revised Returns (Sec 139(4)/(5))",
        ],
        "description": "Checklist and preparation guidance for annual Income Tax Return collation and reconciliation.",
        "subject": "Income Tax Return Filing & Required Documents Checklist — P Suman & Associates",
        "preheader": "Essential document checklist and preparation guidelines for your ITR filing.",
        "get_fragment": get_itr_checklist_html,
        "variables": ["name", "company", "unsubscribe_url"]
    },
    "monthly_tax_digest": {
        "name": "Monthly PSA Tax & Regulatory Digest",
        "category": "newsletter",
        "subcategory": "Executive Intelligence Bulletin",
        "occasions": [
            "Direct Tax & Judicial Precedents Edition",
            "GST & Indirect Tax Circulars Edition",
            "Corporate Laws & MCA Regulatory Edition",
            "Banking, FEMA & RBI Guidelines Edition",
        ],
        "description": "Monthly curated regulatory briefing covering direct tax, GST circulars, and MCA corporate governance.",
        "subject": "PSA Monthly Tax & Regulatory Digest — Executive Briefing",
        "preheader": "Executive tax intelligence, circular highlights, and statutory amendments.",
        "get_fragment": get_monthly_tax_digest_html,
        "variables": ["name", "company", "unsubscribe_url"]
    },
    "festive_greetings": {
        "name": "Diwali / Festive Greetings",
        "category": "greetings",
        "subcategory": "Festive Occasions & Milestones",
        "occasions": [
            "Diwali & Dhanteras Wishes",
            "New Year 2026 Greetings",
            "Holi Celebrations",
            "Navratri & Dussehra Wishes",
            "Independence Day (15th August)",
            "Republic Day (26th January)",
        ],
        "description": "Warm corporate greetings and wishes for clients and partners across major festivals and national milestones.",
        "subject": "Warm Festive Greetings & Best Wishes — P Suman & Associates",
        "preheader": "Wishing you joy, prosperity, and continued success this festive season.",
        "get_fragment": get_festive_greetings_html,
        "variables": ["name", "company", "unsubscribe_url"]
    },
    "blank_corporate_template": {
        "name": "Blank Corporate Template (Header & Footer Only)",
        "category": "announcement",
        "subcategory": "General & Custom Communications",
        "occasions": [
            "General Announcement",
            "Custom Advisory Memo",
            "Executive Notice",
            "Client Circular",
        ],
        "description": "Clean blank canvas with official PSA corporate header and footer, ready for any custom message or announcement.",
        "subject": "Important Communication — P Suman & Associates",
        "preheader": "Official communication from P Suman & Associates.",
        "get_fragment": get_blank_corporate_template_html,
        "variables": ["name", "company", "unsubscribe_url"]
    },
    "contact_acknowledgement": {
        "name": "Contact Inquiry Acknowledgment",
        "category": "transactional",
        "subcategory": "Client Inquiries",
        "occasions": ["New Advisory Inquiry"],
        "description": "Instant confirmation sent upon inquiry form submission.",
        "subject": "Inquiry Received — P Suman & Associates",
        "preheader": "We have received your advisory inquiry.",
        "get_fragment": get_contact_acknowledgement_fragment,
        "variables": ["name", "service_of_interest", "company", "unsubscribe_url"]
    },
    "newsletter_welcome": {
        "name": "Newsletter Welcome & Insights",
        "category": "newsletter",
        "subcategory": "Subscriber Onboarding",
        "occasions": ["New Subscriber Welcome"],
        "description": "Welcome email for new PSA Insights subscribers.",
        "subject": "Welcome to PSA Insights — P Suman & Associates",
        "preheader": "Welcome to executive tax & audit intelligence.",
        "get_fragment": get_newsletter_welcome_fragment,
        "variables": ["unsubscribe_url"]
    }
}


async def migrate_system_templates_to_v2(db: AsyncIOMotorDatabase) -> dict:
    """
    Safely normalizes known built-in system templates to fragment storage with apply_wrapper=True.
    1. Creates a safety backup snapshot in template_version_history before mutation.
    2. Updates ONLY known built-in templates (never touches custom or user-created templates).
    3. Normalizes stored content to clean fragment without redundant outer shell.
    """
    now = get_utc_now()
    results = {"backed_up": [], "migrated": [], "created": []}

    for tid, defn in SYSTEM_TEMPLATES_DEFINITIONS.items():
        existing = await db.email_templates_studio.find_one({"template_id": tid})
        fragment_html = defn["get_fragment"]()
        subject = defn["subject"]
        preheader = defn.get("preheader", "")
        subcategory = defn.get("subcategory")
        occasions = defn.get("occasions")

        if existing:
            old_version = existing.get("version", 1)
            history_entry = TemplateVersionHistory(
                template_id=tid,
                version_number=old_version,
                subject=existing.get("published_subject") or existing.get("draft_subject") or subject,
                body_html=existing.get("published_body_html") or existing.get("draft_body_html") or "",
                preheader=existing.get("published_preheader") or existing.get("draft_preheader") or preheader,
                apply_wrapper=existing.get("apply_wrapper"),
                created_by="system_migration_phase4",
                created_at=now
            )
            await db.template_version_history.insert_one(history_entry.model_dump())
            results["backed_up"].append({"template_id": tid, "version": old_version})

            new_version = old_version + 1
            update_data = {
                "name": defn["name"],
                "category": defn["category"],
                "subcategory": subcategory,
                "occasions": occasions,
                "description": defn["description"],
                "published_subject": subject,
                "published_body_html": fragment_html,
                "published_preheader": preheader,
                "draft_subject": subject,
                "draft_body_html": fragment_html,
                "draft_preheader": preheader,
                "apply_wrapper": True,
                "is_system_template": True,
                "system_template_key": tid,
                "system_template_revision": 2,
                "has_pending_draft": False,
                "version": new_version,
                "variables": defn["variables"],
                "updated_at": now
            }
            await db.email_templates_studio.update_one({"template_id": tid}, {"$set": update_data})
            results["migrated"].append({"template_id": tid, "new_version": new_version})
        else:
            t = EmailTemplateStudio(
                template_id=tid,
                name=defn["name"],
                category=defn["category"],
                subcategory=subcategory,
                occasions=occasions,
                description=defn["description"],
                published_subject=subject,
                published_body_html=fragment_html,
                published_preheader=preheader,
                draft_subject=subject,
                draft_body_html=fragment_html,
                draft_preheader=preheader,
                apply_wrapper=True,
                is_system_template=True,
                system_template_key=tid,
                system_template_revision=2,
                has_pending_draft=False,
                version=1,
                variables=defn["variables"],
                sender_name="P Suman & Associates",
                sender_email="updates@updates.psumanassociates.com",
                created_at=now,
                updated_at=now
            )
            await db.email_templates_studio.insert_one(t.model_dump())
            results["created"].append({"template_id": tid, "version": 1})

    # Clean up deprecated independence_day template
    if hasattr(db.email_templates_studio, "delete_many"):
        del_res = db.email_templates_studio.delete_many({
            "$or": [
                {"template_id": "independence_day_2026"},
                {"system_template_key": "independence_day_2026"}
            ]
        })
        if inspect.isawaitable(del_res):
            await del_res

    return results


async def seed_default_templates_if_empty(db: AsyncIOMotorDatabase):
    # 1. Purge deprecated Independence Day and legacy Welcome templates from database
    if hasattr(db.email_templates_studio, "delete_many"):
        del_res = db.email_templates_studio.delete_many({
            "$or": [
                {"template_id": "independence_day_2026"},
                {"system_template_key": "independence_day_2026"},
                {"name": {"$regex": "independence day", "$options": "i"}},
                {"name": {"$regex": "^welcome template", "$options": "i"}},
                {"template_id": "f990c681-48dd-4d64-b17f-790ae0bca3ba"},
            ]
        })
        if inspect.isawaitable(del_res):
            await del_res

    # 2. Normalize any legacy "Dear {{name}}," in existing templates to "Dear Valued Customer,"
    if hasattr(db.email_templates_studio, "find"):
        cursor = db.email_templates_studio.find({
            "$or": [
                {"published_body_html": {"$regex": r"Dear\s*\{\{+.*name.*\}\}+"}},
                {"draft_body_html": {"$regex": r"Dear\s*\{\{+.*name.*\}\}+"}}
            ]
        })
        if hasattr(cursor, "__aiter__"):
            async for doc in cursor:
                p_html = doc.get("published_body_html") or ""
                d_html = doc.get("draft_body_html") or ""
                p_new = re.sub(r"Dear\s*\{\{+\s*name\s*\}\}+,", "Dear Valued Customer,", p_html)
                d_new = re.sub(r"Dear\s*\{\{+\s*name\s*\}\}+,", "Dear Valued Customer,", d_html)
                up_res = db.email_templates_studio.update_one(
                    {"_id": doc["_id"]},
                    {"$set": {"published_body_html": p_new, "draft_body_html": d_new}}
                )
                if inspect.isawaitable(up_res):
                    await up_res

    # 3. Ensure all active system templates from SYSTEM_TEMPLATES_DEFINITIONS exist
    try:
        now = get_utc_now()
        for tid, defn in SYSTEM_TEMPLATES_DEFINITIONS.items():
            existing = await db.email_templates_studio.find_one({"template_id": tid})
            if not existing:
                fragment_html = defn["get_fragment"]()
                t = EmailTemplateStudio(
                    template_id=tid,
                    name=defn["name"],
                    category=defn["category"],
                    subcategory=defn.get("subcategory"),
                    occasions=defn.get("occasions"),
                    description=defn["description"],
                    published_subject=defn["subject"],
                    published_body_html=fragment_html,
                    published_preheader=defn.get("preheader", ""),
                    draft_subject=defn["subject"],
                    draft_body_html=fragment_html,
                    draft_preheader=defn.get("preheader", ""),
                    apply_wrapper=True,
                    is_system_template=True,
                    system_template_key=tid,
                    system_template_revision=2,
                    has_pending_draft=False,
                    version=1,
                    variables=defn["variables"],
                    sender_name="P Suman & Associates",
                    sender_email="updates@updates.psumanassociates.com",
                    created_at=now,
                    updated_at=now
                )
                await db.email_templates_studio.insert_one(t.model_dump())
    except (StopIteration, StopAsyncIteration):
        pass


@router.get("/senders/approved", dependencies=[Depends(get_current_admin)])
@router.get("/senders", dependencies=[Depends(get_current_admin)])
async def get_approved_senders():
    """Returns list of approved sending identities."""
    return APPROVED_SENDER_IDENTITIES


@router.get("", response_model=List[EmailTemplateStudio], dependencies=[Depends(get_current_admin)])
async def list_templates(
    include_archived: bool = Query(False, description="Whether to include archived templates"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    await seed_default_templates_if_empty(db)
    query: Dict[str, Any] = {}
    if not include_archived:
        query["is_archived"] = {"$ne": True}
    
    templates = await db.email_templates_studio.find(query, {"_id": 0}).sort("created_at", 1).to_list(100)
    filtered_templates = [
        t for t in templates
        if t.get("template_id") not in ["independence_day_2026", "f990c681-48dd-4d64-b17f-790ae0bca3ba"]
        and not re.search(r"(independence day|^welcome template)", t.get("name", ""), re.I)
    ]
    return [EmailTemplateStudio(**t) for t in filtered_templates]


def get_curated_template_variation(template_id: str, occasion: Optional[str] = None) -> Dict[str, str]:
    """
    Returns curated subject, preheader, and body_html for a given template and occasion/sub-theme.
    """
    if template_id == "advance_tax_alert":
        occ = (occasion or "").lower()
        if "q1" in occ or "june" in occ or "15%" in occ:
            subj = "Advance Tax Alert: 1st Installment (15%) Due on 15th June — P Suman & Associates"
            pre = "Mandatory 15% Advance Tax deposit deadline reminder under Section 208."
        elif "q2" in occ or "september" in occ or "45%" in occ:
            subj = "Advance Tax Alert: 2nd Installment (45%) Due on 15th September — P Suman & Associates"
            pre = "Mandatory cumulative 45% Advance Tax deposit deadline reminder."
        elif "q3" in occ or "december" in occ or "75%" in occ:
            subj = "Advance Tax Alert: 3rd Installment (75%) Due on 15th December — P Suman & Associates"
            pre = "Mandatory cumulative 75% Advance Tax deposit deadline reminder."
        elif "q4" in occ or "march" in occ or "100%" in occ:
            subj = "Advance Tax Alert: Final Installment (100%) Due on 15th March — P Suman & Associates"
            pre = "Mandatory 100% year-end Advance Tax settlement notice."
        else:
            subj = "Advance Tax Due Date Alert — Mandatory Installment Notice"
            pre = "Formal statutory reminder for upcoming advance tax quarterly installment."
        return {
            "subject": subj,
            "preheader": pre,
            "body_html": get_advance_tax_alert_html(occasion),
            "occasion": occasion or ""
        }

    elif template_id == "itr_checklist_reminder":
        occ = (occasion or "").lower()
        if "individual" in occ or "salaried" in occ or "july" in occ:
            subj = "ITR Filing Checklist for Individuals & Salaried Taxpayers — Due 31st July"
            pre = "Collate Form 16, AIS, TIS and investment proofs for timely error-free filing."
        elif "corporate" in occ or "business" in occ or "october" in occ:
            subj = "Corporate Income Tax Return (ITR-6) Checklist & Filing Notice — Due 31st October"
            pre = "Checklist for corporate tax returns, audited balance sheets, and statutory disclosures."
        elif "audit" in occ or "transfer pricing" in occ or "november" in occ:
            subj = "Tax Audit (Form 3CD) & Transfer Pricing Checklist — Due 30th November"
            pre = "Critical documentation guidelines for tax audit and international transactions."
        elif "belated" in occ or "revised" in occ or "139" in occ:
            subj = "Notice for Filing Belated or Revised Returns (Sec 139(4)/(5)) — P Suman & Associates"
            pre = "Statutory cut-off notice to rectify returns and mitigate late filing fees."
        else:
            subj = "Income Tax Return Filing & Required Documents Checklist — P Suman & Associates"
            pre = "Essential document checklist and preparation guidelines for your ITR filing."
        return {
            "subject": subj,
            "preheader": pre,
            "body_html": get_itr_checklist_html(occasion),
            "occasion": occasion or ""
        }

    elif template_id == "monthly_tax_digest":
        occ = (occasion or "").lower()
        if "direct" in occ or "judicial" in occ:
            subj = "Direct Tax Digest: Landmark Judicial Precedents & Rulings — PSA Insights"
            pre = "Executive briefing on High Court & ITAT decisions, Section 14A, and CBDT circulars."
        elif "gst" in occ or "indirect" in occ:
            subj = "GST Regulatory Briefing: Recent Circulars, ITC Norms & E-Invoicing — PSA Insights"
            pre = "CBIC notifications, corporate guarantee valuations, and ITC reconciliation mandates."
        elif "corporate" in occ or "mca" in occ:
            subj = "MCA Corporate Governance: Demat of Shares, SBO & CSR Audits — PSA Insights"
            pre = "Companies Act updates, private company share dematerialization, and annual filings."
        elif "fema" in occ or "banking" in occ or "rbi" in occ:
            subj = "Cross-Border & Banking Digest: FEMA, ODI & RBI Directions — PSA Insights"
            pre = "Overseas direct investments, foreign liabilities reporting, and ECB compliance."
        else:
            subj = "PSA Monthly Tax & Regulatory Digest — Executive Briefing"
            pre = "Executive tax intelligence, circular highlights, and statutory amendments."
        return {
            "subject": subj,
            "preheader": pre,
            "body_html": get_monthly_tax_digest_html(occasion),
            "occasion": occasion or ""
        }

    elif template_id == "festive_greetings":
        occ = (occasion or "").lower()
        if "diwali" in occ or "dhanteras" in occ:
            subj = "Shubh Deepawali & Dhanteras Wishes — P Suman & Associates"
            pre = "Wishing you, your family, and your enterprise immense joy, health, and financial prosperity."
        elif "new year" in occ or "2026" in occ:
            subj = "Happy New Year 2026 — Warm Wishes from P Suman & Associates"
            pre = "Celebrating new milestones, bold aspirations, and continued professional excellence in 2026."
        elif "holi" in occ:
            subj = "Joyous & Colorful Holi Greetings — P Suman & Associates"
            pre = "Wishing you and your loved ones a joyful, vibrant, and prosperous Holi."
        elif "navratri" in occ or "dussehra" in occ:
            subj = "Auspicious Navratri & Vijayadashami Greetings — P Suman & Associates"
            pre = "May this auspicious season bring victory of good over evil and enduring success."
        elif "independence" in occ or "15th august" in occ:
            subj = "Happy 80th Independence Day — P Suman & Associates"
            pre = "One Vision for Viksit Bharat 2047 — Warm Independence Day Wishes."
        elif "republic" in occ or "26th january" in occ:
            subj = "Happy Republic Day — P Suman & Associates"
            pre = "Celebrating the Constitution, democratic values, and economic sovereignty of India."
        else:
            subj = "Warm Festive Greetings & Best Wishes — P Suman & Associates"
            pre = "Wishing you joy, prosperity, and continued success this festive season."
        return {
            "subject": subj,
            "preheader": pre,
            "body_html": get_festive_greetings_html(occasion),
            "occasion": occasion or ""
        }

    elif template_id == "blank_corporate_template":
        return {
            "subject": f"{occasion} — P Suman & Associates" if occasion else "Important Communication — P Suman & Associates",
            "preheader": f"{occasion} from P Suman & Associates." if occasion else "Official communication from P Suman & Associates.",
            "body_html": get_blank_corporate_template_html(),
            "occasion": occasion or ""
        }

    return {
        "subject": "",
        "preheader": "",
        "body_html": "",
        "occasion": occasion or ""
    }


@router.get("/{template_id}/curated-variation", dependencies=[Depends(get_current_admin)])
async def get_curated_variation(
    template_id: str,
    occasion: Optional[str] = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    variation = get_curated_template_variation(template_id, occasion)
    if not variation["body_html"]:
        t = await db.email_templates_studio.find_one({"template_id": template_id}, {"_id": 0})
        if not t:
            raise HTTPException(status_code=404, detail="Template not found")
        return {
            "subject": t.get("published_subject") or t.get("draft_subject"),
            "preheader": t.get("published_preheader") or t.get("draft_preheader") or "",
            "body_html": t.get("published_body_html") or t.get("draft_body_html") or "",
            "occasion": occasion or ""
        }
    return variation


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

    if payload.sender_email and not _is_approved_sender_email(payload.sender_email):
        raise HTTPException(
            status_code=400,
            detail=f"Sender email '{payload.sender_email}' is not in approved sender allowlist."
        )

    clean_subject = re.sub(r"[\r\n]+", " ", payload.subject).strip()[:250]
    now = get_utc_now()

    template = EmailTemplateStudio(
        template_id=payload.template_id,
        name=payload.name,
        category=payload.category,
        description=payload.description or "",
        published_subject=clean_subject if payload.publish_immediately else "",
        published_body_html=payload.body_html if payload.publish_immediately else "",
        published_preheader=payload.preheader if payload.publish_immediately else "",
        draft_subject=clean_subject,
        draft_body_html=payload.body_html,
        draft_preheader=payload.preheader or "",
        apply_wrapper=payload.apply_wrapper,
        sender_name=payload.sender_name or "P Suman & Associates",
        sender_email=payload.sender_email,
        reply_to=payload.reply_to,
        cc=payload.cc,
        bcc=payload.bcc,
        tags=payload.tags,
        has_pending_draft=not payload.publish_immediately,
        version=1,
        variables=payload.variables or ["name", "company", "unsubscribe_url"],
        last_published_at=now if payload.publish_immediately else None,
        published_by="admin" if payload.publish_immediately else None,
        created_at=now,
        updated_at=now
    )

    if payload.publish_immediately:
        history_entry = TemplateVersionHistory(
            template_id=payload.template_id,
            version_number=1,
            subject=clean_subject,
            body_html=payload.body_html,
            preheader=payload.preheader or "",
            apply_wrapper=payload.apply_wrapper,
            sender_name=payload.sender_name,
            sender_email=payload.sender_email,
            reply_to=payload.reply_to,
            cc=payload.cc,
            bcc=payload.bcc,
            tags=payload.tags,
            change_summary="Initial publication",
            created_at=now
        )
        await db.template_version_history.insert_one(history_entry.model_dump())

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

    if payload.sender_email and not _is_approved_sender_email(payload.sender_email):
        raise HTTPException(
            status_code=400,
            detail=f"Sender email '{payload.sender_email}' is not in approved sender allowlist."
        )

    now = get_utc_now()
    update_data: Dict[str, Any] = {"updated_at": now}

    if payload.name is not None:
        update_data["name"] = payload.name
    if payload.category is not None:
        update_data["category"] = payload.category
    if payload.description is not None:
        update_data["description"] = payload.description
    if payload.apply_wrapper is not None:
        update_data["apply_wrapper"] = payload.apply_wrapper
    if payload.sender_name is not None:
        update_data["sender_name"] = payload.sender_name
    if payload.sender_email is not None:
        update_data["sender_email"] = payload.sender_email
    if payload.reply_to is not None:
        update_data["reply_to"] = payload.reply_to
    if payload.cc is not None:
        update_data["cc"] = payload.cc
    if payload.bcc is not None:
        update_data["bcc"] = payload.bcc
    if payload.tags is not None:
        update_data["tags"] = payload.tags
    if payload.variables is not None:
        update_data["variables"] = payload.variables

    # Update draft fields
    is_draft_modified = False
    if payload.subject is not None:
        clean_subj = re.sub(r"[\r\n]+", " ", payload.subject).strip()[:250]
        update_data["draft_subject"] = clean_subj
        is_draft_modified = True
    if payload.body_html is not None:
        update_data["draft_body_html"] = payload.body_html
        is_draft_modified = True
    if payload.preheader is not None:
        update_data["draft_preheader"] = payload.preheader
        is_draft_modified = True

    if is_draft_modified:
        update_data["has_pending_draft"] = True
        update_data["draft_updated_at"] = now

    effective_wrapper = payload.apply_wrapper if payload.apply_wrapper is not None else template.get("apply_wrapper", True)

    if payload.publish_immediately:
        new_version = template.get("version", 1) + 1
        subj_to_pub = (
            update_data.get("draft_subject")
            or template.get("draft_subject")
            or template.get("published_subject")
            or ""
        )
        body_to_pub = (
            update_data.get("draft_body_html")
            or template.get("draft_body_html")
            or template.get("published_body_html")
            or ""
        )
        preheader_to_pub = (
            update_data.get("draft_preheader")
            if "draft_preheader" in update_data
            else template.get("draft_preheader", "")
        )

        history_entry = TemplateVersionHistory(
            template_id=template_id,
            version_number=new_version,
            subject=subj_to_pub,
            body_html=body_to_pub,
            preheader=preheader_to_pub,
            apply_wrapper=effective_wrapper,
            sender_name=update_data.get("sender_name") or template.get("sender_name"),
            sender_email=update_data.get("sender_email") or template.get("sender_email"),
            reply_to=update_data.get("reply_to") or template.get("reply_to"),
            cc=update_data.get("cc") or template.get("cc"),
            bcc=update_data.get("bcc") or template.get("bcc"),
            tags=update_data.get("tags") or template.get("tags"),
            change_summary="Published changes",
            created_at=now
        )
        await db.template_version_history.insert_one(history_entry.model_dump())

        update_data["published_subject"] = subj_to_pub
        update_data["published_body_html"] = body_to_pub
        update_data["published_preheader"] = preheader_to_pub
        update_data["draft_subject"] = subj_to_pub
        update_data["draft_body_html"] = body_to_pub
        update_data["draft_preheader"] = preheader_to_pub
        update_data["has_pending_draft"] = False
        update_data["version"] = new_version
        update_data["last_published_at"] = now
        update_data["published_by"] = "admin"

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
    subj_to_pub = template.get("draft_subject") or template.get("published_subject") or ""
    body_to_pub = template.get("draft_body_html") or template.get("published_body_html") or ""
    preheader_to_pub = template.get("draft_preheader") if template.get("draft_preheader") is not None else template.get("published_preheader", "")
    apply_wrapper = template.get("apply_wrapper", True)

    history_entry = TemplateVersionHistory(
        template_id=template_id,
        version_number=new_version,
        subject=subj_to_pub,
        body_html=body_to_pub,
        preheader=preheader_to_pub,
        apply_wrapper=apply_wrapper,
        sender_name=template.get("sender_name"),
        sender_email=template.get("sender_email"),
        reply_to=template.get("reply_to"),
        cc=template.get("cc"),
        bcc=template.get("bcc"),
        tags=template.get("tags"),
        change_summary=f"Published version {new_version}",
        created_at=now
    )
    await db.template_version_history.insert_one(history_entry.model_dump())

    update_data = {
        "published_subject": subj_to_pub,
        "published_body_html": body_to_pub,
        "published_preheader": preheader_to_pub,
        "draft_subject": subj_to_pub,
        "draft_body_html": body_to_pub,
        "draft_preheader": preheader_to_pub,
        "has_pending_draft": False,
        "version": new_version,
        "last_published_at": now,
        "published_by": "admin",
        "updated_at": now
    }
    await db.email_templates_studio.update_one({"template_id": template_id}, {"$set": update_data})
    updated = await db.email_templates_studio.find_one({"template_id": template_id}, {"_id": 0})
    return EmailTemplateStudio(**updated)


@router.post("/{template_id}/duplicate", response_model=EmailTemplateStudio, dependencies=[Depends(get_current_admin)])
async def duplicate_template(template_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Duplicates an existing template into a new independent user draft.
    Does not inherit system-template identity.
    """
    source = await db.email_templates_studio.find_one({"template_id": template_id})
    if not source:
        raise HTTPException(status_code=404, detail="Source template not found")

    now = get_utc_now()
    random_suffix = uuid.uuid4().hex[:6]
    clean_id_base = re.sub(r"[^a-zA-Z0-9_]+", "_", source.get("name", "template")).lower()[:20]
    new_template_id = f"{clean_id_base}_copy_{random_suffix}"
    new_name = f"Copy of {source.get('name', 'Template')}"

    subj = source.get("draft_subject") or source.get("published_subject") or ""
    body = source.get("draft_body_html") or source.get("published_body_html") or ""
    preheader = source.get("draft_preheader") or source.get("published_preheader") or ""

    new_template = EmailTemplateStudio(
        template_id=new_template_id,
        name=new_name,
        category=source.get("category", "announcement"),
        description=f"Cloned from {source.get('name')}",
        published_subject="",
        published_body_html="",
        published_preheader="",
        draft_subject=subj,
        draft_body_html=body,
        draft_preheader=preheader,
        apply_wrapper=source.get("apply_wrapper", True),
        has_pending_draft=True,
        version=1,
        is_system_template=False,
        system_template_key=None,
        system_template_revision=1,
        sender_name=source.get("sender_name", "P Suman & Associates"),
        sender_email=source.get("sender_email"),
        reply_to=source.get("reply_to"),
        cc=source.get("cc"),
        bcc=source.get("bcc"),
        tags=source.get("tags"),
        clone_source_template_id=template_id,
        is_archived=False,
        variables=source.get("variables") or ["name", "company", "unsubscribe_url"],
        created_at=now,
        updated_at=now,
        draft_updated_at=now
    )

    await db.email_templates_studio.insert_one(new_template.model_dump())
    return new_template


@router.post("/{template_id}/archive", response_model=EmailTemplateStudio, dependencies=[Depends(get_current_admin)])
async def archive_template(template_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Safely archives a template. Blocks archiving of required active system autoresponders.
    """
    template = await db.email_templates_studio.find_one({"template_id": template_id})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    if template.get("is_system_template") and template.get("system_template_key") in ("contact_acknowledgement", "newsletter_welcome"):
        raise HTTPException(
            status_code=400,
            detail=f"Template '{template_id}' is a required active system autoresponder and cannot be archived."
        )

    now = get_utc_now()
    await db.email_templates_studio.update_one(
        {"template_id": template_id},
        {"$set": {"is_archived": True, "updated_at": now}}
    )
    updated = await db.email_templates_studio.find_one({"template_id": template_id}, {"_id": 0})
    return EmailTemplateStudio(**updated)


@router.post("/{template_id}/unarchive", response_model=EmailTemplateStudio, dependencies=[Depends(get_current_admin)])
async def unarchive_template(template_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    template = await db.email_templates_studio.find_one({"template_id": template_id})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    now = get_utc_now()
    await db.email_templates_studio.update_one(
        {"template_id": template_id},
        {"$set": {"is_archived": False, "updated_at": now}}
    )
    updated = await db.email_templates_studio.find_one({"template_id": template_id}, {"_id": 0})
    return EmailTemplateStudio(**updated)


@router.get("/{template_id}/history", response_model=List[TemplateVersionHistory], dependencies=[Depends(get_current_admin)])
async def get_template_history(template_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Returns version history snapshots for a template."""
    history = await db.template_version_history.find(
        {"template_id": template_id},
        {"_id": 0}
    ).sort("version_number", -1).to_list(50)
    return [TemplateVersionHistory(**h) for h in history]


@router.post("/{template_id}/restore/{version_id}", response_model=EmailTemplateStudio, dependencies=[Depends(get_current_admin)])
async def restore_version_as_draft(
    template_id: str,
    version_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Restores a historical version AS A DRAFT.
    Safety rule: Does NOT directly overwrite live published version.
    """
    template = await db.email_templates_studio.find_one({"template_id": template_id})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    snapshot = await db.template_version_history.find_one({"version_id": version_id, "template_id": template_id})
    if not snapshot:
        raise HTTPException(status_code=404, detail="Historical version snapshot not found")

    now = get_utc_now()
    update_data = {
        "draft_subject": snapshot.get("subject", ""),
        "draft_body_html": snapshot.get("body_html", ""),
        "draft_preheader": snapshot.get("preheader", ""),
        "apply_wrapper": snapshot.get("apply_wrapper", True) if snapshot.get("apply_wrapper") is not None else template.get("apply_wrapper", True),
        "sender_name": snapshot.get("sender_name") or template.get("sender_name"),
        "sender_email": snapshot.get("sender_email") or template.get("sender_email"),
        "reply_to": snapshot.get("reply_to") or template.get("reply_to"),
        "cc": snapshot.get("cc") or template.get("cc"),
        "bcc": snapshot.get("bcc") or template.get("bcc"),
        "tags": snapshot.get("tags") or template.get("tags"),
        "has_pending_draft": True,
        "draft_updated_at": now,
        "updated_at": now
    }
    await db.email_templates_studio.update_one({"template_id": template_id}, {"$set": update_data})
    updated = await db.email_templates_studio.find_one({"template_id": template_id}, {"_id": 0})
    return EmailTemplateStudio(**updated)


@router.post("/preview", dependencies=[Depends(get_current_admin)])
async def preview_template(payload: TemplatePreviewRequest):
    """
    Renders preview with full delivery metadata, variable analysis, and compatibility checks.
    """
    analysis = validate_template_variables(f"{payload.subject} {payload.body_html} {payload.preheader or ''}")
    compatibility = check_html_compatibility(payload.body_html)

    vars_map = {
        "name": payload.recipient_name or "Valued Customer",
        "company": payload.recipient_company or "Acme Corp",
        "email": payload.recipient_email or "client@example.com",
        "unsubscribe_url": "https://psumanassociates.com/unsubscribe?sample=true",
        "year": datetime.now(timezone.utc).year,
        "service_of_interest": "Corporate Advisory"
    }

    rendered_subj = interpolate_variables(payload.subject, vars_map)
    rendered_preheader = interpolate_variables(payload.preheader or "", vars_map)

    full_html, plain_text = render_final_email(
        body_html=payload.body_html,
        variables=vars_map,
        unsubscribe_url=vars_map["unsubscribe_url"],
        apply_wrapper=payload.apply_wrapper if payload.apply_wrapper is not None else True,
        preheader=rendered_preheader
    )

    from_name = payload.sender_name or "P Suman & Associates"
    from_email = payload.sender_email or "updates@updates.psumanassociates.com"
    from_header = f"{from_name} <{from_email}>"

    return {
        "subject": rendered_subj,
        "preheader": rendered_preheader,
        "html": full_html,
        "plain_text": plain_text,
        "metadata": {
            "from": from_header,
            "sender_name": from_name,
            "sender_email": from_email,
            "reply_to": payload.reply_to or settings.RESEND_REPLY_TO,
            "to": f"{vars_map['name']} <{vars_map['email']}>",
            "cc": payload.cc or [],
            "bcc": payload.bcc or [],
            "apply_wrapper": payload.apply_wrapper if payload.apply_wrapper is not None else True,
            "layout_mode": "PSA Corporate Layout (780px)" if (payload.apply_wrapper is not False) else "Complete Custom HTML"
        },
        "compatibility_warnings": compatibility,
        "variable_analysis": analysis
    }


@router.delete("/{template_id}/draft", response_model=EmailTemplateStudio, dependencies=[Depends(get_current_admin)])
async def discard_draft(template_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    template = await db.email_templates_studio.find_one({"template_id": template_id})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    now = get_utc_now()
    pub_subj = template.get("published_subject", "")
    pub_body = template.get("published_body_html", "")
    pub_preheader = template.get("published_preheader", "")

    update_data = {
        "draft_subject": pub_subj,
        "draft_body_html": pub_body,
        "draft_preheader": pub_preheader,
        "has_pending_draft": False,
        "updated_at": now
    }
    await db.email_templates_studio.update_one({"template_id": template_id}, {"$set": update_data})
    updated = await db.email_templates_studio.find_one({"template_id": template_id}, {"_id": 0})
    return EmailTemplateStudio(**updated)


@router.post("/migrate-system-templates", dependencies=[Depends(get_current_admin)])
async def trigger_system_template_migration(db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Safely normalizes known built-in system templates to fragment storage with apply_wrapper=True.
    Backed up to template_version_history before mutation.
    """
    results = await migrate_system_templates_to_v2(db)
    return {
        "status": "success",
        "message": "System templates successfully migrated to v2 responsive architecture",
        "details": results
    }
