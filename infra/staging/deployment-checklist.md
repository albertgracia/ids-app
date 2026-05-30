# ids-app Staging Deployment Checklist

## Pre-Deployment

- [ ] VM snapshot taken (192.168.1.40)
- [ ] Prometheus/Grafana/Loki data backed up
- [ ] Ports 3002, 8088, 8090, 8091 confirmed free
- [ ] `.env` created with real secrets (not committed)
- [ ] `docker compose config` validates
- [ ] Images published or build context ready

## Deployment

- [ ] `docker compose --env-file .env -f compose.yaml pull` (if using GHCR)
- [ ] `docker compose --env-file .env -f compose.yaml up -d`
- [ ] `docker ps | grep ids-` confirms 6 containers running

## Post-Deployment Verification

- [ ] `curl http://127.0.0.1:8088/healthz` returns 200
- [ ] `curl http://127.0.0.1:8088/api/v1/status` returns capabilities
- [ ] `curl http://127.0.0.1:8090/healthz` returns 200
- [ ] `curl http://127.0.0.1:8090/api/v1/status` returns capabilities
- [ ] `curl http://127.0.0.1:3002` returns HTML (Next.js)
- [ ] Simulate event via dashboard
- [ ] Score event via analytics-api
- [ ] Events appear in recent endpoint
- [ ] Dashboard accessible from browser

## Rollback

- [ ] `docker compose --env-file .env -f compose.yaml down`
- [ ] Restore VM snapshot if needed
