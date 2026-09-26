import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from starlette.testclient import TestClient

from backend.server import app
from backend.core.auth import get_current_admin


@pytest.fixture
def client():
    app.dependency_overrides[get_current_admin] = lambda: {"username": "admin", "role": "superadmin"}
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


def test_attachment_upload_success(client):
    """Verifies that an admin can upload an attachment (.pdf) to Cloudflare R2 and receive metadata."""
    fake_file_bytes = b"%PDF-1.4 sample pdf content for test"
    files = {"file": ("report.pdf", fake_file_bytes, "application/pdf")}

    with patch("backend.routes.admin_attachments.upload_file_to_r2", new_callable=AsyncMock) as mock_upload:
        mock_upload.return_value = {
            "attachment_id": "att_test_123",
            "file_key": "attachments/2026/09/att_test_123_report.pdf",
            "filename": "report.pdf",
            "sanitized_filename": "report.pdf",
            "content_type": "application/pdf",
            "size_bytes": len(fake_file_bytes),
            "uploaded_at": "2026-09-25T19:00:00+00:00",
        }

        res = client.post("/api/admin/attachments/upload", files=files)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["attachment"]["filename"] == "report.pdf"
        assert "download_url" in data["attachment"]


def test_attachment_disallowed_extension(client):
    """Verifies that disallowed file extensions (.exe) are rejected with HTTP 400."""
    fake_file_bytes = b"bad executable content"
    files = {"file": ("virus.exe", fake_file_bytes, "application/octet-stream")}

    res = client.post("/api/admin/attachments/upload", files=files)
    assert res.status_code == 400
    assert "File extension not permitted" in res.json()["detail"]


def test_attachment_list(client):
    """Verifies that GET /api/admin/attachments returns recently uploaded attachments."""
    res = client.get("/api/admin/attachments")
    assert res.status_code == 200
    assert "attachments" in res.json()
    assert isinstance(res.json()["attachments"], list)


def test_attachment_delete(client):
    """Verifies that DELETE /api/admin/attachments/{id} deletes the file or handles gracefully."""
    with patch("backend.routes.admin_attachments.delete_file_from_r2") as mock_delete:
        with patch("backend.routes.admin_attachments._get_db") as mock_get_db:
            mock_db = MagicMock()
            mock_db.attachments.find_one = AsyncMock(return_value={"attachment_id": "test_id", "file_key": "test_key"})
            mock_db.attachments.delete_one = AsyncMock(return_value=True)
            mock_get_db.return_value = mock_db

            res = client.delete("/api/admin/attachments/test_id")
            assert res.status_code == 200
            assert res.json()["success"] is True
            mock_delete.assert_called_once_with("test_key")
