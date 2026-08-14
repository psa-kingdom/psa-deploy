# CHANGELOG

This records meaningful project changes.

Do not record every tiny UI adjustment.

---

## 2026-08-13 — Full Email Management Subsystem & Independence Day Campaign Implementation

### Added
- **Backend Architecture**:
  - `backend/core/config.py`: Typed configuration with allowlist parsing and environment isolation.
  - `backend/core/auth.py`: Admin API key authentication dependency (`X-Admin-API-Key` & `Bearer`).
  - `backend/models/email.py`: Pydantic models for campaigns, frozen recipient snapshots, outbox jobs, template studio, version history, suppressions, and attempts.
  - `backend/services/email/renderer.py`: Corporate HTML email template engine with navy/ivory styling, variable interpolation, and plain-text fallback.
  - `backend/services/email/templates.py`: Pre-built template generators including **Independence Day 2026 Greetings**, Contact Inquiry Acknowledgment, and Newsletter Welcome.
  - `backend/services/email/provider.py`: Resend SDK client wrapper with mock simulation and strict server-side allowlist guard.
  - `backend/services/email/audience.py`: Recipient extraction, normalization, and deduplication across newsletter and contact collections.
  - `backend/services/email/worker.py`: Background outbox dispatcher with token bucket rate limiting and retry with backoff.
  - `backend/routes/admin_campaigns.py`: REST APIs for audience estimation, campaign freeze, 2-step confirmation, cancellation, and test sends.
  - `backend/routes/admin_templates.py`: Template Studio endpoints with draft/publish staging and version snapshots.
  - `backend/routes/admin_logs.py`: Real-time delivery logs and aggregated delivery statistics.
  - `backend/routes/webhooks.py`: Cryptographically verified Resend webhook receiver with Svix validation and automatic suppression handling.
  - `backend/routes/unsubscribe.py`: Public one-click unsubscription endpoint.
- **Frontend Communication Center**:
  - `frontend/src/pages/AdminCommunication.jsx`: Full-featured communication dashboard at `/admin/communication`.
  - `frontend/src/components/admin/AudienceSelector.jsx`: Audience card picker with live estimation counts.
  - `frontend/src/components/admin/TemplateEditor.jsx`: Live template picker, personalization tag buttons, and side-by-side iframe preview.
  - `frontend/src/components/admin/CampaignReviewModal.jsx`: Two-step production confirmation modal requiring typed recipient count verification.
  - `frontend/src/components/admin/CampaignProgress.jsx`: Real-time progress monitor and emergency outbox cancellation.
  - `frontend/src/components/admin/DeliveryLogsTable.jsx`: Filterable delivery audit log table with status indicators and search.
  - `frontend/src/App.js`: Added `/admin/communication` route and hidden marketing chrome on admin pages.
- **Testing & Verification**:
  - Added unit test suite `backend/tests/test_email_system.py` and `backend/tests/test_campaign_flow.py` with 100% passing tests covering template rendering, variable interpolation, allowlist blocking, and campaign lifecycles.
  - Verified frontend production build passes cleanly (`npm run build`).
  - Verified live API endpoints against running local backend server.
