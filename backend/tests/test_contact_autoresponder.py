"""
Test Suite for Contact Inquiry Autoresponder — Phase 3

Covers:
1. Valid inquiry persists
2. Valid inquiry queues acknowledgement
3. Inquiry API does not call provider synchronously
4. Queued job uses contact template
5. Recipient matches inquiry email
6. Deterministic idempotency key
7. Duplicate/retry within cooldown cannot queue duplicate logical acknowledgement
8. Missing optional company handled gracefully
9. Malicious HTML in name/company is escaped
10. Queue failure does not delete inquiry
11. Worker retries provider failures safely
12. Provider receives deterministic Resend idempotency key
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timezone, timedelta
from starlette.testclient import TestClient

from backend.server import app, db
import backend.server as server_module
from backend.models.email import OutboxJobStatus
from backend.services.email.worker import OutboxWorker
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

    async def update_many(self, query, update_spec):
        cnt = 0
        for i, d in enumerate(self.docs):
            if self._matches(d, query):
                if "$set" in update_spec:
                    self.docs[i].update(update_spec["$set"])
                cnt += 1
        return MagicMock(modified_count=cnt)

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
    return mock


@pytest.fixture
def client(test_db):
    return TestClient(app)


def test_1_and_2_valid_inquiry_persists_and_queues_acknowledgement(client, test_db):
    """Requirement 1 & 2: Valid inquiry persists and queues exactly one transactional outbox job."""
    payload = {
        "name": "CA Rajesh Sharma",
        "company": "Apex Corp Ltd",
        "email": "rajesh@apexcorp.com",
        "service_of_interest": "Statutory Audit",
        "message": "We require audit assistance for FY26.",
        "source": "website_contact"
    }
    resp = client.post("/api/contact", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "rajesh@apexcorp.com"
    assert data["acknowledgement_status"] == "queued"
    inquiry_id = data["id"]

    # Check persistence in db
    assert len(test_db.contact_submissions.docs) == 1
    stored_inquiry = test_db.contact_submissions.docs[0]
    assert stored_inquiry["id"] == inquiry_id
    assert stored_inquiry["name"] == "CA Rajesh Sharma"

    # Check outbox job
    assert len(test_db.outbox_jobs.docs) == 1
    job = test_db.outbox_jobs.docs[0]
    assert job["job_type"] == "transactional"
    assert job["transactional_type"] == "contact_acknowledgement"
    assert job["source_entity_id"] == inquiry_id
    assert job["recipient_email"] == "rajesh@apexcorp.com"
    assert job["idempotency_key"] == f"contact-acknowledgement/{inquiry_id}"
    assert job["status"] == OutboxJobStatus.PENDING.value


def test_3_inquiry_api_does_not_call_provider_synchronously(client, test_db):
    """Requirement 3: API returns without calling send_email_via_provider or Resend synchronously."""
    payload = {
        "name": "Async Test User",
        "email": "async@test.com",
        "message": "Verify no synchronous provider dispatch occurs."
    }
    with patch("backend.services.email.provider.send_email_via_provider") as mock_send:
        resp = client.post("/api/contact", json=payload)
        assert resp.status_code == 200
        # The provider must NOT be called in the HTTP cycle
        mock_send.assert_not_called()

    # Job is safely queued in the outbox
    assert len(test_db.outbox_jobs.docs) == 1


def test_4_5_6_queued_job_metadata_and_idempotency(client, test_db):
    """Requirement 4, 5, 6: Uses contact template, matches inquiry email, deterministic idempotency."""
    payload = {
        "name": "Sneha Gupta",
        "company": "FinEdge Advisory",
        "email": "sneha@finedge.com",
        "service_of_interest": "Direct Tax",
        "message": "Advisory needed on transfer pricing."
    }
    resp = client.post("/api/contact", json=payload)
    assert resp.status_code == 200
    inquiry_id = resp.json()["id"]

    job = test_db.outbox_jobs.docs[0]
    assert job["template_id"] == "contact_acknowledgement"
    assert job["recipient_email"] == "sneha@finedge.com"
    assert job["idempotency_key"] == f"contact-acknowledgement/{inquiry_id}"
    assert len(job["idempotency_key"]) <= 256
    assert "FinEdge Advisory" in job["rendered_html"]
    assert "Direct Tax" in job["rendered_html"]
    assert "Inquiry Received" in job["subject"]


def test_7_duplicate_rapid_submissions_cooldown(client, test_db):
    """Requirement 7: Repeated submissions within cooldown do not queue duplicate autoresponders."""
    payload = {
        "name": "Double Clicker",
        "email": "rapid@domain.com",
        "message": "Click 1"
    }
    # First submission
    resp1 = client.post("/api/contact", json=payload)
    assert resp1.status_code == 200
    assert resp1.json()["acknowledgement_status"] == "queued"
    assert len(test_db.outbox_jobs.docs) == 1

    # Second submission with same email immediately
    resp2 = client.post("/api/contact", json=payload)
    assert resp2.status_code == 200
    # The inquiry itself IS saved
    assert len(test_db.contact_submissions.docs) == 2
    # But acknowledgement is suppressed to protect recipient
    assert resp2.json()["acknowledgement_status"] == "suppressed_cooldown"
    # No duplicate outbox job was queued
    assert len(test_db.outbox_jobs.docs) == 1


def test_8_missing_optional_company_handled_gracefully(client, test_db):
    """Requirement 8: Missing optional company / service defaults gracefully without crashing."""
    payload = {
        "name": "Individual Client",
        "email": "individual@personal.com",
        "message": "Personal income tax assistance."
    }
    resp = client.post("/api/contact", json=payload)
    assert resp.status_code == 200
    job = test_db.outbox_jobs.docs[0]
    assert "Not specified" in job["rendered_html"]
    assert "General Advisory" in job["rendered_html"]


def test_9_malicious_html_is_escaped_in_rendered_html(client, test_db):
    """Requirement 9: XSS attacks in name/company/service are escaped in HTML context, inert in text."""
    payload = {
        "name": '<script>alert("pwned")</script>',
        "company": '"><img src=x onerror=alert(1)>',
        "service_of_interest": '<b onmouseover="alert(2)">Audit</b>',
        "email": "hacker@security.com",
        "message": "Testing input sanitization."
    }
    resp = client.post("/api/contact", json=payload)
    assert resp.status_code == 200
    job = test_db.outbox_jobs.docs[0]

    html = job["rendered_html"]
    # HTML must NOT contain unescaped script tag or unescaped img onerror
    assert '<script>alert("pwned")</script>' not in html
    assert '&lt;script&gt;alert(&quot;pwned&quot;)&lt;/script&gt;' in html
    assert '"><img src=x onerror=alert(1)>' not in html
    assert '&quot;&gt;&lt;img src=x onerror=alert(1)&gt;' in html

    # Plain text remains human readable and harmless
    text = job["rendered_text"]
    assert "alert" in text  # Clean text preserved without tag interpretation


def test_10_queue_failure_does_not_delete_or_rollback_inquiry(client, test_db, monkeypatch):
    """Requirement 10: If outbox queueing fails, the inquiry is preserved and returns 200."""
    async def failing_insert(*args, **kwargs):
        raise RuntimeError("MongoDB outbox disk full or connection dropped")

    monkeypatch.setattr(test_db.outbox_jobs, "insert_one", failing_insert)

    payload = {
        "name": "Resilient Customer",
        "email": "customer@resilience.com",
        "message": "My inquiry must be saved even if email fails!"
    }
    resp = client.post("/api/contact", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    # Submission was saved!
    assert len(test_db.contact_submissions.docs) == 1
    assert data["acknowledgement_status"] == "queue_failed"
    # Document recorded queue_failed
    assert test_db.contact_submissions.docs[0]["acknowledgement_status"] == "queue_failed"


@pytest.mark.asyncio
async def test_11_worker_retries_provider_failures_safely(test_db, monkeypatch):
    """Requirement 11: OutboxWorker retries temporary provider failures with backoff."""
    worker = OutboxWorker(test_db)
    now = datetime.now(timezone.utc)

    # Insert a pending job
    test_db.outbox_jobs.docs.append({
        "job_id": "job_retry_test",
        "job_type": "transactional",
        "transactional_type": "contact_acknowledgement",
        "source_entity_type": "contact_submission",
        "source_entity_id": "inq_123",
        "recipient_email": "retry@test.com",
        "subject": "Test Retry",
        "rendered_html": "<p>Hello</p>",
        "status": OutboxJobStatus.PENDING.value,
        "attempts": 0,
        "max_attempts": 3,
        "next_attempt_at": now - timedelta(seconds=1),
        "idempotency_key": "contact-acknowledgement/inq_123"
    })

    # Simulate provider failure on attempt 1
    async def mock_fail(**kwargs):
        return {"success": False, "status": "failed", "error": "Resend 500 Network Error"}

    monkeypatch.setattr("backend.services.email.worker.send_email_via_provider", mock_fail)

    job = await worker._claim_next_job()
    assert job is not None
    await worker._process_job(job)

    # Job should be reset to pending with attempts=1 and a future next_attempt_at
    updated_job = test_db.outbox_jobs.docs[0]
    assert updated_job["status"] == OutboxJobStatus.PENDING.value
    assert updated_job["attempts"] == 1
    assert updated_job["error_details"] == "Resend 500 Network Error"
    assert updated_job["next_attempt_at"] > now


@pytest.mark.asyncio
async def test_12_provider_receives_deterministic_resend_idempotency_key(monkeypatch):
    """Requirement 12: send_email_via_provider passes options={'idempotency_key': ...} to Resend."""
    mock_send = MagicMock(return_value={"id": "re_det_123"})
    monkeypatch.setattr("resend.Emails.send", mock_send)
    monkeypatch.setattr("backend.services.email.provider.settings.RESEND_API_KEY", "re_live_key_test")

    res = await send_email_via_provider(
        to="savagesnowboy@gmail.com",
        subject="Deterministic Idempotency Test",
        html="<p>Test</p>",
        is_production_dispatch=True,
        idempotency_key="contact-acknowledgement/inq_stable_789"
    )

    assert res["success"] is True
    assert res["resend_id"] == "re_det_123"

    # Verify resend.Emails.send call arguments
    mock_send.assert_called_once()
    call_args, call_kwargs = mock_send.call_args
    # Params: call_args[0]
    assert call_args[0]["to"] == ["savagesnowboy@gmail.com"]
    # Options: call_args[1] must contain idempotency_key
    assert len(call_args) >= 2
    assert call_args[1] == {"idempotency_key": "contact-acknowledgement/inq_stable_789"}
