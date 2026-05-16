# =====================================================================
# KUPE — One-shot Cloudflare Tunnel team-share starter
# =====================================================================
# Starts two TryCloudflare Quick Tunnels (frontend + backend), parses
# the trycloudflare.com URLs out of their logs, writes them into the
# .env files, and restarts uvicorn + Vite so the wiring picks up.
#
# Prerequisites:
#   - cloudflared installed (winget install Cloudflare.cloudflared)
#   - Python venv at backend/.venv with deps installed
#   - npm deps installed at frontend/
#   - backend/.env and frontend/.env.local both exist
#
# Usage:  .\infra\share-tunnel.ps1
# Stop:   .\infra\share-tunnel.ps1 -Stop
# =====================================================================

param([switch]$Stop)

$ErrorActionPreference = "Stop"
$RepoRoot = $PSScriptRoot | Split-Path -Parent
$CloudflaredPath = "C:\Program Files (x86)\cloudflared\cloudflared.exe"

if ($Stop) {
    Write-Host "=== Stopping tunnels and servers ===" -ForegroundColor Cyan
    Get-Process -Name cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "Killed cloudflared." -ForegroundColor Green
    foreach ($port in @(5173, 8000)) {
        $pids = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Where-Object State -eq Listen).OwningProcess
        foreach ($p in $pids) {
            if ($p -and $p -ne 0) {
                $proc = Get-Process -Id $p -ErrorAction SilentlyContinue
                if ($proc -and ($proc.ProcessName -match "python|node")) {
                    Stop-Process -Id $p -Force
                    Write-Host "Killed PID $p ($($proc.ProcessName)) on port $port." -ForegroundColor Green
                }
            }
        }
    }
    Write-Host "Done." -ForegroundColor Green
    return
}

if (-not (Test-Path $CloudflaredPath)) {
    Write-Error "cloudflared not found at $CloudflaredPath. Install: winget install Cloudflare.cloudflared"
    exit 1
}

Write-Host "=== Starting Cloudflare Tunnels ===" -ForegroundColor Cyan

$feLog = Join-Path $RepoRoot ".tunnel-frontend.log"
$beLog = Join-Path $RepoRoot ".tunnel-backend.log"

# Wipe old logs so URL parsing isn't confused
"" | Out-File -Encoding utf8 $feLog
"" | Out-File -Encoding utf8 $beLog

$feProc = Start-Process -FilePath $CloudflaredPath `
    -ArgumentList "tunnel","--url","http://localhost:5173","--logfile",$feLog,"--loglevel","info" `
    -PassThru -WindowStyle Hidden
Write-Host "Frontend tunnel PID: $($feProc.Id)" -ForegroundColor Gray

$beProc = Start-Process -FilePath $CloudflaredPath `
    -ArgumentList "tunnel","--url","http://localhost:8000","--logfile",$beLog,"--loglevel","info" `
    -PassThru -WindowStyle Hidden
Write-Host "Backend  tunnel PID: $($beProc.Id)" -ForegroundColor Gray

function Wait-ForUrl($logPath, $name, $timeoutSec = 30) {
    $deadline = (Get-Date).AddSeconds($timeoutSec)
    while ((Get-Date) -lt $deadline) {
        if (Test-Path $logPath) {
            $match = Select-String -Path $logPath -Pattern "https://[a-z0-9-]+\.trycloudflare\.com" -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($match) {
                $url = $match.Matches[0].Value
                Write-Host "[OK] $name URL: $url" -ForegroundColor Green
                return $url
            }
        }
        Start-Sleep -Milliseconds 500
    }
    Write-Error "$name tunnel URL did not appear within $timeoutSec seconds."
    exit 1
}

$frontendUrl = Wait-ForUrl $feLog "Frontend"
$backendUrl  = Wait-ForUrl $beLog "Backend"

Write-Host ""
Write-Host "=== Writing tunnel URLs to env files ===" -ForegroundColor Cyan

# Update frontend/.env.local: VITE_API_BASE_URL=...
$feEnvPath = Join-Path $RepoRoot "frontend\.env.local"
$feContent = Get-Content $feEnvPath -Raw
$feContent = $feContent -replace "VITE_API_BASE_URL=[^\r\n]*", "VITE_API_BASE_URL=$backendUrl"
$feContent | Set-Content -Encoding utf8 -NoNewline $feEnvPath
Write-Host "[OK] frontend/.env.local -> VITE_API_BASE_URL=$backendUrl" -ForegroundColor Green

# Update backend/.env: append frontendUrl to ALLOWED_ORIGINS (only if missing)
$beEnvPath = Join-Path $RepoRoot "backend\.env"
$beContent = Get-Content $beEnvPath -Raw
$origLine = ($beContent -split "`n" | Where-Object { $_ -match "^ALLOWED_ORIGINS=" } | Select-Object -First 1).Trim()
if ($origLine -and $origLine -notmatch [regex]::Escape($frontendUrl)) {
    $newLine = "$origLine,$frontendUrl"
    $beContent = $beContent -replace [regex]::Escape($origLine), $newLine
    $beContent | Set-Content -Encoding utf8 -NoNewline $beEnvPath
    Write-Host "[OK] backend/.env -> appended $frontendUrl to ALLOWED_ORIGINS" -ForegroundColor Green
} else {
    Write-Host "[skip] backend/.env already has the frontend tunnel in ALLOWED_ORIGINS" -ForegroundColor DarkGray
}

