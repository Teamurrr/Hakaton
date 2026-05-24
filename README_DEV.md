Quick dev startup

PowerShell (recommended on Windows):

1. From project root run:

   .\scripts\start-dev.ps1

This will:
- create `.venv` in project root (if missing)
- install Python deps from `backend/requirements.txt`
- run `npm install` in project root (installs `concurrently` etc.)
- execute `npm run dev` (starts frontend + smart-traffic backend)

If you prefer to run parts separately:

- Start backend only:
  .\scripts\start-backend.ps1

- Start frontend only:
  .\scripts\start-frontend.ps1

Bash / Git Bash:

1. From project root run:

   ./scripts/start-dev.sh

Notes:
- Scripts assume `python` in PATH and a working Node.js/npm.
- If PowerShell blocks scripts by policy, run `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` as admin, or run the script with `powershell -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1`.
