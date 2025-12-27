# Script pour démarrer le serveur Next.js et capturer les erreurs
Write-Host "Démarrage du serveur Next.js sur le port 3001..." -ForegroundColor Green
Write-Host "Les erreurs seront affichées ci-dessous..." -ForegroundColor Yellow
Write-Host ""

# Changer vers le dossier du projet
Set-Location $PSScriptRoot

# Démarrer le serveur
npm run dev


