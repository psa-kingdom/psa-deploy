import logging
from typing import Optional, List, Any

from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends, Request
from fastapi.responses import StreamingResponse, RedirectResponse

from backend.core.config import settings
from backend.core.auth import get_current_admin
from backend.services.storage.r2 import (
    upload_file_to_r2,
    get_file_stream_from_r2,
    delete_file_from_r2,
)

logger = logging.getLogger(__name__)

admin_router = APIRouter(prefix="/admin/attachments", tags=["Admin Attachments"])
public_router = APIRouter(prefix="/attachments", tags=["Public Attachments"])

def _get_db(request: Request = None):
    """Retrieves the motor MongoDB database instance."""
    if request and hasattr(request.app.state, "db") and request.app.state.db is not None:
        return request.app.state.db
    try:
        from backend.server import db
        return db
    except Exception:
        pass
    try:
        from server import db
        return db
    except Exception:
        pass
    return None

MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB max per file

ALLOWED_EXTENSIONS = {
    ".pdf", ".docx", ".doc", ".xlsx", ".xls", ".csv",
    ".png", ".jpg", ".jpeg", ".webp", ".zip", ".txt"
}


# ---------- Admin Routes ----------

@admin_router.post("/upload")
async def upload_attachment(
    file: UploadFile = File(...),
    request: Request = None,
    admin: dict = Depends(get_current_admin)
):
    """
    Uploads a file to Cloudflare R2 and records its metadata in MongoDB.
    Requires admin authentication.
    """
    if not settings.is_r2_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Cloudflare R2 is not configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY in backend/.env."
        )

    # Validate file extension
    filename = file.filename or "attachment"
    lower_name = filename.lower()
    if not any(lower_name.endswith(ext) for ext in ALLOWED_EXTENSIONS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File extension not permitted. Allowed extensions: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    # Read and check file size
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of 25MB."
        )

    content_type = file.content_type or "application/octet-stream"

    # Upload to R2
    try:
        meta = await upload_file_to_r2(
            file_bytes=file_bytes,
            original_filename=filename,
            content_type=content_type
        )
    except Exception as e:
        logger.error("Error during R2 upload: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file to Cloudflare R2: {str(e)}"
        )

    # Store record in MongoDB
    if settings.R2_PUBLIC_DOMAIN and meta.get("file_key"):
        meta["download_url"] = f"{settings.R2_PUBLIC_DOMAIN.rstrip('/')}/{meta['file_key']}"

    try:
        db = _get_db(request)
        if db is not None:
            await db.attachments.insert_one(meta.copy())
    except Exception as e:
        logger.warning("Could not persist attachment record to database: %s", e)

    return {
        "success": True,
        "attachment": meta
    }


@admin_router.get("")
async def list_attachments(
    request: Request,
    admin: dict = Depends(get_current_admin)
):
    """Lists recently uploaded attachments for insertion into emails."""
    try:
        db = _get_db(request)
        if db is not None:
            items = await db.attachments.find({}, {"_id": 0}).sort("uploaded_at", -1).limit(50).to_list(50)
            if settings.R2_PUBLIC_DOMAIN:
                for item in items:
                    if item.get("file_key"):
                        item["download_url"] = f"{settings.R2_PUBLIC_DOMAIN.rstrip('/')}/{item['file_key']}"
            return {"attachments": items}
    except Exception as e:
        logger.error("Failed to query attachments: %s", e)
    return {"attachments": []}


@admin_router.delete("/{attachment_id}")
async def delete_attachment(
    attachment_id: str,
    request: Request,
    admin: dict = Depends(get_current_admin)
):
    """Deletes an attachment from Cloudflare R2 and removes record from database."""
    try:
        db = _get_db(request)
        if db is not None:
            record = await db.attachments.find_one({"attachment_id": attachment_id})
            if record and record.get("file_key"):
                delete_file_from_r2(record["file_key"])
                await db.attachments.delete_one({"attachment_id": attachment_id})
                return {"success": True, "message": "Attachment deleted."}
    except Exception as e:
        logger.error("Failed to delete attachment: %s", e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete attachment.")

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found.")


# ---------- Public Download Routes ----------

@public_router.get("/download/{attachment_id}")
async def download_attachment(attachment_id: str, request: Request):
    """
    Public recipient download endpoint:
    Redirects to pre-signed Cloudflare R2 URL or streams file directly with proper Content-Disposition.
    """
    if not settings.is_r2_configured:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Storage service unavailable.")

    db = _get_db(request)
    record = None
    if db is not None:
        record = await db.attachments.find_one({"attachment_id": attachment_id})

    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found or link has expired.")

    file_key = record["file_key"]
    filename = record.get("sanitized_filename") or record.get("filename") or "download"

    # If public domain is configured, redirect directly
    if settings.R2_PUBLIC_DOMAIN:
        public_url = f"{settings.R2_PUBLIC_DOMAIN.rstrip('/')}/{file_key}"
        return RedirectResponse(url=public_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)

    # Otherwise stream the file through backend with content-disposition
    try:
        r2_obj = get_file_stream_from_r2(file_key)
        stream_body = r2_obj["Body"]
        content_type = r2_obj.get("ContentType", "application/octet-stream")

        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "public, max-age=86400"
        }

        return StreamingResponse(
            stream_body.iter_chunks(chunk_size=64 * 1024),
            media_type=content_type,
            headers=headers
        )
    except Exception as e:
        logger.error("Failed to stream attachment %s: %s", attachment_id, e)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not retrieve attachment.")
