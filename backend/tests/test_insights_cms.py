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


def test_all_editorial_fields_multi_field_lifecycle(client, mock_db):
    """
    Controlled multi-field test for:
    'Internal Controls in the Age of Rapid Automotive Expansion'
    Audits:
    1. Title
    2. Slug
    3. Category
    4. Excerpt / Summary
    5. Cover Image
    6. Author
    7. Publication Date
    8. Read Time
    9. Article Body
    10. Table of Contents (toc)
    11. Publication Status
    """
    orig_slug = "internal-controls-automotive-expansion"
    
    # 1. Fetch original article publicly
    res_init = client.get(f"/api/insights/{orig_slug}")
    assert res_init.status_code == 200
    orig_data = res_init.json()
    article_id = orig_data["id"]
    orig_title = orig_data["title"]
    orig_category = orig_data["category"]
    orig_excerpt = orig_data["excerpt"]
    orig_image = orig_data["image"]
    orig_date = orig_data["date"]
    orig_read_time = orig_data["read_time"]
    orig_author = orig_data["author"]
    orig_body = orig_data["body"]
    orig_toc = orig_data["toc"]

    admin_token = _create_session_token()
    client.cookies.set(COOKIE_NAME, admin_token)

    # 2. Multi-field update: change Category, Excerpt, Cover Image, Read Time, Title, Author, Date, Body
    new_image = "https://images.unsplash.com/photo-1647427060118-4911c9821b82?crop=entropy&cs=srgb&fm=jpg&w=1600&q=80"
    update_payload = {
        "title": "Internal Controls in Automotive: 2026 Boardroom Briefing",
        "category": "Automotive",
        "excerpt": "Controlled test excerpt: examining dealer-level governance drift.",
        "image": new_image,
        "date": "April 2026",
        "read_time": "12 min read",
        "author": "PSA Editorial & Advisory Board",
        "body": "<h2 id=\"context\">Updated Context</h2><p>Controlled test body paragraph demonstrating full HTML persistence.</p>"
    }

    res_update = client.put(f"/api/admin/insights/{article_id}", json=update_payload)
    assert res_update.status_code == 200
    updated_doc = res_update.json()

    assert updated_doc["title"] == update_payload["title"]
    assert updated_doc["category"] == "Automotive"
    assert updated_doc["excerpt"] == update_payload["excerpt"]
    assert updated_doc["image"] == new_image
    assert updated_doc["date"] == "April 2026"
    assert updated_doc["read_time"] == "12 min read"
    assert updated_doc["author"] == "PSA Editorial & Advisory Board"
    assert updated_doc["body"] == update_payload["body"]
    # TOC should be safely preserved
    assert len(updated_doc["toc"]) == len(orig_toc)

    # 3. Direct DB verification
    db_doc = next((d for d in mock_db.insights.docs if d["id"] == article_id), None)
    assert db_doc is not None
    assert db_doc["title"] == update_payload["title"]
    assert db_doc["category"] == "Automotive"
    assert db_doc["image"] == new_image
    assert db_doc["read_time"] == "12 min read"
    assert db_doc["author"] == "PSA Editorial & Advisory Board"
    assert db_doc["date"] == "April 2026"
    assert db_doc["body"] == update_payload["body"]

    # 4. Admin list verification
    res_admin_list = client.get("/api/admin/insights")
    assert res_admin_list.status_code == 200
    admin_item = next(a for a in res_admin_list.json() if a["id"] == article_id)
    assert admin_item["title"] == update_payload["title"]
    assert admin_item["category"] == "Automotive"
    assert admin_item["image"] == new_image
    assert admin_item["read_time"] == "12 min read"

    # 5. Public unauthenticated verification on listing and detail
    client.cookies.clear()

    # Public listing
    res_pub_list = client.get("/api/insights")
    assert res_pub_list.status_code == 200
    pub_item = next(a for a in res_pub_list.json() if a["id"] == article_id)
    assert pub_item["title"] == update_payload["title"]
    assert pub_item["category"] == "Automotive"
    assert pub_item["excerpt"] == update_payload["excerpt"]
    assert pub_item["image"] == new_image
    assert pub_item["read_time"] == "12 min read"

    # Public detail
    res_pub_detail = client.get(f"/api/insights/{orig_slug}")
    assert res_pub_detail.status_code == 200
    detail_data = res_pub_detail.json()
    assert detail_data["title"] == update_payload["title"]
    assert detail_data["category"] == "Automotive"
    assert detail_data["excerpt"] == update_payload["excerpt"]
    assert detail_data["image"] == new_image
    assert detail_data["read_time"] == "12 min read"
    assert detail_data["author"] == "PSA Editorial & Advisory Board"
    assert detail_data["date"] == "April 2026"
    assert detail_data["body"] == update_payload["body"]
    assert len(detail_data["toc"]) == len(orig_toc)

    # 6. Slug modification test
    client.cookies.set(COOKIE_NAME, admin_token)
    new_slug = "internal-controls-automotive-expansion-2026"
    res_slug_update = client.put(f"/api/admin/insights/{article_id}", json={"slug": new_slug})
    assert res_slug_update.status_code == 200
    assert res_slug_update.json()["slug"] == new_slug

    # Unauthenticated public request at new slug works; old slug returns 404
    client.cookies.clear()
    assert client.get(f"/api/insights/{new_slug}").status_code == 200
    assert client.get(f"/api/insights/{orig_slug}").status_code == 404

    # 7. Status workflow (Archived & Draft visibility check)
    client.cookies.set(COOKIE_NAME, admin_token)
    res_archive = client.patch(f"/api/admin/insights/{article_id}/status", json={"status": "archived"})
    assert res_archive.status_code == 200
    assert res_archive.json()["status"] == "archived"

    client.cookies.clear()
    # Archived article should not appear in public list or detail
    res_archived_list = client.get("/api/insights")
    assert not any(a["id"] == article_id for a in res_archived_list.json())
    assert client.get(f"/api/insights/{new_slug}").status_code == 404

    # 8. Restore original values completely
    client.cookies.set(COOKIE_NAME, admin_token)
    restore_payload = {
        "title": orig_title,
        "slug": orig_slug,
        "category": orig_category,
        "excerpt": orig_excerpt,
        "image": orig_image,
        "date": orig_date,
        "read_time": orig_read_time,
        "author": orig_author,
        "body": orig_body,
        "status": "published",
    }
    res_restore = client.put(f"/api/admin/insights/{article_id}", json=restore_payload)
    assert res_restore.status_code == 200

    # Verify restored state publicly while logged out
    client.cookies.clear()
    res_restored_pub = client.get(f"/api/insights/{orig_slug}")
    assert res_restored_pub.status_code == 200
    restored_data = res_restored_pub.json()
    assert restored_data["title"] == orig_title
    assert restored_data["slug"] == orig_slug
    assert restored_data["category"] == orig_category
    assert restored_data["excerpt"] == orig_excerpt
    assert restored_data["image"] == orig_image
    assert restored_data["date"] == orig_date
    assert restored_data["read_time"] == orig_read_time
    assert restored_data["author"] == orig_author
    assert restored_data["body"] == orig_body


