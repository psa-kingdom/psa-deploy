import logging
from fastapi import APIRouter, Query, Depends, status
from fastapi.responses import HTMLResponse
from datetime import datetime, timezone
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from backend.models.email import EmailSuppression

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/unsubscribe", tags=["Unsubscribe"])


def get_db() -> AsyncIOMotorDatabase:
    from backend.server import db
    return db


def _render_page(title: str, heading: str, message: str, email_badge: Optional[str] = None, is_error: bool = False) -> str:
    badge_html = f'<p><span class="badge">{email_badge}</span></p>' if email_badge else ""
    border_color = "#fca5a5" if is_error else "#e2e8f0"
    heading_color = "#991b1b" if is_error else "#0a192f"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} — P Suman & Associates</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
        }}
        .card {{
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.07);
            max-width: 480px;
            width: 100%;
            text-align: center;
            border: 1px solid {border_color};
            box-sizing: border-box;
        }}
        h1 {{ font-size: 20px; color: {heading_color}; margin-bottom: 12px; }}
        p {{ font-size: 14px; color: #64748b; line-height: 1.5; }}
        .badge {{ background: #f1f5f9; padding: 6px 12px; border-radius: 4px; font-size: 13px; font-weight: 600; color: #0a192f; word-break: break-all; }}
        a {{ color: #c5a059; text-decoration: none; font-weight: 600; font-size: 13px; }}
        a:hover {{ text-decoration: underline; }}
    </style>
</head>
<body>
    <div class="card">
        <h1>{heading}</h1>
        <p>{message}</p>
        {badge_html}
        <p style="margin-top: 24px;">
            <a href="https://psumanassociates.com">← Return to P Suman & Associates</a>
        </p>
    </div>
</body>
</html>"""


@router.get("", response_class=HTMLResponse)
async def handle_unsubscribe(
    email: Optional[str] = Query(None),
    token: Optional[str] = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Public one-click unsubscription endpoint with strict token authorization.
    Validates token against the recipient record in campaign_recipients.
    """
    clean_email = email.strip().lower() if email else ""
    clean_token = token.strip() if token else ""

    if not clean_email or not clean_token:
        return HTMLResponse(
            content=_render_page(
                title="Invalid Request",
                heading="Invalid Unsubscribe Link",
                message="This unsubscription request is incomplete or missing parameters. Please use the link provided in your email.",
                is_error=True
            ),
            status_code=status.HTTP_400_BAD_REQUEST
        )

    # Validate token against campaign_recipients or newsletter_subscriptions
    recipient = await db.campaign_recipients.find_one({
        "unsubscribe_token": clean_token,
        "email": clean_email
    })

    newsletter_sub = None
    if not recipient and hasattr(db, "newsletter_subscriptions"):
        newsletter_sub = await db.newsletter_subscriptions.find_one({
            "unsubscribe_token": clean_token,
            "email": clean_email
        })

    if not recipient and not newsletter_sub:
        logger.warning(
            "Unsubscribe rejected: invalid or mismatched token for recipient: %s",
            clean_email
        )
        return HTMLResponse(
            content=_render_page(
                title="Invalid Link",
                heading="Invalid or Expired Link",
                message="We could not verify this unsubscription request. The link may be invalid, expired, or already used. If you need assistance, please contact us at contact@psumanassociates.com.",
                is_error=True
            ),
            status_code=status.HTTP_400_BAD_REQUEST
        )

    # If newsletter subscriber, mark unsubscribed in newsletter_subscriptions collection
    now = datetime.now(timezone.utc)
    if newsletter_sub:
        try:
            await db.newsletter_subscriptions.update_one(
                {"email": clean_email},
                {"$set": {"unsubscribed": True, "unsubscribed_at": now}}
            )
        except Exception as n_exc:
            logger.error("Failed to mark newsletter subscriber unsubscribed: %s", n_exc)

    # Idempotent suppression insertion
    try:
        existing = await db.email_suppressions.find_one({"email": clean_email})
        if not existing:
            supp = EmailSuppression(
                email=clean_email,
                reason="unsubscribe",
                source_campaign_id=recipient.get("campaign_id") if recipient else None,
                created_at=now
            )
            await db.email_suppressions.insert_one(supp.model_dump())
            logger.info("Email successfully suppressed via verified unsubscribe token: %s", clean_email)
    except Exception as exc:
        logger.error("Failed to record suppression in database: %s", exc)

    return HTMLResponse(
        content=_render_page(
            title="Preferences Updated",
            heading="Preferences Updated",
            message="You have been successfully unsubscribed from marketing and promotional communications sent to:",
            email_badge=clean_email,
            is_error=False
        ),
        status_code=status.HTTP_200_OK
    )

