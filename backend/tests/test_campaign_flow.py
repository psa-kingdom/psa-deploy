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
        target_filter=TargetFilter(source="all"),
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
