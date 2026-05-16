# =====================================================================
# KUPE — One-command deploy script (Cloud Run + Firebase Hosting)
# =====================================================================
# Usage:
#   .\infra\deploy.ps1                  # deploys both
#   .\infra\deploy.ps1 -OnlyBackend     # backend only
#   .\infra\deploy.ps1 -OnlyFrontend    # frontend only
#
# Requires:
#   - $env:GCP_PROJECT_ID set
#   - gcloud + firebase CLIs authenticated
# =====================================================================

param(
    [switch]$OnlyBackend,
    [switch]$OnlyFrontend
)

$ErrorActionPreference = "Stop"

if (-not $env:GCP_PROJECT_ID) {
    Write-Error "Set GCP_PROJECT_ID before running."
    exit 1
}

$Project = $env:GCP_PROJECT_ID
$Region = "us-central1"
$SA = "kupe-backend-sa@$Project.iam.gserviceaccount.com"
$Image = "gcr.io/$Project/kupe-backend"

if (-not $OnlyFrontend) {
    Write-Host "=== Building backend image with Cloud Build ===" -ForegroundColor Cyan
    Push-Location $PSScriptRoot\..\backend
    gcloud builds submit --tag $Image --project $Project
    if ($LASTEXITCODE -ne 0) { throw "Cloud Build failed" }

    Write-Host "=== Deploying to Cloud Run ===" -ForegroundColor Cyan
    gcloud run deploy kupe-backend `
        --image $Image `
        --region $Region `
        --platform managed `
        --allow-unauthenticated `
        --service-account $SA `
        --min-instances 1 `
        --max-instances 5 `
        --memory 1Gi `
        --cpu 1 `
        --set-env-vars "GCP_PROJECT_ID=$Project,VERTEX_LOCATION=$Region,GEMINI_MODEL=gemini-2.5-pro,FIREBASE_PROJECT_ID=$Project,APP_ENV=production,ALLOWED_ORIGINS=https://$Project.web.app,https://$Project.firebaseapp.com" `
        --project $Project
    Pop-Location

    $BackendUrl = gcloud run services describe kupe-backend --region $Region --format "value(status.url)" --project $Project
    Write-Host "Backend deployed → $BackendUrl" -ForegroundColor Green
    $env:KUPE_BACKEND_URL = $BackendUrl
}

if (-not $OnlyBackend) {
    Write-Host "=== Building frontend ===" -ForegroundColor Cyan
    Push-Location $PSScriptRoot\..\frontend
    if (Test-Path .env.local) { Write-Host "Using existing .env.local" }
    npm install
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Vite build failed" }

    Write-Host "=== Deploying to Firebase Hosting ===" -ForegroundColor Cyan
    firebase deploy --only hosting --project $Project
    Pop-Location
    Write-Host "Frontend deployed → https://$Project.web.app" -ForegroundColor Green
}

Write-Host "Done." -ForegroundColor Green
