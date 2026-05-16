# KUPE — New Device Setup (after copying project folder)

You've copied the whole `KUPE/` folder to a new machine (USB / zip / OneDrive / etc.) including the `backend/.env` and `frontend/.env.local` files. This doc gets you running in ~10 minutes.

## What transfers via the folder copy

✅ All source code, configs, seed data
✅ `backend/.env` (Gemini model, Firebase project ID, Maps server key, CORS list)
✅ `frontend/.env.local` (Firebase web config, Maps browser key)
✅ Already-installed venv? **No** — venvs are not portable across machines. Delete `backend/.venv/` if it copied over, you'll recreate it.
✅ `node_modules/`? **No, don't copy** — they're huge and platform-specific. Re-install with `npm install`.

## What does NOT transfer (and you must redo on the new device)

❌ **gcloud authentication** — tied to this machine. Re-run `gcloud auth login` and `gcloud auth application-default login` on the new machine.
❌ **Python venv** — recreate locally
❌ **node_modules** — recreate locally
❌ **Firebase CLI auth** — re-run `firebase login` if you plan to deploy
❌ **The OS itself** — you'll need gcloud CLI, Python 3.11+, Node 20+ installed first

## Prerequisites on the new device

Install these once:

| Tool | Why | Installer |
|---|---|---|
| Google Cloud SDK | `gcloud` CLI | https://cloud.google.com/sdk/docs/install |
| Python 3.11+ | Backend | https://www.python.org/downloads/ |
| Node 20+ | Frontend | https://nodejs.org/ |
| Firebase CLI (optional, for deploy) | `firebase deploy` | `npm install -g firebase-tools` |

## One-shot setup

After copying the project folder to e.g. `D:\Projects\KUPE`:

```powershell
cd D:\Projects\KUPE

# Step 1: authenticate gcloud (browser pops up; pick aiman0608@gmail.com → Allow)
gcloud auth login
gcloud auth application-default login
gcloud auth application-default set-quota-project project-8835c3ba-ad0b-4e0b-b56
gcloud config set project project-8835c3ba-ad0b-4e0b-b56

# Step 2: run the bootstrap script
.\infra\bootstrap.ps1
```

The bootstrap script:
1. Creates `backend/.venv` and installs Python deps
2. Runs `npm install` in `frontend/`
3. Verifies `.env` files exist
4. Smoke-tests connectivity to Gemini / Firestore / Translation

## Run

Two terminals:

```powershell
# Terminal 1 — backend
cd D:\Projects\KUPE\backend
.\.venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000
```

```powershell
# Terminal 2 — frontend
cd D:\Projects\KUPE\frontend
npm run dev
```

Visit http://localhost:5173.

## Troubleshooting

**`gcloud: command not found`** → Cloud SDK isn't installed or not on PATH. Open a fresh PowerShell after install.

**Backend 500 error on `/api/trips/generate` with "DefaultCredentialsError"** → `gcloud auth application-default login` wasn't run on this machine. Re-run it.

**Backend 500 with "quota project not set"** → run `gcloud auth application-default set-quota-project project-8835c3ba-ad0b-4e0b-b56`.

**Frontend shows "Firebase not configured — using dev mock sign-in"** → `frontend/.env.local` is missing or empty. Copy it from your other machine.

**Maps shows "Map preview disabled"** → `VITE_MAPS_BROWSER_KEY` is missing in `frontend/.env.local`. Copy it.

**Gemini 404 on `gemini-2.5-pro` or `gemini-2.5-flash`** → Different project, no access. The `.env` model name should match what your project can call. Test with the curl probe at the bottom of [infra/setup_apis.md](infra/setup_apis.md).

## What is — and isn't — secret in `.env`

| Value | Class | Why |
|---|---|---|
| `VITE_FIREBASE_*` | **Public** | Firebase web SDK keys are shipped in the JS bundle anyway. Security comes from Auth + Firestore rules, not from hiding the key. |
| `VITE_MAPS_BROWSER_KEY` | **Restricted public** | Will appear in the browser bundle. Restricted to Maps JS + Places API via the project's API key restrictions. |
| `MAPS_SERVER_KEY` | **Secret** | Server-only. Don't commit, don't expose in logs. |
| `GCP_PROJECT_ID`, `FIREBASE_PROJECT_ID`, `GEMINI_MODEL` | Public | Identifiers, not credentials. |
| `GOOGLE_APPLICATION_CREDENTIALS` | N/A | We don't use a service-account JSON file — ADC handles auth via `gcloud auth application-default login`. |

So in practice: keep the `.env` files off public git, but a USB/private cloud copy is fine.
