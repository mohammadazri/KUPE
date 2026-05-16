# =====================================================================
# KUPE — New-device bootstrap script
# Run from repo root AFTER:
#   - copying the folder to the new machine (incl. .env files)
#   - installing gcloud CLI, Python 3.11+, Node 20+
#   - running: gcloud auth login + gcloud auth application-default login
# =====================================================================

$ErrorActionPreference = "Stop"
$RepoRoot = $PSScriptRoot | Split-Path -Parent

Write-Host "==== KUPE bootstrap ====" -ForegroundColor Cyan
Write-Host "Repo root: $RepoRoot"
Write-Host ""

# 1. Sanity: prereqs
function Test-Cmd($name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}
$missing = @()
foreach ($cmd in @("gcloud", "python", "node", "npm")) {
    if (-not (Test-Cmd $cmd)) { $missing += $cmd }
}
if ($missing.Count -gt 0) {
    Write-Error "Missing prerequisites: $($missing -join ', '). See NEW_DEVICE_SETUP.md."
    exit 1
}
Write-Host "[OK] Prereqs found: gcloud, python, node, npm" -ForegroundColor Green

# 2. Sanity: env files exist
$backendEnv = Join-Path $RepoRoot "backend\.env"
$frontendEnv = Join-Path $RepoRoot "frontend\.env.local"
foreach ($f in @($backendEnv, $frontendEnv)) {
    if (-not (Test-Path $f)) {
        Write-Error "Missing $f. Copy it from the source machine."
        exit 1
    }
}
Write-Host "[OK] .env files present" -ForegroundColor Green

# 3. Sanity: gcloud auth + ADC + project
$account = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
if (-not $account) {
    Write-Error "No active gcloud account. Run: gcloud auth login"
    exit 1
}
Write-Host "[OK] gcloud authenticated as $account" -ForegroundColor Green

$adcPath = Join-Path $env:APPDATA "gcloud\application_default_credentials.json"
if (-not (Test-Path $adcPath)) {
    Write-Error "No Application Default Credentials. Run: gcloud auth application-default login"
    exit 1
}
Write-Host "[OK] ADC file present" -ForegroundColor Green

$proj = gcloud config get-value project 2>$null
if (-not $proj) {
    Write-Host "[WARN] gcloud project not set; setting to project-8835c3ba-ad0b-4e0b-b56" -ForegroundColor Yellow
    gcloud config set project project-8835c3ba-ad0b-4e0b-b56 | Out-Null
    $proj = "project-8835c3ba-ad0b-4e0b-b56"
}
Write-Host "[OK] gcloud project: $proj" -ForegroundColor Green

# 4. Backend venv + deps
Write-Host ""
Write-Host "==== Backend setup ====" -ForegroundColor Cyan
Push-Location (Join-Path $RepoRoot "backend")
if (-not (Test-Path ".venv")) {
    Write-Host "Creating Python venv..."
    python -m venv .venv
}
Write-Host "Installing Python deps..."
& .\.venv\Scripts\python.exe -m pip install --upgrade pip --quiet
& .\.venv\Scripts\python.exe -m pip install -r requirements.txt --quiet
Write-Host "[OK] Backend deps installed" -ForegroundColor Green
Pop-Location

# 5. Frontend deps
Write-Host ""
Write-Host "==== Frontend setup ====" -ForegroundColor Cyan
Push-Location (Join-Path $RepoRoot "frontend")
if (-not (Test-Path "node_modules")) {
    Write-Host "Running npm install..."
    npm install --silent
} else {
    Write-Host "node_modules already exists, skipping install"
}
Write-Host "[OK] Frontend deps installed" -ForegroundColor Green
Pop-Location

# 6. Smoke tests
Write-Host ""
Write-Host "==== Smoke tests (Gemini, Firestore, Translation) ====" -ForegroundColor Cyan
Push-Location (Join-Path $RepoRoot "backend")
& .\.venv\Scripts\python.exe -c @"
import sys, asyncio
sys.path.insert(0, '.')
from services import firestore_client as fs, translation_client as tc, gemini_client as g

async def go():
    try:
        rows = await fs.list_all('businesses', limit=1)
        print(f'  Firestore: OK ({len(rows)} doc readable)')
    except Exception as e:
        print(f'  Firestore: FAIL -- {e}'); raise

    try:
        r = await tc.translate_text('hello', 'ms')
        print(f'  Translation: OK ({r[\"translated\"]!r})')
    except Exception as e:
        print(f'  Translation: FAIL -- {e}'); raise

    try:
        r = await g.health_check()
        if r.get('ok'):
            print(f'  Gemini ({r[\"model\"]}): OK')
        else:
            print(f'  Gemini: FAIL -- {r}'); raise SystemExit(1)
    except Exception as e:
        print(f'  Gemini: FAIL -- {e}'); raise

asyncio.run(go())
print()
print('All services reachable.')
"@
Pop-Location

Write-Host ""
Write-Host "==== Bootstrap complete ====" -ForegroundColor Green
Write-Host ""
Write-Host "To run:"
Write-Host "  Terminal 1: cd $RepoRoot\backend; .\.venv\Scripts\Activate.ps1; uvicorn main:app --reload --port 8000"
Write-Host "  Terminal 2: cd $RepoRoot\frontend; npm run dev"
Write-Host ""
Write-Host "Then open http://localhost:5173"
