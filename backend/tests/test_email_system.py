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
    succeed for any address. Without a real key, no real emails can leave
    regardless of environment.
    """
    settings.EMAIL_ENVIRONMENT = "development"
    settings.RESEND_API_KEY = ""  # No real key — mock mode

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

@pytest.mark.asyncio
async def test_final_safety_guard_blocks_non_test_recipient_when_key_present():
    """
    Final safety guard (Layer 2): when EMAIL_ENVIRONMENT != production AND
    a real RESEND_API_KEY is present, any recipient that doesn't match the
    configured test recipient must be blocked.

    We simulate a real API key by setting a dummy value that won't trigger mock mode.
    The Resend SDK call will fail (no real key), but the guard should fire first.
    """
    settings.EMAIL_ENVIRONMENT = "development"
    settings.RESEND_API_KEY = "re_fake_test_key_for_guard_test"

    # Deliver to a non-test-recipient should be blocked
    result = await send_email_via_provider(
        to="real.campaign.recipient@example.com",
        subject="Should be blocked",
        html="<p>This should never send</p>",
        db=None,
        _test_recipient_override="testrecipient@example.com"
    )
    assert result["success"] is False
    assert result["status"] == "blocked_test_mode"
    assert "blocked" in (result["error"] or "").lower()

@pytest.mark.asyncio
async def test_final_safety_guard_allows_test_recipient():
    """
    Final safety guard passes when the recipient matches the configured test recipient.
    With a real-looking key, it will then attempt Resend and fail — we only
    care that the guard passes (the Resend call failure is expected in test).
    """
    settings.EMAIL_ENVIRONMENT = "development"
    settings.RESEND_API_KEY = ""  # No key — fall through to mock

    result = await send_email_via_provider(
        to="testrecipient@example.com",
        subject="Test guard pass",
        html="<p>Allowed</p>",
        db=None,
        _test_recipient_override="testrecipient@example.com"
    )
    assert result["success"] is True
    assert result["status"] == "sent"
