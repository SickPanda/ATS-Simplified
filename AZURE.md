# Hosting Candeo on Azure Free Tier

This app is packaged so **frontend + API run as one process** — the cheapest path on Azure free offerings.

## Recommended architecture (always free-capable)

| Piece | Free option | Notes |
|--------|-------------|--------|
| **Web + API** | App Service **F1 Free** | 1 GB RAM, 60 CPU-min/day, shared. Enough for demos & small teams. |
| **Database** | **SQLite** on app disk (`DATA_DIR`) | Zero cost. Not multi-instance; fine for free tier. |
| **AI parse / draft** | **Gemini free API key** | Stored in Settings or `GeminiApiKey` app setting. Matching works **without** AI via local engine. |
| **Optional SPA split** | Static Web Apps Free + API elsewhere | Only if you want edge CDN; needs CORS. |

### Why not “full Ceipal” on free?

Ceipal-scale job boards, VMS, SMS, and multi-tenant enterprise DB need paid services. On free tier we prioritize:

1. **Internal talent ranking** (explainable match — works offline)
2. **Staffing pipeline** (submittals, interviews, placements/margin)
3. **Resume parse** (Gemini optional)
4. **Single-box deploy** (SQLite + SPA from `wwwroot`)

---

## Deploy steps (App Service F1)

### 1. Build SPA into API `wwwroot`

```bash
npm install
npm run build:azure
```

### 2. Publish the API

```bash
cd AtsApi
dotnet publish -c Release -o ../publish_azure
```

### 3. Create free resources (Azure CLI)

```bash
az group create -n rg-atspro -l eastus
az appservice plan create -n plan-atspro -g rg-atspro --sku FREE
az webapp create -n atspro-YOURNAME -g rg-atspro -p plan-atspro --runtime "DOTNETCORE:9.0"
```

### 4. App settings (critical)

```bash
az webapp config appsettings set -n atspro-YOURNAME -g rg-atspro --settings \
  JWT_KEY="generate-a-long-random-secret-at-least-32-chars" \
  DEMO_PASSWORD="change-me" \
  DATA_DIR="/home/data" \
  ASPNETCORE_ENVIRONMENT="Production" \
  Cors__Origins="https://atspro-YOURNAME.azurewebsites.net"
```

Optional Gemini:

```bash
az webapp config appsettings set -n atspro-YOURNAME -g rg-atspro --settings \
  GeminiApiKey="YOUR_GEMINI_KEY"
```

### 5. Zip deploy

```bash
cd publish_azure
# Windows PowerShell:
Compress-Archive -Path * -DestinationPath ..\ats.zip -Force
az webapp deployment source config-zip -g rg-atspro -n atspro-YOURNAME --src ..\ats.zip
```

### 6. Smoke test

- `https://atspro-YOURNAME.azurewebsites.net/api/health`
- Login: `admin@candeo.com` / your `DEMO_PASSWORD`

---

## Free-tier limits & how we stay under them

| Constraint | Mitigation in this app |
|------------|-------------------------|
| 60 CPU min/day (F1) | Local match engine (no LLM for ranking); lean analytics |
| 1 GB disk | SQLite + resumes folder; prune old resumes periodically |
| Cold start / idle unload | Acceptable for internal staffing tools |
| No Always On | Health endpoint for monitoring only |
| No SLA | Fine for MVP / agency pilot |

---

## Split hosting (optional)

- **Static Web Apps Free**: frontend only (`dist/`)
- **App Service Free / Container**: API only
- Set `VITE_API_BASE` at build time to the API URL
- Set `CORS_ORIGINS` / `Cors__Origins` on the API to the SWA URL

---

## Security checklist before any real use

1. Change `JWT_KEY` and `DEMO_PASSWORD`
2. Disable or reseed demo accounts
3. Never commit Gemini keys — use App Settings only
4. Prefer HTTPS only (Azure provides free TLS on `*.azurewebsites.net`)
5. For production: move SQLite → Azure SQL free/serverless and enable Always On (paid)
