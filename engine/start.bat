@echo off
rem Double-click to run the game in your browser (needs Node.js from nodejs.org).
cd /d "%~dp0"
if not exist node_modules call npm install
call npm run dev
