# Console Dashboard MVP — ids-web

## Purpose

The Dashboard MVP provides the first web-based console for `ids-app`, connecting to `ids-core` to display system status, recent events, and simulation controls.

## Architecture

```
Browser (Next.js 16) ──HTTP──► ids-core (Go)
  http://127.0.0.1:8088
```

The console is a client-side React application that calls the ids-core REST API directly. No backend proxy is needed for local development.

## Endpoints Used

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/healthz` | Core health |
| GET | `/api/v1/status` | Core status + capabilities |
| GET | `/api/v1/events/recent?limit=N` | Recent events |
| POST | `/api/v1/simulate/events` | Generate simulated events |

## Environment Variable

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_IDS_CORE_URL` | `http://127.0.0.1:8088` | ids-core base URL |

## Dashboard Sections

### Core Status Card

Displays: service name, status badge, mode, version, storage mode, and capabilities list. Shows an error state when ids-core is unreachable.

### Event Summary

Calculated from recent events: total count, severity breakdown (critical/high/medium/low/info), OT vs IT events.

### Simulation Panel

Scenario selector (7 scenarios), count input (1-100), generate button with success/error feedback.

### Recent Events Table

Columns: time, severity (color-coded badge), type, protocol, source IP:port, destination IP:port, zone, title. Refresh button to reload from API.

### Future Roadmap

Footer indicating planned features: asset inventory, analytics scoring, Suricata EVE JSON ingest.

## Quick Start

```powershell
# Terminal 1: Start ids-core
cd services/ids-core
go run ./cmd/ids-core

# Terminal 2: Start Next.js
cd apps/web
npm run dev
```

Open http://localhost:3000

## CORS

ids-core includes a CORS middleware that allows requests from `http://127.0.0.1:3000` and `http://localhost:3000` for local development.

## Limitations

- No authentication
- No WebSocket real-time updates
- No asset inventory view
- No analytics scoring
- No Suricata/Zeek integration
- ESLint 10 has a known incompatibility with eslint-config-next
