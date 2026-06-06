# IDS-UNIFI-TRAFFICLOG-SEND-SMOKE-01

**Status:** PASS  
**Date:** 2026-06-06  
**Objective:** Send live UniFi operational syslog events from traffic.log to ids-core endpoint with `--send=true`

## Results

| Metric | Value |
|--------|-------|
| Lines read | 3 |
| Parsed | 3 (100%) |
| Sent | 3 |
| Accepted | **3** |
| Rejected | 0 |
| Duplicates | 0 |
| Status code | 200 |

## Steps Executed

1. **Build** linux/amd64 collector binary
2. **Backup** .env and compose.yaml on .40
3. **Inject token** `IDS_UNIFI_INGEST_TOKEN` into .env and compose.yaml
4. **Recreate ids-core** with `docker compose up -d --no-deps ids-core`
5. **Run collector** with `--send=true --endpoint=http://127.0.0.1:8088/api/internal/v1/ingest/events/unifi --tail-file=/var/log/unifi/traffic.log --once`
6. **Validate** `/api/v1/events/recent` — 3 events stored with correct metadata (batch_id, collector_id, source_host, idempotency_key)
7. **Revert** — restored .env and compose.yaml from backups
8. **Recreate ids-core** without token
9. **Confirm** 503 returned on POST without token

## Key Learnings

- `--endpoint` flag requires **full URL** including path (`/api/internal/v1/ingest/events/unifi`), not just base URL
- traffic.log produces ~3 lines in 15s window, all DHCPv6 and earlyoom events
- Dedupe not triggered (first send — no prior idempotency keys)
- Pipeline validated end-to-end: tail → parse → batch → auth → ingest → store
