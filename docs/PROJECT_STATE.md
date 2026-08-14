# PROJECT STATE

> This document describes the CURRENT state of the project.
> It is not a historical diary.

## Last Reconciled

2026-08-13

## Project Purpose

Premium, high-converting corporate website and digital communications platform for **P Suman & Associates** (Chartered Accountancy, Audit, Inventory Intelligence, Risk & Tax Advisory). Located at `psumanassociates.com`.

## Current Architecture

Decoupled SPA Architecture:
- **Frontend**: React 19 single-page application built with CRA, CRACO, Tailwind CSS, and Radix UI components. Deployed to Vercel. Includes dedicated `/admin/communication` management center.
- **Backend**: FastAPI asynchronous Python service exposing REST APIs, resilient background outbox workers, signed webhook receivers, and template rendering engines. Deployed to Railway / Render.
- **Database**: Async MongoDB Atlas database managed via Motor with dedicated collections for newsletters, contacts, campaigns, outbox jobs, audit attempts, and suppressions.

## Technology Stack

- **Frontend**: React 19, React Router v7, Tailwind CSS 3.4, Framer Motion, Lucide React, React Hook Form, Sonner, CRACO, Axios.
- **Backend**: Python 3.12, FastAPI 0.110, Motor 3.3 (async MongoDB driver), PyMongo 4.5, Pydantic 2.13, Uvicorn, Starlette, Resend SDK (>=2.30.0), Svix (>=1.20.0), Pytest-asyncio.
- **Infrastructure**: Vercel (Frontend), Railway / Render (Backend), MongoDB Atlas, Resend (Transactional & Bulk Email).

## Major Modules

- `frontend/src/pages/`:
  - `Home`: Corporate landing page, hero section, value propositions, firm highlights.
  - `Services`: Core offerings (Internal Audit, Inventory Intelligence, Risk Advisory, Tax).
  - `Industries`: Industry-specific capabilities and case studies.
  - `About`: Firm history, leadership team, methodology.
  - `Insights`: Articles, thought leadership, industry updates.
  - `Contact`: Client inquiry form with backend API integration.
  - `Connect`: Digital Business Card interface (`/connect`).
  - `AdminCommunication`: Full-featured communication dashboard (`/admin/communication`) with campaign composer, template studio, audit logs, and test dispatchers.
- `frontend/src/components/admin/`:
  - `AudienceSelector`: Recipient filtering and live audience calculation.
  - `TemplateEditor`: Live HTML editor with side-by-side iframe preview.
  - `CampaignReviewModal`: Two-step verification requiring exact recipient count confirmation.
  - `CampaignProgress`: Real-time dispatch tracking and outbox cancellation.
  - `DeliveryLogsTable`: Searchable delivery audit logs.
- `backend/`:
  - `server.py`: FastAPI server mounting API routers, lifecycle events, and index initialization.
  - `core/config.py`: Typed configuration and allowlist settings.
  - `core/auth.py`: Admin API key authentication dependency.
  - `models/email.py`: Pydantic data schemas for campaigns, outbox, templates, suppressions, and attempts.
  - `services/email/`:
    - `renderer.py`: Base HTML corporate template wrapper, tag interpolator, plain-text generator.
    - `templates.py`: Pre-built template generators (Independence Day 2026, Contact Ack, Newsletter Welcome).
    - `provider.py`: Resend client wrapper with mock simulation and allowlist safety guard.
    - `audience.py`: Recipient extraction, normalization, deduplication, suppression filtering.
    - `worker.py`: Async outbox dispatcher with token bucket rate limiting and retry backoff.
  - `routes/`:
    - `admin_campaigns.py`: Campaign draft, audience estimation, 2-step confirmation, cancellation, test send.
    - `admin_templates.py`: Template Studio draft/publish/versioning APIs.
    - `admin_logs.py`: Real-time delivery logs and aggregated stats.
    - `webhooks.py`: Signed Resend webhook processor (Svix verified).
    - `unsubscribe.py`: Public one-click unsubscription handler.

## Current Features

- Interactive marketing pages with responsive navigation and dark/ivory design token styling.
- Newsletter subscription API (`POST /api/newsletter`, `GET /api/newsletter`).
- Contact form submission API (`POST /api/contact`, `GET /api/contact`).
- Standalone `/connect` Digital Business Card view.
- Complete Email Management System (`/admin/communication`) supporting:
  - Controlled bulk email campaigns (Independence Day 2026).
  - Multi-tier server allowlist safety barrier preventing accidental production dispatches.
  - Two-step confirmation dialog with frozen audience snapshots.
  - Background outbox worker with automatic retries and in-flight cancellation.
  - Cryptographically signed Resend webhook processing with automatic bounce suppressions.
  - One-click public unsubscription flow (`/api/unsubscribe`).

## Authentication & Authorization

- Public routes: Marketing pages, contact submission, newsletter subscription, unsubscribe.
- Protected admin routes: `/api/admin/communication/*` protected via `X-Admin-API-Key` or `Authorization: Bearer <ADMIN_API_KEY>`.
- Signed webhook route: `/api/webhooks/resend` validated using Svix cryptographic HMAC signatures.

## Data & API Architecture

- RESTful API structured under `/api` path prefix.
- Asynchronous Motor driver interacting with MongoDB collections:
  - `newsletter_subscriptions`
  - `contact_submissions`
  - `email_campaigns`
  - `campaign_recipients`
  - `outbox_jobs`
  - `email_attempts`
  - `email_templates_studio`
  - `template_version_history`
  - `email_suppressions`
  - `webhook_events`

## Deployment

- **Frontend**: Vercel (Auto-deploy on `main` branch push).
- **Backend**: Railway / Render with Python 3.12 runtime and Uvicorn ASGI server.
- **Local Dev**: Run `uvicorn server:app` on port 8001; run `npm start` on port 3000.

## Current Constraints

- Resend free tier rate limit: 2 requests/sec max. Handled via rate-limited worker and token bucket.
- Server-side allowlist strictly enforced whenever `EMAIL_ENVIRONMENT != 'production'`.

## Known Technical Debt

- None currently impacting the email subsystem.

## Known Risks

- In production, ensure `RESEND_API_KEY` domain verification DNS records (DKIM/SPF) are completed in Resend dashboard before sending live unallowlisted bulk traffic.

## Active Development

- Complete Email Management System built and tested on branch `test`.

## Important Architectural Rules

- Never bypass server allowlist in development/staging.
- Never dispatch unconfirmed campaign drafts.
- Deduplicate audience before freezing recipient snapshots.
- Log every single delivery attempt with latency and provider identifiers.
