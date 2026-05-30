# Console Analytics Integration — ids-web

## Purpose

Integrates the `analytics-api` scoring engine into the Next.js dashboard, allowing users to view risk scores, explanatory factors, and recommendations for individual IDS events.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_IDS_CORE_URL` | `http://127.0.0.1:8088` | ids-core API URL |
| `NEXT_PUBLIC_ANALYTICS_API_URL` | `http://127.0.0.1:8090` | analytics-api URL |

## Endpoints Used

### ids-core
- `GET /api/v1/status` — core status
- `GET /api/v1/events/recent?limit=N` — recent events
- `POST /api/v1/simulate/events` — generate simulated events

### analytics-api
- `GET /api/v1/status` — analytics service status
- `POST /api/v1/score/event` — score a single event

## Dashboard Sections

### Analytics Status Card
Shows analytics-api online/offline, version, mode, and capabilities.

### Event Selection
Click any row in the Recent Events table to select it. Selected events are highlighted.

### Event Details Panel
Displays full event metadata: ID, timestamp, severity, type, protocol, source, destination, zone, direction, title, tags.

### Event Scoring Panel
- "Score selected event" button
- Numeric score (0-100) with risk level color coding
- Explanatory factors table (name, impact, reason)
- Investigation recommendations list
- Controlled error handling when analytics-api is offline

## CORS

analytics-api has CORS middleware configured for `http://127.0.0.1:3000` and `http://localhost:3000`.

## Quick Start

```powershell
# Terminal 1: Start ids-core
cd services/ids-core
go run ./cmd/ids-core

# Terminal 2: Start analytics-api
cd services/analytics-api
$env:PYTHONPATH="src"
uv run uvicorn ids_analytics.main:app --port 8090

# Terminal 3: Start Next.js
cd apps/web
npm run dev
```

Open http://localhost:3000

## Limitations

- No batch scoring in UI (single event only)
- No real-time auto-scoring
- No Suricata integration yet
- No write/destructive actions
