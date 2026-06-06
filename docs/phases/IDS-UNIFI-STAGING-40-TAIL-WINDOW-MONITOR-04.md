# IDS-UNIFI-STAGING-40-TAIL-WINDOW-MONITOR-04

**Resultado:** PARTIAL

**Objetivo:** Monitorizar read-only la llegada de nuevas líneas a `/var/log/unifi/ids.log` en .40 durante una ventana controlada de 10 minutos.

---

## Repo

| Item | Valor |
|------|-------|
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `e4b0937` |
| HEAD final | (por commit) |
| Git status final | Limpio |
| Push | (por realizar) |

## Baseline .40

| Item | Resultado |
|------|-----------|
| Host | `ubuntu-server` |
| Deploy dir | `/home/albert/docker/ids-app` |
| ids-core imagen | `ghcr.io/albertgracia/ids-app/ids-core:staging` (digest `sha256:23d64c263349...`) |
| ids-core health | Up healthy |
| Capability | ✅ `unifi_internal_ingest_dry_run` |
| Endpoint GET | `405 method not allowed` |
| Endpoint POST sin token | `503 IDS_UNIFI_INGEST_TOKEN not configured` |
| rsyslog | active |
| Puerto 8088 | LISTEN |

## Monitor ids.log

| Parámetro | Valor |
|-----------|-------|
| Duración total | 10 minutos |
| Intervalo | 60 segundos |
| Muestras tomadas | 11 (t=0 a t=10) |

### ids.log

| Métrica | Inicial (t=0) | Final (t=10) | Cambio |
|---------|---------------|--------------|--------|
| Bytes | 978581 | 978581 | **0** |
| Líneas | 3658 | 3658 | **0** |
| mtime | 1780690874 (Jun 5 22:21) | 1780690874 | **Sin cambio** |

### traffic.log (referencia)

| Métrica | Inicial (t=0) | Final (t=10) | Cambio |
|---------|---------------|--------------|--------|
| Bytes | 3759571 | 3784774 | **+25,203** |
| mtime | 1780740971 | 1780741580 | **Actualizado cada minuto** |

### Conclusión

| Resultado | Valor |
|-----------|-------|
| ids.log creció | **No** |
| traffic.log creció | **Sí** — consistentemente ~2.5KB/min |

A pesar de que el receptor rsyslog está activo y recibe tráfico (evidenciado por traffic.log creciendo), el archivo `/var/log/unifi/ids.log` **no ha recibido nuevas líneas desde el 5 de junio 22:21**.

## Decisión

| Item | Valor |
|------|-------|
| Continuar a smoke | **No** |
| Motivo | ids.log sin datos nuevos. No tiene sentido inyectar token ni ejecutar collector sin líneas que procesar. |

## Validación Posterior

| Item | Resultado |
|------|-----------|
| ids-core health | OK (sin cambios) |
| rsyslog | active |
| Puerto 8088 | LISTEN |

## Tests

| Suite | Resultado |
|-------|-----------|
| `go test ./...` | OK |

## Documentación

| Item | Resultado |
|------|-----------|
| Informe creado | `docs/phases/IDS-UNIFI-STAGING-40-TAIL-WINDOW-MONITOR-04.md` |
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
- [x] No se inyectó token
- [x] No se modificó .env
- [x] No se modificó compose.yaml
- [x] No se recreó ids-core
- [x] No se ejecutó collector
- [x] No se usó `--send=true`
- [x] No se hizo ingest real
- [x] No se imprimieron logs reales
- [x] No se imprimieron secretos
- [x] No se commitearon logs/secretos/tokens/binarios/state-files

## Próxima Fase Recomendada

**`IDS-UNIFI-IDSLOG-SOURCE-REVIEW-01`**

El archivo `/var/log/unifi/ids.log` no recibe datos desde Jun 5 22:21. El pipeline completo (endpoint, token auth, collector, parser) está validado y funcional, pero no hay fuente de datos.

Posibles causas a investigar:
1. La regla rsyslog que escribe en `ids.log` podría tener un filtro que ya no coincide
2. El gateway UniFi podría haber cambiado su configuración de syslog
3. La facility o el tag que rsyslog espera podría haber cambiado

Una fase de revisión debería:
- Inspeccionar read-only las reglas de rsyslog en `.40` (ej: `/etc/rsyslog.d/`)
- Confirmar qué regla escribe en `ids.log` vs `traffic.log`
- Determinar si el gateway sigue enviando (ver traffic.log timestamp)
- Sin modificar nada, solo diagnosticar

Si se confirma que `ids.log` ya no es una fuente viable, considerar:
- Redirigir el collector hacia `traffic.log` (que sí recibe datos)
- O cerrar el pipeline UniFi IDS/operational syslog como no viable
