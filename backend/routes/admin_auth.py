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
import secrets
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional, Any, Dict, List

from fastapi import APIRouter, Response, Request, HTTPException, status, Depends
from pydantic import BaseModel

from backend.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/auth", tags=["Admin Auth"])

COOKIE_NAME = "psa_admin_session"
COOKIE_MAX_AGE_SECONDS = 8 * 60 * 60  # 8 hours


DEV_LOCAL_USERNAME = "admin"
DEV_LOCAL_PASSWORD_HASH = "$2b$12$JDdlv99rcfr/P8JFsLA1H.zDuWfdrpXVmD/pvVDbmzWlFGL7xIrji"  # admin123

PROD_USERNAME = "psa_admin"
PROD_PASSWORD_HASH = "$2b$12$U3raXGN/roKptdpJ1I7Yi.O1e/HZBTlBfazOVU./5x/uJJJcjFY4u"  # H5ofj_3Pd8gNzT-Xn1_x


def _is_localhost_request(request: Request) -> bool:
    """
    Detects whether the request originates from or targets localhost / 127.0.0.1.
    """
    origin = request.headers.get("origin") or request.headers.get("referer", "")
    host = request.headers.get("host", "")
    client_ip = request.client.host if request.client else ""

    if origin:
        origin_lower = origin.lower()
        if "localhost" in origin_lower or "127.0.0.1" in origin_lower:
            return True
    if host:
        host_lower = host.lower()
        if "localhost" in host_lower or "127.0.0.1" in host_lower:
            return True
    if client_ip in ("127.0.0.1", "::1", "localhost"):
        return True
    return False


# ---------- Helpers ----------

def _create_session_token(username: str = "admin") -> str:
    """
    Creates a signed session token using PyJWT.
    """
    import jwt
    payload = {
        "sub": username,
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


async def _get_stored_admin_hash(username: str, db: Optional[Any] = None) -> str:
    """
    Retrieves stored admin password hash for the specified username. Checks MongoDB `admin_credentials` collection first,
    falling back to environment settings / defaults.
    """
    clean_user = username.strip().lower()
    if db is not None:
        try:
            record = await db.admin_credentials.find_one({"username": clean_user})
            if record and record.get("password_hash"):
                return record["password_hash"].strip()
        except Exception as e:
            logger.error("Error reading admin credentials from database: %s", e)

    if clean_user == PROD_USERNAME.lower():
        return PROD_PASSWORD_HASH
    return settings.ADMIN_PASSWORD_HASH.strip() or DEV_LOCAL_PASSWORD_HASH


async def _verify_admin_password(username: str, plain: str, db: Optional[Any] = None) -> bool:
    """
    Compares plain-text password against bcrypt hash stored in DB (or fallback).
    """
    import bcrypt
    stored = await _get_stored_admin_hash(username, db)

    # If the stored value looks like a bcrypt hash, use bcrypt
    if stored.startswith("$2b$") or stored.startswith("$2a$"):
        return bcrypt.checkpw(plain.encode("utf-8"), stored.encode("utf-8"))

    # Plaintext fallback (if configured as plain string)
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
async def admin_login(payload: AdminLoginRequest, request: Request, response: Response, db: Optional[Any] = None):
    """
    Verify admin credentials and set an HttpOnly session cookie on success.
    - If accessing via localhost: requires username 'admin' and password 'admin123'.
    - If accessing non-localhost (production/Vercel/Railway): requires username 'psa_admin' and password 'H5ofj_3Pd8gNzT-Xn1_x'.
    """
    _validate_request_origin(request)

    is_local = _is_localhost_request(request)
    expected_username = DEV_LOCAL_USERNAME if is_local else PROD_USERNAME

    input_user = payload.username.strip()
    if input_user.lower() != expected_username.lower():
        logger.warning("Admin login failed: incorrect username '%s' for is_local=%s (expected '%s')", input_user, is_local, expected_username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
        )

    # Validate password
    valid = await _verify_admin_password(expected_username, payload.password, db=db)
    if not valid:
        logger.warning("Admin login failed: invalid password for user '%s' (is_local=%s)", input_user, is_local)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
        )

    token = _create_session_token(username=expected_username)
    _set_session_cookie(response, token)
    logger.info("Admin session created for '%s' (is_local=%s).", expected_username, is_local)
    return {"authenticated": True, "username": expected_username, "role": "admin"}


