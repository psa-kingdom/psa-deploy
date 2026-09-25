import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from backend.server import app
from backend.routes.webhooks import normalize_subject, get_db as get_webhooks_db
from backend.core.auth import get_current_admin


class MockCollection:
    def __init__(self, docs=None):
        self.docs = [dict(d) for d in (docs or [])]

    async def find_one(self, query, projection=None):
        for d in self.docs:
            match = True
            for k, v in query.items():
                if isinstance(v, dict) and "$regex" in v:
                    import re
                    pattern = v["$regex"]
                    flags = re.IGNORECASE if v.get("$options") == "i" else 0
                    if not re.search(pattern, str(d.get(k, "")), flags):
                        match = False
                        break
                elif d.get(k) != v:
                    match = False
                    break
            if match:
                return dict(d)
        return None

    async def count_documents(self, query=None):
        if not query:
            return len(self.docs)
        count = 0
        for d in self.docs:
            match = True
            for k, v in query.items():
                if d.get(k) != v:
                    match = False
                    break
            if match:
                count += 1
        return count

    async def insert_one(self, doc):
        d = dict(doc)
        self.docs.append(d)
        return type("Result", (), {"inserted_id": d.get("reply_id") or "id_1"})()

    async def update_one(self, query, update, upsert=False):
        set_fields = update.get("$set", {})
        for d in self.docs:
            match = True
            for k, v in query.items():
                if d.get(k) != v:
                    match = False
                    break
            if match:
                d.update(set_fields)
                return type("Result", (), {"modified_count": 1, "upserted_id": None})()
        if upsert:
            new_doc = dict(query)
            new_doc.update(set_fields)
            self.docs.append(new_doc)
            return type("Result", (), {"modified_count": 0, "upserted_id": "upserted_1"})()
        return type("Result", (), {"modified_count": 0, "upserted_id": None})()

    async def delete_one(self, query):
        initial_len = len(self.docs)
        self.docs = [d for d in self.docs if not all(d.get(k) == v for k, v in query.items())]
        return type("Result", (), {"deleted_count": initial_len - len(self.docs)})()

    def find(self, query=None, projection=None):
        docs = list(self.docs)
        class Cursor:
            def __init__(self, d):
                self._d = d
            def sort(self, key, direction=-1):
                return self
            def limit(self, n):
                self._d = self._d[:n]
                return self
            async def to_list(self, n):
                return self._d[:n]
        return Cursor(docs)

    def aggregate(self, pipeline):
        # Basic mock aggregate grouping by clean_subject
        grouped = {}
        for d in self.docs:
            key = d.get("clean_subject")
            if key not in grouped:
                grouped[key] = {
                    "_id": key,
                    "clean_subject": key,
                    "sample_raw_subject": d.get("subject"),
                    "reply_count": 0,
                    "latest_reply_at": d.get("received_at"),
                    "first_reply_at": d.get("received_at"),
                    "senders": set(),
                    "campaign_id": d.get("campaign_id"),
                    "campaign_title": d.get("campaign_title"),
                }
            grouped[key]["reply_count"] += 1
            grouped[key]["senders"].add(d.get("sender_email"))
        
        results = []
        for g in grouped.values():
            g["senders"] = list(g["senders"])
            results.append(g)

        class AggCursor:
            def __init__(self, items):
                self.items = items
            async def to_list(self, n):
                return self.items[:n]

        return AggCursor(results)


class MockDB:
    def __init__(self):
        self.email_replies = MockCollection()
        self.email_campaigns = MockCollection()
        self.webhook_events = MockCollection()
        self.campaign_recipients = MockCollection()
        self.outbox_jobs = MockCollection()
        self.email_suppressions = MockCollection()


@pytest.fixture
def mock_db():
    return MockDB()


@pytest.fixture
def client(mock_db):
    app.dependency_overrides[get_webhooks_db] = lambda: mock_db
    app.dependency_overrides[get_current_admin] = lambda: {"username": "admin", "role": "admin"}
    app.state.db = mock_db
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


def test_normalize_subject():
    assert normalize_subject("Re: Tax Advisory 2026") == "Tax Advisory 2026"
    assert normalize_subject("RE:  FWD: Important Update") == "Important Update"
    assert normalize_subject("Fw: Year End Compliance") == "Year End Compliance"
    assert normalize_subject("Clean Subject Without Prefix") == "Clean Subject Without Prefix"
    assert normalize_subject("") == "No Subject"
    assert normalize_subject(None) == "No Subject"


