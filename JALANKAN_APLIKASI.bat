@echo off
title Speaking Partner - Sistem Informasi Keuangan
echo ==================================================
echo   SEDANG MENJALANKAN APLIKASI SISFO KEUANGAN...
echo ==================================================
echo.
echo [1/2] Menyiapkan server lokal...
start "" http://localhost:3000
npm run dev
pause
