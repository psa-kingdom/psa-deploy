import pytest
from datetime import datetime, timezone
from backend.models.email import (
    CampaignCreate,
    CampaignConfirm,
    CampaignStatus,
    OutboxJobStatus,
    TargetFilter,
    EmailCampaign,
    CampaignRecipient
)
from backend.services.email.renderer import interpolate_variables
from backend.services.email.audience import analyze_manual_recipients, parse_manual_emails
from backend.core.config import settings


def test_variable_interpolation():
    template = "Greetings {{name}} from {{company}}! Unsubscribe here: {{unsubscribe_url}}"
    vars_map = {
        "name": "CA Gaurav",
        "company": "P Suman & Associates",
        "unsubscribe_url": "https://psumanassociates.com/unsubscribe?token=123"
    }
    rendered = interpolate_variables(template, vars_map)
    assert rendered == "Greetings CA Gaurav from P Suman & Associates! Unsubscribe here: https://psumanassociates.com/unsubscribe?token=123"


def test_campaign_model_lifecycle():
    campaign = EmailCampaign(
        campaign_id="camp_test_123",
        title="Independence Day Campaign",
        subject="Happy Independence Day",
        body_html="<p>Greetings!</p>",
        sender_email="P Suman & Associates <notifications@psumanassociates.com>",
        reply_to="contact@psumanassociates.com",
        target_filter=TargetFilter(source="newsletter_subscriptions"),
        frozen_recipient_count=150,
        status=CampaignStatus.REVIEWING
    )

    assert campaign.status == CampaignStatus.REVIEWING
    assert campaign.frozen_recipient_count == 150
    assert campaign.dispatched_count == 0

    # Confirm campaign
    confirm_payload = CampaignConfirm(
        exact_recipient_count=150,
        idempotency_key="idemp_key_12345"
    )
    assert confirm_payload.exact_recipient_count == campaign.frozen_recipient_count


def test_origin_validation_security():
    # Production domain
    assert settings.is_allowed_origin("https://psumanassociates.com") is True
    assert settings.is_allowed_origin("https://www.psumanassociates.com") is True
    assert settings.is_allowed_origin("http://localhost:3000") is True

    # Valid PSA Vercel preview domains
    assert settings.is_allowed_origin("https://psa-deploy.vercel.app") is True
    assert settings.is_allowed_origin("https://psa-deploy-liard.vercel.app") is True
    assert settings.is_allowed_origin("https://psa-deploy-git-test-branch.vercel.app") is True

    # Disallowed domains / prefix spoofing attempts
    assert settings.is_allowed_origin("https://attacker.com") is False
    assert settings.is_allowed_origin("https://psa-deploy.vercel.app.attacker.com") is False
    assert settings.is_allowed_origin("https://attacker-psa-deploy.vercel.app") is False
    assert settings.is_allowed_origin("https://fakevercel.app") is False
    assert settings.is_allowed_origin("") is False


def test_manual_recipients_analysis():
    raw_input = [
        "valid1@example.com, valid2@example.com\nVALID1@example.com",  # 3 tokens (1 duplicate)
        "invalid-email-address",                                       # 1 token (invalid)
        "suppressed@example.com",                                      # 1 token (suppressed)
        "valid3@example.com; another.valid@domain.co.in"               # 2 tokens
    ]
    suppressed_set = {"suppressed@example.com"}

    analysis = analyze_manual_recipients(raw_input, suppressed_set=suppressed_set)

    assert analysis["entered_count"] == 7
    assert analysis["valid_count"] == 6
    assert analysis["invalid_count"] == 1
    assert "invalid-email-address" in analysis["invalid_samples"]
    assert analysis["duplicate_count"] == 1  # VALID1 duplicate removed
    assert analysis["suppressed_count"] == 1  # suppressed@example.com filtered
    assert analysis["net_count"] == 4  # valid1, valid2, valid3, another.valid
    assert set(analysis["net_sendable"]) == {
        "valid1@example.com",
        "valid2@example.com",
        "valid3@example.com",
        "another.valid@domain.co.in"
    }
