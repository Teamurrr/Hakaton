# start-backend.ps1 — запускает только backend сервиса Smart Traffic
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptRoot
Set-Location ..\backend\services\smart_traffic_service

if (-not (Test-Path ".venv")) {
    Write-Host "[start-backend] Creating .venv in service folder..."
    python -m venv .venv
}

Write-Host "[start-backend] Activating .venv..."
if (Test-Path ".venv\Scripts\Activate.ps1") {
    try {
        . .\.venv\Scripts\Activate.ps1
    } catch {
        Write-Host "[start-backend] Activate.ps1 executed but failed: $_"
    }
} else {
    Write-Host "[start-backend] Activate.ps1 not found, activate manually if needed."
}

Write-Host "[start-backend] Installing service requirements..."
pip install -r requirements.txt

Write-Host "[start-backend] Starting uvicorn..."
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --ws websockets
