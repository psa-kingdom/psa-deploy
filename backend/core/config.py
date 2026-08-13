import os
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

    # CORS
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*")

    # Email
    EMAIL_ENVIRONMENT: str = os.getenv("EMAIL_ENVIRONMENT", "development").lower()  # development | staging | production
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    RESEND_FROM_EMAIL: str = os.getenv("RESEND_FROM_EMAIL", "P Suman & Associates <notifications@psumanassociates.com>")
    RESEND_REPLY_TO: str = os.getenv("RESEND_REPLY_TO", "contact@psumanassociates.com")
    EMAIL_TEST_RECIPIENT_ALLOWLIST: str = os.getenv("EMAIL_TEST_RECIPIENT_ALLOWLIST", "gaurav@psumanassociates.com,admin@psumanassociates.com")
    RESEND_WEBHOOK_SECRET: str = os.getenv("RESEND_WEBHOOK_SECRET", "")

    # Admin Portal Authentication
    # ADMIN_API_KEY is kept for backward-compatibility during transition but new code uses cookie sessions
    ADMIN_API_KEY: str = os.getenv("ADMIN_API_KEY", "psa_admin_secret_dev_key_2026")
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
    # ADMIN_PASSWORD_HASH: bcrypt hash for production. Set to a plain string for dev (triggers a warning).
    ADMIN_PASSWORD_HASH: str = os.getenv("ADMIN_PASSWORD_HASH", "psa_admin_dev_password_2026")
    # ADMIN_SESSION_SECRET: random secret used to sign JWT session tokens.
    ADMIN_SESSION_SECRET: str = os.getenv("ADMIN_SESSION_SECRET", "psa_dev_session_secret_change_in_production_2026")

    # App
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "https://psumanassociates.com")
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:8001")

    @property
    def test_allowlist_emails(self) -> list[str]:
        return [e.strip().lower() for e in self.EMAIL_TEST_RECIPIENT_ALLOWLIST.split(",") if e.strip()]

    @property
    def is_test_mode(self) -> bool:
        return self.EMAIL_ENVIRONMENT != "production"


settings = Settings()
