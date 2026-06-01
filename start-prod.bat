@echo off
cd /d "%~dp0"

echo Installing dependencies...
call npm install
call npm install --prefix server
call npm install --prefix client

echo.
echo Building client...
call npm run build

echo.
echo Starting production server on port 3001...
echo Open http://localhost:3001 or use the Cloudflare Tunnel URL
echo.
call npm --prefix server start
