@echo off
title Speaking Partner - Sistem Keuangan
echo =============================================
echo   Speaking Partner by Kampung Inggris
echo   Sistem Informasi Keuangan
echo =============================================
echo.
echo Memulai server...
echo.

set PATH=C:\Program Files\nodejs;%PATH%
set DATABASE_URL=postgresql://postgres:123456@localhost:5432/sisfo_speaking_partner?schema=public

cd /d "%~dp0"
start "" "http://localhost:3000"
timeout /t 2 /nobreak >nul
npm.cmd run dev

pause
