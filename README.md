# ATS Pro — Staffing Applicant Tracking System

Modern staffing ATS built to compete on the features recruiters actually use day-to-day: **internal talent ranking**, **pipeline + submittals**, **placements with margin**, and **AI-assisted resume parse** — designed to run on **Azure free tier**.

## What’s included

| Area | Capabilities |
|------|----------------|
| **Jobs** | Reqs with bill/pay rates, skills, client link, status |
| **Pipeline** | Kanban stages, drag-and-drop, interviews (.ics), placements |
| **Talent Match** | Explainable ranking of your whole database against a job |
| **Candidates** | Resume parse (PDF/DOCX), quick-parse, bulk assign/email log, activities |
| **Clients** | Accounts, contacts JSON, submittals |
| **Analytics** | Live funnel, weekly trend, recruiter KPIs, source mix, margin |
| **Auth** | JWT + roles (Admin / Recruiter) |
| **Search** | Global search (⌘/Ctrl+K) across candidates, jobs, clients |

## Stack

- **Frontend:** React 19 + Vite + Tailwind 4  
- **API:** ASP.NET Core 9 + EF Core + SQLite + Identity/JWT  
- **AI (optional):** Google Gemini for parse / copilot — **matching works without it**

## Quick start (local)

```bash
# Terminal 1 — API
cd AtsApi
dotnet run

# Terminal 2 — SPA (proxies /api → API)
npm install
npm run dev
```

Default logins:

- `admin@atspro.com` / `password123`
- `recruiter@atspro.com` / `password123`

Add a Gemini key under **Settings → Integrations** for resume parsing and email drafts.

## Azure free tier

See **[AZURE.md](./AZURE.md)** for App Service F1 deploy, env vars, and limits.

Single-host package:

```bash
npm run build:azure
cd AtsApi
dotnet publish -c Release -o ../publish_azure
```

## Competitive notes (vs Ceipal-class ATS)

Implemented now (high leverage on free tier):

- **Candidate matching & ranking** with **explainable** skill/role/experience breakdown  
- **Duplicate merge** on resume parse (email match)  
- **Submittals → interview → placement** with **gross margin**  
- **Live recruiter KPI / funnel / source analytics** (no mock data)  
- **Global search** and bulk pipeline actions  

Roadmap toward full parity (typically paid integrations):

- Job board multi-post / VMS portals  
- Two-way email/SMS + campaigns  
- Branded career portal + public apply  
- Weighted scorecards / custom workflows  
- eOnboarding / eSign  
- Multi-tenant SaaS + Azure SQL  

## API highlights

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/ats/jobs/{id}/talent-matches` | Rank internal talent for a job |
| GET | `/api/ats/search?q=` | Global search |
| GET | `/api/ats/match-preview` | Score one candidate vs job |
| GET | `/api/ats/analytics` | Funnel, trend, KPIs, sources |
| POST | `/api/ats/candidates/mass-assign` | Bulk assign (alias of bulk-assign) |
| GET | `/api/health` | Liveness for Azure |

## Project layout

```
src/                 React SPA
AtsApi/              .NET API, SQLite, resume storage
scripts/             Azure SPA → wwwroot copy
AZURE.md             Free-tier hosting guide
```
