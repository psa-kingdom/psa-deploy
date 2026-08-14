import os
import re
import sys
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
if str(ROOT_DIR.parent) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR.parent))
load_dotenv(ROOT_DIR / '.env')


class Settings:
    # Database
    MONGO_URL: str = os.getenv("MONGO_URL", "mongodb://localhost:27017/psuman_associates")
    DB_NAME: str = os.getenv("DB_NAME", "psuman_associates")

    # CORS — comma-separated list of allowed explicit origins. Never use "*" with credentials.
    # Production domain, local dev, etc.
    CORS_ORIGINS: str = os.getenv(
        "CORS_ORIGINS",
        "https://psumanassociates.com,https://www.psumanassociates.com,http://localhost:3000,http://127.0.0.1:3000"
    )

    # Scoped PSA Vercel preview origin regex (matches psa-deploy.vercel.app, psa-deploy-*.vercel.app)
    PSA_VERCEL_PREVIEW_REGEX: str = r"^https:\/\/psa-deploy(-[a-zA-Z0-9_-]+)?\.vercel\.app$"

    # Email
    EMAIL_ENVIRONMENT: str = os.getenv("EMAIL_ENVIRONMENT", "development").lower()  # development | staging | production
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    RESEND_FROM_EMAIL: str = os.getenv("RESEND_FROM_EMAIL", "P Suman & Associates <notifications@psumanassociates.com>")
    RESEND_REPLY_TO: str = os.getenv("RESEND_REPLY_TO", "contact@psumanassociates.com")

    # Dispatch rate (conservative default: 2.0 req/s to respect standard Resend rate limits)
    EMAIL_DISPATCH_RATE_PER_SEC: float = float(os.getenv("EMAIL_DISPATCH_RATE_PER_SEC", "2.0"))

    # Single test recipient for test-mode dispatches. Can be overridden via admin UI (stored in DB).
    # If empty, test sends will fail with a clear error until configured via the admin UI.
    EMAIL_TEST_RECIPIENT: str = os.getenv("EMAIL_TEST_RECIPIENT", "")

    RESEND_WEBHOOK_SECRET: str = os.getenv("RESEND_WEBHOOK_SECRET", "")

    # Admin Portal Authentication
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
    # ADMIN_PASSWORD_HASH: bcrypt hash for production. Set to a plain string for dev (triggers a warning).
    ADMIN_PASSWORD_HASH: str = os.getenv("ADMIN_PASSWORD_HASH", "psa_admin_dev_password_2026")
    # ADMIN_SESSION_SECRET: random secret used to sign JWT session tokens.
    ADMIN_SESSION_SECRET: str = os.getenv("ADMIN_SESSION_SECRET", "psa_dev_session_secret_change_in_production_2026")

    # App
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "https://psumanassociates.com")
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:8001")

    @property
    def cors_origins_list(self) -> list[str]:
        """Returns CORS_ORIGINS as a clean list of stripped, non-empty origin strings."""
        return [o.strip().rstrip("/") for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def is_test_mode(self) -> bool:
        return self.EMAIL_ENVIRONMENT != "production"

    def is_allowed_origin(self, origin: str) -> bool:
        """
        Strict origin verification:
        1. Exact match against configured explicit CORS origins
        2. Exact regex match against scoped PSA Vercel preview domain pattern
        NO prefix / startsWith matching allowed.
        """
        if not origin:
            return False
        clean_origin = origin.strip().rstrip("/")
        # Check explicit origins
        if clean_origin in self.cors_origins_list:
            return True
        # Check scoped Vercel preview regex
        if re.match(self.PSA_VERCEL_PREVIEW_REGEX, clean_origin):
            return True
        return False


settings = Settings()
