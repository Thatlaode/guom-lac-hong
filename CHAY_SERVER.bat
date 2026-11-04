@echo off
chcp 65001 >nul
title GUOM LAC HONG - May chu tran dau
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo [!] Chua co Node.js. Hay cai ban LTS tai https://nodejs.org roi chay lai file nay.
  pause
  exit /b
)
if not exist node_modules\ws (
  echo Dang cai thu vien lan dau...
  call npm install --no-audit --no-fund
)
start "" http://localhost:8080
node server\server.js
pause
