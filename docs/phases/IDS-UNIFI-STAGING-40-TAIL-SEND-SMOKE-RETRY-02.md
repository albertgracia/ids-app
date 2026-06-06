# IDS-UNIFI-STAGING-40-TAIL-SEND-SMOKE-RETRY-02

**Resultado:** PARTIAL

**Objetivo:** Ejecutar send smoke controlado del collector UniFi en .40 con token activo, validar pipeline completo: log → collector → POST loopback → ids-core.

---

## Repo

| Item | Valor |
|------|-------|
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `ba64300` |
| HEAD final | (por commit) |
| Git status final | Limpio |
| Push | (por realizar) |

## Baseline .40

| Item | Resultado |
|------|-----------|
| Host | `ubuntu-server` |
| Deploy dir | `/home/albert/docker/ids-app` |
| ids-core imagen | `ghcr.io/albertgracia/ids-app/ids-core:staging` (digest `sha256:23d64c263349...`) |
| ids-core health inicial | Up healthy |
| Capability | ✅ `unifi_internal_ingest_dry_run` |
| Token en container env | Sí (sin valor) |
| Endpoint GET inicial | `405 method not allowed` |
| Endpoint POST token+payload inválido inicial | `400 invalid JSON body` |
| rsyslog inicial | active |
| Puerto 8088 | LISTEN |
| Log metadata | `/var/log/unifi/ids.log` 956K (Jun 5 22:21), `/var/log/unifi/traffic.log` 3.6M (Jun 6 12:10) |

## Binario Temporal

| Item | Resultado |
|------|-----------|
| Build linux/amd64 | OK |
| Ruta temporal local | `$env:TEMP\unifi-parallel-collector` |
| Ruta temporal .40 | `/tmp/unifi-parallel-collector` |
| Checksum local | `E8084F97AB2F3D09722ED19EB8D4234C606C891F3704807B13C4BC4E2F465A56` |
| Checksum remoto | `e8084f97ab2f3d09722ed19eb8d4234c606c891f3704807b13c4bc4e2f465a56` |
| Coinciden | ✅ |
| Eliminado | Sí |

## State/Dry-Run

| Item | Resultado |
|------|-----------|
| State temporal | `/tmp/unifi-state.json` |
| Dry-run send=false ejecutado | Sí |
| start-position | `end` |
| Offset inicial | 978581 |
| Offset final | 978581 |
| total_lines | 0 |
| parsed | 0 |
| batch_events | 0 |
| Replay evitado | ✅ |

## Smoke

| Item | Resultado |
|------|-----------|
| Collector ejecutado | Sí |
| send=true usado | Sí |
| once usado | Sí |
| Endpoint loopback | `http://127.0.0.1:8088/api/internal/v1/ingest/events/unifi` |
| Batch size | 10 |
| token-env | `IDS_UNIFI_INGEST_TOKEN` (exportado desde .env) |
| total_lines | 0 |
| parsed | 0 |
| batch_events | 0 |
| accepted | 0 |
| rejected | 0 |
| duplicates | 0 |
| Errores auth | 0 |
| Errores endpoint | 0 |
| POST realizado | No (0 batches, 0 events) |
| Replay histórico evitado | ✅ |

## Validación Posterior

| Item | Resultado |
|------|-----------|
| ids-core health posterior | Up healthy |
| /api/v1/events/recent | `{"items":[],"count":0,"limit":50}` |
| Eventos nuevos visibles | No (0 líneas nuevas en ids.log) |
| rsyslog posterior | active |
| Puerto 8088 posterior | LISTEN |

## Token Estado Final

| Item | Resultado |
|------|-----------|
| Token mantenido activo | No — **revertido** |
| Rollback token ejecutado | Sí |
| Motivo | Sin nuevas líneas en ids.log. No se necesita token para siguiente fase inmediata. |
| Health tras rollback | Up healthy |
| Endpoint final | `503 IDS_UNIFI_INGEST_TOKEN not configured` (esperado) |

**Resumen del rollback:**
- `.env` restaurado desde `backups/.env.pre-token-injection`
- `compose.yaml` restaurado desde `backups/compose.yaml.pre-token-injection`
- `docker compose up -d --no-deps ids-core`
- Token eliminado del container env
- Backups temporales eliminados

## Limpieza

| Item | Resultado |
|------|-----------|
| Proceso temporal detenido | N/A (no quedó vivo) |
| Binario temporal eliminado (.40) | Sí |
| State temporal eliminado (.40) | Sí |
| Scripts temporales eliminados (.40) | Sí |
| Build local eliminado | Sí |
| Backups con token eliminados | Sí |
| Secretos expuestos | No |
| Logs reales impresos | No |

## Tests

| Suite | Resultado |
|-------|-----------|
| `go test ./...` | OK |

## Documentación

| Item | Resultado |
|------|-----------|
| Informe creado | `docs/phases/IDS-UNIFI-STAGING-40-TAIL-SEND-SMOKE-RETRY-02.md` |
| Commit | (por realizar) |
| Push | (por realizar) |

## Confirmaciones

- [x] No se tocó UniFi
- [x] No se modificó SIEM
- [x] No se activó NetFlow/IPFIX
- [x] No se cambió IDS/IPS
- [x] No se ejecutó BlackSun
- [x] No se hicieron escaneos
- [x] No se usó API key UniFi
- [x] No se modificó rsyslog
- [x] No se reinició rsyslog
- [x] No se tocó Promtail/Loki/Grafana
- [x] No se tocó firewall
- [x] No se recreó postgres
- [x] No se recreó redis
- [x] No se recreó ids-web
- [x] No se recreó ids-analytics
- [x] No se recreó ids-mcp
- [x] No se instaló binario permanente
- [x] No se creó systemd
- [x] No se creó state permanente
- [x] No se imprimió token
- [x] No se imprimieron secretos
- [x] No se imprimieron logs reales
- [x] No se hizo replay histórico
- [x] No se commitearon logs/secretos/tokens/binarios/state-files

## Próxima Fase Recomendada

**`IDS-UNIFI-STAGING-40-TAIL-SEND-SMOKE-WINDOW-03`**

Repetir el send smoke en una ventana donde el archivo `/var/log/unifi/ids.log` tenga líneas nuevas. El pipeline completo está validado:

- Collector compila y se ejecuta en .40  ✅
- Endpoint existe, token funcional, auth OK  ✅
- Dry-run fija offset correctamente sin replay  ✅
- Send=true no produce errores de auth/endpoint  ✅
- Rollback de token documentado y probado  ✅
- ids.log sin cambios desde Jun 5 22:21  ❌

La siguiente fase debe:
1. Esperar a que haya actividad en ids.log (tráfico UniFi real)
2. Re-inyectar token temporal (fase `IDS-CORE-STAGING-40-UNIFI-TOKEN-INJECTION-REAPPLY-01`)
3. Ejecutar collector con `--send=true --once`
4. Validar `accepted > 0` y eventos en `/api/v1/events/recent`
5. Retirar token al finalizar