def test_interactive_toc_editorial_lifecycle(client, mock_db):
    """
    Phase 05 TOC Editor verification:
    TEST A — TOC PERSISTENCE: Save structured TOC with levels
    TEST B — ADMIN RELOAD: Returned in CMS
    TEST C — PUBLIC RELOAD: Returned publicly
    TEST D — UNRELATED EDIT: Preserved during title/excerpt/category changes
    TEST E — BODY EDIT: Preserved during body changes
    TEST F — STATUS LIFECYCLE: Preserved across draft/publish/archive
    TEST G — SLUG CHANGE: Preserved across slug changes
    TEST H — TOC CLEAR: Empty array persists cleanly
    """
    slug = "internal-controls-automotive-expansion"
    admin_token = _create_session_token()
    client.cookies.set(COOKIE_NAME, admin_token)

    # 1. Fetch initial article
    res = client.get("/api/admin/insights")
    assert res.status_code == 200
    article = next(a for a in res.json() if a["slug"] == slug)
    article_id = article["id"]

    # TEST A: Admin saves a customized TOC with h2 (level 2) and h3 (level 3)
    custom_toc = [
        {"id": "context", "label": "01 Executive Context & Thesis", "level": 2},
        {"id": "risk", "label": "02 Critical Risk Breakpoints", "level": 2},
        {"id": "dealer-governance", "label": "02.1 Dealer Network Governance", "level": 3},
        {"id": "closing", "label": "03 Boardroom Mandates", "level": 2},
    ]

    res_toc_save = client.put(f"/api/admin/insights/{article_id}", json={"toc": custom_toc})
    assert res_toc_save.status_code == 200
    saved_doc = res_toc_save.json()
    assert len(saved_doc["toc"]) == 4
    assert saved_doc["toc"][0]["label"] == "01 Executive Context & Thesis"
    assert saved_doc["toc"][2]["level"] == 3
    assert saved_doc["toc"][2]["id"] == "dealer-governance"

    # Verify MongoDB contains the exact saved TOC
    db_doc = next((d for d in mock_db.insights.docs if d["id"] == article_id), None)
    assert db_doc is not None
    assert len(db_doc["toc"]) == 4
    assert db_doc["toc"][2]["id"] == "dealer-governance"
    assert db_doc["toc"][2]["level"] == 3

    # TEST B: Admin Reload
    res_admin_reload = client.get(f"/api/admin/insights/{article_id}")
    assert res_admin_reload.status_code == 200
    assert len(res_admin_reload.json()["toc"]) == 4
    assert res_admin_reload.json()["toc"][0]["label"] == "01 Executive Context & Thesis"

    # TEST C: Public Reload (unauthenticated)
    client.cookies.clear()
    res_pub_reload = client.get(f"/api/insights/{slug}")
    assert res_pub_reload.status_code == 200
    pub_toc = res_pub_reload.json()["toc"]
    assert len(pub_toc) == 4
    assert pub_toc[0]["label"] == "01 Executive Context & Thesis"
    assert pub_toc[2]["level"] == 3

    # TEST D: Unrelated edit (title & category) must not wipe or alter TOC
    client.cookies.set(COOKIE_NAME, admin_token)
    res_unrelated = client.put(
        f"/api/admin/insights/{article_id}",
        json={"title": "Updated Automotive Controls Title", "category": "Automotive"}
    )
    assert res_unrelated.status_code == 200
    assert res_unrelated.json()["title"] == "Updated Automotive Controls Title"
    assert len(res_unrelated.json()["toc"]) == 4
    assert res_unrelated.json()["toc"][0]["label"] == "01 Executive Context & Thesis"

    # TEST E: Body edit must not wipe TOC
    new_body = "<h2 id=\"context\">Executive Context</h2><p>Updated content...</p>"
    res_body = client.put(f"/api/admin/insights/{article_id}", json={"body": new_body})
    assert res_body.status_code == 200
    assert res_body.json()["body"] == new_body
    assert len(res_body.json()["toc"]) == 4

    # TEST F: Status transitions must preserve TOC
    res_draft = client.patch(f"/api/admin/insights/{article_id}/status", json={"status": "draft"})
    assert res_draft.status_code == 200
    assert len(res_draft.json()["toc"]) == 4

    res_pub = client.patch(f"/api/admin/insights/{article_id}/status", json={"status": "published"})
    assert res_pub.status_code == 200
    assert len(res_pub.json()["toc"]) == 4

    # TEST G: Slug change must preserve TOC
    new_slug = "internal-controls-automotive-expansion-updated"
    res_slug = client.put(f"/api/admin/insights/{article_id}", json={"slug": new_slug})
    assert res_slug.status_code == 200
    assert res_slug.json()["slug"] == new_slug
    assert len(res_slug.json()["toc"]) == 4

    # TEST H: Intentionally clearing TOC persists toc = []
    res_clear = client.put(f"/api/admin/insights/{article_id}", json={"toc": []})
    assert res_clear.status_code == 200
    assert res_clear.json()["toc"] == []

    # Verify MongoDB directly has empty TOC
    db_doc_cleared = next((d for d in mock_db.insights.docs if d["id"] == article_id), None)
    assert db_doc_cleared["toc"] == []

    # Restore original article values
    from backend.data.initial_insights import INITIAL_INSIGHTS
    orig_initial = next(i for i in INITIAL_INSIGHTS if i["slug"] == slug)
    restore_dict = {
        "title": orig_initial["title"],
        "slug": slug,
        "category": orig_initial["category"],
        "excerpt": orig_initial["excerpt"],
        "image": orig_initial["image"],
        "date": orig_initial["date"],
        "read_time": orig_initial["read_time"],
        "author": orig_initial["author"],
        "body": orig_initial["body"],
        "toc": orig_initial["toc"],
        "status": "published"
    }
    res_restored = client.put(f"/api/admin/insights/{article_id}", json=restore_dict)
    assert res_restored.status_code == 200
    assert len(res_restored.json()["toc"]) == len(orig_initial["toc"])


