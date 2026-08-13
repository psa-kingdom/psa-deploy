# ARCHITECTURE

> High-level architecture reference.
> Keep this document focused on stable architectural concepts.

## System Overview

P Suman & Associates (PSA) operates a modern, high-performance web platform designed for corporate marketing, service inquiries, and digital networking. The platform consists of a React-based Single-Page Application (SPA) frontend and a Python FastAPI RESTful backend service connected to a MongoDB document database.

## Architecture Pattern

Decoupled Client-Server Architecture:
- **Client Tier**: React 19 SPA delivering dynamic UI views, responsive navigation, and client-side form validation.
- **Service Tier**: Asynchronous FastAPI Python backend handling data validation, business logic, and API endpoints.
- **Data Tier**: MongoDB Atlas cloud document database storing subscription and contact inquiry records.

## Frontend

- **Framework**: React 19 initialized with Create React App (CRA) and customized via CRACO (`@craco/craco`).
- **Styling & Design System**: Tailwind CSS v3 using a custom color palette (`bg-ivory`, `text-ink`), smooth gradients, and glassmorphism elements.
- **Component Primitives**: Radix UI UI components and Framer Motion micro-animations.
- **Routing**: React Router v7 (`BrowserRouter`) with full client-side route handling. The `/connect` route renders a standalone Digital Business Card view without standard header and footer navigation.
- **API Client**: Axios configured with environment-based backend resolution (`process.env.REACT_APP_BACKEND_URL`).

## Backend

- **Framework**: FastAPI (Python 3.12) running under Uvicorn ASGI server.
- **Modular Routing**: `APIRouter` mounting all endpoints under `/api`.
- **Data Validation & Serialisation**: Pydantic v2 schemas (`BaseModel`) with UUID creation and ISO UTC timestamping.
- **Database Driver**: `motor.motor_asyncio.AsyncIOMotorClient` for non-blocking database queries.
- **CORS Handling**: `CORSMiddleware` reading allowed origins from `CORS_ORIGINS`.

## Database

- **Engine**: MongoDB Atlas (M0 Cloud Cluster).
- **Logical Database**: `psuman_associates`.
- **Collections**:
  - `newsletter_subscriptions`: Stores email subscriptions with source tracking and timestamps.
  - `contact_submissions`: Stores lead details (name, company, email, phone, service of interest, message).

## Authentication

- Stateless public API architecture. Currently no user session login required for marketing and inquiry submission routes.

## Authorization

- Public endpoint access. Origin restrictions enforced at API boundary via `CORSMiddleware`.

## Major Feature Boundaries

1. **Corporate Website & Content Engine**: Static and dynamic marketing views (`/`, `/services`, `/industries`, `/about`, `/insights`).
2. **Lead & Subscription Ingestion**: Contact inquiry submission (`/contact`) and newsletter registration (`NewsletterBlock`).
3. **Digital Business Card**: Dedicated standalone card view (`/connect`).

## Shared Infrastructure

- Environment configuration files (`frontend/.env`, `backend/.env`).
- Standardized Uvicorn/Python logging pipeline (`logging.basicConfig`).

## Data Flow

```
[User Form / UI Interaction]
         │
         ▼
[Axios Client (React SPA)]
         │ (HTTP REST / JSON)
         ▼
[FastAPI Router (/api/*)]
         │
         ▼
[Pydantic Input Validation]
         │
         ▼
[Async Motor Driver]
         │
         ▼
[MongoDB Atlas Collection]
```

## External Integrations

- **Vercel**: CDN hosting for frontend SPA bundle.
- **Railway / Render**: Containerized backend hosting platform.
- **MongoDB Atlas**: Managed cloud database host.

## Deployment Architecture

- **Frontend**: Automated build via Vercel pipeline (`frontend/vercel.json` SPA rewrite rules).
- **Backend**: Containerized deployment via Railway (`backend/railway.json`) or Render (`backend/render.yaml` & `Procfile`).

## Important Architectural Constraints

- Frontend build path alias `@/*` configured via CRACO and `jsconfig.json`.
- All backend routes must remain non-blocking using async handler functions.
- Environment variables must supply `MONGO_URL`, `DB_NAME`, and `CORS_ORIGINS`.

## Known Architectural Risks

- Free-tier backend hosting may experience cold-start latencies after periods of inactivity.
- Dynamic backend container IP addresses require MongoDB Atlas network whitelist entry (`0.0.0.0/0`).

## Last Updated

2026-08-13
