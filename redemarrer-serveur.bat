@echo off
echo ========================================
echo   Redemarrage du serveur BudgetWise
echo   Port: 4000
echo ========================================
echo.
echo 1. Nettoyage du cache Next.js...
if exist .next rmdir /s /q .next
echo Cache nettoye!
echo.
echo 2. Demarrage du serveur...
echo.
cd /d "%~dp0"
npm run dev

pause

