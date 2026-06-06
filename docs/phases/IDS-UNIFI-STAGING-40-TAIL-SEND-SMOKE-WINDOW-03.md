# IDS-UNIFI-STAGING-40-TAIL-SEND-SMOKE-WINDOW-03

**Resultado:** PARTIAL

**Objetivo:** Reintentar send smoke en ventana con líneas nuevas en `/var/log/unifi/ids.log`. Confirmar crecimiento o cerrar PARTIAL sin modificaciones.

---

## Repo

| Item | Valor |
|------|-------|
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `9d0f88a` |
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
| Capability | ✅ `unifi_internal_ingest_dry_run` (en status) |
| Endpoint GET inicial | `405 method not allowed` |
| Endpoint POST sin token inicial | `503 IDS_UNIFI_INGEST_TOKEN not configured` |
| rsyslog inicial | active |
| Puerto 8088 | LISTEN |

## Ventana ids.log

| Item | t=0 | t=+30s |
|------|-----|--------|
| Tamaño | 978581 bytes (956K) | 978581 bytes (956K) |
| mtime | 1780690874 (Jun 5 22:21) | 1780690874 (Jun 5 22:21) |
| Líneas | 3658 | 3658 |

| Resultado | Valor |
|-----------|-------|
| ids.log creció | **No** |
| traffic.log creció | Sí (3.6M constante, nueva timestamp) |
| Decisión | **Cerrar PARTIAL** — sin nuevas líneas, no se toca token |

### Análisis

El archivo `/var/log/unifi/ids.log` no ha recibido nuevas líneas desde el **5 de junio 22:21**. En contraste, `/var/log/unifi/traffic.log` sigue recibiendo datos (timestamp actualizada). Esto indica que:

- rsyslog está activo y recibiendo tráfico → confirmado
- El flujo hacia `traffic.log` funciona → confirmado
- El flujo hacia `ids.log` está **detenido** desde Jun 5 22:21
- Posibles causas (fuera de alcance): cambio en regla rsyslog, gateway dejó de enviar, filtro IDS desactivado

No se modificó nada. No se inyectó token. No se recreó ids-core.

## Próxima Fase Recomendada

**`IDS-UNIFI-STAGING-40-TAIL-WINDOW-MONITOR-04`**

Monitorear `/var/log/unifi/ids.log` hasta que reciba nuevas líneas, luego ejecutar el send smoke completo:

1. Verificar periódicamente si `ids.log` crece (via crontab o watchdog ligero)
2. Cuando haya nuevas líneas, disparar:
   - Inyectar token temporal
   - Recrear ids-core
   - Ejecutar collector con `--send=true --once`
   - Validar accepted > 0 y events/recent
   - Retirar token
3. No modificar rsyslog, no tocar UniFi, no generar tráfico artificial

**Alternativa:** Si se confirma que `ids.log` ya no recibe datos, considerar investigar rsyslog routing en una fase autorizada o reenfocar el pipeline hacia `traffic.log`.

## Token/env

| Item | Resultado |
|------|-----------|
| Token inyectado | No (ids.log no creció) |
| ids-core recreado | No |

## Binario Temporal

No compilado — no se ejecuta collector sin líneas nuevas.

## Smoke

No ejecutado.

## Validación Posterior

| Item | Resultado |
|------|-----------|
| ids-core health | OK (sin cambios) |
| rsyslog | active |
| Puerto 8088 | LISTEN |

## Rollback Token

No aplica — token no fue inyectado.

## Limpieza

No aplica — no se crearon artefactos.

## Tests

| Suite | Resultado |
|-------|-----------|
| `go test ./...` | OK |

## Documentación

| Item | Resultado |
|------|-----------|
| Informe creado | `docs/phases/IDS-UNIFI-STAGING-40-TAIL-SEND-SMOKE-WINDOW-03.md` |
| Commit | (por realizar) |
| Push | (por realizar) |

## Confirmaciones

- [x] No se tocó UniFi
- [x] No se modificó SIEM
- [x] No se activó NetFlow/IPFIX
- [x] No se cambió IDS/IPS
- [x] No se ejecutó BlackSun
- [x] No se hicieron escaneos
- [x] No se provocó tráfico artificial
- [x] No se usó API key UniFi
- [x] No se modificó rsyslog
- [x] No se reinició rsyslog
- [x] No se tocó Promtail/Loki/Grafana
- [x] No se tocó firewall
- [x] No se recreó postgres/redis/ids-web/ids-analytics/ids-mcp
- [x] No se instaló binario permanente
- [x] No se creó systemd
- [x] No se creó state permanente
- [x] No se imprimió token
- [x] No se imprimieron secretos
- [x] No se imprimieron logs reales
- [x] No se hizo replay histórico
- [x] No se commitearon logs/secretos/tokens/binarios/state-files
