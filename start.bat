@echo off
cd /d "%~dp0"

echo Installing dependencies...
call npm install
call npm install --prefix server
call npm install --prefix client

echo.
echo Starting Movie Artwork Reviewer...
call npm run dev
