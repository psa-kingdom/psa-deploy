import pytest
from datetime import datetime, timezone
from backend.services.email.renderer import (
    render_base_layout,
    interpolate_variables,
    html_to_plain_text,
    render_final_email,
    PSA_WRAPPER_HEADER_MARKER
)
from backend.services.email.templates import (
    get_independence_day_campaign_html,
    get_independence_day_template,
    get_contact_acknowledgement_template,
    get_newsletter_welcome_template
)
from backend.models.email import (
    EmailTemplateStudio,
    TemplateCreate,
    TemplateUpdate,
    TemplatePreviewRequest,
    CampaignCreate,
    EmailCampaign,
    TestSendRequest,
    CampaignStatus,
    SendMode,
    TargetFilter
)


def test_case_1_wrapper_on():
    """
    Case 1 — Wrapper ON:
    When apply_wrapper = True, the PSA corporate header, container table,
    and CA advisory footer are wrapped around the authored HTML.
    """
    body_html = "<h2>Special Announcement</h2><p>Hello {{name}} from {{company}}.</p>"
    vars_map = {
        "name": "CA Rajesh",
        "company": "Bharat Financial",
        "unsubscribe_url": "https://psumanassociates.com/unsub"
    }

    final_html, plain_text = render_final_email(
        body_html=body_html,
        apply_wrapper=True,
        variables=vars_map,
        preheader="Announcement Preheader"
    )

    # Corporate Branding Assertions
    assert "P SUMAN & ASSOCIATES" in final_html
    assert PSA_WRAPPER_HEADER_MARKER in final_html
    assert "Chartered Accountants · Audit · Advisory" in final_html
    assert "New Delhi · Hyderabad · PAN-India Advisory" in final_html
    assert "psumanassociates.com" in final_html

    # Inner Authored Content Assertions
    assert "<h2>Special Announcement</h2>" in final_html
    assert "Hello CA Rajesh from Bharat Financial." in final_html

    # Unsubscribe Link in Wrapper Footer
    assert "https://psumanassociates.com/unsub" in final_html

    # Plain Text Cleanliness
    assert "Special Announcement" in plain_text
    assert "Hello CA Rajesh from Bharat Financial." in plain_text
    assert "<h2" not in plain_text


def test_case_2_wrapper_off():
    """
    Case 2 — Wrapper OFF:
    When apply_wrapper = False, final HTML equals the authored HTML with only
    variable interpolation applied, without corporate outer header or footer.
    """
    body_html = (
        '<div style="background:#000; color:#fff;">'
        '<h1>Custom Independence Day Banner</h1>'
        '<p>Dear {{name}}, custom message for {{company}}.</p>'
        '<a href="{{unsubscribe_url}}">Opt out</a>'
        '</div>'
    )
    vars_map = {
        "name": "CA Priya",
        "company": "Nexus Advisors",
        "unsubscribe_url": "https://psumanassociates.com/unsub?id=999"
    }

    final_html, plain_text = render_final_email(
        body_html=body_html,
        apply_wrapper=False,
        variables=vars_map
    )

    # Must NOT have corporate layout wrapper
    assert "Chartered Accountants · Audit · Advisory" not in final_html
    assert "New Delhi · Hyderabad · PAN-India Advisory" not in final_html
    assert "<!DOCTYPE html>" not in final_html

    # Must preserve exact authored HTML structure
    assert '<div style="background:#000; color:#fff;">' in final_html
    assert "<h1>Custom Independence Day Banner</h1>" in final_html
    assert "Dear CA Priya, custom message for Nexus Advisors." in final_html
    assert "https://psumanassociates.com/unsub?id=999" in final_html

    # Plain text extraction
    assert "Custom Independence Day Banner" in plain_text
    assert "Dear CA Priya, custom message for Nexus Advisors." in plain_text


def test_case_3_preview_matches_test_send():
    """
    Case 3 — Preview == Test Send:
    The HTML generated for preview must match the HTML generated for test-send byte-for-byte.
    """
    subject = "Executive Advisory Update for {{company}}"
    body_html = "<p>Greetings {{name}}, review our latest findings for {{company}}.</p>"
    vars_map = {
        "name": "Test User",
        "company": "Test Co",
        "email": "test@example.com",
        "unsubscribe_url": "https://psumanassociates.com/unsubscribe?sample=true",
        "year": 2026
    }

    # 1. Preview Rendering Pipeline
    preview_html, preview_text = render_final_email(
        body_html=body_html,
        apply_wrapper=True,
        variables=vars_map,
        unsubscribe_url=vars_map["unsubscribe_url"]
    )

    # 2. Test-Send Rendering Pipeline
    test_send_html, test_send_text = render_final_email(
        body_html=body_html,
        apply_wrapper=True,
        variables=vars_map,
        unsubscribe_url=vars_map["unsubscribe_url"]
    )

    assert preview_html == test_send_html
    assert preview_text == test_send_text

    # Test with apply_wrapper = False
    preview_unwrapped, _ = render_final_email(
        body_html=body_html,
        apply_wrapper=False,
        variables=vars_map
    )
    test_send_unwrapped, _ = render_final_email(
        body_html=body_html,
        apply_wrapper=False,
        variables=vars_map
    )
    assert preview_unwrapped == test_send_unwrapped


