# Container Health Endpoints — ids-app

## Purpose

Standardized HTTP health endpoints for all `ids-app` services. These endpoints are used by Docker healthchecks, orchestration, and monitoring.

## Endpoints per Service

### ids-core

| Endpoint | Method | Response |
|----------|--------|----------|
| `/healthz` | GET | `{"service":"ids-core","status":"ok"}` |
| `/readyz` | GET | `{"service":"ids-core","ready":true}` |
| `/api/v1/status` | GET | Full status with capabilities |

Port: `8088`

### analytics-api

| Endpoint | Method | Response |
|----------|--------|----------|
| `/healthz` | GET | `{"service":"analytics-api","status":"ok"}` |
| `/api/v1/status` | GET | Full status with capabilities |

Port: `8090`

### mcp-server

| Endpoint | Method | Response |
|----------|--------|----------|
| `/healthz` | GET | `{"service":"ids-mcp","status":"ok","mode":"read_only"}` |
| `/api/v1/status` | GET | Full status with capabilities list |

Port: `8091`

**Note:** The MCP server runs both the stdin MCP protocol handler and an HTTP server for health endpoints.

### ids-web (Next.js)

| Endpoint | Method | Response |
|----------|--------|----------|
| `/api/health` | GET | `{"service":"ids-web","status":"ok","mode":"development"}` |

Port: `3000`

This endpoint is static and does not depend on ids-core or analytics-api.

## Docker Healthcheck Configuration

```yaml
ids-core:
  healthcheck:
    test: ["CMD", "wget", "-qO-", "http://127.0.0.1:8088/healthz"]
    interval: 15s
    timeout: 5s
    retries: 5

ids-analytics:
  healthcheck:
    test: ["CMD", "wget", "-qO-", "http://127.0.0.1:8090/healthz"]
    interval: 15s
    timeout: 5s
    retries: 5

ids-mcp:
  healthcheck:
    test: ["CMD", "wget", "-qO-", "http://127.0.0.1:8091/healthz"]
    interval: 15s
    timeout: 5s
    retries: 5

ids-web:
  healthcheck:
    test: ["CMD", "wget", "-qO-", "http://127.0.0.1:3000/api/health"]
    interval: 15s
    timeout: 5s
    retries: 5
```

## Health vs Readiness vs Status

- **/healthz** — Liveness: the process is alive and responding
- **/readyz** — Readiness: the service can receive traffic (ids-core only)
- **/api/v1/status** — Detailed status with capabilities, version, storage mode

## Verification

```bash
curl http://127.0.0.1:8088/healthz
curl http://127.0.0.1:8090/healthz
curl http://127.0.0.1:8091/healthz
curl http://127.0.0.1:3000/api/health
```

## Out of Scope

- Prometheus `/metrics` endpoints (future phase)
- Readiness probes for all services (only ids-core has /readyz)
- Authentication on health endpoints
