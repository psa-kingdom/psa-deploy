# CHANGELOG

This records meaningful project changes.

Do not record every tiny UI adjustment.

---

## Unreleased

### Added
- Created `test` branch tracking `origin/test` for ongoing development work.
- Configured local environment configuration files (`frontend/.env` and `backend/.env`).
- Created Python virtual environment in `backend/venv` with FastAPI, Uvicorn, Motor, PyMongo, Pydantic, and supporting dependencies.
- Added comprehensive repository documentation suite ([`AGENTS.md`](file:///d:/Downloads/Workspace/PSA/AGENTS.md), [`PROJECT_STATE.md`](file:///d:/Downloads/Workspace/PSA/docs/PROJECT_STATE.md), [`ARCHITECTURE.md`](file:///d:/Downloads/Workspace/PSA/docs/ARCHITECTURE.md), [`CHANGELOG.md`](file:///d:/Downloads/Workspace/PSA/docs/CHANGELOG.md)).

### Changed
- Configured Git author identity to `Gaurav` for local repository operations.
- Updated frontend dependencies with `ajv` 8 and `ajv-keywords` 5 compatibility overrides for React 19 / CRACO build stability.

### Fixed
- Fixed webpack/craco build module dependency error (`Cannot find module 'ajv/dist/compile/codegen'`).

### Infrastructure
- Verified GitHub API authentication token and full administrative/repository access permissions.
- Launched and verified local backend FastAPI server on `http://127.0.0.1:8001`.
- Built and verified local frontend SPA server on `http://localhost:3000`.

---

## Previous Releases

- **Initial Commit (2026-07-07)**: Base repository setup for P Suman & Associates marketing website, backend FastAPI service, and Digital Business Card view.
