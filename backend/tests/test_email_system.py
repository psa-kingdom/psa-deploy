import pytest
import asyncio
from datetime import datetime, timezone
from backend.services.email.renderer import render_base_layout, interpolate_variables, html_to_plain_text
from backend.services.email.templates import (
    get_independence_day_template,
    get_contact_acknowledgement_template,
    get_newsletter_welcome_template
)
from backend.services.email.provider import send_email_via_provider
from backend.services.email.audience import is_valid_email
from backend.core.config import settings

def test_independence_day_template_rendering():
    variables = {
        "name": "Rajesh Sharma",
        "company": "Bharat Infra Ltd",
        "unsubscribe_url": "https://psumanassociates.com/unsubscribe?token=abc"
    }
    subject, full_html, plain_text = get_independence_day_template(variables)

    assert "Happy Independence Day" in subject
    assert "Bharat Infra Ltd" in full_html
    assert "Rajesh Sharma" in full_html
    assert "P SUMAN & ASSOCIATES" in full_html
    assert "Unsubscribe" in full_html
    assert "https://psumanassociates.com/unsubscribe?token=abc" in full_html
    assert len(plain_text) > 100
    assert "<" not in plain_text  # Clean plain text without raw HTML tags

def test_contact_acknowledgement_template():
    variables = {
        "name": "Anita Desai",
        "service_of_interest": "Internal Audit",
        "company": "Tech Matrix Inc"
    }
    subject, full_html, plain_text = get_contact_acknowledgement_template(variables)

    assert "Inquiry Received" in subject
    assert "Anita Desai" in full_html
    assert "Internal Audit" in full_html
    assert "Tech Matrix Inc" in full_html

def test_newsletter_welcome_template():
    variables = {
        "unsubscribe_url": "https://psumanassociates.com/unsubscribe?token=xyz"
    }
    subject, full_html, plain_text = get_newsletter_welcome_template(variables)

    assert "PSA Insights" in subject
    assert "Welcome to PSA Insights" in full_html
    assert "https://psumanassociates.com/insights" in full_html

def test_email_validation():
    assert is_valid_email("gaurav@psumanassociates.com") is True
    assert is_valid_email("test.user+tag@domain.co.in") is True
    assert is_valid_email("invalid-email") is False
    assert is_valid_email("@missinguser.com") is False
    assert is_valid_email("") is False
    assert is_valid_email(None) is False

@pytest.mark.asyncio
async def test_mock_provider_sends_in_dev_mode():
    """
    In development mode with no RESEND_API_KEY, the mock provider should
    succeed for any address passed to it. Test recipient enforcement is
    handled upstream in admin_campaigns.py, not in provider.py.
    """
    settings.EMAIL_ENVIRONMENT = "development"
    settings.RESEND_API_KEY = ""  # Ensure mock mode

    # Mock provider should succeed for any valid address
    result = await send_email_via_provider(
        to="any.recipient@example.com",
        subject="Test via Mock",
        html="<p>Hello</p>",
        db=None
    )
    assert result["success"] is True
    assert result["status"] == "sent"
    assert result["resend_id"] is not None
    assert result["resend_id"].startswith("mock_re_")
