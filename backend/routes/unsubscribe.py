from fastapi import APIRouter, Query, Response
from fastapi.responses import HTMLResponse
from datetime import datetime, timezone
from backend.models.email import EmailSuppression

router = APIRouter(prefix="/unsubscribe", tags=["Unsubscribe"])

@router.get("", response_class=HTMLResponse)
async def handle_unsubscribe(
    email: str = Query(...),
    token: str = Query(...)
):
    """
    Public one-click unsubscription endpoint.
    Adds email to email_suppressions.
    """
    from backend.server import db
    clean_email = email.strip().lower()

    if clean_email:
        try:
            existing = await db.email_suppressions.find_one({"email": clean_email})
            if not existing:
                supp = EmailSuppression(
                    email=clean_email,
                    reason="unsubscribe",
                    created_at=datetime.now(timezone.utc)
                )
                await db.email_suppressions.insert_one(supp.model_dump())
        except Exception as exc:
            pass  # Fail soft if DB connection is unavailable

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Unsubscribed — P Suman & Associates</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
        }}
        .card {{
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            max-width: 480px;
            text-align: center;
            border: 1px solid #e2e8f0;
        }}
        h1 {{ font-size: 20px; color: #0a192f; margin-bottom: 12px; }}
        p {{ font-size: 14px; color: #64748b; line-height: 1.5; }}
        .badge {{ background: #f1f5f9; padding: 4px 10px; border-radius: 4px; font-size: 13px; font-weight: 600; color: #0a192f; }}
        a {{ color: #c5a059; text-decoration: none; font-weight: 600; font-size: 13px; }}
    </style>
</head>
<body>
    <div class="card">
        <h1>Preferences Updated</h1>
        <p>You have been successfully unsubscribed from marketing and promotional communications sent to:</p>
        <p><span class="badge">{clean_email}</span></p>
        <p style="margin-top: 24px;">
            <a href="https://psumanassociates.com">← Return to P Suman & Associates</a>
        </p>
    </div>
</body>
</html>"""
    return HTMLResponse(content=html_content, status_code=200)
