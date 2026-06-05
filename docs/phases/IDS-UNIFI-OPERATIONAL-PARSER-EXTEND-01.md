# FASE: IDS-UNIFI-OPERATIONAL-PARSER-EXTEND-01

**Resultado:** PASS

**Fecha:** 2026-06-05

---

## 1. Objetivo

Extender el parser operacional UniFi para clasificar los procesos reales no cubiertos más frecuentes identificados en la fase de validación: MCA, mcad, dpi-flow-stats y systemd.

## 2. Estado del repositorio

| Ítem | Valor |
|---|---|
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `8f3ce60` |
| HEAD final | `(post-commit)` |
| Working tree | limpio |

## 3. Kinds añadidos

| Kind | Procesos | EventType (domain) | Categoría |
|---|---|---|---|
| `mca_event` | MCA, mcad | `system` | MCA |
| `dpi_flow_stats_event` | dpi-flow-stats, ubios-udapi-server (flow stats content) | `network_connection` | DPI |
| `systemd_event` | systemd | `system` | System |

## 4. Cambios realizados

### `services/ids-core/internal/unifi/operational.go`

- Añadidos 3 nuevos `OperationalEventKind` constants: `KindMCAEvent`, `KindDPIFlowStatsEvent`, `KindSystemdEvent`
- `classifyOperational`: nuevos casos para `MCA`, `mcad` → `mca_event`; `dpi-flow-stats` → `dpi_flow_stats_event`; `systemd` → `systemd_event`
- Orden de `ubios-udapi-server`: `odhcp6c` > `flow stats` > `dpi` para evitar falsos positivos (msg "DPI flow stats timeout" clasificado como `dpi_flow_stats_event` en lugar de `dpi_event`)
- `parseMessageContent`: nuevo bloque para `KindDPIFlowStatsEvent` (action: timeout/failed/lifecycle) y `KindMCAEvent` (action: timeout/failure/heartbeat)

### `services/ids-core/internal/unifi/normalize_operational.go`

- `mapKindToEventType`: `mca_event` → `system`, `dpi_flow_stats_event` → `network_connection`, `systemd_event` → `system`
- `mapKindToCategory`: `mca_event` → `MCA`, `dpi_flow_stats_event` → `DPI`, `systemd_event` → `System`
- `mapKindToSeverityNum`: severity conservadora según las reglas de la fase
  - MCA: info(0) default, low(1) para timeout/disconnected/unavailable/retry/warning, medium(3) para failed/error/unable
  - dpi-flow-stats: info(0) default, low(1) para timeout/retry/warning, medium(3) para failed/error/unable/queue full/dropped
  - systemd: info(0) default, medium(3) para failed/error/stopped unexpectedly
- `buildSafeMessage`: mensajes seguros para cada nuevo kind

### `packages/contracts/unifi/samples/operational/`

- `mca.log`: 2 líneas sintéticas (MCA heartbeat + mcad timeout)
- `dpi-flow-stats.log`: 2 líneas sintéticas (dpi-flow-stats info + ubios flow stats timeout)
- `systemd.log`: 2 líneas sintéticas (systemd started + restart)

## 5. Tests

### Tests unitarios (operational_test.go)

Nuevos tests:
1. `TestParseOperationalSyslog_MCAHeartbeat` — process=MCA, kind=mca_event, PID extraído
2. `TestParseOperationalSyslog_MCADTimeout` — process=mcad, kind=mca_event
3. `TestParseOperationalSyslog_DPIFlowStatsInfo` — kind=dpi_flow_stats_event, PID extraído
4. `TestParseOperationalSyslog_UbiosDPIFlowStatsTimeout` — kind=dpi_flow_stats_event (evita falso DPI)
5. `TestParseOperationalSyslog_SystemdInfo` — kind=systemd_event
6. `TestNormalizeOperational_MCAHeartbeat` — event_type=system, severity=0, kind=mca_event
7. `TestNormalizeOperational_MCADTimeoutSeverityLow` — severity=1 (timeout)
8. `TestNormalizeOperational_DPIFlowStatsInfo` — event_type=network_connection, severity=0
9. `TestNormalizeOperational_UbiosDPIFlowStatsTimeoutSeverityLow` — severity=1, kind=dpi_flow_stats_event
10. `TestNormalizeOperational_SystemdServiceInfo` — event_type=system, severity=0

### Tests CLI (main_test.go)

Nuevos tests:
1. `TestRunMCASampleParsedAsOperational` — parsed=2, event_type system
2. `TestRunDPIFlowStatsSampleParsedAsOperational` — parsed=2, event_type network_connection
3. `TestRunSystemdSampleParsedAsOperational` — parsed=2
4. `TestRunAllOperationalSamplesParsed` — actualizado: parsed=22 (antes 16, +2+2+2)
5. Helper `containsEventType`

### Regresiones verificadas

| Sample | parsed | errors | tipos |
|---|---|---|---|
| coredns.json.log | 2 | 0 | dns_query=2 |
| dpi.log | 4 | 0 | network_connection=4 |
| odhcp6c.log | 3 | 0 | network_connection=3 |
| earlyoom.log | 3 | 0 | system=3 |
| syslog-ng.log | 2 | 0 | system=2 |
| CEF embedded | 1 | 0 | threat_detected=1 |
| mca.log | 2 | 0 | system=2 |
| dpi-flow-stats.log | 2 | 0 | network_connection=2 |
| systemd.log | 2 | 0 | system=2 |

### Resultados `go test ./...`: **PASS**
### Resultados `task check`: **PASS** (solo preexistentes: ESLint 10 circular JSON, mcp-server F401)

## 6. Procesos cubiertos

| Proceso | Antes | Después |
|---|---|---|
| MCA | unclassified_unifi_syslog | mca_event |
| mcad | unclassified_unifi_syslog | mca_event |
| dpi-flow-stats | unclassified_unifi_syslog | dpi_flow_stats_event |
| ubios-udapi-server (flow stats content) | unclassified_unifi_syslog | dpi_flow_stats_event |
| systemd | unclassified_unifi_syslog | systemd_event |

## 7. Limitaciones

- Los mensajes MCA sin PID (formato `device_host MCA: msg`) siguen generando warning `missing_pid`. Es correcto.
- `dpi-flow-stats` sin pattern `process[pid]:` seguiría como `unclassified`. No se detectó en logs reales de la fase previa (todos tienen PID).
- `ubios-udapi-server` sin contenido clasificable sigue como `unclassified`. Es correcto.
- La severidad `low` (1) es nueva en el parser operacional. Las fases previas usaban solo 0/3/6/8. No hay impacto en regresiones.

## 8. Confirmaciones

- ✅ No se tocó UniFi.
- ✅ No se cambió SIEM/NetFlow/IDS-IPS.
- ✅ No se ejecutó BlackSun/escaneos/ataques.
- ✅ No se usó API key.
- ✅ No se modificó rsyslog/Promtail/Loki/Grafana/Docker/firewall.
- ✅ No se hizo POST/live ingest.
- ✅ No se usaron logs reales como samples.
- ✅ No se commitearon logs reales/sanitizados.
- ✅ Parser CEF intacto.
- ✅ Regresiones operacionales intactas.

## 9. Próxima fase recomendada

**IDS-UNIFI-OPERATIONAL-PARSER-EXTEND-VALIDATION-01** — opcional, validar con muestra real de .40 para confirmar que `unsupported_operational_format` se reduce de 188 a ~77 líneas (eliminando MCA/mcad/dpi-flow-stats/systemd).
