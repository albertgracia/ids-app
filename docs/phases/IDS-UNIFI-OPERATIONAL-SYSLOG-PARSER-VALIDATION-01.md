# FASE: IDS-UNIFI-OPERATIONAL-SYSLOG-PARSER-VALIDATION-01

**Resultado:** PASS

**Fecha:** 2026-06-05

---

## 1. Objetivo

Validar el parser operacional UniFi (`ParseOperationalSyslog` + `NormalizeOperational`) contra logs reales del gateway `.40` usando una muestra temporal sanitizada fuera del repo.

## 2. Estado del repositorio

| Ítem | Valor |
|---|---|
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `cdafe12` |
| HEAD final | `cdafe12` |
| Working tree | limpio |

## 3. Estado read-only de .40

| Servicio | Estado |
|---|---|
| IDS health | `ids-core`, `ids-web`, `analytics-api`, `ids-mcp` todos OK |
| rsyslog | active |
| Puerto 1514 | TCP+UDP LISTEN |
| Puerto 15514 | TCP+UDP LISTEN |
| `/var/log/unifi/ids.log` | 3658 líneas, 956 KB |
| `/var/log/unifi/traffic.log` | 2.7 MB |

## 4. Conteos agregados de ids.log (3658 líneas)

| Fuente | Conteo | % |
|---|---|---|
| coredns | 1691 | 46.2% |
| ubios-udapi-server (+DPI+odhcp6c wrap) | 1006 | 27.5% |
| odhcp6c | 840 | 23.0% |
| earlyoom | 107 | 2.9% |
| syslog-ng | 68 | 1.9% |
| firewall/iptables | 7 | 0.2% |
| CEF | 3 | 0.1% |

CEF real: 3 líneas. Las 3655 restantes son operacionales no-CEF.

## 5. Muestra temporal

| Atributo | Valor |
|---|---|
| Líneas extraídas | 300 (tail -n 300) |
| Raw impreso | No |
| Raw commiteado | No |
| Sanitizado derivado | Sí (IPs/MACs/dominios/clientes reemplazados) |
| Sanitizado impreso | No |
| Sanitizado commiteado | No |
| Temporales eliminados | Sí |

### Composición de la muestra (300 líneas)

| Fuente | Conteo |
|---|---|
| coredns | 16 |
| ubios-udapi-server | 151 |
| odhcp6c | 60 |
| DPI/dpi | 36 |
| earlyoom | 8 |
| syslog-ng | 6 |
| unifi-mq-broker | 4 |
| firewall/iptables | 2 |
| CEF | 1 |

Nota: ubios-udapi-server (151) incluye eventos wrapper de odhcp6c y DPI. Hay solapamiento natural.

## 6. Collector dry-run contra muestra real sanitizada

| Métrica | Valor |
|---|---|
| Ejecutado | Sí (`--input` sanitizado, `--output json`) |
| total_lines | 300 |
| parsed | 294 (98.0%) |
| skipped | 0 (0.0%) |
| errors | 1 (0.3%) — línea 1, primer byte del log ("no CEF payload found") |
| duplicates | 5 (1.7%) — eventos odhcp6c duplicados naturalmente |

### Distribución por event_kind

| kind | Count |
|---|---|
| `unclassified_unifi_syslog` | 188 |
| `dhcp_ipv6_event` | 59 |
| `dpi_event` | 19 |
| `dns_gateway_event` | 13 |
| `gateway_health_event` | 8 |
| `syslog_operational_event` | 6 |
| *(sin kind — error/duplicados/TEST)* | 7 |

### Distribución por event_type (domain)

| event_type | Count |
|---|---|
| `unclassified_event` | 188 |
| `network_connection` | 78 |
| `system` | 14 |
| `dns_query` | 13 |
| `threat_detected` | 1 |

### Distribución por severidad

| Severidad | Count |
|---|---|
| info | 215 |
| medium | 78 |
| critical | 1 |

La severidad `critical` corresponde a la línea de TEST (línea 112: "TEST synthetic 1514 still alive") que el parser CEF clasificó erróneamente como amenaza. No es un evento real.

### Warnings dominantes

| Warning | Count |
|---|---|
| `duplicated_hostname_envelope` | 253 |
| `unsupported_operational_format` | 188 |
| `missing_pid` | 40 |
| `duplicate raw_hash` | 5 |
| `embedded_cef_extracted` | 1 |
| `syslog_envelope_detected` | 1 |

## 7. Regresión sintética

| Sample | total | parsed | errors | tipos |
|---|---|---|---|---|
| coredns.json.log | 2 | 2 | 0 | dns_query=2 |
| dpi.log | 4 | 4 | 0 | network_connection=4 |
| odhcp6c.log | 3 | 3 | 0 | network_connection=3 |
| earlyoom.log | 3 | 3 | 0 | system=3 |
| syslog-ng.log | 2 | 2 | 0 | system=2 |
| CEF embedded | 3 | 3 | 0 | system=3 |

