# KUPE — AI Linkage Engine for Constraint-Aware Tourism

> Built for **Build With AI 2026 KL — MyHack** at Sunway University.
> 24-hour hackathon submission for the challenge *"Automating Ecosystem Linkages Instead of Manual Coordination."*

KUPE is an **AI-powered relationship graph** that auto-generates verified itineraries for travellers with strict needs (Halal, accessibility, dietary). It treats each connection between a traveller and a local business as a **First-Class Linkage** — a programmable entity that self-verifies and autonomously self-heals when a node fails.

This repo proves the engine against personalised tourism in Kuala Lumpur but the same logic scales to startup ↔ mentor matching, patient ↔ clinic, learner ↔ course, etc.

---

## What we built

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite, Framer Motion, `vite-plugin-pwa`, `@react-google-maps/api` |
| Mobile | Installable PWA (manifest + service worker) |
| Backend | FastAPI + Pydantic v2 on Cloud Run |
| AI | **Gemini 2.5 Pro** via Vertex AI (`google-genai` SDK), structured output, Google Search grounding |
| Auth | Firebase Auth (Google Sign-In) |
| Database | Firestore |
| Hosting | Firebase Hosting (frontend) + Cloud Run (backend) |
| Extra Google services | Cloud Translation API v3, Speech-to-Text Chirp 2, Cloud Vision (logo detection) |

Every layer of the stack is on the Google Cloud Platform so the entire build runs on the **$100 hackathon credit** the event provided.

---

## Quick start (local dev)

### Prerequisites
- Python 3.11+, Node.js 20+, gcloud CLI logged in
- GCP project with billing + the $100 credit applied
- Service account JSON (roles: `aiplatform.user`, `datastore.user`, `cloudtranslate.user`, `speech.client`, `vision.user`) saved locally
- Firebase project linked to the same GCP project, Google Sign-In enabled

### 1. Backend
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy ..\.env.example .env   # fill in values, see infra/setup_apis.md
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\Users\<you>\.kupe\sa-key.json"
uvicorn main:app --reload --port 8000
```

Open http://localhost:8000/docs for the OpenAPI UI.

### 2. Frontend
```powershell
cd frontend
npm install
copy ..\.env.example .env.local   # fill VITE_FIREBASE_* and VITE_MAPS_BROWSER_KEY
npm run dev
```

Open http://localhost:5173.

### 3. Seed data
```powershell
cd backend
python -m utils.seed_loader
```
Loads 40 curated KL businesses (JAKIM-certified, wheelchair-accessible) into Firestore.

---

## Deploy

### Backend → Cloud Run
```powershell
cd backend
gcloud builds submit --tag gcr.io/$env:GCP_PROJECT_ID/kupe-backend
gcloud run deploy kupe-backend `
  --image gcr.io/$env:GCP_PROJECT_ID/kupe-backend `
  --region us-central1 `
  --service-account kupe-backend-sa@$env:GCP_PROJECT_ID.iam.gserviceaccount.com `
  --set-env-vars "GCP_PROJECT_ID=$env:GCP_PROJECT_ID,VERTEX_LOCATION=us-central1,GEMINI_MODEL=gemini-3.1-pro-preview,FIREBASE_PROJECT_ID=$env:GCP_PROJECT_ID,ALLOWED_ORIGINS=https://$env:GCP_PROJECT_ID.web.app" `
  --min-instances 1 `
  --allow-unauthenticated
```

### Frontend → Firebase Hosting
```powershell
cd frontend
npm run build
firebase deploy --only hosting
```

Full step-by-step setup, including which APIs to enable and how to wire the service account, is in [infra/setup_apis.md](infra/setup_apis.md).

---

## Architecture

```
Browser (PWA)
   │  Firebase Auth → ID token
   ▼
Firebase Hosting (static)
   │  Axios → Bearer <id_token>
   ▼
Cloud Run (FastAPI)
   ├─→ firebase-admin (verify token)
   ├─→ Vertex AI (Gemini 3.1 Pro Preview)
   ├─→ Cloud Translation
   ├─→ Speech-to-Text (Chirp 2)
   ├─→ Cloud Vision
   ├─→ Places API New
   └─→ Firestore
```

The **Linkage Engine** is the brain. Given a traveller profile + city + dates, it:
1. Queries Firestore for candidates that pass hard constraints (Halal/wheelchair are deterministic boolean checks, not AI guesses).
2. Sends candidates + profile to Gemini with a Pydantic response schema.
3. Persists each match as a `Linkage` entity carrying its constraint audit, reasoning, confidence and strength.
4. Assembles the day-by-day itinerary.

The **Self-Heal** flow takes any broken linkage (business closed, demo button clicked) and re-runs the engine with the broken business excluded, producing a new linkage with `healed_from` set to the dead one. The animation in `SelfHealDemo.jsx` makes the wow moment visible.

---

## Rubric mapping

| Criterion | Pts | Where it lives |
|---|---|---|
| Google Tech Integration | 15 | Vertex AI (Gemini), Firebase Auth, Firestore, Cloud Run, Firebase Hosting, Maps Places API, Translation, Speech-to-Text, Vision — 9 Google services, all on the $100 credit |
| AI Implementation Quality | 10 | Structured output schemas, deterministic constraint solver (no AI guess on Halal), grounding with dynamic threshold, ethical AI audit log, confidence scores |
| Working Demo & UI/UX | 10 | Premium dark glassmorphism, skeleton loaders, Framer Motion micro-interactions, map-integrated timeline, PWA install on mobile |
| AI Model Performance | 5 | Self-heal completes in <5s, confidence scores explained per linkage, transparent constraint audit on every card |

---

## Project layout

See [development_plan.md](development_plan.md) for the original blueprint and the approved 24h plan at `~/.claude/plans/please-try-to-check-reflective-conway.md`.

```
KUPE/
├── backend/       # FastAPI + services + routers
├── frontend/      # Vite + React + PWA
├── data/seed/     # 40 KL businesses
├── infra/         # Deploy scripts + setup guide
├── ideation.md    # Problem statement
└── development_plan.md
```

---

## License

MIT — built for the hackathon, open for anyone to fork and adapt the linkage engine to their own ecosystem.
