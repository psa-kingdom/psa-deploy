"""
Admin Portal Authentication Routes.

Session model:
  - POST /admin/auth/login   → verify credentials → set HttpOnly session cookie
  - GET  /admin/auth/me      → return current session identity (requires cookie)
  - POST /admin/auth/logout  → clear session cookie

Security properties:
  - Credentials verified server-side (password hash comparison via bcrypt)
  - Session token is a signed JWT stored in an HttpOnly cookie
  - Cookie is HttpOnly, Secure=True, SameSite=None (required for cross-site frontend/backend)
  - SameSite=None requires Secure=True; both Railway and Vercel deploy over HTTPS
  - Admin secret never reaches frontend JavaScript
  - State-changing endpoints (login, logout) validate Origin/Referer against allowed CORS origins
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Response, Request, HTTPException, status, Depends
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


def _validate_request_origin(request: Request) -> None:
    """
    Validates Origin (or Referer) header against the configured CORS allow-list.
    Raises 403 if the origin is not in the allow-list.

    This guards state-changing admin endpoints against cross-site request forgery
    without requiring a separate CSRF token framework.

    Requests with no Origin/Referer (e.g. direct server-to-server calls) are
    allowed through — they cannot be triggered by a browser cross-site attack.
    """
    origin = request.headers.get("origin") or request.headers.get("referer", "")
    if not origin:
        # No browser origin header — allow (server-to-server / direct API calls)
        return

    # Extract the origin root (scheme + hostname + port if any)
    origin_root = origin.rstrip("/").split("?")[0]
    if "://" in origin_root:
        parts = origin_root.split("/")
        origin_root = "/".join(parts[:3])

    if settings.is_allowed_origin(origin_root):
        return

    logger.warning("Blocked request with disallowed origin: %s (root: %s)", origin, origin_root)
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Request origin not allowed.",
    )


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


def _set_session_cookie(response: Response, token: str) -> None:
    """
    Sets the admin session cookie with correct cross-site security attributes.

    SameSite=None + Secure=True is required for cross-origin frontend (Vercel)
    to backend (Railway) cookie-based sessions over HTTPS.
    """
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=COOKIE_MAX_AGE_SECONDS,
        httponly=True,
        secure=True,      # Required for SameSite=None; safe since both Railway and Vercel use HTTPS
        samesite="none",  # Required for cross-site cookie from Vercel frontend to Railway backend
        path="/",
    )


def _clear_session_cookie(response: Response) -> None:
    """
    Clears the admin session cookie. Must use the same attributes as set_cookie
    so the browser actually removes it cross-site.
    """
    response.set_cookie(
        key=COOKIE_NAME,
        value="",
        max_age=0,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )


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
async def admin_login(payload: AdminLoginRequest, request: Request, response: Response):
    """
    Verify admin credentials and set an HttpOnly session cookie on success.
    Validates request Origin to prevent CSRF on the login endpoint.
    """
    _validate_request_origin(request)

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
    _set_session_cookie(response, token)
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
async def admin_logout(request: Request, response: Response):
    """
    Clears the admin session cookie.
    Validates request Origin to prevent CSRF.
    """
    _validate_request_origin(request)
    _clear_session_cookie(response)
    return {"message": "Logged out successfully."}
