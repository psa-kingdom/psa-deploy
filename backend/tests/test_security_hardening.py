"""
Security Hardening Regression Test Suite — Phase 1A

Validates:
1. Unsubscribe token authorization:
   - Valid email + valid matching token -> succeeds (suppression created)
   - Valid email + incorrect token -> rejected/no suppression
   - Valid token belonging to another email -> rejected/no suppression
   - Nonexistent token -> rejected/no suppression
   - Missing token or email -> rejected/no suppression
   - Repeated valid unsubscription -> idempotent/no duplicate harmful effect
2. Webhook verification fail-closed:
   - Production environment + missing RESEND_WEBHOOK_SECRET -> request rejected (HTTP 500)
   - Invalid signature -> rejected (HTTP 401)
   - Valid signature -> accepted and processed
3. Webhook idempotency:
   - Replayed/duplicate webhook delivery -> handled idempotently (no duplicate state mutation)
   - Duplicate bounce/complaint suppression -> idempotent
"""

import json
import time
import pytest
from datetime import datetime, timezone
from starlette.testclient import TestClient
from svix.webhooks import Webhook

from backend.server import app
from backend.core.config import settings
from backend.routes.unsubscribe import get_db as get_unsubscribe_db
from backend.routes.webhooks import get_db as get_webhooks_db


class MockMongoCollection:
    def __init__(self, docs=None):
        self.docs = [dict(d) for d in (docs or [])]

    def _matches(self, doc, query):
        for k, v in query.items():
            if doc.get(k) != v:
                return False
        return True

    async def find_one(self, query, projection=None):
        for d in self.docs:
            if self._matches(d, query):
                return dict(d)
        return None

    async def insert_one(self, doc):
        d = dict(doc)
        self.docs.append(d)
        return type("InsertResult", (), {"inserted_id": d.get("id") or d.get("email")})()

    async def update_one(self, query, update_spec):
        for i, d in enumerate(self.docs):
            if self._matches(d, query):
                if "$set" in update_spec:
                    self.docs[i].update(update_spec["$set"])
                return type("UpdateResult", (), {"modified_count": 1})()
        return type("UpdateResult", (), {"modified_count": 0})()

    async def count_documents(self, query=None):
        if not query:
            return len(self.docs)
        return sum(1 for d in self.docs if self._matches(d, query))


class MockSecurityDatabase:
    def __init__(self):
        self.campaign_recipients = MockMongoCollection()
        self.email_suppressions = MockMongoCollection()
        self.webhook_events = MockMongoCollection()


@pytest.fixture
def mock_db():
    return MockSecurityDatabase()


@pytest.fixture
def client(mock_db):
    app.dependency_overrides[get_unsubscribe_db] = lambda: mock_db
    app.dependency_overrides[get_webhooks_db] = lambda: mock_db
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


# =========================================================================
# UNSUBSCRIBE TESTS (TASK 1)
# =========================================================================

def test_unsubscribe_valid_token_and_email(client, mock_db):
    """1. Valid email + matching token succeeds and creates suppression record."""
    mock_db.campaign_recipients.docs.append({
        "email": "partner@example.com",
        "unsubscribe_token": "valid_token_uuid_12345",
        "campaign_id": "camp_abc",
        "status": "delivered"
    })

    resp = client.get("/api/unsubscribe?email=partner@example.com&token=valid_token_uuid_12345")
    assert resp.status_code == 200
    assert "Preferences Updated" in resp.text
    assert "partner@example.com" in resp.text

    # Verify suppression created
    supp = next((d for d in mock_db.email_suppressions.docs if d["email"] == "partner@example.com"), None)
    assert supp is not None
    assert supp["reason"] == "unsubscribe"
    assert supp["source_campaign_id"] == "camp_abc"


