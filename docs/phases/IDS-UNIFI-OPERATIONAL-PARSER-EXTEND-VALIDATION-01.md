# FASE: IDS-UNIFI-OPERATIONAL-PARSER-EXTEND-VALIDATION-01

**Resultado:** PASS

**Fecha:** 2026-06-06

---

## 1. Objetivo

Validar con una muestra real sanitizada temporal de `.40` que la extension del parser operacional UniFi reduce de forma real los eventos `unsupported_operational_format` y `unclassified_event` tras incorporar `mca_event`, `dpi_flow_stats_event` y `systemd_event`.

## 2. Estado del repositorio

| Item | Valor |
|---|---|
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `207fe81` |
| HEAD final | `207fe81` |
| Working tree inicial | limpio |

## 3. Estado read-only de .40

| Componente | Estado |
|---|---|
| `ids-core` | OK |
| `ids-web` | OK |
| `analytics-api` | OK |
| `ids-mcp` | OK |
| `rsyslog` | active |
| Puerto `1514` | TCP+UDP LISTEN |
| Puerto `15514` | TCP+UDP LISTEN |
| `/var/log/unifi/ids.log` | 3658 lineas, 956 KB |
| `/var/log/unifi/traffic.log` | 2.7 MB |

## 4. Conteos agregados de ids.log

| Fuente/patron | Conteo |
|---|---:|
| coredns | 1691 |
| ubios-udapi-server / DPI | 1006 |
| odhcp6c | 840 |
| MCA / mcad | 267 |
| dpi-flow-stats | 228 |
| earlyoom | 107 |
| syslog-ng | 68 |
| unifi-mq-broker | 55 |
| systemd | 37 |
| sudo | 11 |
| firewall / iptables | 7 |
| CEF | 3 |
| ulogd | 1 |

Observacion: la extension del parser cubre ahora tres bolsas relevantes del log real: `MCA/mcad` (267), `dpi-flow-stats` (228) y `systemd` (37).

## 5. Muestra temporal real

| Atributo | Valor |
|---|---|
| Lineas extraidas | 300 |
| Raw impreso | No |
| Raw commiteado | No |
| Sanitizado impreso | No |
| Sanitizado commiteado | No |
| Temporales eliminados | Si |

### Composicion de la muestra sanitizada

| Fuente/patron | Conteo |
|---|---:|
| coredns | 16 |
| DPI / dpi | 36 |
| odhcp6c | 60 |
| MCA / mcad | 60 |
| dpi-flow-stats | 17 |
| earlyoom | 8 |
| systemd | 7 |
| syslog-ng | 6 |
| unifi-mq-broker | 4 |
| firewall | 2 |
| CEF | 1 |
| ulogd | 1 |
| sudo | 1 |
| ubios-udapi-server | 151 |

## 6. Collector dry-run sobre muestra sanitizada

| Metrica | Valor |
|---|---:|
| total_lines | 300 |
| parsed | 294 |
| skipped | 0 |
| errors | 1 |
| duplicates | 5 |

### Distribucion por event_type

| event_type | Count |
|---|---:|
| `dns_query` | 13 |
| `network_connection` | 95 |
| `system` | 81 |
| `threat_detected` | 1 |
| `unclassified_event` | 104 |

### Distribucion por kind

| kind | Count |
|---|---:|
| `unclassified_unifi_syslog` | 104 |
| `mca_event` | 60 |
| `dhcp_ipv6_event` | 59 |
| `dpi_event` | 19 |
| `dpi_flow_stats_event` | 17 |
| `dns_gateway_event` | 13 |
| `gateway_health_event` | 8 |
| `systemd_event` | 7 |
| `syslog_operational_event` | 6 |
| sin kind (1 error + 5 duplicates + 1 CEF test) | 7 |

### Distribucion por severidad

| Severidad | Count |
|---|---:|
| `info` | 198 |
| `low` | 9 |
| `medium` | 86 |
| `critical` | 1 |

### Warnings dominantes

| Warning | Count |
|---|---:|
| `duplicated_hostname_envelope` | 253 |
| `unsupported_operational_format` | 104 |
| `missing_pid` | 40 |
| `duplicate raw_hash` | 5 |
| `embedded_cef_extracted` | 1 |
| `syslog_envelope_detected` | 1 |

## 7. Comparacion con baseline anterior