Todos los controles sintéticos OK. CEF intacto.

## 8. Tests

| Suite | Resultado |
|---|---|
| `go test ./...` | PASS (todos los paquetes) |
| `task check` | PASS con issues preexistentes (ESLint 10 circular JSON, mcp-server F401 uvicorn) |

## 9. Gaps del parser

### Formatos no cubiertos por clasificación específica (188 unclassified)

| Proceso | Conteo en muestra | Descripción |
|---|---|---|
| `ubios-udapi-server` | ~53 | Mensajes wrapper sin patrón `process[pid]:`. Algunos se clasifican por contenido (29 DHCP, 19 DPI), el resto queda unclassified. |
| `MCA` | 40 | Device agent UniFi. Formato: `device_host process: msg` sin PID. |
| `mcad` | 20 | Otro proceso device agent. Sin PID. |
| `dpi-flow-stats` | 17 | Estadísticas de flujo DPI. Sin PID. |
| `systemd` | 7 | Mensajes systemd/journal. Formato de syslog diferente. |
| `ulogd` | 1 | ULOG firewall. Sin PID. |
| `sudo` | 1 | Comandos sudo. Sin PID. |

### Procesos nuevos no cubiertos anteriormente

- `MCA` — mensajes de device agent UniFi (inform, setparam, cfgversion, notif status)
- `mcad` — otro device agent
- `dpi-flow-stats` — estadísticas de flujo DPI periódicas
- `systemd` — mensajes de systemd/journald
- `ulogd` — ULOG (firewall log daemon)
- `sudo` — comandos sudo

### Warnings recurrentes

1. **`duplicated_hostname_envelope`** (253 en muestra, 84%): casi todas las líneas tienen HOST1=HOST2 porque rsyslog en .40 recibe de un solo gateway. Es normal, no problemático.
2. **`unsupported_operational_format`** (188 en muestra): formato `process[pid]: msg` no coincide. Principalmente MCA, mcad, dpi-flow-stats, systemd, ulogd, sudo, y algunos ubios-udapi-server.
3. **`missing_pid`** (40): siempre ligado a MCA (formato `device_host MCA: msg` sin PID).

### Privacidad

El parser no extrae IPs, MACs, dominios, clientes, usernames ni hostnames en los eventos normalizados. Las IPs en mensajes de texto plano no se extraen a campos estructurados. La sanitización previa a validación reemplazó todas las IPs/MACs/dominios. No hay riesgo de exposición.

### Mejoras recomendadas para siguiente fase

1. **MCA class**: añadir `KindMCAEvent` para mensajes de `MCA`/`mcad` (inform, setparam, cfgversion, capability). Son ~40 líneas en muestra (~13%) y representan actividad de dispositivos UniFi (switches, APs). Contienen IPs de gestión, hostnames de dispositivos y versión de firmware — útiles para inventory.
2. **dpi-flow-stats class**: añadir `KindDPIFlowStatsEvent` con categoría `network_connection` para `dpi-flow-stats` (~17 líneas, ~6%). Contiene estadísticas de tráfico.
3. **systemd class**: añadir `KindSystemdEvent` para mensajes systemd. Baja prioridad (~7 líneas, ~2%).
4. **ulogd class**: añadir `KindFirewallEvent` para mensajes ulogd (firewall). Baja prioridad (~1 línea).
5. **sudo class**: añadir `KindSudoEvent` como subclase de `syslog_operational_event`. Baja prioridad (~1 línea).

Prioridad: MCA > dpi-flow-stats > systemd > ulogd/sudo.

## 10. Confirmaciones

- ✅ No se tocó UniFi.
- ✅ No se cambió SIEM.
- ✅ No se activó NetFlow/IPFIX.
- ✅ No se cambió modo IDS/IPS.
- ✅ No se ejecutó BlackSun.
- ✅ No se hicieron escaneos/ataques.
- ✅ No se usó API key.
- ✅ No se modificó rsyslog.
- ✅ No se reinició rsyslog.
- ✅ No se modificó Promtail.
- ✅ No se tocó Loki/Grafana.
- ✅ No se tocó Docker/firewall.
- ✅ No se hizo POST/live ingest.
- ✅ No se modificó código funcional.
- ✅ No se imprimieron secretos.
- ✅ No se imprimieron logs sensibles.
- ✅ No se commitearon logs/sanitizados.
- ✅ No quedaron temporales.

## 11. Próxima fase recomendada

**IDS-UNIFI-OPERATIONAL-PARSER-EXTEND-01** — extender parser con:
- `MCA` class (KindMCAEvent) para mensajes de device agent UniFi
- `dpi-flow-stats` class (KindDPIFlowStatsEvent)
- Opcional: `systemd`, `ulogd`, `sudo`
