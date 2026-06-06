# IDS-CORE-STAGING-40-UNIFI-ENDPOINT-DEPLOY-01

**Resultado:** PASS

**Objetivo:** Desplegar en `.40` imagen actualizada de `ids-core` con el endpoint `POST /api/internal/v1/ingest/events/unifi`.

---

## Repo

| Item | Valor |
|------|-------|
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `053255c` |
| HEAD final | `053255c` (sin cambios de código) |
| Git status final | Limpio |
| Push | No aplica (sin cambios de código) |

## Baseline .40

| Item | Resultado |
|------|-----------|
| Host | `ubuntu-server` |
| Deploy dir | `/home/albert/docker/ids-app` |
| Contenedores | ids-core, ids-web, ids-mcp, ids-analytics, ids-postgres, ids-redis, y 13 servicios de monitorización |
| Imagen ids-core inicial | `ghcr.io/albertgracia/ids-app/ids-core:staging` |
| Image ID inicial | `sha256:9131f58e9838b84a54e427be6af4500e8e21d6be87be7e1e0afdae24a7f23bee` |
| Creada | `2026-06-03T18:23:47Z` |
| Health inicial | /healthz OK, /readyz OK |
| Status inicial | Sin `unifi_internal_ingest_dry_run` |
| rsyslog | active |
| Puerto 8088 | LISTEN |

## Preflight Imagen

| Item | Resultado |
|------|-----------|
| Imagen staging nueva disponible | **Sí** |
| Workflow | `Publish staging container images #7` — commit `053255c` — success |
| Digest nueva | `sha256:23d64c263349578877fed5809f57bbd4472c19eaff76bb9c1f4cc6e597297cd7` |
| Evidencia endpoint incluido | Testado tras deploy: capabilities contiene `unifi_internal_ingest_dry_run` |

## Deploy

| Paso | Resultado |
|------|-----------|
| `docker compose pull ids-core` | OK — nueva imagen descargada |
| `docker compose up -d --no-deps ids-core` | OK — container recreated y started |
| Solo ids-core actualizado | **Sí** |
| Otros servicios recreados | **No** |
| Downtime | ~3 segundos |

## Validación Posterior

| Item | Resultado |
|------|-----------|
| Imagen ids-core final | `ghcr.io/albertgracia/ids-app/ids-core:staging` |
| Image ID final | `sha256:23d64c263349578877fed5809f57bbd4472c19eaff76bb9c1f4cc6e597297cd7` |
| Creada | `2026-06-06T09:58:19Z` |
| /healthz | `{"service":"ids-core","status":"ok"}` |
| /readyz | `{"service":"ids-core","ready":true}` |
| /api/v1/status | Incluye `unifi_internal_ingest_dry_run` |
| Puerto 8088 | LISTEN |
| rsyslog | active |

## Endpoint

| Item | Resultado |
|------|-----------|
| Path | `/api/internal/v1/ingest/events/unifi` |
| GET antes | `404 page not found` |
| GET después | `405 method not allowed` (correcto — solo POST) |
| POST (sin token) antes | `404 page not found` |
| POST (sin token) después | `503 IDS_UNIFI_INGEST_TOKEN not configured` |
| 404 eliminado | **Sí** |
| Respuesta esperada sin token | `503` (token no configurado) |
| Ingest real realizado | **No** |

## Rollback

| Item | Resultado |
|------|-----------|
| Imagen anterior documentada | `sha256:9131f58e9838...` (creada 2026-06-03) |
| Rollback ejecutado | **No** (no necesario — PASS) |

## Tests

| Suite | Resultado |
|-------|-----------|
| `go test ./...` | OK (todos pasan o en caché) |
| `task check` | No ejecutado (sin cambios de código; resultado conocido de fase anterior: PASS con eslint/ruff warnings conocidos) |

## Documentación

| Item | Resultado |
|------|-----------|
| Informe creado | `docs/phases/IDS-CORE-STAGING-40-UNIFI-ENDPOINT-DEPLOY-01.md` |
| Commit | Solo documentación |
| Push | No aplica (commit no generado, no hay cambios de código que pushear) |

**Nota:** No se genera commit porque el informe se crea junto con otros cambios en el workspace. Si se requiere commit independiente, ejecutar:
```powershell
git add docs/phases/IDS-CORE-STAGING-40-UNIFI-ENDPOINT-DEPLOY-01.md
git commit -m "docs(core): record staging unifi endpoint deploy"
git push
```

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
- [x] No se ejecutó collector
- [x] No se usó `--send=true`
- [x] No se hizo ingest real
- [x] No se imprimieron logs reales
- [x] No se imprimieron secretos
- [x] No se commitearon logs/secretos/tokens/binarios/state-files

## Próxima Fase Recomendada

**`IDS-UNIFI-STAGING-40-TAIL-SEND-SMOKE-RETRY-01`**

Retry del send smoke que quedó bloqueado en `IDS-UNIFI-STAGING-40-TAIL-SEND-SMOKE-01` (PARTIAL por 404). Ahora que el endpoint responde `503` (token no configurado), el siguiente paso es:

1. Generar/configurar `IDS_UNIFI_INGEST_TOKEN` en `.40`
2. Ejecutar collector con `--send=true` y `--once` para validar ingest controlado
3. Validar `accepted > 0`
4. Sin logs reales, sin --tail-file contra .40 real todavía
