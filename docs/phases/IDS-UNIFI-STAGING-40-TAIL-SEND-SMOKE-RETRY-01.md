# IDS-UNIFI-STAGING-40-TAIL-SEND-SMOKE-RETRY-01

**Resultado:** PARTIAL

**Objetivo:** Reintentar smoke controlado de envío desde collector UniFi en .40 hacia ids-core local, ahora que el endpoint interno UniFi ya no devuelve 404.

---

## Repo

| Item | Valor |
|------|-------|
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `28ea37f` |
| HEAD final | (por commit) |
| Git status final | Limpio |
| Push | (por realizar) |

## Baseline .40

| Item | Resultado |
|------|-----------|
| Host | `ubuntu-server` |
| Imagen ids-core actual | `ghcr.io/albertgracia/ids-app/ids-core:staging` (digest `sha256:23d64c263349...`) |
| ids-core health inicial | Up healthy |
| /api/v1/status capability | ✅ `unifi_internal_ingest_dry_run` presente |
| Endpoint GET | `405 method not allowed` |
| Endpoint POST sin token | `503 IDS_UNIFI_INGEST_TOKEN not configured` |
| rsyslog inicial | active |
| Puerto 8088 | LISTEN |
| Log metadata | `/var/log/unifi/ids.log` 956K (Jun 5 22:21), `/var/log/unifi/traffic.log` 3.6M (Jun 6 12:02) |

## Token/Env

| Item | Resultado |
|------|-----------|
| Token temporal creado | **No** — bloqueado |
| Token impreso | No |
| Token persistente creado | No |
| ids-core token configurado | **No** — `IDS_UNIFI_INGEST_TOKEN` ausente en .env y container env |
| Bloqueo por 503 | **Sí** — endpoint devuelve 503 sin token |

### Detalle del bloqueo

ids-core lee `IDS_UNIFI_INGEST_TOKEN` de `os.Getenv()` (`unifi_ingest_handler.go:43`). El contenedor en .40 no tiene esta variable. El .env del deploy dir tampoco. Para inyectar el token se requiere:

1. Añadir `IDS_UNIFI_INGEST_TOKEN=<valor>` al `.env` de `/home/albert/docker/ids-app/`
2. Recrear ids-core con `docker compose up -d --no-deps ids-core`

Ambas operaciones fueron denegadas en esta fase por la regla "No recrear ids-core salvo autorización explícita" y la directriz de mantener .40 read-only.

## Endpoint Pre-Smoke

| Item | Resultado |
|------|-----------|
| Método | POST (sin token) |
| Resultado | `503 IDS_UNIFI_INGEST_TOKEN not configured` |
| 404 eliminado | ✅ |
| Auth efectiva | No aplicable (token ausente en servidor) |
| Payload inválido controlado | No (no se puede probar sin token) |
| Ingest real pre-smoke | No |

## Binario Temporal

No compilado — no se puede ejecutar collector sin token funcional.

## Smoke

No ejecutado — bloqueado por 503.

## Validación Posterior

| Item | Resultado |
|------|-----------|
| ids-core health posterior | OK (healthy) |
| rsyslog posterior | active |
| /api/v1/events/recent | No revisado (no aplica sin ingest) |

## Limpieza

No aplica — no se crearon artefactos temporales.

## Tests

| Suite | Resultado |
|-------|-----------|
| `go test ./...` | OK |
| `task check` | No ejecutado (sin cambios de código; resultado conocido) |

## Documentación

| Item | Resultado |
|------|-----------|
| Informe creado | `docs/phases/IDS-UNIFI-STAGING-40-TAIL-SEND-SMOKE-RETRY-01.md` |
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
- [x] No se creó env permanente
- [x] No se creó state permanente
- [x] No se creó systemd
- [x] No se imprimieron logs reales
- [x] No se imprimieron secretos
- [x] No se hizo replay histórico
- [x] No se commitearon logs/secretos/tokens/binarios/state-files

## Próxima Fase Recomendada

**IDS-CORE-STAGING-40-UNIFI-TOKEN-INJECTION-PLAN-01**

Planificar la inyección controlada de un token temporal `IDS_UNIFI_INGEST_TOKEN` en ids-core:

1. Generar token seguro temporal
2. Añadir al `.env` de `/home/albert/docker/ids-app/`
3. Recrear solo ids-core (`docker compose up -d --no-deps ids-core`)
4. Validar endpoint responde 400/401/403 (no 503)
5. Decidir si ejecutar send smoke en la misma fase o en una separada
6. Al finalizar: retirar token y recrear ids-core de nuevo