# Add frontend tunnel domain to Firebase Auth authorized domains
# (without this, Google Sign-In popup closes immediately on the tunnel URL)
$feHost = ([uri]$frontendUrl).Host
Write-Host ""
Write-Host "=== Patching Firebase Auth authorized domains ===" -ForegroundColor Cyan
$gcpProject = "project-8835c3ba-ad0b-4e0b-b56"
$token = (gcloud auth print-access-token 2>$null)
if (-not $token) {
    Write-Warning "Skipping Firebase Auth domain update — gcloud not authenticated. Run: gcloud auth login"
} else {
    try {
        $current = Invoke-RestMethod -Uri "https://identitytoolkit.googleapis.com/admin/v2/projects/$gcpProject/config" `
            -Headers @{ "Authorization" = "Bearer $token"; "x-goog-user-project" = $gcpProject } `
            -Method Get
        $domains = @($current.authorizedDomains)
        if ($domains -notcontains $feHost) {
            $domains += $feHost
            $body = @{ authorizedDomains = $domains } | ConvertTo-Json -Depth 5
            Invoke-RestMethod -Uri "https://identitytoolkit.googleapis.com/admin/v2/projects/$gcpProject/config?updateMask=authorizedDomains" `
                -Headers @{ "Authorization" = "Bearer $token"; "x-goog-user-project" = $gcpProject; "Content-Type" = "application/json" } `
                -Method Patch -Body $body | Out-Null
            Write-Host "[OK] Firebase Auth -> added $feHost to authorizedDomains" -ForegroundColor Green
        } else {
            Write-Host "[skip] Firebase Auth already has $feHost" -ForegroundColor DarkGray
        }
    } catch {
        Write-Warning "Firebase Auth domain update failed: $($_.Exception.Message). Sign-in popup may close on tunnel URL — add the domain manually in Firebase Console > Auth > Settings."
    }
}

Write-Host ""
Write-Host "=== Restarting backend + frontend ===" -ForegroundColor Cyan

# Kill anything on 5173 + 8000 (only python/node)
foreach ($port in @(5173, 8000)) {
    $pids = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Where-Object State -eq Listen).OwningProcess
    foreach ($p in $pids) {
        if ($p -and $p -ne 0) {
            $proc = Get-Process -Id $p -ErrorAction SilentlyContinue
            if ($proc -and ($proc.ProcessName -match "python|node")) {
                Stop-Process -Id $p -Force
                Write-Host "Killed PID $p ($($proc.ProcessName)) on $port" -ForegroundColor Gray
            }
        }
    }
}
Start-Sleep -Seconds 2

# Start uvicorn (background, hidden)
$backendCmd = Join-Path $RepoRoot "backend\.venv\Scripts\python.exe"
$uvicornArgs = @("-m","uvicorn","main:app","--port","8000","--log-level","info")
Start-Process -FilePath $backendCmd -ArgumentList $uvicornArgs `
    -WorkingDirectory (Join-Path $RepoRoot "backend") -WindowStyle Hidden | Out-Null
Write-Host "[OK] uvicorn restarting on :8000" -ForegroundColor Green

# Start vite (background, hidden)
Start-Process -FilePath "npm.cmd" -ArgumentList "run","dev" `
    -WorkingDirectory (Join-Path $RepoRoot "frontend") -WindowStyle Hidden | Out-Null
Write-Host "[OK] vite restarting on :5173" -ForegroundColor Green

Write-Host ""
Write-Host "=== Waiting for both servers to be ready ===" -ForegroundColor Cyan
$bothReady = $false
$deadline = (Get-Date).AddSeconds(40)
while (-not $bothReady -and (Get-Date) -lt $deadline) {
    $be = $false; $fe = $false
    try { $be = (Invoke-WebRequest -Uri "http://localhost:8000/health" -TimeoutSec 2 -UseBasicParsing).StatusCode -eq 200 } catch {}
    try { $fe = (Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 2 -UseBasicParsing).StatusCode -eq 200 } catch {}
    if ($be -and $fe) { $bothReady = $true; break }
    Start-Sleep -Seconds 1
}

if (-not $bothReady) {
    Write-Warning "Servers did not respond within 40s. Check the windows or run again."
} else {
    Write-Host "[OK] Both servers responding." -ForegroundColor Green
}

Write-Host ""
Write-Host "=== SHARE THIS WITH YOUR TEAM ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "  🌐 KUPE app:      $frontendUrl" -ForegroundColor White
Write-Host "  🔧 API health:    $backendUrl/health" -ForegroundColor DarkGray
Write-Host "  📑 API docs:      $backendUrl/docs" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Stop:  .\infra\share-tunnel.ps1 -Stop"
Write-Host ""
