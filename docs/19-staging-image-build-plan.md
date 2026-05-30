# Staging Image Build Plan — ids-app

## Objective

Define the Docker image build strategy for staging deployment of `ids-app`.

## Images

| Image | Base | Build Context | Port | Healthcheck |
|-------|------|---------------|------|-------------|
| `ids-app/ids-core:local` | golang:1.25-alpine → alpine:3.20 | `services/ids-core/` | 8088 | `/healthz` |
| `ids-app/ids-analytics:local` | python:3.10-slim | `services/analytics-api/` | 8090 | `/healthz` |
| `ids-app/ids-mcp:local` | python:3.10-slim | `services/mcp-server/` | 8091 | `/healthz` |
| `ids-app/ids-web:local` | node:22-alpine (multi-stage) | `apps/web/` | 3000 | `/api/health` |

## Build Commands

```bash
docker build -f services/ids-core/Dockerfile -t ids-app/ids-core:local .
docker build -f services/analytics-api/Dockerfile -t ids-app/ids-analytics:local .
docker build -f services/mcp-server/Dockerfile -t ids-app/ids-mcp:local .
docker build -f apps/web/Dockerfile -t ids-app/ids-web:local .
```

Or using Taskfile:

```bash
task docker:build:all
```

## Local Smoke Tests

```bash
# Run containers
docker run --rm -d --name ids-core-smoke -p 18088:8088 ids-app/ids-core:local
docker run --rm -d --name ids-analytics-smoke -p 18090:8090 ids-app/ids-analytics:local
docker run --rm -d --name ids-mcp-smoke -p 18091:8091 ids-app/ids-mcp:local
docker run --rm -d --name ids-web-smoke -p 13000:3000 ids-app/ids-web:local

# Verify health
curl http://127.0.0.1:18088/healthz
curl http://127.0.0.1:18090/healthz
curl http://127.0.0.1:18091/healthz
curl http://127.0.0.1:13000/api/health

# Clean up
docker stop ids-core-smoke ids-analytics-smoke ids-mcp-smoke ids-web-smoke
```

## GHCR Publication Plan

**Tags:**
- `ghcr.io/albertgracia/ids-app/ids-core:staging`
- `ghcr.io/albertgracia/ids-app/ids-analytics:staging`
- `ghcr.io/albertgracia/ids-app/ids-mcp:staging`
- `ghcr.io/albertgracia/ids-app/ids-web:staging`

**Future command (not running yet):**
```bash
docker tag ids-app/ids-core:local ghcr.io/albertgracia/ids-app/ids-core:staging
docker push ghcr.io/albertgracia/ids-app/ids-core:staging
```

**Recommended approach:** GitHub Actions CI builds and pushes on tag or merge to main/staging branch.

## Build Results

| Image | Build | Smoke Test | Size |
|-------|-------|-----------|------|
| ids-core | ✅ PASS | ✅ healthz OK | ~25 MB |
| ids-analytics | ✅ PASS | ✅ healthz OK | ~175 MB |
| ids-mcp | ✅ PASS | ✅ healthz OK | ~175 MB |
| ids-web | ✅ PASS | ✅ /api/health OK | ~450 MB |

## Requirements

- Docker Desktop
- `.dockerignore` at repo root
- Taskfile targets for local builds

## Out of Scope

- GitHub Actions workflow (future)
- GHCR publication (future phase)
- Image vulnerability scanning
- Multi-architecture builds
