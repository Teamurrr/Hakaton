# start-dev.ps1 — запуск dev окружения (PowerShell)
# Запускает: создание .venv, установка Python-зависимостей, npm install и `npm run dev`.

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptRoot
Set-Location ..

Write-Host "[start-dev] Working directory: $(Get-Location)"

if (-not (Test-Path ".venv")) {
    Write-Host "[start-dev] Creating Python venv .venv..."
    python -m venv .venv
}

Write-Host "[start-dev] Activating .venv..."
# PowerShell activation (compatible fallback)
if (Test-Path ".\.venv\Scripts\Activate.ps1") {
    try {
        . .\.venv\Scripts\Activate.ps1
    } catch {
        Write-Host "[start-dev] Activate.ps1 executed but failed: $_"
    }
} else {
    Write-Host "[start-dev] Activate.ps1 not found, continuing without activating (activate manually if needed)."
}

Write-Host "[start-dev] Installing Python dependencies (backend/requirements.txt)..."
pip install -r backend\requirements.txt

Write-Host "[start-dev] Installing npm dependencies (project root)..."
npm install

Write-Host "[start-dev] Starting dev servers (npm run dev)..."
npm run dev
