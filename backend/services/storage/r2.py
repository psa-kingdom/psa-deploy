import logging
import uuid
import re
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from backend.core.config import settings

logger = logging.getLogger(__name__)


def get_r2_client():
    """
    Initializes and returns a boto3 S3 client configured for Cloudflare R2.
    """
    if not settings.is_r2_configured:
        raise ValueError("Cloudflare R2 is not fully configured in environment variables (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME).")

    return boto3.client(
        "s3",
        endpoint_url=settings.r2_endpoint_url,
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
        region_name="auto"
    )


def sanitize_filename(filename: str) -> str:
    """Sanitizes filename to prevent directory traversal and invalid characters."""
    clean = re.sub(r'[^a-zA-Z0-9_.-]', '_', filename)
    return clean[:120] if clean else "attachment"


async def upload_file_to_r2(
    file_bytes: bytes,
    original_filename: str,
    content_type: str = "application/octet-stream",
    folder: str = "attachments"
) -> Dict[str, Any]:
    """
    Uploads a file to Cloudflare R2 object storage.
    Returns file metadata including storage key, original filename, size, and download URLs.
    """
    clean_name = sanitize_filename(original_filename)
    unique_id = str(uuid.uuid4())
    date_prefix = datetime.now(timezone.utc).strftime("%Y/%m")
    file_key = f"{folder}/{date_prefix}/{unique_id}_{clean_name}"

    client = get_r2_client()

    extra_args = {
        "ContentType": content_type,
        "ContentDisposition": f'attachment; filename="{clean_name}"',
    }

    try:
        client.put_object(
            Bucket=settings.R2_BUCKET_NAME,
            Key=file_key,
            Body=file_bytes,
            **extra_args
        )
    except ClientError as e:
        logger.error("Failed to upload object to Cloudflare R2: %s", e, exc_info=True)
        raise RuntimeError(f"R2 upload failed: {e}")

    # Determine public or backend download URL
    if settings.R2_PUBLIC_DOMAIN:
        download_url = f"{settings.R2_PUBLIC_DOMAIN.rstrip('/')}/{file_key}"
    else:
        # Backend proxy download endpoint
        download_url = f"{settings.BACKEND_URL.rstrip('/')}/api/attachments/download/{unique_id}"

    return {
        "attachment_id": unique_id,
        "file_key": file_key,
        "filename": original_filename,
        "sanitized_filename": clean_name,
        "content_type": content_type,
        "size_bytes": len(file_bytes),
        "download_url": download_url,
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }


def generate_presigned_download_url(file_key: str, original_filename: Optional[str] = None, expires_in: int = 86400) -> str:
    """
    Generates a pre-signed download URL for a file stored in R2.
    Default expiry is 24 hours (86400 seconds).
    """
    client = get_r2_client()
    params = {
        "Bucket": settings.R2_BUCKET_NAME,
        "Key": file_key,
    }
    if original_filename:
        clean = sanitize_filename(original_filename)
        params["ResponseContentDisposition"] = f'attachment; filename="{clean}"'

    try:
        url = client.generate_presigned_url(
            "get_object",
            Params=params,
            ExpiresIn=expires_in
        )
        return url
    except ClientError as e:
        logger.error("Failed to generate presigned URL for key %s: %s", file_key, e)
        raise RuntimeError(f"Presigned URL generation failed: {e}")


def get_file_stream_from_r2(file_key: str):
    """
    Retrieves the raw StreamingBody and metadata of an object from R2.
    """
    client = get_r2_client()
    try:
        response = client.get_object(
            Bucket=settings.R2_BUCKET_NAME,
            Key=file_key
        )
        return response
    except ClientError as e:
        logger.error("Failed to retrieve file from R2 key %s: %s", file_key, e)
        raise


def delete_file_from_r2(file_key: str) -> bool:
    """Deletes a file object from Cloudflare R2."""
    client = get_r2_client()
    try:
        client.delete_object(
            Bucket=settings.R2_BUCKET_NAME,
            Key=file_key
        )
        return True
    except ClientError as e:
        logger.error("Failed to delete file from R2 key %s: %s", file_key, e)
        return False