def test_webhook_inbound_reply_ingestion(client, mock_db):
    import json
    from svix.webhooks import Webhook
    from backend.core.config import settings

    # Set up matching campaign
    mock_db.email_campaigns.docs.append({
        "campaign_id": "camp_tax_01",
        "title": "Annual Tax Compliance Briefing",
        "subject": "Annual Tax Compliance Briefing 2026"
    })

    payload = {
        "id": "evt_test_reply_001",
        "type": "email.received",
        "data": {
            "email_id": "msg_inbound_123",
            "from": "Ravi Kumar <ravi@clientfirm.com>",
            "to": ["contact@psumanassociates.com"],
            "subject": "Re: Annual Tax Compliance Briefing 2026",
            "snippet": "We have received the briefing and would like to schedule an audit."
        }
    }

    headers = {"Content-Type": "application/json"}
    payload_bytes = json.dumps(payload, separators=(',', ':')).encode("utf-8")
    if settings.RESEND_WEBHOOK_SECRET:
        wh = Webhook(settings.RESEND_WEBHOOK_SECRET)
        msg_id = "evt_test_reply_001"
        dt = datetime.now(timezone.utc)
        sig = wh.sign(msg_id, dt, payload_bytes.decode("utf-8"))
        headers.update({
            "svix-id": msg_id,
            "svix-timestamp": str(int(dt.timestamp())),
            "svix-signature": sig,
        })

    resp = client.post("/api/webhooks/resend", content=payload_bytes, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "processed"

    # Verify reply record saved
    assert len(mock_db.email_replies.docs) == 1
    reply = mock_db.email_replies.docs[0]
    assert reply["sender_email"] == "ravi@clientfirm.com"
    assert reply["sender_name"] == "Ravi Kumar"
    assert reply["clean_subject"] == "Annual Tax Compliance Briefing 2026"
    assert reply["campaign_id"] == "camp_tax_01"
    assert reply["campaign_title"] == "Annual Tax Compliance Briefing"


def test_sync_replies_from_resend(client, mock_db, monkeypatch):
    import resend
    from backend.core.config import settings

    monkeypatch.setattr(settings, "RESEND_API_KEY", "re_test_key_123")

    fake_remote_items = [
        {
            "id": "re_recv_999",
            "from": "Client <client@bigcorp.com>",
            "to": ["updates@updates.psumanassociates.com"],
            "subject": "Re: September Updates",
            "created_at": "2026-09-20T10:00:00Z"
        }
    ]

    monkeypatch.setattr(resend.Emails.Receiving, "list", lambda: {"data": fake_remote_items})
    monkeypatch.setattr(
        resend.Emails.Receiving,
        "get",
        lambda _id: {"text": "Yes we agree with terms.", "html": None}
    )

    resp = client.post("/api/admin/communication/replies/sync")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["synced_count"] == 1

    # Ingested into database
    found = next((d for d in mock_db.email_replies.docs if d.get("email_id") == "re_recv_999"), None)
    assert found is not None
    assert found["sender_email"] == "client@bigcorp.com"
    assert found["clean_subject"] == "September Updates"
    assert found["source"] == "resend_sync"


def test_admin_replies_stats_and_manual_create(client, mock_db):
    # Create test reply via POST
    create_payload = {
        "sender_email": "finance@globalcorp.com",
        "sender_name": "Finance Dept",
        "subject": "Re: Corporate Governance Advisory",
        "snippet": "Acknowledged with thanks."
    }

    post_resp = client.post("/api/admin/communication/replies", json=create_payload)
    assert post_resp.status_code == 200
    res_data = post_resp.json()
    assert res_data["success"] is True
    reply_id = res_data["reply"]["reply_id"]
    assert res_data["reply"]["clean_subject"] == "Corporate Governance Advisory"

    # Get stats
    stats_resp = client.get("/api/admin/communication/replies/stats")
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert stats["total_replies"] == 1
    assert stats["unique_subjects_count"] == 1
    assert stats["by_subject"][0]["clean_subject"] == "Corporate Governance Advisory"
    assert stats["by_subject"][0]["reply_count"] == 1

    # List replies
    list_resp = client.get("/api/admin/communication/replies")
    assert list_resp.status_code == 200
    assert len(list_resp.json()["replies"]) == 1

    # Delete reply
    del_resp = client.delete(f"/api/admin/communication/replies/{reply_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["success"] is True
    assert len(mock_db.email_replies.docs) == 0
