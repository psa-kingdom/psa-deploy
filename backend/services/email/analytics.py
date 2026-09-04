import logging
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
import httpx
from backend.core.config import settings

logger = logging.getLogger(__name__)

# In-memory TTL cache
_analytics_cache: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 180  # 3 minutes


def _parse_resend_metrics(raw_data: Dict[str, Any], period: str) -> Dict[str, Any]:
    """
    Normalizes response from Resend Email Metrics API: GET /emails/metrics
    """
    # The API can return a top-level dict or a list in 'data'
    data = raw_data.get("data", raw_data)
    if isinstance(data, list) and len(data) > 0:
        data = data[0]

    sent = int(data.get("sent", 0) or 0)
    delivered = int(data.get("delivered", 0) or 0)
    bounced = int(data.get("bounced", 0) or 0)
    complained = int(data.get("complained", 0) or 0)
    suppressed = int(data.get("suppressed", 0) or 0)
    failed = int(data.get("failed", 0) or 0)

    delivery_rate = float(data.get("delivery_rate") or (round((delivered / sent * 100), 2) if sent > 0 else 0.0))
    bounce_rate = float(data.get("bounce_rate") or (round((bounced / sent * 100), 2) if sent > 0 else 0.0))
    complaint_rate = float(data.get("complaint_rate") or (round((complained / sent * 100), 2) if sent > 0 else 0.0))

    return {
        "period": period,
        "source": "resend",
        "sent": sent,
        "delivered": delivered,
        "delivery_rate": delivery_rate,
        "bounced": bounced,
        "bounce_rate": bounce_rate,
        "complained": complained,
        "complaint_rate": complaint_rate,
        "suppressed": suppressed,
        "failed": failed,
        "tracking_status": "disabled_privacy_first",
        "open_rate": 0.0,
        "click_rate": 0.0,
        "cached_at": datetime.now(timezone.utc).isoformat(),
        "is_cached": False,
    }


async def _get_local_metrics(db, period: str) -> Dict[str, Any]:
    """
    Aggregates metrics from local MongoDB collections (email_attempts, outbox_jobs, email_suppressions).
    Used as graceful fallback when Resend API is unavailable or RESEND_API_KEY is not configured.
    """
    now = datetime.now(timezone.utc)
    days = 30 if period == "30d" else 7
    since = now - timedelta(days=days)

    sent = 0
    failed = 0
    delivered = 0
    bounced = 0
    complained = 0
    suppressed = 0

    if db is not None:
        try:
            # Attempts in window
            attempts_cursor = db.email_attempts.find({"created_at": {"$gte": since}})
            async for att in attempts_cursor:
                st = att.get("status")
                if st == "sent":
                    sent += 1
                elif st in ("failed", "blocked_test_mode"):
                    failed += 1

            # Outbox jobs in window for delivery status
            jobs_cursor = db.outbox_jobs.find({"created_at": {"$gte": since}})
            async for job in jobs_cursor:
                ds = job.get("delivery_status")
                if ds == "delivered":
                    delivered += 1
                elif ds == "bounced":
                    bounced += 1
                elif ds == "complained":
                    complained += 1

            # Total suppressions in system
            suppressed = await db.email_suppressions.count_documents({})
        except Exception as exc:
            logger.error("Failed to query local metrics from MongoDB: %s", exc)

    # In case delivered < sent and no bounced, treat sent as delivered for local mock/dev
    effective_delivered = max(delivered, sent - bounced - failed) if sent > 0 else 0
    delivery_rate = round((effective_delivered / sent * 100), 2) if sent > 0 else 0.0
    bounce_rate = round((bounced / sent * 100), 2) if sent > 0 else 0.0
    complaint_rate = round((complained / sent * 100), 2) if sent > 0 else 0.0

    return {
        "period": period,
        "source": "local_database",
        "sent": sent,
        "delivered": effective_delivered,
        "delivery_rate": delivery_rate,
        "bounced": bounced,
        "bounce_rate": bounce_rate,
        "complained": complained,
        "complaint_rate": complaint_rate,
        "suppressed": suppressed,
        "failed": failed,
        "tracking_status": "disabled_privacy_first",
        "open_rate": 0.0,
        "click_rate": 0.0,
        "cached_at": now.isoformat(),
        "is_cached": False,
    }


async def get_email_analytics(
    db: Any,
    period: str = "7d",
    force_refresh: bool = False
) -> Dict[str, Any]:
    """
    Fetches communication delivery metrics.
    1. Checks in-memory cache unless force_refresh is True.
    2. Queries Resend Email Metrics API (GET /emails/metrics).
    3. Gracefully falls back to local database stats if Resend fails or key is missing.
    4. Caches result for CACHE_TTL_SECONDS.
    """
    period_key = "30d" if period == "30d" else "7d"
    now_ts = time.time()

    # 1. Cache hit
    if not force_refresh and period_key in _analytics_cache:
        cached_entry = _analytics_cache[period_key]
        if now_ts - cached_entry["_cached_ts"] < CACHE_TTL_SECONDS:
            res = dict(cached_entry["data"])
            res["is_cached"] = True
            return res

    result = None

    # 2. Try Resend Email Metrics API
    if settings.RESEND_API_KEY and not settings.RESEND_API_KEY.startswith("mock"):
        days = 30 if period_key == "30d" else 7
        now_dt = datetime.now(timezone.utc)
        start_date = (now_dt - timedelta(days=days)).strftime("%Y-%m-%d")
        end_date = now_dt.strftime("%Y-%m-%d")

        url = f"https://api.resend.com/emails/metrics?start_date={start_date}&end_date={end_date}"
        headers = {
            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
            "User-Agent": "psa-control-center/1.0",
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(url, headers=headers)
                if resp.status_code == 200:
                    raw_json = resp.json()
                    result = _parse_resend_metrics(raw_json, period_key)
                else:
                    logger.warning(
                        "Resend Metrics API returned %d: %s. Falling back to local metrics.",
                        resp.status_code, resp.text[:200]
                    )
        except Exception as exc:
            logger.warning("Resend Metrics API request failed: %s. Falling back to local metrics.", exc)

    # 3. Fallback to local MongoDB metrics
    if result is None:
        result = await _get_local_metrics(db, period_key)

    # 4. Store in cache
    _analytics_cache[period_key] = {
        "_cached_ts": now_ts,
        "data": result,
    }

    return result
