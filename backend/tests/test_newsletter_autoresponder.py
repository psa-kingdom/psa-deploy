"""
Test Suite for Newsletter Welcome Autoresponder & Unsubscribe Security — Phase 3

Covers:
1. New subscriber persists
2. New subscriber queues welcome email
3. API does not call provider synchronously
4. Deterministic idempotency key
5. Valid secure unsubscribe token generated
6. Welcome email contains valid unsubscribe URL
7. Duplicate active subscription does not send repeated welcome email
8. Unsubscribe token validates correctly against newsletter_subscriptions
9. Wrong token cannot unsubscribe subscriber (rejected HTTP 400)
10. Token belonging to another subscriber cannot unsubscribe target
11. Repeat unsubscribe is idempotent
12. Provider receives deterministic idempotency key
"""

import pytest
import asyncio
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone, timedelta
from starlette.testclient import TestClient

from backend.server import app
import backend.server as server_module
from backend.models.email import OutboxJobStatus
from backend.services.email.provider import send_email_via_provider


class MockCollection:
    def __init__(self, docs=None):
        self.docs = [dict(d) for d in (docs or [])]

    def _matches(self, doc, query):
        if not query:
            return True
        for k, v in query.items():
            if k == "$or":
                if not any(self._matches(doc, q) for q in v):
                    return False
                continue
            if isinstance(v, dict):
                val = doc.get(k)
                for op, target in v.items():
                    if op == "$gte":
                        if val is None or val < target:
                            return False
                    elif op == "$lte":
                        if val is None or val > target:
                            return False
                    elif op == "$lt":
                        if val is None or val >= target:
                            return False
                    elif op == "$in":
                        if val not in target:
                            return False
                continue
            if doc.get(k) != v:
                return False
        return True

    async def find_one(self, query=None, projection=None):
        for d in self.docs:
            if self._matches(d, query):
                return dict(d)
        return None

    async def insert_one(self, doc):
        d = dict(doc)
        self.docs.append(d)
        return MagicMock(inserted_id=d.get("id"))

    async def update_one(self, query, update_spec):
        for i, d in enumerate(self.docs):
            if self._matches(d, query):
                if "$set" in update_spec:
                    self.docs[i].update(update_spec["$set"])
                if "$inc" in update_spec:
                    for k, v in update_spec["$inc"].items():
                        self.docs[i][k] = self.docs[i].get(k, 0) + v
                return MagicMock(modified_count=1)
        return MagicMock(modified_count=0)

    async def find_one_and_update(self, query, update_spec):
        for i, d in enumerate(self.docs):
            if self._matches(d, query):
                old = dict(self.docs[i])
                if "$set" in update_spec:
                    self.docs[i].update(update_spec["$set"])
                return old
        return None

    async def delete_one(self, query):
        for i, d in enumerate(self.docs):
            if self._matches(d, query):
                self.docs.pop(i)
                return MagicMock(deleted_count=1)
        return MagicMock(deleted_count=0)

    async def count_documents(self, query=None):
        return sum(1 for d in self.docs if self._matches(d, query))


class MockDatabase:
    def __init__(self):
        self.contact_submissions = MockCollection()
        self.newsletter_subscriptions = MockCollection()
        self.outbox_jobs = MockCollection()
        self.email_templates_studio = MockCollection()
        self.email_attempts = MockCollection()
        self.email_campaigns = MockCollection()
        self.campaign_recipients = MockCollection()
        self.email_suppressions = MockCollection()
        self.webhook_events = MockCollection()


@pytest.fixture
def test_db(monkeypatch):
    mock = MockDatabase()
    monkeypatch.setattr(server_module, "db", mock)
    # Also override dependency for unsubscribe route
    from backend.routes.unsubscribe import get_db as get_unsub_db
    app.dependency_overrides[get_unsub_db] = lambda: mock
    return mock


