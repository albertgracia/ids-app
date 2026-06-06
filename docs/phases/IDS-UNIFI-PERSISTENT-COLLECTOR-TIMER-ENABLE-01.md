# IDS-UNIFI-PERSISTENT-COLLECTOR-TIMER-ENABLE-01

**Resultado:** PASS
**Fecha:** 2026-06-06 ~13:20 CEST

## Repo

| Campo | Valor |
|---|---|
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `16f96ed` |
| HEAD final | `16f96ed` (previo a commit) |
| Git status final | Limpio (solo phase report nuevo) |
| Push | `origin/scaffold/ids-v2-dev-env-01` |

## Baseline .40

| Componente | Estado |
|---|---|
| Host | `ubuntu-server` |
| ids-core health (inicial) | `/healthz` → `{"service":"ids-core","status":"ok"}` ✅ |
| /readyz (inicial) | `{"service":"ids-core","ready":true}` ✅ |
| capability unifi_internal_ingest_dry_run | Presente ✅ |
| rsyslog (inicial) | active ✅ |
| Puerto 8088 | LISTEN ✅ |
| Stack staging (6/6) | Todos healthy ✅ |
| service existe | `ids-unifi-collector.service` ✅ |
| timer existe | `ids-unifi-collector.timer` ✅ |
| timer active (inicial) | inactive |
| timer enabled (inicial) | disabled |
| state file existe | `/var/lib/ids-app/unifi-collector/state.json` (295 bytes) ✅ |
| env file existe | `/etc/ids-app/unifi-collector.env` ✅ (permisos 600, no legible) |
| traffic.log metadata | 4,879,488 bytes / 17,274 líneas (modificado 13:13) |
| runaway inicial | Ninguno ✅ |

## Systemd

| Parámetro | Valor |
|---|---|
| Service | Type=oneshot, User=ids-unifi-collector, Group=ids-unifi-collector, adm suplementario |
| EnvironmentFile | `/etc/ids-app/unifi-collector.env` ✅ |
| tail-file | `/var/log/unifi/traffic.log` ✅ |
| state-file | `/var/lib/ids-app/unifi-collector/state.json` ✅ |
| endpoint | `http://127.0.0.1:8088/api/internal/v1/ingest/events/unifi` ✅ |
| batch-size | 25 ✅ |
| --send | true ✅ |
| --once | true ✅ |
| Timer interval | `OnUnitActiveSec=60s`, `OnBootSec=2min`, `AccuracySec=10s` ✅ |
| Token impreso | No |

## Enable/start

| Acción | Detalle |
|---|---|
| Comando | `sudo systemctl enable --now ids-unifi-collector.timer` (ejecutado por usuario) |
| timer enabled (final) | **enabled** ✅ |
| timer active (final) | **active** ✅ |
| list-timers | Próximo trigger: 13:17:54 (activo con cola) ✅ |
| service status | inactive entre ejecuciones (oneshot) ✅ |

## Observación (tres intervalos)

### Intervalo 1 — 13:16:54

| Métrica | Valor |
|---|---|
| lines_read | 2,433 |
| parsed | 1,610 |
| errors | 0 |
| duplicates (parseo) | 823 |
| batches | 65 (IDs 1-65) |
| accepted | 1,610 |
| rejected | 0 |
| duplicates (ingest) | 0 |
| auth errors | 0 |
| endpoint errors | 0 |
| batches 200 OK | 65/65 ✅ |
| offset before | 4,179,774 |
| offset after | 5,084,662 |
| replay evitado | Sí (offset incremental) ✅ |

### Intervalo 2 — 13:17:54

| Métrica | Valor |
|---|---|
| lines_read | 149 |
| parsed | 109 |
| errors | 0 |
| duplicates (parseo) | 40 |
| batches | 5 |
| accepted | 108 (24+25+25+25+9) |
| rejected | 0 |
| duplicates (ingest) | 1 (dedup correcto) |
| auth errors | 0 |
| endpoint errors | 0 |
| batches 200 OK | 5/5 ✅ |
| offset before | 5,084,662 |
| offset after | 5,140,195 |

