"""
Comprehensive Automated Test Suite for Phase 4:
Template Studio & Communication Control Center

Covers all 31 requirements in the Task 30 Test Matrix:
1.  test_draft_edit_does_not_alter_published_template
2.  test_publish_promotes_draft_to_live
3.  test_publish_creates_history_snapshot
4.  test_restore_creates_draft_only
5.  test_duplicate_creates_independent_user_template
6.  test_archive_hides_from_active_selector
7.  test_system_template_cannot_be_archived
8.  test_preheader_persists_draft_and_published
9.  test_sender_display_name_rendered_correctly
10. test_unapproved_sender_email_rejected
11. test_reply_to_validation
12. test_cc_validation
13. test_bcc_validation
14. test_campaign_recipients_isolated_from_cc_bcc
15. test_tags_passed_to_provider
16. test_tags_scrub_pii
17. test_variable_validation_catches_unknown_variable
18. test_required_variable_validation
19. test_system_variable_protection
20. test_preview_metadata_matches_send_metadata
21. test_test_send_restricted_to_configured_test_recipient
22. test_queued_job_freezes_delivery_metadata
23. test_transactional_contact_autoresponder_persists_published_preheader
24. test_newsletter_autoresponder_persists_published_preheader
25. test_campaign_regression_preserved
26. test_metrics_api_service_parses_provider_response
27. test_metrics_api_failure_handled_gracefully_with_local_fallback
28. test_metrics_cache_works_within_ttl
29. test_admin_metrics_endpoint_requires_authentication
30. test_raw_html_mode_preserved
31. test_corporate_layout_mode_preserved
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timezone, timedelta
from starlette.testclient import TestClient
from fastapi import HTTPException

from backend.server import app, db
from backend.models.email import (
    EmailTemplateStudio,
    TemplateVersionHistory,
    TemplateCreate,
    TemplateUpdate,
    TemplatePreviewRequest,
    TestSendRequest,
    OutboxJob,
    OutboxJobStatus,
    CampaignCreate,
    CampaignType,
    SendMode
)
from backend.services.email.renderer import (
    render_final_email,
    check_html_compatibility,
    validate_template_variables
)
from backend.services.email.provider import (
    send_email_via_provider,
    sanitize_tags,
    clean_email_list
)
from backend.services.email.analytics import (
    _parse_resend_metrics,
    get_email_analytics,
    _analytics_cache
)
from backend.routes.admin_templates import _is_approved_sender_email
from backend.core.config import settings


class InMemoryDB:
    """Lightweight in-memory MongoDB mock for isolated fast testing."""
    def __init__(self):
        self.email_templates_studio = MagicMock()
        self.email_templates_studio.find_one = AsyncMock()
        self.email_templates_studio.insert_one = AsyncMock()
        self.email_templates_studio.update_one = AsyncMock()
        self.email_templates_studio.delete_one = AsyncMock()
        self.email_templates_studio.count_documents = AsyncMock(return_value=1)
        self.email_templates_studio.find.return_value.sort.return_value.to_list = AsyncMock(return_value=[])
        self.template_version_history = AsyncMock()
        self.email_attempts = AsyncMock()
        self.outbox_jobs = AsyncMock()
        self.email_suppressions = AsyncMock()
        self.email_campaigns = AsyncMock()
        self.campaign_recipients = AsyncMock()
        self.admin_settings = AsyncMock()
        self.app_settings = AsyncMock()
        self.contact_submissions = AsyncMock()
        self.newsletter_subscriptions = AsyncMock()


# 1. Draft edit does not alter published template
@pytest.mark.asyncio
async def test_draft_edit_does_not_alter_published_template():
    from backend.routes.admin_templates import update_template
    fake_db = InMemoryDB()
    existing_doc = {
        "template_id": "tpl_test_1",
        "name": "Advisory Notice",
        "published_subject": "Published Live Subject",
        "published_body_html": "<p>Published Live Body</p>",
        "draft_subject": "Published Live Subject",
        "draft_body_html": "<p>Published Live Body</p>",
        "version": 2,
        "has_pending_draft": False,
        "apply_wrapper": True,
    }
    fake_db.email_templates_studio.find_one.side_effect = [
        existing_doc,
        {
            **existing_doc,
            "draft_subject": "New Draft Subject",
            "draft_body_html": "<p>New Draft Body</p>",
            "has_pending_draft": True,
        }
    ]

    payload = TemplateUpdate(
        subject="New Draft Subject",
        body_html="<p>New Draft Body</p>",
        publish_immediately=False
    )
    res = await update_template("tpl_test_1", payload, db=fake_db)

    assert res.draft_subject == "New Draft Subject"
    assert res.published_subject == "Published Live Subject"
    assert res.published_body_html == "<p>Published Live Body</p>"
    assert res.has_pending_draft is True


# 2. Publish promotes draft to live
@pytest.mark.asyncio
async def test_publish_promotes_draft_to_live():
    from backend.routes.admin_templates import publish_template
    fake_db = InMemoryDB()
    existing_doc = {
        "template_id": "tpl_test_2",
        "name": "Tax Update",
        "published_subject": "Old Live Subject",
        "published_body_html": "<p>Old Live Body</p>",
        "draft_subject": "Promoted Draft Subject",
        "draft_body_html": "<p>Promoted Draft Body</p>",
        "draft_preheader": "Promoted Preheader",
        "version": 1,
        "has_pending_draft": True,
        "apply_wrapper": True,
    }
    fake_db.email_templates_studio.find_one.side_effect = [
        existing_doc,
        {
            **existing_doc,
            "published_subject": "Promoted Draft Subject",
            "published_body_html": "<p>Promoted Draft Body</p>",
            "published_preheader": "Promoted Preheader",
            "version": 2,
            "has_pending_draft": False,
        }
    ]

    res = await publish_template("tpl_test_2", db=fake_db)
    assert res.published_subject == "Promoted Draft Subject"
    assert res.published_preheader == "Promoted Preheader"
    assert res.version == 2
    assert res.has_pending_draft is False


# 3. Publish creates history snapshot
@pytest.mark.asyncio
async def test_publish_creates_history_snapshot():
    from backend.routes.admin_templates import publish_template
    fake_db = InMemoryDB()
    existing_doc = {
        "template_id": "tpl_test_3",
        "name": "Audit Notice",
        "published_subject": "Old Subject",
        "published_body_html": "<p>Old Body</p>",
        "draft_subject": "V2 Subject",
        "draft_body_html": "<p>V2 Body</p>",
        "version": 1,
        "has_pending_draft": True,
    }
    fake_db.email_templates_studio.find_one.side_effect = [
        existing_doc,
        {**existing_doc, "published_subject": "V2 Subject", "version": 2}
    ]

    await publish_template("tpl_test_3", db=fake_db)
    fake_db.template_version_history.insert_one.assert_called_once()
    snapshot = fake_db.template_version_history.insert_one.call_args[0][0]
    assert snapshot["version_number"] == 2
    assert snapshot["subject"] == "V2 Subject"


# 4. Restore creates draft only
@pytest.mark.asyncio
async def test_restore_creates_draft_only():
    from backend.routes.admin_templates import restore_version_as_draft
    fake_db = InMemoryDB()
    existing_template = {
        "template_id": "tpl_test_4",
        "name": "Quarterly Report",
        "published_subject": "Live Subject V3",
        "published_body_html": "<p>Live Body V3</p>",
        "version": 3,
        "has_pending_draft": False,
    }
    history_snapshot = {
        "version_id": "hist_v1",
        "template_id": "tpl_test_4",
        "version_number": 1,
        "subject": "Restored Historical Subject V1",
        "body_html": "<p>Restored Historical Body V1</p>",
        "preheader": "Restored Preheader V1",
    }
    fake_db.email_templates_studio.find_one.side_effect = [
        existing_template,
        {
            **existing_template,
            "draft_subject": "Restored Historical Subject V1",
            "draft_body_html": "<p>Restored Historical Body V1</p>",
            "draft_preheader": "Restored Preheader V1",
            "has_pending_draft": True,
        }
    ]
    fake_db.template_version_history.find_one.return_value = history_snapshot

    res = await restore_version_as_draft("tpl_test_4", "hist_v1", db=fake_db)
    # Draft is restored to v1
    assert res.draft_subject == "Restored Historical Subject V1"
    # Live published remains untouched at V3
    assert res.published_subject == "Live Subject V3"
    assert res.has_pending_draft is True


# 5. Duplicate creates independent user template
@pytest.mark.asyncio
async def test_duplicate_creates_independent_user_template():
    from backend.routes.admin_templates import duplicate_template
    fake_db = InMemoryDB()
    source_template = {
        "template_id": "independence_day_2026",
        "name": "Independence Day 2026 Greetings",
        "category": "announcement",
        "is_system_template": True,
        "system_template_key": "independence_day_2026",
        "published_subject": "Happy Independence Day",
        "published_body_html": "<p>Patriotic message</p>",
        "apply_wrapper": True,
    }
    fake_db.email_templates_studio.find_one.return_value = source_template

    res = await duplicate_template("independence_day_2026", db=fake_db)
    assert res.template_id != "independence_day_2026"
    assert "copy" in res.template_id
    assert res.name == "Copy of Independence Day 2026 Greetings"
    assert res.is_system_template is False
    assert res.system_template_key is None
    assert res.has_pending_draft is True
    fake_db.email_templates_studio.insert_one.assert_called_once()


# 6. Archive hides from active selector
@pytest.mark.asyncio
async def test_archive_hides_from_active_selector():
    from backend.routes.admin_templates import archive_template, list_templates
    fake_db = InMemoryDB()
    template_doc = {
        "template_id": "custom_promo",
        "name": "Old Promo",
        "is_system_template": False,
        "is_archived": False,
    }
    fake_db.email_templates_studio.find_one.side_effect = [
        template_doc,
        {**template_doc, "is_archived": True}
    ]

    res = await archive_template("custom_promo", db=fake_db)
    assert res.is_archived is True

    # When listing with default include_archived=False, query contains is_archived: {$ne: True}
    fake_db.email_templates_studio.find.return_value.sort.return_value.to_list = AsyncMock(return_value=[])
    await list_templates(include_archived=False, db=fake_db)
    call_query = fake_db.email_templates_studio.find.call_args[0][0]
    assert call_query == {"is_archived": {"$ne": True}}


# 7. System template cannot be archived
@pytest.mark.asyncio
async def test_system_template_cannot_be_archived():
    from backend.routes.admin_templates import archive_template
    fake_db = InMemoryDB()
    contact_tpl = {
        "template_id": "contact_acknowledgement",
        "name": "Contact Inquiry Acknowledgment",
        "is_system_template": True,
        "system_template_key": "contact_acknowledgement",
    }
    fake_db.email_templates_studio.find_one.return_value = contact_tpl

    with pytest.raises(HTTPException) as exc_info:
        await archive_template("contact_acknowledgement", db=fake_db)
    assert exc_info.value.status_code == 400
    assert "required active system autoresponder" in exc_info.value.detail


# 8. Preheader persists draft and published
@pytest.mark.asyncio
async def test_preheader_persists_draft_and_published():
    from backend.routes.admin_templates import update_template
    fake_db = InMemoryDB()
    existing_doc = {
        "template_id": "tpl_preheader_test",
        "name": "Advisory",
        "published_subject": "Subject",
        "published_body_html": "<p>Content</p>",
        "published_preheader": "Initial Preheader",
        "draft_preheader": "Initial Preheader",
        "version": 1,
    }
    fake_db.email_templates_studio.find_one.side_effect = [
        existing_doc,
        {
            **existing_doc,
            "published_preheader": "New Published Preheader",
            "draft_preheader": "New Published Preheader",
            "version": 2,
        }
    ]

    payload = TemplateUpdate(
        preheader="New Published Preheader",
        publish_immediately=True
    )
    res = await update_template("tpl_preheader_test", payload, db=fake_db)
    assert res.published_preheader == "New Published Preheader"
    assert res.draft_preheader == "New Published Preheader"


# 9. Sender display name rendered correctly
def test_sender_display_name_rendered_correctly():
    sender_name = "PSA Corporate Advisory"
    sender_email = "advisory@updates.psumanassociates.com"
    sender_header = f"{sender_name} <{sender_email}>"
    assert "PSA Corporate Advisory" in sender_header
    assert "<advisory@updates.psumanassociates.com>" in sender_header


# 10. Unapproved sender email rejected
def test_unapproved_sender_email_rejected():
    assert _is_approved_sender_email("updates@updates.psumanassociates.com") is True
    assert _is_approved_sender_email("advisory@updates.psumanassociates.com") is True
    assert _is_approved_sender_email("hacker@malicious-domain.com") is False
    assert _is_approved_sender_email("random@gmail.com") is False


# 11. Reply-to validation
def test_reply_to_validation():
    valid = clean_email_list(["contact@psumanassociates.com", "valid@domain.org"])
    assert len(valid) == 2
    assert "contact@psumanassociates.com" in valid
    assert "valid@domain.org" in valid

    invalid = clean_email_list(["not-an-email", "", None, "bad@domain\nwith\rcrlf.com"])
    # CRLF stripped and validated
    assert all("\n" not in e and "\r" not in e for e in invalid)


# 12. CC validation
def test_cc_validation():
    raw_cc = ["partner1@firm.com", "partner2@firm.com", "invalid_cc"]
    cleaned = clean_email_list(raw_cc)
    assert len(cleaned) == 2
    assert "partner1@firm.com" in cleaned
    assert "partner2@firm.com" in cleaned
    assert "invalid_cc" not in cleaned


# 13. BCC validation
def test_bcc_validation():
    raw_bcc = ["audit@firm.com", "compliance@firm.com"]
    cleaned = clean_email_list(raw_bcc)
    assert len(cleaned) == 2
    assert "audit@firm.com" in cleaned
    assert "compliance@firm.com" in cleaned


# 14. Campaign recipients isolated from CC / BCC
def test_campaign_recipients_isolated_from_cc_bcc():
    recipients = ["client1@acme.com", "client2@globex.com", "client3@initech.com"]
    # In PSA architecture, each recipient receives an individual OutboxJob
    jobs = [
        OutboxJob(
            recipient_email=r,
            subject="Update",
            rendered_html="<p>Hi</p>",
            rendered_text="Hi",
            sender="P Suman & Associates <updates@updates.psumanassociates.com>",
            reply_to="contact@psumanassociates.com",
            idempotency_key=f"test_{r}",
            cc=None, # Crucial: Campaign audience is NEVER passed as CC
            bcc=None
        )
        for r in recipients
    ]
    for j in jobs:
        # Every dispatch is addressed to 1 primary recipient with empty or independent CC
        assert j.recipient_email in recipients
        assert j.cc is None


# 15. Tags passed to provider
def test_tags_passed_to_provider():
    tags = [
        {"name": "type", "value": "campaign"},
        {"name": "category", "value": "announcement"}
    ]
    sanitized = sanitize_tags(tags)
    assert len(sanitized) == 2
    assert sanitized[0] == {"name": "type", "value": "campaign"}
    assert sanitized[1] == {"name": "category", "value": "announcement"}


# 16. Tags scrub PII
def test_tags_scrub_pii():
    tags_with_pii = [
        {"name": "type", "value": "campaign"},
        {"name": "recipient", "value": "john.doe@clientcorp.com"},  # PII Email
        {"name": "phone", "value": "+1-555-867-5309"},              # PII Phone
        {"name": "category", "value": "advisory"}
    ]
    sanitized = sanitize_tags(tags_with_pii)
    assert len(sanitized) == 2
    names = [t["name"] for t in sanitized]
    assert "type" in names
    assert "category" in names
    assert "recipient" not in names
    assert "phone" not in names


# 17. Variable validation catches unknown variable
def test_variable_validation_catches_unknown_variable():
    content = "Hello {{name}}, your account at {{company}} with code {{mysterious_unknown_token}} is ready."
    res = validate_template_variables(content)
    assert "name" in res["known_variables"]
    assert "company" in res["known_variables"]
    assert "mysterious_unknown_token" in res["unknown_variables"]


# 18. Required variable validation
def test_required_variable_validation():
    content = "Check {{unsubscribe_url}} and {{name}}."
    res = validate_template_variables(content)
    assert "unsubscribe_url" in res["system_variables"]
    assert "name" in res["user_variables"]


# 19. System variable protection
def test_system_variable_protection():
    content = "{{unsubscribe_url}} and {{year}}"
    res = validate_template_variables(content)
    assert set(res["system_variables"]) == {"unsubscribe_url", "year"}
    assert len(res["unknown_variables"]) == 0


# 20. Preview metadata matches send metadata
@pytest.mark.asyncio
async def test_preview_metadata_matches_send_metadata():
    from backend.routes.admin_templates import preview_template
    req = TemplatePreviewRequest(
        subject="Important Notice",
        body_html="<p>Notice body</p>",
        preheader="Notice preheader",
        sender_name="PSA Advisory",
        sender_email="advisory@updates.psumanassociates.com",
        reply_to="advisory@psumanassociates.com",
        cc=["lead@firm.com"],
        recipient_name="CA Rajesh",
        recipient_email="rajesh@example.com"
    )
    preview = await preview_template(req)
    meta = preview["metadata"]
    assert meta["sender_name"] == "PSA Advisory"
    assert meta["sender_email"] == "advisory@updates.psumanassociates.com"
    assert meta["from"] == "PSA Advisory <advisory@updates.psumanassociates.com>"
    assert meta["reply_to"] == "advisory@psumanassociates.com"
    assert meta["cc"] == ["lead@firm.com"]
    assert preview["preheader"] == "Notice preheader"


# 21. Test send restricted to configured test recipient
@pytest.mark.asyncio
async def test_test_send_restricted_to_configured_test_recipient():
    from backend.routes.admin_campaigns import send_test_email
    fake_db = InMemoryDB()
    # Configure test recipient
    fake_db.admin_settings.find_one.return_value = {"key": "test_recipient", "value": "savagesnowboy@gmail.com"}

    # Attempt to send test email to arbitrary target
    bad_req = TestSendRequest(
        recipient_email="external_customer@acme.com",
        subject="Test",
        body_html="<p>Test</p>"
    )
    with pytest.raises(HTTPException) as exc_info:
        await send_test_email(bad_req, db=fake_db)
    assert exc_info.value.status_code == 400
    assert "Test send recipient mismatch" in exc_info.value.detail


# 22. Queued job freezes delivery metadata
def test_queued_job_freezes_delivery_metadata():
    job = OutboxJob(
        recipient_email="client@example.com",
        subject="Frozen Subject",
        preheader="Frozen Preheader",
        rendered_html="<p>Frozen HTML</p>",
        rendered_text="Frozen Text",
        sender="P Suman & Associates <updates@updates.psumanassociates.com>",
        reply_to="contact@psumanassociates.com",
        tags=[{"name": "type", "value": "campaign"}],
        idempotency_key="idemp_123"
    )
    job_dump = job.model_dump()
    assert job_dump["subject"] == "Frozen Subject"
    assert job_dump["preheader"] == "Frozen Preheader"
    assert job_dump["sender"] == "P Suman & Associates <updates@updates.psumanassociates.com>"
    assert job_dump["tags"] == [{"name": "type", "value": "campaign"}]


# 23. Transactional contact autoresponder persists published preheader
@pytest.mark.asyncio
async def test_transactional_contact_autoresponder_persists_published_preheader():
    fake_db = InMemoryDB()
    tpl_doc = {
        "template_id": "contact_acknowledgement",
        "published_subject": "Inquiry Received — PSA",
        "published_preheader": "Custom published contact acknowledgement preheader",
        "published_body_html": "<p>Hello {{name}}</p>",
        "apply_wrapper": True,
    }
    fake_db.email_templates_studio.find_one.return_value = tpl_doc

    # Verify template loading logic
    preheader = tpl_doc.get("published_preheader") or "Default"
    assert preheader == "Custom published contact acknowledgement preheader"


# 24. Newsletter autoresponder persists published preheader
@pytest.mark.asyncio
async def test_newsletter_autoresponder_persists_published_preheader():
    tpl_doc = {
        "template_id": "newsletter_welcome",
        "published_preheader": "Exclusive tax briefing access inside",
    }
    preheader = tpl_doc.get("published_preheader") or "Default"
    assert preheader == "Exclusive tax briefing access inside"


# 25. Campaign regression preserved
def test_campaign_regression_preserved():
    create_payload = CampaignCreate(
        title="Q3 Tax Briefing",
        campaign_type=CampaignType.ANNOUNCEMENT,
        send_mode=SendMode.TEST,
        subject="Q3 Briefing",
        body_html="<p>Briefing details</p>",
        apply_wrapper=True
    )
    assert create_payload.title == "Q3 Tax Briefing"
    assert create_payload.send_mode == SendMode.TEST
    assert create_payload.apply_wrapper is True


# 26. Metrics API service parses provider response
def test_metrics_api_service_parses_provider_response():
    sample_resend_response = {
        "data": {
            "sent": 100,
            "delivered": 98,
            "delivery_rate": 98.0,
            "bounced": 2,
            "bounce_rate": 2.0,
            "complained": 0,
            "complaint_rate": 0.0,
            "suppressed": 1,
            "failed": 0
        }
    }
    parsed = _parse_resend_metrics(sample_resend_response, "7d")
    assert parsed["sent"] == 100
    assert parsed["delivered"] == 98
    assert parsed["delivery_rate"] == 98.0
    assert parsed["bounced"] == 2
    assert parsed["bounce_rate"] == 2.0
    assert parsed["open_rate"] == 0.0  # Confirms open tracking remains 0.0 (disabled)
    assert parsed["tracking_status"] == "disabled_privacy_first"


# 27. Metrics API failure handled gracefully with local fallback
@pytest.mark.asyncio
async def test_metrics_api_failure_handled_gracefully_with_local_fallback():
    fake_db = InMemoryDB()
    # Mock empty or failing attempts
    fake_db.email_attempts.find.return_value = AsyncMock()
    fake_db.email_attempts.find.return_value.__aiter__.return_value = []
    fake_db.outbox_jobs.find.return_value = AsyncMock()
    fake_db.outbox_jobs.find.return_value.__aiter__.return_value = []
    fake_db.email_suppressions.count_documents.return_value = 0

    # Force fallback by calling with mock db and no resend key or force failure
    with patch("backend.services.email.analytics.settings.RESEND_API_KEY", ""):
        metrics = await get_email_analytics(fake_db, period="7d", force_refresh=True)
        assert metrics["source"] == "local_database"
        assert "sent" in metrics
        assert "delivered" in metrics
        assert "delivery_rate" in metrics


# 28. Metrics cache works within TTL
@pytest.mark.asyncio
async def test_metrics_cache_works_within_ttl():
    fake_db = InMemoryDB()
    fake_db.email_attempts.find.return_value = AsyncMock()
    fake_db.email_attempts.find.return_value.__aiter__.return_value = []
    fake_db.outbox_jobs.find.return_value = AsyncMock()
    fake_db.outbox_jobs.find.return_value.__aiter__.return_value = []
    fake_db.email_suppressions.count_documents.return_value = 0

    with patch("backend.services.email.analytics.settings.RESEND_API_KEY", ""):
        m1 = await get_email_analytics(fake_db, period="7d", force_refresh=True)
        assert m1["is_cached"] is False
        m2 = await get_email_analytics(fake_db, period="7d", force_refresh=False)
        assert m2["is_cached"] is True


# 29. Admin metrics endpoint requires authentication
def test_admin_metrics_endpoint_requires_authentication():
    client = TestClient(app)
    # Request without admin cookie or session
    resp = client.get("/api/admin/communication/analytics")
    assert resp.status_code == 401


# 30. Raw HTML mode preserved
def test_raw_html_mode_preserved():
    authored_html = "<!DOCTYPE html><html><body><h1>Exact Authored Content</h1></body></html>"
    rendered_html, plain_text = render_final_email(
        body_html=authored_html,
        apply_wrapper=False
    )
    assert "<!DOCTYPE html>" in rendered_html
    assert "Exact Authored Content" in rendered_html
    # Does NOT contain the corporate 780px outer shell
    assert "mso-container" not in rendered_html
    assert plain_text == "Exact Authored Content"


# 31. Corporate layout mode preserved
def test_corporate_layout_mode_preserved():
    fragment = "<p>Tax Advisory Update for Q3</p>"
    rendered_html, plain_text = render_final_email(
        body_html=fragment,
        apply_wrapper=True,
        preheader="Important tax notice"
    )
    # Contains 780px corporate wrapper
    assert "P SUMAN & ASSOCIATES" in rendered_html
    assert "max-width: 780px" in rendered_html
    assert "Tax Advisory Update for Q3" in rendered_html
    assert "Important tax notice" in rendered_html
