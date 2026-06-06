# IDS-UNIFI-COLLECTOR-TRAFFICLOG-SOURCE-PLAN-01

**Resultado:** PASS

**Objetivo:** Planificar la adaptación del collector UniFi para usar `/var/log/unifi/traffic.log` como fuente activa, determinando si requiere cambios de código o solo configuración.

---

## Repo

| Item | Valor |
|------|-------|
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `338f92e` |
| HEAD final | (por commit) |
| Git status final | Limpio |
| Push | (por realizar) |

## Baseline .40

| Item | Resultado |
|------|-----------|
| Host | `ubuntu-server` |
| rsyslog | active |
| Puertos 1514/15514 | Ambos TCP+UDP LISTEN |
| ids.log | 978581 bytes, 3658 líneas, mtime Jun 5 22:21 (stale) |
| traffic.log | ~3.8MB, 14124+ líneas, creciendo activamente |
| ids-core health | Up healthy (sin cambios) |

## Collector Actual

| Parámetro | Estado |
|-----------|--------|
| Ruta/paquete | `services/ids-core/cmd/unifi-parallel-collector/main.go` |
| Log path configurable | **Sí** — `--tail-file` flag (línea 234) |
| Default actual | Vacío (requerido en modo tail) |
| State configurable | **Sí** — `--state-file` (línea 235) |
| Start-position soportado | **Sí** — `beginning`/`end` (línea 236) |
| send=true soportado | **Sí** — `--send` (línea 246) |
| Endpoint configurable | **Sí** — `--endpoint` (línea 247) |
| Token env configurable | **Sí** — `--token-env` (línea 248) |
| Batch size configurable | **Sí** — `--batch-size` (línea 251) |

## Compatibilidad traffic.log

| Aspecto | Resultado |
|---------|-----------|
| Parser compatible | **Sí** — sin cambios necesarios |
| Evidencia | Ambos logs usan el mismo template rsyslog (`%timegenerated% %HOSTNAME% %syslogtag%%msg%\n`). `ParseOperationalSyslog` analiza el mismo formato. Las clasificaciones por proceso (coredns, odhcp6c, ubios-udapi-server, etc.) son idénticas en ambos archivos. |
| Muestras reales impresas | No |
| Logs reales commiteados | No |
| Riesgos | Ninguno — solo cambiar la ruta del archivo. El formato es idéntico. |

## Plan Recomendado

**Opción A — Configuración solamente.**

El collector ya soporta `--tail-file` como ruta arbitraria. No requiere cambios de código, ni nuevos flags, ni modificaciones al parser. La adaptación es puramente operativa: cambiar la ruta de `ids.log` a `traffic.log`.

### Cambios necesarios

| Ítem | Necesario |
|------|-----------|
| Código Go | **No** |
| Nuevos flags | **No** |
| Parser | **No** |
| Tests | **No** (parser ya probado con sample sintético operacional) |
| Documentación | Sugerido: actualizar docs de collector si referencian ids.log |

### Siguiente smoke propuesto

Fase: **`IDS-UNIFI-TRAFFICLOG-LOCAL-DRYRUN-01`**

1. Compilar collector linux/amd64
2. Copiar a /tmp en .40
3. Ejecutar dry-run con `send=false`:
   ```
   --tail-file=/var/log/unifi/traffic.log
   --state-file=/tmp/unifi-state-traffic.json
   --start-position=end
   --once
   --collector-id=traffic-dryrun-01
   --source-host=ubuntu-server
   --ingest-batch
   ```
4. Validar summary: total_lines, parsed, skipped, event_types
5. Sin imprimir logs reales
6. No ejecutar send=true
7. No inyectar token

### Rollback/Seguridad

| Aspecto | Estrategia |
|---------|------------|
| Rollback | Siempre usar `--start-position=end`; state temporal en /tmp |
| Token | No necesario para dry-run (send=false) |
| State | Temporal, se elimina al finalizar |
| Binario | Temporal en /tmp, se elimina al finalizar |
| Rsyslog | No se toca |
| UniFi | No se toca |

## Tests

| Suite | Resultado |
|-------|-----------|
| `go test ./...` | OK |

## Documentación

| Item | Resultado |
|------|-----------|
| Informe creado | `docs/phases/IDS-UNIFI-COLLECTOR-TRAFFICLOG-SOURCE-PLAN-01.md` |
| Commit | (por realizar) |
| Push | (por realizar) |

## Confirmaciones

- [x] No se tocó UniFi
- [x] No se modificó SIEM
- [x] No se cambió puerto SIEM
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
- [x] No se ejecutó collector con --send=true
- [x] No se hizo ingest real
- [x] No se imprimieron logs reales
- [x] No se imprimieron secretos
- [x] No se commitearon logs/secretos/tokens/binarios/state-files

## Próxima Fase Recomendada

**`IDS-UNIFI-TRAFFICLOG-LOCAL-DRYRUN-01`**

Ejecutar dry-run del collector sobre `/var/log/unifi/traffic.log` en .40 con `send=false` para:
1. Validar que el parser procesa correctamente las líneas de traffic.log
2. Obtener estadísticas de clasificación (event_types, parsed vs skipped)
3. Fijar offset inicial
4. Sin token, sin ingest, sin modificar nada permanente
