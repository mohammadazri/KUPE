# GCP + Firebase Setup (Hour 0–2 of the sprint)

Everything below should be done by **Dev D** before the rest of the team can run anything locally. Total time: 30–45 min.

## 0. Prerequisites

- `gcloud` CLI installed and logged in: `gcloud auth login`
- `firebase` CLI installed: `npm install -g firebase-tools` → `firebase login`
- Hackathon $100 credit applied to a billing account (Cloud Console → Billing).

## 1. Create the GCP project

```powershell
$env:GCP_PROJECT_ID = "kupe-hackathon-2026"
gcloud projects create $env:GCP_PROJECT_ID --name="KUPE Hackathon"
gcloud config set project $env:GCP_PROJECT_ID

# Link your billing account (replace BILLING_ACCOUNT_ID with yours)
gcloud billing accounts list
gcloud billing projects link $env:GCP_PROJECT_ID --billing-account=BILLING_ACCOUNT_ID
```

## 2. Enable all required APIs

```powershell
gcloud services enable `
  aiplatform.googleapis.com `
  firestore.googleapis.com `
  run.googleapis.com `
  cloudbuild.googleapis.com `
  artifactregistry.googleapis.com `
  containerregistry.googleapis.com `
  places.googleapis.com `
  maps-backend.googleapis.com `
  translate.googleapis.com `
  speech.googleapis.com `
  vision.googleapis.com `
  identitytoolkit.googleapis.com `
  firebase.googleapis.com `
  firebasehosting.googleapis.com
```

## 3. Initialise Firestore (Native mode)

```powershell
gcloud firestore databases create --location=asia-southeast1 --type=firestore-native
```

(Use `us-central1` instead if you'd rather keep everything near Vertex AI; latency penalty is small for our payload sizes.)

## 4. Create the backend service account

```powershell
gcloud iam service-accounts create kupe-backend-sa --display-name="KUPE Backend"

$sa = "kupe-backend-sa@$env:GCP_PROJECT_ID.iam.gserviceaccount.com"

# Roles
gcloud projects add-iam-policy-binding $env:GCP_PROJECT_ID --member="serviceAccount:$sa" --role="roles/aiplatform.user"
gcloud projects add-iam-policy-binding $env:GCP_PROJECT_ID --member="serviceAccount:$sa" --role="roles/datastore.user"
gcloud projects add-iam-policy-binding $env:GCP_PROJECT_ID --member="serviceAccount:$sa" --role="roles/cloudtranslate.user"
gcloud projects add-iam-policy-binding $env:GCP_PROJECT_ID --member="serviceAccount:$sa" --role="roles/speech.client"
gcloud projects add-iam-policy-binding $env:GCP_PROJECT_ID --member="serviceAccount:$sa" --role="roles/serviceusage.serviceUsageConsumer"
gcloud projects add-iam-policy-binding $env:GCP_PROJECT_ID --member="serviceAccount:$sa" --role="roles/firebaseauth.admin"
gcloud projects add-iam-policy-binding $env:GCP_PROJECT_ID --member="serviceAccount:$sa" --role="roles/run.invoker"

# Vision needs the legacy "Cloud Vision API User" role
gcloud projects add-iam-policy-binding $env:GCP_PROJECT_ID --member="serviceAccount:$sa" --role="roles/serviceusage.serviceUsageConsumer"

# Download key for local dev (keep this safe — never commit)
$keyDir = "$env:USERPROFILE\.kupe"
New-Item -ItemType Directory -Force -Path $keyDir | Out-Null
gcloud iam service-accounts keys create "$keyDir\sa-key.json" --iam-account=$sa
```

Share `sa-key.json` with the rest of the team via your secret manager of choice (1Password, AWS Secrets, encrypted Slack DM — NOT git).

## 5. Confirm Gemini 3.1 Pro Preview is reachable

```powershell
gcloud auth application-default print-access-token | Set-Clipboard
# Then test:
curl -X POST `
  "https://us-central1-aiplatform.googleapis.com/v1/projects/$env:GCP_PROJECT_ID/locations/us-central1/publishers/google/models/gemini-3.1-pro-preview:generateContent" `
  -H "Authorization: Bearer $(gcloud auth application-default print-access-token)" `
  -H "Content-Type: application/json" `
  -d '{\"contents\":[{\"role\":\"user\",\"parts\":[{\"text\":\"Reply with only the JSON {\\\"ok\\\":true}\"}]}]}'
```

If you get an unrecognised-model error, set `GEMINI_MODEL=gemini-2.5-pro` in `.env` and rerun. Both work with the same code.

## 6. Create Firebase project

1. Cloud Console → Firebase → **Add Firebase to GCP project** → pick `kupe-hackathon-2026`.
2. Authentication → Sign-in method → **enable Google**.
3. Authorized domains → add `localhost`, `kupe-hackathon-2026.web.app`, `kupe-hackathon-2026.firebaseapp.com`.
4. Project settings → Your apps → **Add Web App** → copy the config object into `frontend/.env.local`.

```powershell
firebase use $env:GCP_PROJECT_ID
firebase init hosting
# Public dir: frontend/dist
# Single-page app: Yes
# Don't set up GitHub Actions
```

## 7. Maps API keys

Cloud Console → APIs & Services → Credentials.

- **Browser key** (`VITE_MAPS_BROWSER_KEY`):
  - Application restriction: HTTP referrers
  - Allowed referrers: `http://localhost:5173/*`, `https://kupe-hackathon-2026.web.app/*`
  - API restrictions: Maps JavaScript API
- **Server key** (`MAPS_SERVER_KEY`):
  - Application restriction: IP addresses (add Cloud Run egress IP later, or leave unrestricted during demo)
  - API restrictions: Places API (New)

## 8. Distribute config

Send to the team via secret channel:

- `sa-key.json` (one file per dev)
- The Firebase web config (paste into `frontend/.env.local`)
- `MAPS_SERVER_KEY` (backend `.env`)
- `MAPS_BROWSER_KEY` (frontend `.env.local`)

## 9. Seed Firestore

```powershell
cd backend
$env:GOOGLE_APPLICATION_CREDENTIALS = "$env:USERPROFILE\.kupe\sa-key.json"
python -m utils.seed_loader
```

## 10. Confirm everything end-to-end

```powershell
# Backend
cd backend
uvicorn main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173, sign in, plan a trip, watch the linkage engine generate.

---

## Cost guardrails

| Source | $100 budget plan |
|---|---|
| Vertex AI (Gemini 3.1 Pro Preview) | Set quota alerts at $25/$50/$75 in Billing. A 5-minute demo uses ~$0.05 of Gemini tokens. |
| Cloud Run | Scale-to-zero outside demo. `--min-instances=1` only during rehearsal/judging (~$5/day). |
| Places API New | Strict field mask, Firestore cache, session tokens. Demo budget: ~$2. |
| Translation / STT / Vision | Free tier covers demo amounts comfortably. |
| Firestore | Free tier (50k reads, 20k writes/day) is enough. |
| Firebase Hosting | Free. |

Total expected demo + rehearsal cost: **under $15**. Plenty of headroom.
