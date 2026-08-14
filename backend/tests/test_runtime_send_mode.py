import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException

from backend.models.email import (
    CampaignCreate,
    CampaignConfirm,
    CampaignStatus,
    SendMode,
    TargetFilter,
    EmailCampaign,
    TestSendRequest
)
from backend.services.email.provider import send_email_via_provider
from backend.routes.admin_campaigns import (
    confirm_and_dispatch_campaign,
    create_campaign,
    send_test_email,
    _get_test_recipient
)
from backend.core.config import settings


@pytest.mark.asyncio
async def test_test_mode_cannot_broadcast_to_audience():
    """
    Test mode campaigns cannot be broadcast to an audience list via confirm.
    """
    mock_db = MagicMock()
    mock_db.email_campaigns.find_one = AsyncMock(return_value={
        "campaign_id": "camp_test_001",
        "status": CampaignStatus.REVIEWING.value,
        "frozen_recipient_count": 50,
        "send_mode": "test"
    })

    confirm_payload = CampaignConfirm(
        exact_recipient_count=50,
        idempotency_key="idemp_001",
        send_mode=SendMode.TEST
    )

    with pytest.raises(HTTPException) as exc_info:
        await confirm_and_dispatch_campaign("camp_test_001", confirm_payload, db=mock_db)

    assert exc_info.value.status_code == 400
    assert "Test Mode and cannot be broadcast" in exc_info.value.detail


@pytest.mark.asyncio
async def test_production_mode_can_be_selected_and_requires_exact_count():
    """
    Production mode allows confirmation ONLY when exact recipient count matches frozen count.
    """
    mock_db = MagicMock()
    mock_db.email_campaigns.find_one = AsyncMock(side_effect=[
        # 1. find campaign
        {
            "campaign_id": "camp_prod_001",
            "status": CampaignStatus.REVIEWING.value,
            "frozen_recipient_count": 100,
            "send_mode": "production",
            "subject": "Greetings",
            "body_html": "<p>Hello</p>",
            "sender_email": "P Suman & Associates <updates@updates.psumanassociates.com>",
            "reply_to": "contact@psumanassociates.com",
            "target_filter": {"source": "manual", "custom_emails": []}
        },
        # 2. find existing idempotency key (None)
        None,
        # 3. reload updated campaign
        {
            "campaign_id": "camp_prod_001",
            "status": CampaignStatus.SENDING.value,
            "frozen_recipient_count": 100,
            "send_mode": "production",
            "title": "Prod Campaign",
            "subject": "Greetings",
            "body_html": "<p>Hello</p>",
            "sender_email": "P Suman & Associates <updates@updates.psumanassociates.com>",
            "reply_to": "contact@psumanassociates.com",
            "target_filter": {"source": "manual", "custom_emails": []}
        }
    ])

    mock_recipients = [
        {
            "id": f"rec_{i}",
            "campaign_id": "camp_prod_001",
            "email": f"client{i}@example.com",
            "name": f"Client {i}",
            "company": "Acme",
            "unsubscribe_token": f"tok_{i}"
        }
        for i in range(100)
    ]
    mock_cursor = MagicMock()
    mock_cursor.to_list = AsyncMock(return_value=mock_recipients)
    mock_db.campaign_recipients.find.return_value = mock_cursor
    mock_db.outbox_jobs.insert_many = AsyncMock()
    mock_db.email_campaigns.update_one = AsyncMock()

    # Rejects count mismatch
    bad_payload = CampaignConfirm(
        exact_recipient_count=99,
        idempotency_key="idemp_prod_001",
        send_mode=SendMode.PRODUCTION
    )
    with pytest.raises(HTTPException) as exc_info:
        await confirm_and_dispatch_campaign("camp_prod_001", bad_payload, db=mock_db)
    assert exc_info.value.status_code == 400
    assert "Count mismatch" in exc_info.value.detail


@pytest.mark.asyncio
async def test_test_send_strictly_enforces_configured_test_recipient():
    """
    Test send endpoint rejects attempts to send to an arbitrary unconfigured recipient.
    """
    mock_db = MagicMock()
    mock_db.admin_settings.find_one = AsyncMock(return_value={
        "test_recipient": "authorized.tester@psumanassociates.com"
    })

    # Attacker / incorrect frontend passes arbitrary recipient
    bad_payload = TestSendRequest(
        recipient_email="victim@external.com",
        subject="Test Subject",
        body_html="<p>Test Content</p>"
    )

    with pytest.raises(HTTPException) as exc_info:
        await send_test_email(bad_payload, db=mock_db)

    assert exc_info.value.status_code == 400
    assert "Test send recipient mismatch" in exc_info.value.detail


@pytest.mark.asyncio
async def test_provider_final_safety_guard_blocks_unauthorized_non_test_send():
    """
    send_email_via_provider blocks non-test recipients unless is_production_dispatch is True.
    """
    with patch.object(settings, "RESEND_API_KEY", "re_real_key_12345"):
        # Without is_production_dispatch=True, non-test recipient is blocked
        result = await send_email_via_provider(
            to="unauthorized@target.com",
            subject="Test",
            html="<p>Hi</p>",
            _test_recipient_override="tester@psumanassociates.com",
            is_production_dispatch=False
        )
        assert result["success"] is False
        assert result["status"] == "blocked_test_mode"

        # With is_production_dispatch=True (mocking real dispatch), it passes the guard
        with patch("resend.Emails.send", return_value={"id": "re_prod_mock_id"}):
            prod_result = await send_email_via_provider(
                to="customer@target.com",
                subject="Test",
                html="<p>Hi</p>",
                is_production_dispatch=True
            )
            assert prod_result["success"] is True