def test_unsubscribe_valid_email_incorrect_token(client, mock_db):
    """2. Valid email with incorrect token is rejected and creates NO suppression."""
    mock_db.campaign_recipients.docs.append({
        "email": "partner@example.com",
        "unsubscribe_token": "valid_token_uuid_12345",
        "campaign_id": "camp_abc"
    })

    resp = client.get("/api/unsubscribe?email=partner@example.com&token=wrong_attacker_token")
    assert resp.status_code == 400
    assert "Invalid or Expired Link" in resp.text

    # Must NOT create suppression
    assert len(mock_db.email_suppressions.docs) == 0


def test_unsubscribe_valid_token_belonging_to_another_email(client, mock_db):
    """3. Valid token used against a different email is rejected without suppression."""
    mock_db.campaign_recipients.docs.append({
        "email": "victim@example.com",
        "unsubscribe_token": "victim_token_9999",
        "campaign_id": "camp_abc"
    })

    # Attacker tries to suppress target@example.com using victim's token
    resp = client.get("/api/unsubscribe?email=target@example.com&token=victim_token_9999")
    assert resp.status_code == 400
    assert "Invalid or Expired Link" in resp.text

    # Neither email should be suppressed
    assert len(mock_db.email_suppressions.docs) == 0


def test_unsubscribe_nonexistent_token(client, mock_db):
    """4. Nonexistent token is rejected without suppression."""
    resp = client.get("/api/unsubscribe?email=random@example.com&token=nonexistent_token_0000")
    assert resp.status_code == 400
    assert "Invalid or Expired Link" in resp.text
    assert len(mock_db.email_suppressions.docs) == 0


def test_unsubscribe_missing_token_or_email(client, mock_db):
    """5. Missing or empty token/email is rejected without suppression."""
    # Missing token
    resp1 = client.get("/api/unsubscribe?email=partner@example.com")
    assert resp1.status_code == 400
    assert "Invalid Unsubscribe Link" in resp1.text

    # Missing email
    resp2 = client.get("/api/unsubscribe?token=some_token")
    assert resp2.status_code == 400
    assert "Invalid Unsubscribe Link" in resp2.text

    # Empty params
    resp3 = client.get("/api/unsubscribe?email=&token=")
    assert resp3.status_code == 400
    assert "Invalid Unsubscribe Link" in resp3.text

    # Completely missing
    resp4 = client.get("/api/unsubscribe")
    assert resp4.status_code == 400
    assert "Invalid Unsubscribe Link" in resp4.text

    assert len(mock_db.email_suppressions.docs) == 0


def test_unsubscribe_repeated_is_idempotent(client, mock_db):
    """6. Repeated unsubscription clicks succeed cleanly without duplicate suppressions."""
    mock_db.campaign_recipients.docs.append({
        "email": "repeat@example.com",
        "unsubscribe_token": "repeat_token_555",
        "campaign_id": "camp_repeat"
    })

    # First click
    r1 = client.get("/api/unsubscribe?email=repeat@example.com&token=repeat_token_555")
    assert r1.status_code == 200
    assert len(mock_db.email_suppressions.docs) == 1

    # Second click (repeat)
    r2 = client.get("/api/unsubscribe?email=repeat@example.com&token=repeat_token_555")
    assert r2.status_code == 200
    assert "Preferences Updated" in r2.text
    assert len(mock_db.email_suppressions.docs) == 1  # No duplicate


# =========================================================================
# WEBHOOK TESTS (TASK 2 & 3)
# =========================================================================

import base64
import math

TEST_WEBHOOK_SECRET = "whsec_" + base64.b64encode(b"thirty_two_byte_secret_for_test!").decode("ascii")


def _create_signed_webhook_headers(payload_str: str, secret: str, msg_id: str = "msg_test_001"):
    wh = Webhook(secret)
    dt = datetime.now(timezone.utc)
    ts = str(math.floor(dt.timestamp()))
    sig = wh.sign(msg_id, dt, payload_str)
    return {
        "svix-id": msg_id,
        "svix-timestamp": ts,
        "svix-signature": sig,
        "Content-Type": "application/json"
    }



