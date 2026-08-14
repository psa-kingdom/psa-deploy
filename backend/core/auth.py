"""
Admin auth dependency.

Old: X-Admin-API-Key header
New: HttpOnly session cookie verified via require_admin_session

The old get_current_admin is kept temporarily for existing routes during transition.
New routes should import require_admin_session from routes.admin_auth directly.
"""

from fastapi import Request, HTTPException, status
from backend.core.config import settings


def get_current_admin(request: Request) -> dict:
    """
    Validates admin session from HttpOnly cookie.
    This replaces the previous X-Admin-API-Key header approach.
    """
    from backend.routes.admin_auth import get_session_from_request
    session = get_session_from_request(request)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin session required. Please log in at /admin/login.",
        )
    return {"role": session.get("role", "admin"), "identity": settings.ADMIN_USERNAME}
