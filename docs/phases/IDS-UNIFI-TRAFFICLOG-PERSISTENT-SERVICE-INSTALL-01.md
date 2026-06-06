# IDS-UNIFI-TRAFFICLOG-PERSISTENT-SERVICE-INSTALL-01

**Status:** PARTIAL  
**Date:** 2026-06-06  
**Objective:** Install persistent collector service for traffic.log on .40

## Results

| Area | Result |
|------|--------|
| User/group created | ✅ `ids-unifi-collector` (uid=994) added to `adm` group |
| Directories | ✅ `/opt/ids-app/bin`, `/var/lib/ids-app/unifi-collector`, `/etc/ids-app` |
| Binary installed | ✅ `/opt/ids-app/bin/unifi-parallel-collector` (SHA256 match) |
| Env file | ✅ `/etc/ids-app/unifi-collector.env` (600, root:ids-unifi-collector) |
| systemd service | ✅ `ids-unifi-collector.service` |
| systemd timer | ✅ `ids-unifi-collector.timer` |
| daemon-reload | ✅ |
| Manual service start | ✅ exit=0, state file created, 0 lines read (at end) |
| Second run | ⚠️ 9 lines parsed, but **503 on send** |
| Token in ids-core | ❌ **Not configured** — endpoint returns 503 |
| Timer enabled | ❌ (intentionally disabled, start-only) |
| Timer started then stopped | ✅ (stopped to avoid 503 log spam) |

### Send Failure Reason

The collector read 9 lines from traffic.log, parsed them (100%), built a batch, but the HTTP POST returned **503**:
```
error: no se pudo enviar batch ingest: ingest request failed with status 503
```

This is **expected** — `IDS_UNIFI_INGEST_TOKEN` is configured in the collector's env file (`/etc/ids-app/unifi-collector.env`) but **not** in ids-core's environment. The endpoint correctly rejects unauthenticated requests.

**The collector infrastructure is fully installed and operational.** The pipeline cannot complete until the same token is injected into ids-core's compose environment, followed by ids-core recreation. This was proven working in SEND-SMOKE-01.

## Service ExecStart

```
/opt/ids-app/bin/unifi-parallel-collector \
  --tail-file=/var/log/unifi/traffic.log \
  --state-file=/var/lib/ids-app/unifi-collector/state.json \
  --endpoint=http://127.0.0.1:8088/api/internal/v1/ingest/events/unifi \
  --send=true \
  --batch-size=25 \
  --once \
  --ingest-batch
```

## Token Injection Required

For the collector to successfully send events to ids-core:

1. Add `IDS_UNIFI_INGEST_TOKEN=<same_token>` to `/home/albert/docker/ids-app/.env`
2. Add `IDS_UNIFI_INGEST_TOKEN: ${IDS_UNIFI_INGEST_TOKEN}` to `compose.yaml` under `ids-core.environment`
3. Run `docker compose up -d --no-deps ids-core` to recreate only ids-core

This is deferred to a follow-up phase.

## Confirmed Not Modified

- No UniFi touched
- No rsyslog modified
- No SIEM/NetFlow/IDS/IPS changed
- No compose .env or compose.yaml modified
- No containers recreated
- No firewall
- No Promtail/Loki/Grafana
- No token printed or committed
- No logs/state-files committed