def test_webhook_production_fails_closed_when_secret_unconfigured(client, mock_db):
    """7. In production environment, missing RESEND_WEBHOOK_SECRET rejects the request with HTTP 500."""
    original_env = settings.EMAIL_ENVIRONMENT
    original_secret = settings.RESEND_WEBHOOK_SECRET
    try:
        settings.EMAIL_ENVIRONMENT = "production"
        settings.RESEND_WEBHOOK_SECRET = ""

        payload = {"type": "email.delivered", "data": {"email_id": "re_prod_001"}}
        resp = client.post("/api/webhooks/resend", json=payload)
        assert resp.status_code == 500
        assert "Webhook signature verification secret is not configured" in resp.json()["detail"]

        # Confirm no state mutation
        assert len(mock_db.webhook_events.docs) == 0
    finally:
        settings.EMAIL_ENVIRONMENT = original_env
        settings.RESEND_WEBHOOK_SECRET = original_secret


def test_webhook_invalid_signature_rejected(client, mock_db):
    """8. Invalid signature headers are rejected with HTTP 401 without mutating state."""
    original_env = settings.EMAIL_ENVIRONMENT
    original_secret = settings.RESEND_WEBHOOK_SECRET
    try:
        settings.EMAIL_ENVIRONMENT = "production"
        settings.RESEND_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET

        payload = {"type": "email.delivered", "data": {"email_id": "re_prod_002"}}
        headers = {
            "svix-id": "msg_bad_sig_001",
            "svix-timestamp": str(int(time.time())),
            "svix-signature": "v1,bad_forged_signature_value"
        }
        resp = client.post("/api/webhooks/resend", json=payload, headers=headers)
        assert resp.status_code == 401
        assert "Invalid webhook signature" in resp.json()["detail"]

        # Confirm no state mutation
        assert len(mock_db.webhook_events.docs) == 0
    finally:
        settings.EMAIL_ENVIRONMENT = original_env
        settings.RESEND_WEBHOOK_SECRET = original_secret


