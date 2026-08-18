import pytest
import asyncio
from datetime import datetime, timezone
from starlette.testclient import TestClient
from backend.server import app
from backend.routes.admin_auth import _create_session_token, COOKIE_NAME
from backend.data.initial_insights import INITIAL_INSIGHTS
from backend.routes.admin_insights import get_db

class MockCursor:
    def __init__(self, docs):
        self.docs = docs

    def sort(self, key, direction=1):
        return self

    def skip(self, n):
        self.docs = self.docs[n:]
        return self

    def limit(self, n):
        self.docs = self.docs[:n]
        return self

    async def to_list(self, n):
        return self.docs[:n]

class MockInsightsCollection:
    def __init__(self):
        self.docs = []

    async def count_documents(self, query):
        filtered = self._filter(query)
        return len(filtered)

    def _filter(self, query):
        if not query:
            return list(self.docs)
        results = []
        for d in self.docs:
            match = True
            for k, v in query.items():
                if k == "$or":
                    or_match = False
                    for clause in v:
                        for ck, cv in clause.items():
                            if isinstance(cv, dict) and "$regex" in cv:
                                import re
                                if re.search(cv["$regex"], str(d.get(ck, "")), re.I):
                                    or_match = True
                            elif d.get(ck) == cv:
                                or_match = True
                    if not or_match:
                        match = False
                elif k == "id" and isinstance(v, dict) and "$ne" in v:
                    if d.get("id") == v["$ne"]:
                        match = False
                elif d.get(k) != v:
                    match = False
            if match:
                results.append(d)
        return results

    def find(self, query=None, projection=None):
        filtered = self._filter(query or {})
        # Deep copy to avoid mutations
        copied = [dict(d) for d in filtered]
        return MockCursor(copied)

    async def find_one(self, query, projection=None):
        filtered = self._filter(query)
        if filtered:
            return dict(filtered[0])
        return None

    async def insert_one(self, doc):
        self.docs.append(dict(doc))
        return type("InsertResult", (), {"inserted_id": doc.get("id")})()

    async def update_one(self, query, update):
        filtered = self._filter(query)
        if not filtered:
            return type("UpdateResult", (), {"matched_count": 0, "modified_count": 0})()
        target = filtered[0]
        if "$set" in update:
            for k, v in update["$set"].items():
                target[k] = v
        return type("UpdateResult", (), {"matched_count": 1, "modified_count": 1})()

    async def delete_one(self, query):
        filtered = self._filter(query)
        if not filtered:
            return type("DeleteResult", (), {"deleted_count": 0})()
        self.docs.remove(filtered[0])
        return type("DeleteResult", (), {"deleted_count": 1})()

class MockDatabase:
    def __init__(self):
        self.insights = MockInsightsCollection()

@pytest.fixture
def mock_db():
    return MockDatabase()

@pytest.fixture
def client(mock_db):
    app.dependency_overrides[get_db] = lambda: mock_db
    
    # Seed initial insights
    now_utc = datetime.now(timezone.utc)
    for item in INITIAL_INSIGHTS:
        doc = dict(item)
        doc["id"] = f"seed-{doc['slug']}"
        doc["status"] = "published"
        doc["published_at"] = now_utc
        doc["created_at"] = now_utc
        doc["updated_at"] = now_utc
        mock_db.insights.docs.append(doc)

    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()

def test_insights_end_to_end_source_of_truth(client, mock_db):
    slug = "internal-controls-automotive-expansion"
    
    # 1. Public user visits /api/insights
    res_pub = client.get("/api/insights")
    assert res_pub.status_code == 200
    articles = res_pub.json()
    assert len(articles) == 9
    
    # 2. Public user fetches specific article by slug
    res_detail = client.get(f"/api/insights/{slug}")
    assert res_detail.status_code == 200
    article = res_detail.json()
    assert article["slug"] == slug
    assert article["category"] == "Audit & Assurance"
    article_id = article["id"]
    
    # 3. Admin logs in and updates category and excerpt
    admin_token = _create_session_token()
    client.cookies.set(COOKIE_NAME, admin_token)
    
    update_payload = {
        "category": "Automotive",
        "excerpt": "Updated excerpt for testing persistence and source of truth."
    }
    
    res_update = client.put(f"/api/admin/insights/{article_id}", json=update_payload)
    assert res_update.status_code == 200
    updated_article = res_update.json()
    assert updated_article["category"] == "Automotive"
    assert updated_article["excerpt"] == "Updated excerpt for testing persistence and source of truth."
    
    # 4. Verify MongoDB mock directly contains the updated values
    db_doc = next((d for d in mock_db.insights.docs if d["id"] == article_id), None)
    assert db_doc is not None
    assert db_doc["category"] == "Automotive"
    assert db_doc["excerpt"] == "Updated excerpt for testing persistence and source of truth."
    
    # 5. Admin reloads /api/admin/insights and sees updated value
    res_admin_list = client.get("/api/admin/insights")
    assert res_admin_list.status_code == 200
    admin_matched = next(a for a in res_admin_list.json() if a["id"] == article_id)
    assert admin_matched["category"] == "Automotive"
    
    # 6. Unauthenticated public access (clear cookies)
    client.cookies.clear()
    
    res_pub_detail_after = client.get(f"/api/insights/{slug}")
    assert res_pub_detail_after.status_code == 200
    pub_article_after = res_pub_detail_after.json()
    assert pub_article_after["category"] == "Automotive"
    assert pub_article_after["excerpt"] == "Updated excerpt for testing persistence and source of truth."
    
    # 7. Test category filtering on public API
    res_filtered = client.get("/api/insights?category=Automotive")
    assert res_filtered.status_code == 200
    filtered_slugs = [a["slug"] for a in res_filtered.json()]
    assert slug in filtered_slugs
    
    # 8. Test Draft status unpublishing
    client.cookies.set(COOKIE_NAME, admin_token)
    res_draft = client.patch(f"/api/admin/insights/{article_id}/status", json={"status": "draft"})
    assert res_draft.status_code == 200
    
    # Public request should now 404
    client.cookies.clear()
    res_pub_draft = client.get(f"/api/insights/{slug}")
    assert res_pub_draft.status_code == 404
    
    # 9. Re-publish article
    client.cookies.set(COOKIE_NAME, admin_token)
    res_pub_back = client.patch(f"/api/admin/insights/{article_id}/status", json={"status": "published"})
    assert res_pub_back.status_code == 200
    
    # Public request should now succeed again
    client.cookies.clear()
    res_pub_restored = client.get(f"/api/insights/{slug}")
    assert res_pub_restored.status_code == 200
    assert res_pub_restored.json()["category"] == "Automotive"