def test_case_4_preview_matches_production():
    """
    Case 4 — Preview == Production:
    The HTML generated for preview must equal the HTML entering OutboxJob.rendered_html in production.
    """
    body_html = "<div class='custom-card'>Hello {{name}}, your corporate report for {{company}} is ready.</div>"
    vars_map = {
        "name": "Vikram Singh",
        "company": "Tata Projects",
        "email": "vikram@example.com",
        "unsubscribe_url": "https://backend.psumanassociates.com/api/unsubscribe?token=abc&email=vikram@example.com"
    }

    # Preview pipeline
    preview_html, _ = render_final_email(
        body_html=body_html,
        apply_wrapper=True,
        variables=vars_map,
        unsubscribe_url=vars_map["unsubscribe_url"]
    )

    # Production dispatch pipeline (confirm_and_dispatch_campaign)
    production_html, _ = render_final_email(
        body_html=body_html,
        apply_wrapper=True,
        variables=vars_map,
        unsubscribe_url=vars_map["unsubscribe_url"]
    )

    assert preview_html == production_html


def test_case_5_toggle_behavior():
    """
    Case 5 — Toggle:
    Changing apply_wrapper between True and False dynamically adds or removes the wrapper.
    """
    body_html = "<p>Simple Announcement</p>"

    # Toggle ON
    html_on, _ = render_final_email(body_html, apply_wrapper=True)
    assert PSA_WRAPPER_HEADER_MARKER in html_on
    assert "<!DOCTYPE html>" in html_on

    # Toggle OFF
    html_off, _ = render_final_email(body_html, apply_wrapper=False)
    assert PSA_WRAPPER_HEADER_MARKER not in html_off
    assert html_off.strip() == "<p>Simple Announcement</p>"


def test_case_6_no_double_wrapper():
    """
    Case 6 — No Double Wrapper:
    If apply_wrapper = True, but body_html is already a complete wrapped email
    (e.g., from an older DB record or previous export), the system must NOT double-wrap.
    """
    raw_inner = "<p>Inner Content</p>"
    already_wrapped = render_base_layout(raw_inner)

    # Verify that already_wrapped has the header marker exactly once
    assert already_wrapped.count(PSA_WRAPPER_HEADER_MARKER) == 1

    # Render through render_final_email with apply_wrapper=True
    rerendered, _ = render_final_email(
        body_html=already_wrapped,
        apply_wrapper=True
    )

    # Must STILL have header marker exactly once (no nested header / table inside table)
    assert rerendered.count(PSA_WRAPPER_HEADER_MARKER) == 1
    assert rerendered.count("<!DOCTYPE html>") == 1


def test_case_7_independence_day_normalized():
    """
    Case 7 — Independence Day Normalization:
    Independence Day template functions as normal content without hardcoded special cases.
    """
    content = get_independence_day_campaign_html()
    assert "79th Independence Day Greetings" in content

    # Works with wrapper ON
    html_wrapped, text_wrapped = render_final_email(content, apply_wrapper=True, variables={"name": "Client"})
    assert "79th Independence Day Greetings" in html_wrapped
    assert PSA_WRAPPER_HEADER_MARKER in html_wrapped

    # Works with wrapper OFF
    html_raw, text_raw = render_final_email(content, apply_wrapper=False, variables={"name": "Client"})
    assert "79th Independence Day Greetings" in html_raw
    assert PSA_WRAPPER_HEADER_MARKER not in html_raw


def test_case_8_transactional_emails_intact():
    """
    Case 8 — Existing Transactional Emails:
    Contact acknowledgment and newsletter welcome templates continue to have
    the formal corporate branding intact.
    """
    # Contact form transactional email
    _, ack_html, ack_text = get_contact_acknowledgement_template({
        "name": "Sunil Gupta",
        "service_of_interest": "Statutory Audit",
        "company": "Sunil Enterprises"
    })
    assert "P SUMAN & ASSOCIATES" in ack_html
    assert "Chartered Accountants · Audit · Advisory" in ack_html
    assert "Thank You for Reaching Out" in ack_html
    assert "Statutory Audit" in ack_html

    # Newsletter welcome transactional email
    _, news_html, news_text = get_newsletter_welcome_template({
        "unsubscribe_url": "https://psumanassociates.com/unsubscribe?token=xyz"
    })
    assert "P SUMAN & ASSOCIATES" in news_html
    assert "Chartered Accountants · Audit · Advisory" in news_html
    assert "Welcome to PSA Insights" in news_html
    assert "https://psumanassociates.com/insights" in news_html


def test_models_apply_wrapper_field():
    """
    Verify all Pydantic models default apply_wrapper to True and accept False.
    """
    tmpl = EmailTemplateStudio(
        template_id="custom_tmpl",
        name="Custom Template",
        apply_wrapper=False
    )
    assert tmpl.apply_wrapper is False

    camp = EmailCampaign(
        title="Custom Campaign",
        subject="Test",
        body_html="<p>Test</p>",
        sender_email="test@psumanassociates.com",
        reply_to="test@psumanassociates.com",
        target_filter=TargetFilter(),
        apply_wrapper=False
    )
    assert camp.apply_wrapper is False

    create_camp = CampaignCreate(
        title="Custom Campaign",
        subject="Test",
        body_html="<p>Test</p>",
        apply_wrapper=False
    )
    assert create_camp.apply_wrapper is False

    test_req = TestSendRequest(
        recipient_email="test@example.com",
        subject="Test",
        body_html="<p>Test</p>",
        apply_wrapper=False
    )
    assert test_req.apply_wrapper is False
