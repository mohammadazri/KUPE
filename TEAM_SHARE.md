# KUPE — Sharing Localhost with Your Team via Cloudflare Tunnel

You want teammates to test KUPE from their own machines without you deploying anywhere. Cloudflare **Quick Tunnels** (TryCloudflare) give you free, anonymous, short-lived HTTPS URLs that proxy to your localhost. No Cloudflare account or domain required.

## Current live URLs (changes every restart)

Look in `.tunnel-frontend.log` and `.tunnel-backend.log` for the current ones, or just re-run `.\infra\share-tunnel.ps1` which prints them at the end.

⚠️ **These URLs are ephemeral.** They die when you stop the tunnel processes or reboot your machine. Every fresh `cloudflared` invocation generates a new random URL.

## Why Google Sign-In would close immediately on a tunnel URL

Firebase Auth has an **Authorized Domains** allowlist. Any domain not on it makes the Google Sign-In popup detect a mismatch and close itself.

`share-tunnel.ps1` now auto-adds the new frontend tunnel domain via the Identity Toolkit admin API — uses your `gcloud auth` token, no Console clicking needed.

To do it manually after a tunnel restart:
```powershell
$proj = "project-8835c3ba-ad0b-4e0b-b56"
$tok = gcloud auth print-access-token
$body = '{"authorizedDomains":["localhost","' + $proj + '.firebaseapp.com","' + $proj + '.web.app","YOUR-NEW-TUNNEL-HOST.trycloudflare.com"]}'
Invoke-RestMethod -Uri "https://identitytoolkit.googleapis.com/admin/v2/projects/$proj/config?updateMask=authorizedDomains" `
  -Headers @{ "Authorization" = "Bearer $tok"; "x-goog-user-project" = $proj; "Content-Type" = "application/json" } `
  -Method Patch -Body $body
```

## How the wiring works

```
Teammate's browser
    │  https://poker-deserve-alliance-indie.trycloudflare.com
    ▼
Cloudflare edge (Quick Tunnel)
    │  HTTPS over WebSocket
    ▼
cloudflared on your machine
    │  → http://localhost:5173
    ▼
Vite dev server
    │  (JS makes API calls to:)
    │  https://characterized-march-improvements-tigers.trycloudflare.com
    ▼
Cloudflare edge (different Quick Tunnel)
    │
    ▼
cloudflared on your machine
    │  → http://localhost:8000
    ▼
FastAPI / uvicorn
    └→ Vertex AI, Firestore, Maps, etc (via your ADC)
```

Two tunnels because the frontend is a static SPA — when the browser executes the JS, it makes API calls from the user's network, not from your machine. So the backend also needs to be publicly reachable, but only by the frontend (via CORS allowlist).

## Background processes running right now

| What | Where | Notes |
|---|---|---|
| Backend uvicorn | task `b4h57gk62`, port 8000 | Restart picks up `backend/.env` changes |
| Vite dev server | task `b90yhdpz3`, port 5173 | HMR via WebSocket through the tunnel works |
| Frontend tunnel | task `byzcspjy1` | log: `.tunnel-frontend.log` |
| Backend tunnel | task `bzaogvtxg` | log: `.tunnel-backend.log` |

Stop them by killing the task or with `taskkill /PID <pid> /F`.

## What was changed for tunnel mode

- `backend/.env` → `ALLOWED_ORIGINS` now includes the frontend `*.trycloudflare.com` URL (CORS preflight passes).
- `frontend/.env.local` → `VITE_API_BASE_URL` points at the backend tunnel URL (axios sends requests there).
- `frontend/vite.config.js` → `server.allowedHosts: [".trycloudflare.com", "localhost"]` so Vite 5+ doesn't reject the proxied Host header, plus `hmr.clientPort: 443` and `hmr.protocol: "wss"` so HMR WebSocket works over HTTPS.

## To start a fresh share session (after reboot or after killing everything)

```powershell
# 1. Make sure your backend + frontend are running locally:
#    Terminal A
cd backend; .\.venv\Scripts\Activate.ps1; uvicorn main:app --port 8000

#    Terminal B
cd frontend; npm run dev

# 2. Start the two tunnels (each prints a URL — copy them)
#    Terminal C
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:8000

#    Terminal D
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:5173

# 3. Update env files with the NEW URLs (they're different each run):
#    backend/.env:        append new frontend tunnel URL to ALLOWED_ORIGINS
#    frontend/.env.local: set VITE_API_BASE_URL to new backend tunnel URL

# 4. Restart backend and frontend so they pick up the new env values.
#    (Vite must restart fully — HMR doesn't pick up new env.)
```

Or use the one-shot helper: `.\infra\share-tunnel.ps1` (below).

## Stopping the share

Three things to stop:

```powershell
# Find PIDs (Windows)
netstat -ano | findstr ":5173 :8000"
# Kill them by PID
taskkill /F /PID <uvicorn-pid>
taskkill /F /PID <vite-pid>

# Tunnels — find cloudflared.exe processes:
tasklist /FI "IMAGENAME eq cloudflared.exe"
taskkill /F /IM cloudflared.exe   # kills BOTH tunnels at once
```

You'd typically just close the four terminal windows.

## Security notes (read before sharing widely)

1. **Anyone with the URL can hit your backend.** Trip generation calls Gemini, which costs Google Cloud credit. A bored teammate spamming the wizard could chew through your `RM 1,186` credit. Watch the billing dashboard.

2. **No auth in dev mode.** The Firebase ID-token middleware allows anonymous calls when `APP_ENV=development`. For real public sharing you'd want to flip to production mode and require sign-in.

3. **Maps API key is exposed.** `VITE_MAPS_BROWSER_KEY` ships in the JS bundle. We restricted it to Maps JS + Places API at the API key level, but a determined abuser could still rack up modest charges. Consider adding HTTP referrer restrictions in Cloud Console → APIs & Services → Credentials → "KUPE Maps Key" once you know the tunnel domain pattern.

4. **The URL is unguessable but not secret.** TryCloudflare URLs are random words, but if a teammate shares the link in a public channel, it's effectively public.

5. **Stop the tunnels when you're done** — leaving them running 24/7 is a small but real attack surface.

## Limitations

- TryCloudflare URLs are **rate-limited** by Cloudflare (~few hundred RPS). Fine for team testing, not for a real demo with 100 concurrent users.
- URLs change every run. For a stable URL during the hackathon judging window, either:
  - Keep your machine + tunnels running continuously, or
  - Upgrade to a named tunnel (needs Cloudflare account + domain, ~10 min setup), or
  - Deploy to Cloud Run + Firebase Hosting using the `infra/deploy.ps1` script.
- WebSocket-heavy features (voice capture mic streaming) should still work since Cloudflare Tunnels support WebSocket.

## Files involved

- [TEAM_SHARE.md](TEAM_SHARE.md) — this file
- [infra/share-tunnel.ps1](infra/share-tunnel.ps1) — one-shot script to (re)start everything
- [frontend/vite.config.js](frontend/vite.config.js) — `allowedHosts` for trycloudflare domains
- [backend/.env](backend/.env) — `ALLOWED_ORIGINS` (gitignored, lives on your machine)
- [frontend/.env.local](frontend/.env.local) — `VITE_API_BASE_URL` (gitignored)
- `.tunnel-frontend.log` + `.tunnel-backend.log` — tunnel runtime logs (gitignored)
