# STAGING DEPLOY — IDS App

## Deploy Summary

| Aspect | Status |
|--------|--------|
| Server | 192.168.1.40 |
| Date | 2026-05-30 |
| Method | Docker Compose via GHCR images |
| Images | ids-core, ids-analytics, ids-mcp, ids-web (`:staging`) |
| Stack | 6 containers (postgres, redis, core, analytics, mcp, web) |
| Network | `ids-net` (bridge) |
| Storage | Memory mode (PostgreSQL available but not configured) |

## Containers

| Container | Status | Port |
|-----------|--------|------|
| ids-postgres | ✅ running | internal |
| ids-redis | ✅ running | internal |
| ids-core | ✅ healthy | 8088 |
| ids-analytics | ✅ healthy | 8090 |
| ids-mcp | ✅ healthy | 8091 |
| ids-web | ✅ running | 3002 |

## Health Endpoints Verified

| Endpoint | Result |
|----------|--------|
| http://192.168.1.40:8088/healthz | ✅ |
| http://192.168.1.40:8090/healthz | ✅ |
| http://192.168.1.40:8091/healthz | ✅ |
| http://192.168.1.40:3002/api/health | ✅ |

## Functionality Verified

- Simulated event generation: ✅
- Recent events query: ✅
- Dashboard accessible via LAN: ✅

## Security

- `.env` created with generated passwords (600 permissions)
- No secrets committed
- No PAT used
- Stack isolated on `ids-net`
- Observability stack untouched

## Rollback

```bash
cd /home/albert/docker/ids-app
docker compose --env-file .env -f compose.yaml down
# Restore backup if needed:
cp backups/pre-IDS-STAGING-DEPLOY-01-*/compose.yaml.bak compose.yaml
```
