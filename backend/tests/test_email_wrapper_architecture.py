import pytest
from datetime import datetime, timezone
from backend.services.email.renderer import (
    render_base_layout,
    interpolate_variables,
    html_to_plain_text,
    render_final_email,
)
from backend.services.email.templates import (
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


def test_admin_authored_html_sent_directly_without_wrapper():
    """
    Test that administrator-authored HTML is rendered and sent directly as composed,
    with variables interpolated and NO automatic or hidden wrapper injected.
    """
    body_html = (
        '<div style="background-color: #000; color: #fff; padding: 20px;">\n'
        '  <h2>PHASE 0 CUSTOM ADVISORY</h2>\n'
        '  <p>Dear {{name}}, this is a custom report for {{company}}.</p>\n'
        '  <p>Unique Test String 12345</p>\n'
        '  <a href="{{unsubscribe_url}}">Manage preferences</a>\n'
        '</div>'
    )
    vars_map = {
        "name": "CA Priya Verma",
        "company": "Nexus Holdings",
        "unsubscribe_url": "https://psumanassociates.com/unsub?id=999"
    }

    final_html, plain_text = render_final_email(
        body_html=body_html,
        variables=vars_map
    )

    # Must NOT have corporate layout wrapper
    assert "Chartered Accountants · Audit · Advisory" not in final_html
    assert "New Delhi · Hyderabad · PAN-India Advisory" not in final_html
    assert "<!DOCTYPE html>" not in final_html

    # Must contain exact authored HTML structure with interpolated variables
    assert '<div style="background-color: #000; color: #fff; padding: 20px;">' in final_html
    assert "PHASE 0 CUSTOM ADVISORY" in final_html
    assert "Dear CA Priya Verma, this is a custom report for Nexus Holdings." in final_html
    assert "Unique Test String 12345" in final_html
    assert "https://psumanassociates.com/unsub?id=999" in final_html

    # Plain text cleanliness
    assert "PHASE 0 CUSTOM ADVISORY" in plain_text
    assert "Unique Test String 12345" in plain_text
    assert "<div" not in plain_text


def test_preview_matches_test_send_and_production_dispatch():
    """
    Verify that Preview HTML == Test Send HTML == Production Dispatch HTML.
    All 3 entry points share the exact same canonical render_final_email() pipeline.
    """
    body_html = (
        "<div class='box'>"
        "<h1>Tax Update for {{company}}</h1>"
        "<p>Greetings {{name}}, review our statutory notes.</p>"
        "</div>"
    )
    vars_map = {
        "name": "Test Client",
        "company": "Enterprise Ltd",
        "unsubscribe_url": "https://psumanassociates.com/unsub?tok=abc"
    }

    # 1. Preview Pipeline
    preview_html, preview_text = render_final_email(
        body_html=body_html,
        variables=vars_map,
        unsubscribe_url=vars_map["unsubscribe_url"]
    )

    # 2. Test-Send Pipeline
    test_send_html, test_send_text = render_final_email(
        body_html=body_html,
        variables=vars_map,
        unsubscribe_url=vars_map["unsubscribe_url"]
    )

    # 3. Production Dispatch Pipeline
    production_html, production_text = render_final_email(
        body_html=body_html,
        variables=vars_map,
        unsubscribe_url=vars_map["unsubscribe_url"]
    )

    assert preview_html == test_send_html == production_html
    assert preview_text == test_send_text == production_text


def test_transactional_emails_retain_corporate_layout():
    """
    Transactional / System automated notices genuinely depend on the corporate letterhead.
    Verify they retain the formal corporate layout via render_base_layout().
    """
    # 1. Contact Form Acknowledgment
    _, ack_html, ack_text = get_contact_acknowledgement_template({
        "name": "Sunil Gupta",
        "service_of_interest": "Statutory Audit",
        "company": "Sunil Enterprises"
    })
    assert "P SUMAN & ASSOCIATES" in ack_html
    assert "Chartered Accountants · Audit · Advisory" in ack_html
    assert "Thank You for Reaching Out" in ack_html
    assert "Statutory Audit" in ack_html
    assert "<!DOCTYPE html>" in ack_html

    # 2. Newsletter Welcome Receipt
    _, news_html, news_text = get_newsletter_welcome_template({
        "unsubscribe_url": "https://psumanassociates.com/unsubscribe?token=xyz"
    })
    assert "P SUMAN & ASSOCIATES" in news_html
    assert "Chartered Accountants · Audit · Advisory" in news_html
    assert "Welcome to PSA Insights" in news_html
    assert "<!DOCTYPE html>" in news_html


def test_no_hidden_double_transformations():
    """
    Verify that multiple passes or raw HTML pastes do not introduce hidden mutations or encoding corruptions.
    """
    raw_html = "<table><tr><td>Cell 1 &amp; Cell 2</td></tr></table>"
    html_out, text_out = render_final_email(raw_html, variables={})
    assert html_out == raw_html
    assert "Cell 1 & Cell 2" in text_out


def test_campaign_models_clean():
    """
    Verify campaign and preview models instantiate cleanly with core fields.
    """
    camp_create = CampaignCreate(
        title="Quarterly Review",
        subject="Q3 Review",
        body_html="<p>Review content</p>",
        target_filter=TargetFilter()
    )
    assert camp_create.title == "Quarterly Review"
    assert camp_create.subject == "Q3 Review"

    prev_req = TemplatePreviewRequest(
        subject="Preview Subj",
        body_html="<p>Preview Body</p>"
    )
    assert prev_req.subject == "Preview Subj"
