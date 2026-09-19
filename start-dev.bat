@echo off
title P Suman & Associates - Dev Launcher
echo ===================================================
echo   Starting P Suman & Associates Application Stack
echo ===================================================
echo.

echo [1/2] Launching Backend API on http://127.0.0.1:8001 ...
start "PSA Backend (FastAPI)" cmd /k "cd backend && venv\Scripts\activate && uvicorn server:app --host 127.0.0.1 --port 8001 --reload"

echo [2/2] Launching Frontend on http://localhost:3000 ...
start "PSA Frontend (React 19)" cmd /k "cd frontend && yarn.cmd start"

echo.
echo ===================================================
echo   Application stack initiated!
echo.
echo   - Frontend:    http://localhost:3000
echo   - Backend API: http://localhost:8001/api/
echo   - Swagger UI:  http://localhost:8001/docs
echo   - Admin Login: http://localhost:3000/admin/login
echo                  (admin / admin123)
echo ===================================================
