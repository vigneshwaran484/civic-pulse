# Civic Pulse — AI-Powered Decision Intelligence Platform

> Gen AI Academy APAC Hackathon · Problem Statement 1

## Problem

City admins receive thousands of unstructured citizen complaints (potholes, water supply failures, safety incidents, etc.) across multiple zones. Without AI assistance, urgent spikes go unnoticed until they become crises.

## Solution

Civic Pulse ingests raw citizen feedback, uses **Gemini AI** to classify and score every complaint, detects anomaly spikes automatically, and lets admins ask plain-English questions to get instant prioritized answers.

## Architecture

```
Citizen Feedback (CSV / API)
        │
        ▼
┌─────────────────────┐
│   FastAPI Backend   │  ← SQLAlchemy + Postgres (Supabase / SQLite)
│  /ingest  /process  │
│  /feedback /ask     │
│  /anomalies /stats  │
└────────┬────────────┘
         │  Gemini 1.5 Flash API
         │  ┌─────────────────────────────────────────┐
         │  │ 1. Classification (category + sentiment) │
         │  │ 2. Urgency scoring (1-10)                │
         │  │ 3. NL query → structured intent          │
         │  │ 4. Structured results → NL answer        │
         │  └─────────────────────────────────────────┘
         ▼
┌─────────────────────┐
│   React Frontend    │  ← Vite + Tailwind + Recharts
│  Dashboard          │
│  Anomalies Panel    │
│  Feedback Explorer  │
│  Ask Civic Pulse    │
└─────────────────────┘
```

## How AI Is Used

| Feature | AI Role |
|---------|---------|
| **Classification** | Gemini classifies each complaint into 7 categories + sentiment |
| **Urgency Scoring** | Gemini assigns 1-10 urgency; combined with recency + zone density → priority score |
| **Anomaly Detection** | Statistical: current 7-day vs prior 7-day per zone+category; flags >2x spikes |
| **NL Query** | Two-step: parse question → structured query intent; execute query → generate answer |

## Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt
cp ../.env.example .env
# Edit .env — add GEMINI_API_KEY and DATABASE_URL
uvicorn main:app --reload
```
 
### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env — set VITE_API_URL if backend is not on localhost:8000
npm run dev
```

### Seed Data

1. Open the app → **Setup** tab
2. Click **Check Health** (verify backend is running)
3. Click **Load Data** (generates ~500 synthetic records with 3 anomaly spikes)
4. Click **Run AI Processing** (Gemini classifies each record; takes ~1-2 min)
5. Navigate to **Dashboard** — data is ready

## Synthetic Anomaly Spikes (for demo)

| Spike | Zone | Category | Window | Magnitude |
|-------|------|----------|--------|-----------|
| Water crisis | Zone B | water_supply | Days 8-10 ago | ~5× baseline |
| Safety surge | Zone D | safety | Days 4-6 ago | ~4× baseline |
| Post-rain potholes | Zone A | pothole | Last 3 days | ~3× baseline |

## 90-Second Demo Script

1. **Dashboard** — show summary cards: X complaints, Y avg urgency, Z anomalies detected
2. **Anomalies** — point at Zone B water supply spike (5× ratio), Zone D safety surge
3. **Ask AI** — type: *"What are the top 5 urgent issues in Zone B this week?"*
4. Show the AI answer + supporting data table
5. **Feedback Explorer** — filter Zone B + water_supply, show high-urgency items

## Deployment

- Backend: Render (set env vars `GEMINI_API_KEY`, `DATABASE_URL`)
- Frontend: Netlify (set `VITE_API_URL` to backend URL)