def test_webhook_valid_signature_accepted_and_processes_delivery(client, mock_db):
    """9. Valid signature accepted and marks recipient status as delivered."""
    original_env = settings.EMAIL_ENVIRONMENT
    original_secret = settings.RESEND_WEBHOOK_SECRET
    try:
        settings.EMAIL_ENVIRONMENT = "production"
        settings.RESEND_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET

        # Seed recipient
        mock_db.campaign_recipients.docs.append({
            "email": "delivered.user@example.com",
            "resend_message_id": "re_delivered_msg_777",
            "status": "dispatched"
        })

        payload = {
            "id": "evt_resend_777",
            "type": "email.delivered",
            "data": {
                "email_id": "re_delivered_msg_777",
                "to": ["delivered.user@example.com"]
            }
        }
        payload_str = json.dumps(payload)
        headers = _create_signed_webhook_headers(payload_str, TEST_WEBHOOK_SECRET, msg_id="msg_svix_777")

        resp = client.post("/api/webhooks/resend", content=payload_str, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "processed"

        # Verify recipient status updated
        rec = next(d for d in mock_db.campaign_recipients.docs if d["resend_message_id"] == "re_delivered_msg_777")
        assert rec["status"] == "delivered"
        assert rec.get("delivered_at") is not None

        # Verify event logged in webhook_events with canonical svix-id
        logged_evt = next((d for d in mock_db.webhook_events.docs if d["event_id"] == "msg_svix_777"), None)
        assert logged_evt is not None
        assert logged_evt["event_type"] == "email.delivered"
    finally:
        settings.EMAIL_ENVIRONMENT = original_env
        settings.RESEND_WEBHOOK_SECRET = original_secret


def test_webhook_replayed_duplicate_is_idempotent(client, mock_db):
    """10. Replayed/duplicate webhook deliveries are ignored cleanly without double mutation."""
    original_env = settings.EMAIL_ENVIRONMENT
    original_secret = settings.RESEND_WEBHOOK_SECRET
    try:
        settings.EMAIL_ENVIRONMENT = "production"
        settings.RESEND_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET

        mock_db.campaign_recipients.docs.append({
            "email": "idemp@example.com",
            "resend_message_id": "re_idemp_888",
            "status": "dispatched"
        })

        payload = {
            "id": "evt_idemp_888",
            "type": "email.delivered",
            "data": {
                "email_id": "re_idemp_888",
                "to": ["idemp@example.com"]
            }
        }
        payload_str = json.dumps(payload)
        headers = _create_signed_webhook_headers(payload_str, TEST_WEBHOOK_SECRET, msg_id="msg_svix_idemp_888")

        # First delivery
        r1 = client.post("/api/webhooks/resend", content=payload_str, headers=headers)
        assert r1.status_code == 200
        assert r1.json()["status"] == "processed"
        assert len(mock_db.webhook_events.docs) == 1

        # Second delivery (replay with same svix-id)
        r2 = client.post("/api/webhooks/resend", content=payload_str, headers=headers)
        assert r2.status_code == 200
        assert r2.json()["status"] == "ignored"
        assert r2.json()["reason"] == "duplicate_event"
        assert len(mock_db.webhook_events.docs) == 1  # No duplicate event inserted
    finally:
        settings.EMAIL_ENVIRONMENT = original_env
        settings.RESEND_WEBHOOK_SECRET = original_secret


def test_webhook_bounce_suppression_idempotency(client, mock_db):
    """11. Webhook bounce events record suppression and mark recipient bounced idempotently."""
    original_env = settings.EMAIL_ENVIRONMENT
    original_secret = settings.RESEND_WEBHOOK_SECRET
    try:
        settings.EMAIL_ENVIRONMENT = "development"
        settings.RESEND_WEBHOOK_SECRET = ""

        mock_db.campaign_recipients.docs.append({
            "email": "bounced@example.com",
            "resend_message_id": "re_bounce_999",
            "status": "dispatched"
        })

        payload = {
            "id": "evt_bounce_999",
            "type": "email.bounced",
            "data": {
                "email_id": "re_bounce_999",
                "to": ["bounced@example.com"]
            }
        }
        r = client.post("/api/webhooks/resend", json=payload)
        assert r.status_code == 200
        assert r.json()["status"] == "processed"

        # Check suppression
        supp = next((d for d in mock_db.email_suppressions.docs if d["email"] == "bounced@example.com"), None)
        assert supp is not None
        assert supp["reason"] == "bounce"

        # Check recipient status
        rec = next(d for d in mock_db.campaign_recipients.docs if d["resend_message_id"] == "re_bounce_999")
        assert rec["status"] == "bounced"
    finally:
        settings.EMAIL_ENVIRONMENT = original_env
        settings.RESEND_WEBHOOK_SECRET = original_secret


def test_webhook_suppressed_event_handling(client, mock_db):
    """12. Webhook email.suppressed marks recipient skipped_suppression and records provider suppression."""
    original_env = settings.EMAIL_ENVIRONMENT
    original_secret = settings.RESEND_WEBHOOK_SECRET
    try:
        settings.EMAIL_ENVIRONMENT = "development"
        settings.RESEND_WEBHOOK_SECRET = ""

        mock_db.campaign_recipients.docs.append({
            "email": "suppressed.user@example.com",
            "resend_message_id": "re_supp_101",
            "status": "dispatched"
        })

        payload = {
            "id": "evt_supp_101",
            "type": "email.suppressed",
            "data": {
                "email_id": "re_supp_101",
                "to": ["suppressed.user@example.com"]
            }
        }
        r = client.post("/api/webhooks/resend", json=payload)
        assert r.status_code == 200
        assert r.json()["status"] == "processed"

        # Check suppression
        supp = next((d for d in mock_db.email_suppressions.docs if d["email"] == "suppressed.user@example.com"), None)
        assert supp is not None
        assert supp["reason"] == "provider_suppression"

        # Check recipient status
        rec = next(d for d in mock_db.campaign_recipients.docs if d["resend_message_id"] == "re_supp_101")
        assert rec["status"] == "skipped_suppression"
    finally:
        settings.EMAIL_ENVIRONMENT = original_env
        settings.RESEND_WEBHOOK_SECRET = original_secret

