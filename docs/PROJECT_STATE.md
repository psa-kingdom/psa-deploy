# PROJECT STATE

> This document describes the CURRENT state of the project.
> It is not a historical diary.

## Last Reconciled

2026-08-13

## Project Purpose

Premium, high-converting corporate website and digital business card platform for **P Suman & Associates** (Chartered Accountancy, Audit, Inventory Intelligence, Risk & Tax Advisory). Located at `psumanassociates.com`.

## Current Architecture

Decoupled SPA Architecture:
- **Frontend**: React 19 single-page application built with CRA, CRACO, Tailwind CSS, and Radix UI components. Deployed to Vercel.
- **Backend**: FastAPI asynchronous Python service exposing REST APIs. Deployed to Railway / Render.
- **Database**: Async MongoDB Atlas database managed via Motor.

## Technology Stack

- **Frontend**: React 19, React Router v7, Tailwind CSS 3.4, Framer Motion, Lucide React, React Hook Form, Sonner, CRACO, Axios.
- **Backend**: Python 3.12, FastAPI 0.110, Motor 3.3 (async MongoDB driver), PyMongo 4.5, Pydantic 2.13, Uvicorn, Starlette.
- **Infrastructure**: Vercel (Frontend), Railway / Render (Backend), MongoDB Atlas (M0 Cluster).

## Major Modules

- `frontend/src/pages/`:
  - `Home`: Corporate landing page, hero section, value propositions, firm highlights.
  - `Services`: Core offerings (Internal Audit, Inventory Intelligence, Risk Advisory, Tax).
  - `Industries`: Industry-specific capabilities and case studies.
  - `About`: Firm history, leadership team, methodology.
  - `Insights`: Articles, thought leadership, industry updates.
  - `Contact`: Client inquiry form with backend API integration.
  - `Connect`: Digital Business Card interface (`/connect`).
- `backend/server.py`:
  - Core API router (`/api`).
  - Contact submissions model & database CRUD.
  - Newsletter subscriptions model & database CRUD.

## Current Features

- Interactive marketing pages with responsive navigation and dark/ivory design token styling.
- Newsletter subscription API (`POST /api/newsletter`, `GET /api/newsletter`).
- Contact form submission API (`POST /api/contact`, `GET /api/contact`).
- Standalone `/connect` Digital Business Card view (hides header/footer).
- Operational health check endpoint (`GET /api/`).

## Authentication & Authorization

- Currently public marketing endpoints with CORS middleware (`allow_origins` populated via `CORS_ORIGINS` environment variable).

## Data & API Architecture

- RESTful API structured under `/api` path prefix.
- Asynchronous Motor driver interacting with MongoDB collections:
  - `newsletter_subscriptions`
  - `contact_submissions`
- Pydantic models with UUID auto-generation and UTC ISO timestamping.

## Deployment

- **Frontend**: Target Vercel (`frontend/vercel.json`). Single-Page App rewriting to `index.html`.
- **Backend**: Configured for Railway (`backend/railway.json`) and Render (`backend/render.yaml` / `Procfile`).

## Current Constraints

- Free-tier hosting optimization: Railway/Render backend sleeping when idle, requiring clean health check response.
- peer-dependency overrides for React 19 compatibility (`ajv` 8 / `ajv-keywords` 5).

## Known Technical Debt

- Legacy CRA build toolchain (`craco` / `react-scripts`) requiring explicit `ajv` 8 dependency alignment.

## Known Risks

- Dynamic IP access rules required on MongoDB Atlas (`0.0.0.0/0`) due to dynamic backend worker IPs.

## Active Development

- Branch structure: Working on `test` branch (tracking `origin/test`). `main` kept stable.
- Local dev servers: Backend running on port 8001, Frontend running on port 3000.

## Important Architectural Rules

- All feature updates must be committed to `test` first.
- Maintain responsive, high-aesthetic styling tokens (`bg-ivory`, `text-ink`).
- Preserve existing REST payload schemas for `/api/contact` and `/api/newsletter`.

## Known Unknowns

- Production MongoDB Atlas connection URI to be configured in cloud environment variables upon deployment.
