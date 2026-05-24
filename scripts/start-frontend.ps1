# start-frontend.ps1 — запускает только frontend
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptRoot
Set-Location ..\frontend

Write-Host "[start-frontend] Installing npm dependencies (if needed)..."
npm install

Write-Host "[start-frontend] Starting Vite dev server on host 127.0.0.1:3000..."
npm run dev -- --host 127.0.0.1 --port 3000