Baseline previo (fase `IDS-UNIFI-OPERATIONAL-SYSLOG-PARSER-VALIDATION-01`):

- `parsed`: 294/300
- `errors`: 1
- `duplicates`: 5
- `unsupported_operational_format`: 188
- `unclassified_event`: 188
- `duplicated_hostname_envelope`: 253
- `missing_pid`: 40

Resultado actual:

| Metrica | Antes | Ahora | Delta |
|---|---:|---:|---:|
| `parsed` | 294 | 294 | 0 |
| `errors` | 1 | 1 | 0 |
| `duplicates` | 5 | 5 | 0 |
| `unsupported_operational_format` | 188 | 104 | -84 |
| `unclassified_event` | 188 | 104 | -84 |
| `duplicated_hostname_envelope` | 253 | 253 | 0 |
| `missing_pid` | 40 | 40 | 0 |

### Nuevos kinds reales confirmados

| Kind real | Count |
|---|---:|
| `mca_event` | 60 |
| `dpi_flow_stats_event` | 17 |
| `systemd_event` | 7 |

### Reduccion estimada

- Reduccion absoluta de `unsupported_operational_format`: **84** eventos.
- Reduccion porcentual aproximada: **44.7%** (`84 / 188`).
- Reduccion absoluta de `unclassified_event`: **84** eventos.

Nota: la comparacion es orientativa sobre el mismo `tail -n 300` validado previamente. En este caso la muestra coincide en tamano y distribucion con la fase anterior, por lo que la comparacion es util.

## 8. Regresion sintetica

| Sample | parsed | errors |
|---|---:|---:|
| `mca.log` | 2 | 0 |
| `dpi-flow-stats.log` | 2 | 0 |
| `systemd.log` | 2 | 0 |
| `coredns.json.log` | 2 | 0 |
| `dpi.log` | 4 | 0 |
| `odhcp6c.log` | 3 | 0 |
| `earlyoom.log` | 3 | 0 |
| `syslog-ng.log` | 2 | 0 |
| `syslog-embedded-cef-ids-alert.log` | 1 | 0 |

Todas las regresiones sinteticas: **PASS**.

## 9. Tests

| Suite | Resultado |
|---|---|
| `go test ./... -count=1` | PASS |
| `task check` | PASS con issues preexistentes |

Issues preexistentes documentados:

- `apps/web`: ESLint 10 circular JSON
- `services/mcp-server`: ruff `F401 uvicorn`

## 10. Gaps restantes

### Procesos aun no cubiertos especificamante

- `ubios-udapi-server` generico sin tokens DPI/flow-stats/odhcp6c: permanece como `unclassified`, correcto y conservador.
- `ulogd` (1 en muestra): pendiente si se quiere clasificar como firewall event.
- `sudo` (1 en muestra): pendiente si se quiere clasificar como system/privileged action event.

### Warnings que deben mantenerse

- `missing_pid` en MCA sin PID: **correcto**, no es bug.
- `duplicated_hostname_envelope`: **normal** en el formato rsyslog enriquecido actual.

### Estado del parser

El parser queda listo para avanzar a diseno de ingest/dashboard con cobertura real sensiblemente mejor. No parece necesaria otra extension inmediata antes de trabajar integracion visual o ingest controlado.

## 11. Confirmaciones

- No se toco UniFi.
- No se cambio SIEM.
- No se activo NetFlow/IPFIX.
- No se cambio modo IDS/IPS.
- No se ejecuto BlackSun.
- No se hicieron escaneos/ataques.
- No se uso API key.
- No se modifico rsyslog.
- No se reinicio rsyslog.
- No se modifico Promtail.
- No se toco Loki/Grafana.
- No se toco Docker/firewall.
- No se hizo POST/live ingest.
- No se modifico codigo funcional.
- No se imprimieron secretos.
- No se imprimieron logs sensibles.
- No se commitearon logs/sanitizados.
- No quedaron temporales.

## 12. Recomendacion siguiente

**IDS-UNIFI-OPERATIONAL-DASHBOARD-DESIGN-01** o **IDS-UNIFI-INGEST-DESIGN-01**.

Si se quiere cerrar completamente el gap residual del parser antes de dashboard, la alternativa seria una fase pequena para `ulogd` y `sudo`, pero su impacto real es muy bajo frente al valor ya ganado.
