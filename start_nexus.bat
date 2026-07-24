@echo off
title Votex AI Platform Manager
echo ==============================================
echo    Votex Mental Health Diagnostics Platform
echo ==============================================
echo.
echo Cleaning up old processes on ports 3000 and 8000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do taskkill /f /pid %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /f /pid %%a 2>nul

echo Starting FastAPI Backend Services...
start "Votex Backend" cmd /k "cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo Starting Next.js Frontend Next Gen...
start "Votex Frontend" cmd /k "set PATH=%~dp0node_bin\node-v20.11.1-win-x64;%PATH% && cd frontend && rmdir /s /q .next 2>nul && npm run dev"

echo.
echo System Boot Initiated! 
echo Dashboard will be available at: http://localhost:3000
echo.
pause
