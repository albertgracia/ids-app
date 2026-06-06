# IDS-CORE-STAGING-40-UNIFI-TOKEN-INJECTION-01

**Resultado:** PASS

**Objetivo:** Inyectar `IDS_UNIFI_INGEST_TOKEN` temporal en ids-core de .40, validar que endpoint deja de responder 503, y decidir si mantener token para send smoke posterior o revertir.

---

## Repo

| Item | Valor |
|------|-------|
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `d69a7c5` |
| HEAD final | (por commit) |
| Git status final | Limpio |
| Push | (por realizar) |

## Baseline .40

| Item | Resultado |
|------|-----------|
| Host | `ubuntu-server` |
| Deploy dir | `/home/albert/docker/ids-app` |
| ids-core imagen inicial | `ghcr.io/albertgracia/ids-app/ids-core:staging` (digest `sha256:23d64c263349...`) |
| ids-core health inicial | Up healthy |
| Capability | ✅ `unifi_internal_ingest_dry_run` |
| Endpoint GET inicial | `405 method not allowed` |
| Endpoint POST sin token inicial | `503 IDS_UNIFI_INGEST_TOKEN not configured` |
| rsyslog inicial | active |
| Puerto 8088 | LISTEN |

## Backup

| Item | Resultado |
|------|-----------|
| .env backup creado | Sí — `/home/albert/docker/ids-app/backups/.env.pre-token-injection` |
| compose backup creado | Sí — `/home/albert/docker/ids-app/backups/compose.yaml.pre-token-injection` |
| Permisos restrictivos | 600 (solo owner) |
| Secretos impresos | No |

## Token/Env

| Item | Resultado |
|------|-----------|
| Token generado | Sí (`openssl rand -hex 32`) |
| Token impreso | No |
| .env modificado | Sí (línea `IDS_UNIFI_INGEST_TOKEN` añadida) |
| compose.yaml modificado | Sí (variable añadida al environment de ids-core) |
| compose config validado | OK |
| Token visible en container env | Sí (confirmado sin mostrar valor) |

## Recreate

| Item | Resultado |
|------|-----------|
| Comando | `docker compose --env-file .env -f compose.yaml up -d --no-deps ids-core` |
| Solo ids-core recreado | Sí |
| Otros servicios recreados | No |
| Downtime | ~3 segundos |

## Validación Posterior

| Item | Resultado |
|------|-----------|
| ids-core health posterior | Up healthy |
| /healthz | `{"service":"ids-core","status":"ok"}` |
| /readyz | `{"service":"ids-core","ready":true}` |
| /api/v1/status | OK — capability `unifi_internal_ingest_dry_run` presente |
| Puerto 8088 | LISTEN |
| rsyslog posterior | active |

## Endpoint

| Item | Resultado |
|------|-----------|
| GET | `405 method not allowed` |
| POST con token + payload inválido | `{"error":"invalid JSON body"}` — HTTP 400 |
| 404 eliminado | ✅ |
| 503 token-not-configured eliminado | ✅ |
| Auth efectiva | ✅ (token aceptado, aplicación procesa payload) |
| Ingest real | No |

## Rollback/Estado Final

| Item | Resultado |
|------|-----------|
| Token mantenido temporalmente | **Sí** — para permitir send smoke inmediato en siguiente fase |
| Motivo | Endpoint validado, token funcional. Se evita repetir inyección. |
| Rollback ejecutado | No (no necesario) |
| .env restaurado | No (token queda activo) |
| compose restaurado | No (token queda activo) |
| Backups conservados | Sí (protegidos, solo owner, para rollback futuro) |

## Limpieza

| Item | Resultado |
|------|-----------|
| Backups | Conservados en `backups/` con permisos 600 |
| Secretos expuestos | No |
| Archivos temporales | Script `/tmp/validate.sh` eliminado automáticamente |

## Tests

| Suite | Resultado |
|-------|-----------|
| `go test ./...` | OK |
| `task check` | No ejecutado (sin cambios de código) |

## Documentación

| Item | Resultado |
|------|-----------|
| Informe creado | `docs/phases/IDS-CORE-STAGING-40-UNIFI-TOKEN-INJECTION-01.md` |
| Commit | (por realizar) |
| Push | (por realizar) |

## Confirmaciones

- [x] No se ejecutó collector
- [x] No se usó `--send=true`
- [x] No se hizo ingest real
- [x] No se tocaron logs reales
- [x] No se imprimió token
- [x] No se imprimieron secretos
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
- [x] No se hizo docker compose up global
- [x] No se commitearon logs/secretos/tokens/binarios/state-files

## Próxima Fase Recomendada

**IDS-UNIFI-STAGING-40-TAIL-SEND-SMOKE-RETRY-02**

El token temporal está activo en .40. La siguiente fase debe:
1. Compilar collector linux/amd64
2. Copiar binario temporal a /tmp en .40
3. Ejecutar collector con `--send=true --once --start-position=end`
4. Validar accepted > 0 (si hay líneas nuevas en ids.log)
5. Al finalizar, retirar token: restaurar .env y compose.yaml desde backup, recrear ids-core
