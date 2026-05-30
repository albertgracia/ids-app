# Staging Deploy Dry-Run — ids-app

## Objective

Validate readiness for staging deployment of `ids-app` on `192.168.1.40`. This dry-run documents the current state, gaps, and step-by-step plan — without deploying anything.

## Local Inspection Results

| Component | Check | Result |
|-----------|-------|--------|
| ids-core | `go build ./cmd/ids-core` | ✅ |
| ids-core | `go test ./...` | ✅ 86 tests |
| analytics-api | `ruff check` | ✅ |
| analytics-api | `pytest` | ✅ 16 tests |
| mcp-server | `ruff check` | ✅ |
| mcp-server | `pytest` | ✅ 10 tests |
| web | `tsc --noEmit` | ✅ |
| web | `next build` | ✅ |
| web | `npm run lint` | ⚠️ known ESLint 10 compat issue |
| Suricata contract | `validate:suricata-contract` | ✅ 9 samples |

## Remote Inspection Results

| Aspect | Result |
|--------|--------|
| Server OS | Ubuntu 26.04 LTS (Hyper-V VM) |
| User | albert (sudo, docker) |
| Docker available | ✅ 29.1.3 |
| Disk root | 61 GB, 39 GB free (33% used) |
| RAM | 7.2 GB, 5.1 GB available |
| Ports 3002, 8088, 8090, 8091, 5432, 5433, 6379, 6380 | ✅ All free |
| Staging dir `/home/albert/docker/ids-app/` | ✅ Exists with 5 files |
| `compose.yaml` validates with `.env.example` | ✅ VALID |

## Remote Compose Review

| Service | Image | Exposed | Healthcheck | Status |
|---------|-------|---------|-------------|--------|
| ids-postgres | postgres:16-alpine | ❌ (internal) | ✅ pg_isready | ✅ |
| ids-redis | redis:7-alpine | ❌ (internal) | ✅ redis-cli ping | ✅ |
| ids-core | ghcr.io/.../ids-core:staging | 127.0.0.1:8088 | ✅ /healthz | ⚠️ image doesn't exist yet |
| ids-analytics | ghcr.io/.../ids-analytics:staging | 127.0.0.1:8090 | ✅ /healthz | ⚠️ image doesn't exist yet |
| ids-mcp | ghcr.io/.../ids-mcp:staging | 127.0.0.1:8091 | ✅ /healthz | ⚠️ image doesn't exist yet |
| ids-web | ghcr.io/.../ids-web:staging | 3002 | ✅ /api/health | ⚠️ image doesn't exist yet |

**Note:** Containers are not running. Compose is scaffold-only.

## Image Plan

4 images need to be built and published to `ghcr.io/albertgracia/ids-app/`:

| Image | Source | Build context |
|-------|--------|---------------|
| `ids-core:staging` | Go service | `services/ids-core/` |
| `ids-analytics:staging` | Python/FastAPI | `services/analytics-api/` |
| `ids-mcp:staging` | Python/MCP | `services/mcp-server/` |
| `ids-web:staging` | Next.js | `apps/web/` |

**Recommended:** Use GitHub Actions to build and push on tag/merge to staging branch.

**Alternative:** Build locally on the server from the cloned repo (simpler for initial staging).

## Variable Plan

Required for `.env`:

| Variable | Source | Secret |
|----------|--------|--------|
| `IDS_ENV` | fixed: staging | no |
| `IDS_WEB_PORT` | fixed: 3002 | no |
| `IDS_CORE_PORT` | fixed: 8088 | no |
| `IDS_ANALYTICS_PORT` | fixed: 8090 | no |
| `IDS_MCP_PORT` | fixed: 8091 | no |
| `POSTGRES_DB` | fixed: ids_staging | no |
| `POSTGRES_USER` | fixed: ids_user | no |
| `POSTGRES_PASSWORD` | generated | ✅ yes |
| `REDIS_PASSWORD` | generated | ✅ yes |
| `IDS_CORE_DATABASE_URL` | derived from above | ✅ yes |
| `IDS_REDIS_URL` | derived from above | ✅ yes |
| `NEXT_PUBLIC_IDS_CORE_URL` | fixed: http://192.168.1.40:8088 | no |
| `NEXT_PUBLIC_ANALYTICS_API_URL` | fixed: http://192.168.1.40:8090 | no |

## Healthcheck Plan

| Service | Endpoint | Status |
|---------|----------|--------|
| ids-core | GET /healthz | ✅ implemented |
| ids-core | GET /readyz | ✅ implemented |
| ids-core | GET /api/v1/status | ✅ implemented |
| ids-analytics | GET /healthz | ✅ implemented |
| ids-analytics | GET /api/v1/status | ✅ implemented |
| ids-mcp | stdin/stdout tool call | ⚠️ no HTTP endpoint (design decision) |
| ids-web | (page load) | ⚠️ no dedicated health endpoint |
| postgres | pg_isready | ✅ via compose healthcheck |
| redis | redis-cli ping | ✅ via compose healthcheck |

## Deployment Steps (Future Phase)

1. **Pre-deployment:** snapshot VM, backup Prometheus/Grafana/Loki data
2. **Build images:** build and push to ghcr.io, or build locally on server
3. **Create .env:** copy `.env.example`, fill secrets
4. **Validate:** `docker compose --env-file .env -f compose.yaml config`
5. **Deploy:** `docker compose --env-file .env -f compose.yaml up -d`
6. **Verify:** check health endpoints, test event simulation, test scoring
7. **Monitor:** logs via Dozzle, metrics via Prometheus (future)

## Gaps Before Real Deploy

| Gap | Impact | Resolution |
|-----|--------|------------|
| No images published | 🔴 blocking | GHCR build workflow or local build |
| No `.env` with secrets | 🔴 blocking | Manual creation before deploy |
| No web health endpoint | 🟡 minor | Add `/api/health` to Next.js |
| No MCP HTTP health | 🟡 minor | Not essential for initial deploy |
| No backup confirmed | 🟡 important | Snapshot VM before deploy |
| No Loki retention check | 🟢 nice | Verify before production use |

## Go / No-Go Decision

**Go for staging deploy:** when images are published and `.env` is ready.

**Not ready yet:** images are placeholders (`ghcr.io/...:staging` do not exist).

## Next Phase

`IDS-STAGING-IMAGE-BUILD-PLAN-01` or `IDS-STAGING-DEPLOY-01`
