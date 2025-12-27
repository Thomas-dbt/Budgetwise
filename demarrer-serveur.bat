@echo off
echo ========================================
echo   Demarrage du serveur BudgetWise
echo   Port: 3001
echo ========================================
echo.
echo Le serveur va demarrer ci-dessous...
echo Si vous voyez des erreurs en rouge, copiez-les et partagez-les.
echo.
echo Pour arreter le serveur, appuyez sur Ctrl+C
echo.
echo ========================================
echo.

cd /d "%~dp0"
npm run dev

pause






