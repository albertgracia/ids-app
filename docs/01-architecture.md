# Architecture

## Overview

```
┌──────────────────────────────────────────────────────────┐
│                    Console (Next.js 16)                   │
│                    Port 3000                              │
└──────────┬──────────────────────────────────┬─────────────┘
           │ HTTP/WS                           │ HTTP/WS
           ▼                                   ▼
┌────────────────────┐          ┌──────────────────────────┐
│   ids-core (Go)    │          │  analytics-api (Python)  │
│   Port 8088         │          │  Port 8090               │
│                     │          │                          │
│  ┌───────────────┐  │          │  ┌────────────────────┐  │
│  │ Engine        │  │          │  │ Scoring            │  │
│  │ Asset Mgmt    │  │          │  │ Reporting          │  │
│  │ Event Ingest  │  │          │  │ Anomaly Detection  │  │
│  │ Real-time WS  │  │          │  └────────────────────┘  │
│  └───────────────┘  │          └──────────────────────────┘
└──────────┬──────────┘                       │
           │                                  │
           ▼                                  ▼
┌────────────────────┐          ┌──────────────────────────┐
│   PostgreSQL        │          │       Redis              │
│   Port 5433         │          │   Port 6380              │
│   Events / Assets   │          │   Cache / Lightweight    │
└────────────────────┘          └──────────────────────────┘
           │
           ▼
┌────────────────────┐
│   mcp-server       │
│   (Python, RO)     │
│   Port 8091        │
└────────────────────┘
           │
           ▼
     AI Agents (OpenCode)
```

## Components

### Console (`apps/web`)
- Next.js 16 with App Router.
- TypeScript.
- Communicates with ids-core via REST + WebSocket.
- Communicates with analytics-api via REST.

### ids-core (`services/ids-core`)
- Go service using standard library `net/http`.
- Single HTTP router (no multi-framework).
- Handles: event ingestion, asset management, real-time broadcast.
- Exposes health, readiness, and status endpoints.
- Planned: WebSocket for real-time console updates.

### analytics-api (`services/analytics-api`)
- Python/FastAPI service.
- Handles: event scoring, anomaly detection, report generation.
- Pydantic for data validation.
- No ML models yet.

### mcp-server (`services/mcp-server`)
- Python MCP server (Model Context Protocol).
- Read-only by design.
- Provides tool interface for AI agents.
- No destructive operations.

### PostgreSQL
- Primary data store for events, assets, and configuration.
- Development credentials only.
- Future: migrations with versioning.

### Redis
- Cache for lightweight event data.
- Pub/sub for real-time event distribution.
- Session store (future).

## Deployment

- Development: Docker Compose local.
- Staging: Server 192.168.1.40 (future phase).
- Sensors: Separate from central platform (future research).