### Intervalo 3 — 13:19:04

| Métrica | Valor |
|---|---|
| lines_read | 175 |
| parsed | 115 |
| errors | 0 |
| duplicates (parseo) | 60 |
| batches | 5 |
| accepted | 115 |
| rejected | 0 |
| duplicates (ingest) | 0 |
| auth errors | 0 |
| endpoint errors | 0 |
| batches 200 OK | 5/5 ✅ |
| offset before | 5,140,195 |
| offset after | 5,205,695 |

## Validación posterior

| Componente | Estado |
|---|---|
| ids-core health (final) | `/healthz` → OK, `/readyz` → ready ✅ |
| rsyslog (final) | active ✅ |
| Puerto 8088 | LISTEN ✅ |
| Stack staging (6/6) | Todos healthy ✅ |
| Timer active | active ✅ |
| Timer enabled | enabled ✅ |
| Service state | inactive (oneshot, esperado) ✅ |
| Procesos runaway | Ninguno ✅ |
| Events/recent | 50 eventos devueltos (default limit) ✅ |
| Eventos nuevos visibles | Sí (offsets 4,179,774 → 5,205,695) ✅ |

## Rollback

| Acción | Estado |
|---|---|
| Rollback ejecutado | No |
| Motivo | PASS — timer funciona correctamente |
| Rollback viable documentado | Sí — `sudo systemctl disable --now ids-unifi-collector.timer` |

### Procedimiento de rollback si fuera necesario

```bash
sudo systemctl disable --now ids-unifi-collector.timer
sudo systemctl stop ids-unifi-collector.service || true
# Validar:
systemctl is-enabled ids-unifi-collector.timer  # disabled
systemctl is-active ids-unifi-collector.timer    # inactive
curl -s http://localhost:8088/healthz             # OK
systemctl is-active rsyslog                       # active
```

## Tests

| Suite | Resultado |
|---|---|
| `go test ./...` (ids-core) | PASS (86 tests, cached) ✅ |
| `task check` — lint web | ESLint 10 known compat issue (pre-existing) ⚠️ |
| `task check` — ruff analytics | PASS ✅ |
| `task check` — ruff mcp | 1 pre-existing unused import (no regression) ⚠️ |
| `task check` — typecheck web | PASS ✅ |
| `task check` — test core | PASS (cached) ✅ |
| `task check` — test analytics | 16 passed ✅ |
| `task check` — test mcp | 10 passed ✅ |
| `task check` — suricata contract | 9/9 validated ✅ |

## Confirmaciones

- ✅ No se tocó UniFi
- ✅ No se modificó SIEM
- ✅ No se cambió puerto SIEM
- ✅ No se activó NetFlow/IPFIX
- ✅ No se cambió IDS/IPS
- ✅ No se ejecutó BlackSun
- ✅ No se hicieron escaneos
- ✅ No se provocó tráfico artificial
- ✅ No se usó API key UniFi
- ✅ No se modificó rsyslog
- ✅ No se reinició rsyslog
- ✅ No se tocó Promtail/Loki/Grafana
- ✅ No se tocó firewall
- ✅ No se modificó compose .env
- ✅ No se modificó compose.yaml
- ✅ No se cambió token
- ✅ No se recreó ids-core
- ✅ No se recrearon contenedores
- ✅ No se hizo docker compose up/down
- ✅ No se reinstaló binario
- ✅ No se recreó usuario
- ✅ No se borró state
- ✅ No se imprimió token
- ✅ No se imprimieron secretos
- ✅ No se imprimieron logs reales
- ✅ No se commitearon logs/secretos/tokens/binarios/state-files

## Próxima fase recomendada

**IDS-UNIFI-PERSISTENT-COLLECTOR-OBSERVE-24H-01** — Observar durante 24h para confirmar estabilidad del timer, ausencia de runaway, y consistencia del offset.