@pytest.fixture
def client(test_db):
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_1_and_2_new_subscriber_persists_and_queues_welcome(client, test_db):
    """Requirement 1 & 2: New subscriber persists and queues welcome email."""
    payload = {"email": "subscriber@domain.com", "source": "website"}
    resp = client.post("/api/newsletter", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "subscriber@domain.com"
    assert data["welcome_email_status"] == "queued"
    assert "unsubscribe_token" in data
    assert len(data["unsubscribe_token"]) >= 32

    sub_id = data["id"]
    # Check persistence in db
    assert len(test_db.newsletter_subscriptions.docs) == 1
    assert test_db.newsletter_subscriptions.docs[0]["id"] == sub_id

    # Check outbox job
    assert len(test_db.outbox_jobs.docs) == 1
    job = test_db.outbox_jobs.docs[0]
    assert job["job_type"] == "transactional"
    assert job["transactional_type"] == "newsletter_welcome"
    assert job["source_entity_id"] == sub_id
    assert job["recipient_email"] == "subscriber@domain.com"
    assert job["idempotency_key"] == f"newsletter-welcome/{sub_id}"
    assert job["status"] == OutboxJobStatus.PENDING.value


def test_3_newsletter_api_does_not_call_provider_synchronously(client, test_db):
    """Requirement 3: API returns before worker/provider dispatch without synchronous Resend calls."""
    payload = {"email": "fast@domain.com", "source": "footer"}
    with patch("backend.services.email.provider.send_email_via_provider") as mock_send:
        resp = client.post("/api/newsletter", json=payload)
        assert resp.status_code == 200
        mock_send.assert_not_called()

    assert len(test_db.outbox_jobs.docs) == 1


def test_4_5_6_deterministic_idempotency_and_unsubscribe_url(client, test_db):
    """Requirement 4, 5, 6: Deterministic key, cryptographically strong token, valid unsubscribe URL."""
    payload = {"email": "secure.token@domain.com", "source": "sidebar"}
    resp = client.post("/api/newsletter", json=payload)
    assert resp.status_code == 200
    sub_data = resp.json()

    job = test_db.outbox_jobs.docs[0]
    token = sub_data["unsubscribe_token"]
    assert job["idempotency_key"] == f"newsletter-welcome/{sub_data['id']}"
    assert len(job["idempotency_key"]) <= 256

    # Verify that the rendered HTML contains the verified unsubscribe URL
    expected_unsub_url = f"/api/unsubscribe?email=secure.token@domain.com&token={token}"
    assert expected_unsub_url in job["rendered_html"]


def test_7_duplicate_active_subscription_does_not_send_repeated_welcome(client, test_db):
    """Requirement 7: Duplicate active subscription does NOT queue another welcome email."""
    payload = {"email": "already.subscribed@domain.com"}
    # 1st subscription
    resp1 = client.post("/api/newsletter", json=payload)
    assert resp1.status_code == 200
    assert len(test_db.outbox_jobs.docs) == 1

    # 2nd subscription
    resp2 = client.post("/api/newsletter", json=payload)
    assert resp2.status_code == 200
    # No duplicate subscriber document created
    assert len(test_db.newsletter_subscriptions.docs) == 1
    # No second outbox job queued!
    assert len(test_db.outbox_jobs.docs) == 1


def test_8_newsletter_unsubscribe_token_validates_and_suppresses(client, test_db):
    """Requirement 8: Unsubscribe token validates against newsletter_subscriptions and suppresses."""
    test_db.newsletter_subscriptions.docs.append({
        "id": "sub_test_001",
        "email": "reader@news.com",
        "unsubscribe_token": "token_secret_xyz123",
        "unsubscribed": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    # Execute unsubscribe via GET /api/unsubscribe
    resp = client.get("/api/unsubscribe", params={
        "email": "reader@news.com",
        "token": "token_secret_xyz123"
    })
    assert resp.status_code == 200
    assert "Preferences Updated" in resp.text

    # Verify subscriber document was marked unsubscribed
    sub = test_db.newsletter_subscriptions.docs[0]
    assert sub["unsubscribed"] is True

    # Verify suppression record was created in email_suppressions
    assert len(test_db.email_suppressions.docs) == 1
    assert test_db.email_suppressions.docs[0]["email"] == "reader@news.com"


def test_9_wrong_token_rejected_400(client, test_db):
    """Requirement 9: Wrong/invalid token cannot unsubscribe subscriber."""
    test_db.newsletter_subscriptions.docs.append({
        "id": "sub_test_002",
        "email": "target@domain.com",
        "unsubscribe_token": "correct_token_111",
        "unsubscribed": False
    })

    resp = client.get("/api/unsubscribe", params={
        "email": "target@domain.com",
        "token": "WRONG_TOKEN"
    })
    assert resp.status_code == 400
    assert "Invalid Link" in resp.text
    # Still subscribed
    assert test_db.newsletter_subscriptions.docs[0]["unsubscribed"] is False
    assert len(test_db.email_suppressions.docs) == 0


def test_10_token_belonging_to_another_subscriber_rejected(client, test_db):
    """Requirement 10: Token belonging to another subscriber cannot unsubscribe target."""
    test_db.newsletter_subscriptions.docs.extend([
        {"id": "s1", "email": "victim@domain.com", "unsubscribe_token": "token_victim_123", "unsubscribed": False},
        {"id": "s2", "email": "attacker@domain.com", "unsubscribe_token": "token_attacker_456", "unsubscribed": False}
    ])

    # Attacker tries to unsubscribe victim using attacker's token
    resp = client.get("/api/unsubscribe", params={
        "email": "victim@domain.com",
        "token": "token_attacker_456"
    })
    assert resp.status_code == 400
    assert "Invalid Link" in resp.text
    assert test_db.newsletter_subscriptions.docs[0]["unsubscribed"] is False


def test_11_repeat_unsubscribe_is_idempotent(client, test_db):
    """Requirement 11: Repeat unsubscribe is idempotent without error or duplicate suppressions."""
    test_db.newsletter_subscriptions.docs.append({
        "id": "sub_test_003",
        "email": "idemp@domain.com",
        "unsubscribe_token": "token_repeat_789",
        "unsubscribed": False
    })

    # 1st call
    resp1 = client.get("/api/unsubscribe", params={"email": "idemp@domain.com", "token": "token_repeat_789"})
    assert resp1.status_code == 200
    assert len(test_db.email_suppressions.docs) == 1

    # 2nd call
    resp2 = client.get("/api/unsubscribe", params={"email": "idemp@domain.com", "token": "token_repeat_789"})
    assert resp2.status_code == 200
    # No duplicate suppression record
    assert len(test_db.email_suppressions.docs) == 1


@pytest.mark.asyncio
async def test_12_newsletter_provider_deterministic_idempotency_key(monkeypatch):
    """Requirement 12: send_email_via_provider forwards deterministic newsletter idempotency key."""
    mock_send = MagicMock(return_value={"id": "re_news_999"})
    monkeypatch.setattr("resend.Emails.send", mock_send)
    monkeypatch.setattr("backend.services.email.provider.settings.RESEND_API_KEY", "re_live_key_test")

    res = await send_email_via_provider(
        to="savagesnowboy@gmail.com",
        subject="Newsletter Welcome",
        html="<p>Welcome!</p>",
        is_production_dispatch=True,
        idempotency_key="newsletter-welcome/sub_uuid_456"
    )

    assert res["success"] is True
    assert res["resend_id"] == "re_news_999"

    mock_send.assert_called_once()
    call_args, _ = mock_send.call_args
    assert call_args[1] == {"idempotency_key": "newsletter-welcome/sub_uuid_456"}