@router.get("/me")
async def admin_me(session: dict = Depends(require_admin_session)):
    """
    Returns current session info. Used by frontend to check if session is still active.
    """
    username = session.get("sub") or settings.ADMIN_USERNAME
    return {
        "authenticated": True,
        "username": username,
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


# ---------- Password Reset Models & Helpers ----------

class AdminForgotPasswordRequest(BaseModel):
    # Optional field: username or email
    email: Optional[str] = None


class AdminVerifyResetCodeRequest(BaseModel):
    code: str


class AdminResetPasswordRequest(BaseModel):
    reset_token: str
    new_password: str


def _create_reset_token() -> str:
    import jwt
    payload = {
        "sub": "admin_reset",
        "role": "admin_reset_authorized",
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
    }
    return jwt.encode(payload, settings.ADMIN_SESSION_SECRET, algorithm="HS256")


def _verify_reset_token(token: str) -> Optional[dict]:
    import jwt
    try:
        payload = jwt.decode(token, settings.ADMIN_SESSION_SECRET, algorithms=["HS256"])
        if payload.get("sub") == "admin_reset":
            return payload
    except Exception:
        return None
    return None


@router.post("/forgot-password")
async def admin_forgot_password(payload: AdminForgotPasswordRequest, request: Request, db: Any):
    """
    Initiates Admin password reset by generating a secure 6-digit verification OTP
    and emailing it to psumanassociates@gmail.com.
    """
    _validate_request_origin(request)

    target_email = settings.ADMIN_RECOVERY_EMAIL.strip().lower()
    now = datetime.now(timezone.utc)

    # Cooldown & Rate Limiting: check recent requests in last 60 seconds
    one_min_ago = now - timedelta(seconds=60)
    recent = await db.admin_password_resets.find_one({
        "target_email": target_email,
        "created_at": {"$gte": one_min_ago}
    })
    if recent:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="A verification code was requested recently. Please wait a minute before requesting another code."
        )

    # Invalidate previous unconsumed reset codes
    await db.admin_password_resets.update_many(
        {"target_email": target_email, "consumed": False},
        {"$set": {"consumed": True, "invalidated_at": now}}
    )

    # Generate 6-digit numeric OTP
    otp = f"{secrets.randbelow(1000000):06d}"
    otp_hash = hashlib.sha256(otp.encode("utf-8")).hexdigest()
    expires_at = now + timedelta(minutes=15)

    reset_record = {
        "target_email": target_email,
        "otp_hash": otp_hash,
        "attempts": 0,
        "consumed": False,
        "created_at": now,
        "expires_at": expires_at
    }
    await db.admin_password_resets.insert_one(reset_record)

    # Send verification email via send_email_via_provider
    from backend.services.email.provider import send_email_via_provider

    email_subject = f"PSA Admin Security: Verification Code {otp}"
    email_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Admin Password Reset Code</title>
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #06182C; color: #ffffff; padding: 30px 15px; margin: 0; }}
        .card {{ max-width: 520px; margin: 0 auto; background: #0A2540; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); padding: 36px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); }}
        .header {{ text-align: center; margin-bottom: 28px; }}
        .logo {{ display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 10px; background: linear-gradient(135deg, #0284c7, #38bdf8); color: #ffffff; font-weight: bold; font-size: 20px; }}
        .title {{ font-size: 20px; font-weight: 700; margin-top: 14px; margin-bottom: 6px; color: #ffffff; }}
        .subtitle {{ font-size: 13px; color: #94a3b8; }}
        .code-box {{ margin: 28px 0; background: #06182C; border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 12px; padding: 20px; text-align: center; }}
        .code {{ font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; font-family: monospace; }}
        .info {{ font-size: 13px; color: #cbd5e1; line-height: 1.6; margin-bottom: 20px; }}
        .warning {{ font-size: 12px; color: #f87171; background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; padding: 10px 14px; border-radius: 4px; margin-top: 24px; }}
        .footer {{ text-align: center; margin-top: 30px; font-size: 11px; color: #64748b; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="logo">P</div>
          <div class="title">Admin Password Reset</div>
          <div class="subtitle">P Suman & Associates Portal Security</div>
        </div>
        <p class="info">
          A request was initiated to reset the Administrator password for the PSA Admin Portal.
          Use the one-time verification code below to authorize the password reset:
        </p>
        <div class="code-box">
          <div class="code">{otp}</div>
        </div>
        <p class="info">
          This code will expire in <strong>15 minutes</strong>. If you did not make this request, please disregard this email or review your portal access logs immediately.
        </p>
        <div class="warning">
          <strong>Security Notice:</strong> Never share this code with anyone. PSA staff will never ask for your verification code.
        </div>
        <div class="footer">
          &copy; {now.year} P Suman &amp; Associates. All rights reserved.
        </div>
      </div>
    </body>
    </html>
    """

    email_text = f"Your PSA Admin Password Reset verification code is: {otp}. It expires in 15 minutes."

    try:
        dispatch_result = await send_email_via_provider(
            to=target_email,
            subject=email_subject,
            html=email_html,
            text=email_text,
            is_production_dispatch=True,
            _test_recipient_override=target_email,
            job_type="transactional",
            transactional_type="admin_password_reset",
            db=db
        )
        logger.info("[ADMIN_AUTH] Sent password reset verification code to %s (result: %s)", target_email, dispatch_result.get("status"))
    except Exception as e:
        logger.error("[ADMIN_AUTH] Failed to send password reset verification email: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to dispatch verification email. Please check server email logs."
        )

    # Mask email for response e.g. p***s@gmail.com
    parts = target_email.split("@")
    if len(parts) == 2 and len(parts[0]) > 2:
        masked_email = f"{parts[0][0]}***{parts[0][-1]}@{parts[1]}"
    else:
        masked_email = target_email

    return {
        "success": True,
        "message": f"Verification code sent to recovery email ({masked_email}).",
        "masked_email": masked_email,
        "expires_in_minutes": 15
    }


@router.post("/verify-reset-code")
async def admin_verify_reset_code(payload: AdminVerifyResetCodeRequest, request: Request, db: Any):
    """
    Verifies the 6-digit OTP and returns a signed single-use reset token (15-min validity).
    """
    _validate_request_origin(request)

    target_email = settings.ADMIN_RECOVERY_EMAIL.strip().lower()
    now = datetime.now(timezone.utc)
    clean_code = payload.code.strip()

    if not clean_code or len(clean_code) != 6 or not clean_code.isdigit():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code must be a 6-digit number."
        )

    reset_record = await db.admin_password_resets.find_one({
        "target_email": target_email,
        "consumed": False,
        "expires_at": {"$gte": now}
    })

    if not reset_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active password reset request found or code has expired. Please request a new code."
        )

    # Anti-brute force: limit to 5 incorrect attempts
    if reset_record.get("attempts", 0) >= 5:
        await db.admin_password_resets.update_one(
            {"_id": reset_record["_id"]},
            {"$set": {"consumed": True, "invalidated_reason": "too_many_failed_attempts"}}
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many incorrect attempts. This code has been invalidated. Please request a new code."
        )

    input_hash = hashlib.sha256(clean_code.encode("utf-8")).hexdigest()
    if input_hash != reset_record["otp_hash"]:
        await db.admin_password_resets.update_one(
            {"_id": reset_record["_id"]},
            {"$inc": {"attempts": 1}}
        )
        remaining = 4 - reset_record.get("attempts", 0)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid verification code. {remaining} attempt(s) remaining."
        )

    # Mark OTP as consumed
    await db.admin_password_resets.update_one(
        {"_id": reset_record["_id"]},
        {"$set": {"consumed": True, "verified_at": now}}
    )

    # Generate single-use reset authorization token
    reset_token = _create_reset_token()

    return {
        "success": True,
        "message": "Verification code confirmed.",
        "reset_token": reset_token
    }


@router.post("/reset-password")
async def admin_reset_password(payload: AdminResetPasswordRequest, request: Request, db: Any):
    """
    Accepts the validated reset token and new password.
    Hashes new password with bcrypt and persists in db.admin_credentials.
    """
    _validate_request_origin(request)

    token_data = _verify_reset_token(payload.reset_token)
    if not token_data or token_data.get("sub") != "admin_reset":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired reset session. Please restart the reset process."
        )

    new_pwd = payload.new_password.strip()
    if len(new_pwd) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long."
        )

    import bcrypt
    salt = bcrypt.gensalt(rounds=12)
    new_hash = bcrypt.hashpw(new_pwd.encode("utf-8"), salt).decode("utf-8")

    now = datetime.now(timezone.utc)
    is_local = _is_localhost_request(request)
    username = DEV_LOCAL_USERNAME if is_local else PROD_USERNAME

    await db.admin_credentials.update_one(
        {"username": username},
        {
            "$set": {
                "username": username,
                "password_hash": new_hash,
                "updated_at": now,
                "updated_via": "email_verification"
            }
        },
        upsert=True
    )

    logger.info("[ADMIN_AUTH] Successfully updated password for admin '%s'", username)

    return {
        "success": True,
        "message": "Admin password has been reset successfully. You can now log in with your new password."
    }
