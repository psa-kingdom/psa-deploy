"""
Admin Portal Authentication Routes.

Session model:
  - POST /admin/auth/login   → verify credentials → set HttpOnly session cookie
  - GET  /admin/auth/me      → return current session identity (requires cookie)
  - POST /admin/auth/logout  → clear session cookie

Security properties:
  - Credentials verified server-side (password hash comparison via bcrypt)
  - Session token is a signed JWT stored in an HttpOnly cookie
  - Cookie is SameSite=Lax, Secure in production
  - Admin secret never reaches frontend JavaScript
"""

import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Response, Request, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/auth", tags=["Admin Auth"])

COOKIE_NAME = "psa_admin_session"
COOKIE_MAX_AGE_SECONDS = 8 * 60 * 60  # 8 hours


# ---------- Helpers ----------

def _create_session_token() -> str:
    """
    Creates a signed session token using PyJWT.
    """
    import jwt
    payload = {
        "sub": "admin",
        "role": "admin",
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(seconds=COOKIE_MAX_AGE_SECONDS),
    }
    return jwt.encode(payload, settings.ADMIN_SESSION_SECRET, algorithm="HS256")


def _verify_session_token(token: str) -> Optional[dict]:
    """
    Validates and decodes a session token.
    Returns the decoded payload or None if invalid/expired.
    """
    import jwt
    try:
        payload = jwt.decode(token, settings.ADMIN_SESSION_SECRET, algorithms=["HS256"])
        return payload
    except Exception:
        return None


def _verify_admin_password(plain: str) -> bool:
    """
    Compares plain-text password against bcrypt hash stored in settings.
    Falls back to direct comparison only in local dev when hash is not configured.
    """
    import bcrypt
    stored = settings.ADMIN_PASSWORD_HASH.strip()

    # If the stored value looks like a bcrypt hash, use bcrypt
    if stored.startswith("$2b$") or stored.startswith("$2a$"):
        return bcrypt.checkpw(plain.encode(), stored.encode())

    # Dev fallback: plaintext comparison (only acceptable with dev-only credentials)
    logger.warning("ADMIN_PASSWORD_HASH is not a bcrypt hash — using plaintext comparison (dev only).")
    return plain == stored


def get_session_from_request(request: Request) -> Optional[dict]:
    """
    Extracts and validates the session cookie from the request.
    """
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return None
    return _verify_session_token(token)


def require_admin_session(request: Request) -> dict:
    """
    FastAPI dependency: enforces valid admin session from cookie.
    Replaces the old X-Admin-API-Key header approach.
    """
    session = get_session_from_request(request)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin session required. Please log in at /admin/login.",
        )
    return session


# ---------- Request/Response Models ----------

class AdminLoginRequest(BaseModel):
    username: str
    password: str


class AdminSessionInfo(BaseModel):
    authenticated: bool
    username: str
    role: str


# ---------- Routes ----------

@router.post("/login")
async def admin_login(payload: AdminLoginRequest, response: Response):
    """
    Verify admin credentials and set an HttpOnly session cookie on success.
    """
    # Validate username
    if payload.username.strip().lower() != settings.ADMIN_USERNAME.strip().lower():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
        )

    # Validate password
    if not _verify_admin_password(payload.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
        )

    token = _create_session_token()
    is_production = os.environ.get("ENVIRONMENT", "development").lower() == "production"

    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=COOKIE_MAX_AGE_SECONDS,
        httponly=True,
        secure=is_production,
        samesite="lax",
        path="/",
    )
    logger.info("Admin session created.")
    return {"authenticated": True, "username": settings.ADMIN_USERNAME, "role": "admin"}


@router.get("/me")
async def admin_me(session: dict = Depends(require_admin_session)):
    """
    Returns current session info. Used by frontend to check if session is still active.
    """
    return {
        "authenticated": True,
        "username": settings.ADMIN_USERNAME,
        "role": session.get("role", "admin"),
    }


@router.post("/logout")
async def admin_logout(response: Response):
    """
    Clears the admin session cookie.
    """
    response.delete_cookie(key=COOKIE_NAME, path="/")
    return {"message": "Logged out successfully."}
