import pytest
from unittest.mock import AsyncMock, MagicMock
from backend.routes.admin_campaigns import (
    add_subscriber_admin,
    delete_subscriber_admin,
    list_subscribers_admin,
    get_audience_recipients,
    AdminSubscriberCreate
)
from backend.models.email import TargetFilter
from fastapi import HTTPException
from datetime import datetime, timezone

class MockCollection:
    def __init__(self):
        self.docs = []

    def find(self, query=None, projection=None):
        mock_cursor = MagicMock()
        filtered = self.docs
        if query and "email" in query:
            if isinstance(query["email"], dict) and "$regex" in query["email"]:
                rgx = query["email"]["$regex"]
                filtered = [d for d in self.docs if rgx.lower() in d.get("email", "").lower()]
            elif isinstance(query["email"], str):
                filtered = [d for d in self.docs if d.get("email") == query["email"]]

        mock_cursor.sort = MagicMock(return_value=mock_cursor)
        async def to_list(length=1000):
            return filtered[:length]
        mock_cursor.to_list = to_list
        return mock_cursor

    async def find_one(self, query, projection=None):
        for d in self.docs:
            if "email" in query and d.get("email") == query["email"]:
                return dict(d)
            if "id" in query and d.get("id") == query["id"]:
                return dict(d)
        return None

    async def insert_one(self, doc):
        d = dict(doc)
        if "_id" not in d:
            d["_id"] = "mock_id_" + str(len(self.docs))
        self.docs.append(d)
        return MagicMock(inserted_id=d["_id"])

    async def update_one(self, filter_query, update_spec):
        for d in self.docs:
            if ("_id" in filter_query and d.get("_id") == filter_query["_id"]) or \
               ("email" in filter_query and d.get("email") == filter_query["email"]) or \
               ("id" in filter_query and d.get("id") == filter_query["id"]):
                if "$set" in update_spec:
                    d.update(update_spec["$set"])
                return MagicMock(modified_count=1)
        return MagicMock(modified_count=0)

    async def delete_one(self, query):
        if "$or" in query:
            for cond in query["$or"]:
                for i, d in enumerate(self.docs):
                    if ("email" in cond and d.get("email") == cond["email"]) or \
                       ("id" in cond and d.get("id") == cond["id"]):
                        self.docs.pop(i)
                        return MagicMock(deleted_count=1)
        return MagicMock(deleted_count=0)

    async def delete_many(self, query):
        self.docs = [d for d in self.docs if d.get("email") != query.get("email")]
        return MagicMock(deleted_count=1)

    async def count_documents(self, query):
        return len(self.docs)


class MockDB:
    def __init__(self):
        self.newsletter_subscriptions = MockCollection()
        self.email_suppressions = MockCollection()


@pytest.mark.anyio
async def test_add_and_list_subscriber():
    db = MockDB()
    # Add new subscriber
    payload = AdminSubscriberCreate(email="user1@example.com", name="User One")
    res = await add_subscriber_admin(payload, db=db)
    assert res["status"] == "success"
    assert res["subscriber"]["email"] == "user1@example.com"
    assert len(db.newsletter_subscriptions.docs) == 1

    # List subscribers
    list_res = await list_subscribers_admin(db=db)
    assert len(list_res) == 1
    assert list_res[0]["email"] == "user1@example.com"


@pytest.mark.anyio
async def test_delete_subscriber():
    db = MockDB()
    payload = AdminSubscriberCreate(email="delete_me@example.com")
    await add_subscriber_admin(payload, db=db)
    assert len(db.newsletter_subscriptions.docs) == 1

    del_res = await delete_subscriber_admin("delete_me@example.com", db=db)
    assert del_res["status"] == "success"
    assert len(db.newsletter_subscriptions.docs) == 0


@pytest.mark.anyio
async def test_invalid_email_fails():
    db = MockDB()
    payload = AdminSubscriberCreate(email="not-an-email")
    with pytest.raises(HTTPException) as exc:
        await add_subscriber_admin(payload, db=db)
    assert exc.value.status_code == 400
