# Fase: IDS-UNIFI-OPERATIONAL-SYSLOG-PARSER-01

## Resultado: PASS

---

## Datos del repositorio

- Rama: `scaffold/ids-v2-dev-env-01`
- HEAD inicial: `5daca84`
- HEAD final: pendiente del commit documental

---

## Motivo

Implementar un parser para logs operacionales UniFi que convierta los formatos reales que llegan a `/var/log/unifi/ids.log` (coredns JSON, DPI, odhcp6c, earlyoom, syslog-ng) en eventos normalizados de ids-app, manteniendo intacto el parser CEF existente.

---

## Archivos modificados/creados

### Creados

| Archivo | Propósito |
|---|---|
| `services/ids-core/internal/unifi/operational.go` | Parser de syslog operacional UniFi |
| `services/ids-core/internal/unifi/normalize_operational.go` | Normalización a UniFiEvent y mapeo a domain.Event |
| `services/ids-core/internal/unifi/operational_test.go` | Tests unitarios del parser operacional (21 tests) |
| `packages/contracts/unifi/samples/operational/coredns.json.log` | Sample sintético coredns JSON dnsAdBlock + broker |
| `packages/contracts/unifi/samples/operational/dpi.log` | Sample sintético DPI timeout/ML failure/lifecycle |
| `packages/contracts/unifi/samples/operational/odhcp6c.log` | Sample sintético odhcp6c SOLICIT/RS failures |
| `packages/contracts/unifi/samples/operational/earlyoom.log` | Sample sintético earlyoom memory status |
| `packages/contracts/unifi/samples/operational/syslog-ng.log` | Sample sintético syslog-ng lifecycle |
| `packages/contracts/unifi/samples/operational/unclassified.log` | Sample sintético procesos no reconocidos |

### Modificados

| Archivo | Cambio |
|---|---|
| `services/ids-core/cmd/unifi-parallel-collector/main.go` | Fallback a parser operacional para líneas no-CEF |
| `services/ids-core/cmd/unifi-parallel-collector/main_test.go` | Tests: 8 nuevos tests de samples operacionales + regresión CEF |
| `packages/contracts/unifi/README.md` | Documentación de samples operacionales |

---

## Parser implementado

### `ParseOperationalSyslog(line string)`

- Parse envelope syslog enriquecido por rsyslog: `Mon DD HH:MM:SS HOST1 HOST2 process[pid]: mensaje`
- Soporta 1 o 2 hostnames (rsyslog_host + device_host)
- Soporta procesos con y sin PID
- Extrae PID del formato `process[NUMBER]:`
- Maneja rutas absolutas en process (ej: `/usr/bin/coredns` → `coredns`)
- Genera warnings controlados: `duplicated_hostname_envelope`, `missing_second_hostname`, `missing_pid`
- Clasifica por process name en 6 kinds

### Formatos regex soportados

1. Dos hostnames + process[pid]: (principal)
2. Un hostname + process[pid]: (envelope mínimo)
3. Dos hostnames + process sin PID
4. Un hostname + process sin PID

### `NormalizeOperational(msg) → *UniFiEvent`

- Reutiliza la estructura `UniFiEvent` existente
- Compatible con `ToDomainEvent()` para mapeo a `domain.Event`
- Severidad mapeada de keywords a escala CEF numérica (0-10)
- Mensajes seguros sin raw completo
- Metadata: process, event_kind, pid, device_host, has_json, JSON fields, etc.

---

## Kinds soportados

| Kind | Procesos | EventType | Severidad base |
|---|---|---|---|
| `dns_gateway_event` | coredns, unifi-mq-broker | dns_query | info (0) / low (3) |
| `dpi_event` | ubios-udapi-server (+ DPI msg) | network_connection | info (0) / low (3) |
| `dhcp_ipv6_event` | odhcp6c, ubios-udapi-server (+ odhcp6c msg) | network_connection | info (0) / low (3) |
| `gateway_health_event` | earlyoom | system | info (0) / medium (6) |
| `syslog_operational_event` | syslog-ng | system | info (0) |
| `unclassified_unifi_syslog` | cualquier otro | unclassified_event | info (0) |

### Severidad por keywords

| Keyword | Severidad |
|---|---|
| block/deny en DNS | low (3) |
| error/fail | low (3) |
| timeout/connect failure | low (3) |
| kill/oom | high (8) |
| pressure/low memory | medium (6) |
| warning lifecycle | low (3) |
| normal/report | info (0) |

---

## Envelope rsyslog soportado

Formato: `Mon DD HH:MM:SS RSYSLOG_HOST [DEVICE_HOST] process[pid]: mensaje`

Ejemplo real (sanitizado):
```
Jun  5 22:16:36 Cloud-Gateway-Fiber-Labraza Cloud-Gateway-Fiber-Labraza coredns[5926]: {"event":"dnsAdBlock",...}
```

Donde:
- `RSYSLOG_HOST` = hostname añadido por rsyslog en .40
- `DEVICE_HOST` = hostname original del gateway (puede ser el mismo)
- `process[pid]` = proceso emisor
- Mensaje = contenido restante

Si solo hay un hostname, genera warning `missing_second_hostname` pero parsea igual.
Si ambos hostnames son iguales, genera warning `duplicated_hostname_envelope`.

---

## Sanitización y privacidad

- No se usa raw completo en metadata ni en mensajes
- Mensajes seguros: `"DNS dnsAdBlock for example.com"`, `"DPI socket timeout"`, etc.
- No se almacenan IPs/MACs/dominios reales en metadata sin sanitizar
- Samples sintéticos no contienen datos reales
- `NormalizeOperational` omite el raw completo en `Message`

---

## Samples sintéticos creados

6 archivos en `packages/contracts/unifi/samples/operational/`:

- `coredns.json.log`: 2 líneas (coredns JSON dnsAdBlock + unifi-mq-broker error)
- `dpi.log`: 4 líneas (timeout, ML failure, config-migrate, lifecycle)
- `odhcp6c.log`: 3 líneas (SOLICIT failure, wrapped por ubios, RS failure)
- `earlyoom.log`: 3 líneas (memory status report)
- `syslog-ng.log`: 2 líneas (startup, config reload)
- `unclassified.log`: 2 líneas (procesos no reconocidos)

Todos son sintéticos. No contienen datos reales. No derivan de logs reales.

---

## Tests unitarios

### `services/ids-core/internal/unifi/operational_test.go`

21 tests que cubren:

| Test | Qué verifica |
|---|---|
| TestParseOperationalSyslog_CoreDNSJSON | coredns JSON dnsAdBlock, kind, has_json, PID, hostnames |
| TestParseOperationalSyslog_DPITimeout | DPI timeout, kind dpi_event |
| TestParseOperationalSyslog_DPIFailure | DPI ML failure |
| TestParseOperationalSyslog_ODHCP6CSolicitFailure | odhcp6c SOLICIT, kind dhcp_ipv6_event |
| TestParseOperationalSyslog_ODHCP6CThroughUbios | ubios-udapi-server wrapping odhcp6c |
| TestParseOperationalSyslog_Earlyoom | earlyoom memory, PID, kind gateway_health_event |
| TestParseOperationalSyslog_SyslogNg | syslog-ng lifecycle, kind syslog_operational_event |
| TestParseOperationalSyslog_Unclassified | unknown process, kind unclassified |
| TestParseOperationalSyslog_DuplicatedHostnameEnvelope | rsyslog_host == device_host → warning |
| TestParseOperationalSyslog_MissingSecondHostname | un solo hostname → warning |
| TestParseOperationalSyslog_MissingPID | proceso sin PID → warning |
| TestParseOperationalSyslog_EmptyLine | error controlado |
| TestParseOperationalSyslog_InvalidFormat | error controlado |
| TestNormalizeOperational_CoreDNSJSON | UniFiEvent creado, ToDomainEvent valido |
| TestNormalizeOperational_DPI | event_type y severity correctos |
| TestNormalizeOperational_GatewayHealthMemory | severity info para memory report normal |
| TestParseOperationalSyslog_UniFiMQBroker | unifi-mq-broker → kind dns_gateway_event |
| TestParseOperationalSyslog_WithPathInProcess | /usr/bin/coredns → process = coredns |

### `services/ids-core/cmd/unifi-parallel-collector/main_test.go`

9 tests operacionales añadidos:

| Test | Parsed |
|---|---|
| TestRunCoreDNSSampleParsedAsOperational | 2 |
| TestRunDPISampleParsedAsOperational | 4 |
| TestRunODHCP6CSampleParsedAsOperational | 3 |
| TestRunEarlyoomSampleParsedAsOperational | 3 |
| TestRunSyslogNgSampleParsedAsOperational | 2 |
| TestRunAllOperationalSamplesParsed | 16 |
| TestRunCEFStillWorksAfterOperationalIntegration | 1 |
| TestRunSyslogEmbeddedCEFStillWorksAfterOperationalIntegration | 1 |
| TestRunSyslogUniFiNoCEFSkipped (existente) | sigue funcionando |

---

## CLI dry-run validación

| Sample | parsed | errors |
|---|---|---|
| coredns.json.log | 2 | 0 |
| dpi.log | 4 | 0 |
| odhcp6c.log | 3 | 0 |
| earlyoom.log | 3 | 0 |
| syslog-ng.log | 2 | 0 |
| unclassified.log | 2 | 0 |
| CEF regression (syslog-embedded-cef) | 1 | 0 |

---

## Compatibilidad CEF

- Parser CEF existente no modificado
- Collector intenta CEF primero, operacional como fallback
- Líneas con "unifi"/"ubiquiti" en el mensaje (sin CEF) ahora pasan por parser operacional antes de ser descartadas
- Todos los tests CEF existentes siguen pasando
- Flag `--operational` (default true) permite desactivar fallback

---

## Limitaciones

- El parser asume el formato rsyslog enriquecido exacto observado en `.40`; cambios en la configuración de rsyslog podrían romper el envelope
- No se hace validación de timestamp real (solo extracción textual)
- La clasificación de `ubios-udapi-server` depende de contenido del mensaje (heurístico)
- La severidad es conservadora: información operacional no recibe high/critical salvo keywords claras de OOM/kill
- No hay live ingest — solo parser en dry-run
- `ErrUnsupportedUniFiSyslogNoCEF` ahora intenta parser operacional antes de skipped

---

## Qué NO se tocó

- No se tocó UniFi
- No se cambió SIEM
- No se activó NetFlow/IPFIX
- No se cambió modo IDS/IPS
- No se ejecutó BlackSun
- No se hicieron escaneos/ataques
- No se usó API key
- No se modificó rsyslog
- No se reinició rsyslog
- No se modificó Promtail
- No se tocó Loki/Grafana
- No se tocó Docker/firewall
- No se hizo POST/live ingest
- No se usaron logs reales como samples
- No se commitearon logs reales/sanitizados
- No se imprimieron secretos
- No se imprimieron logs sensibles
- No se modificó `cef.go` (parser CEF intacto)
- No se modificó `mapper.go` (NormalizeCEF intacto)

---

## Próxima fase recomendada

**IDS-UNIFI-OPERATIONAL-SYSLOG-PARSER-VALIDATION-01**

Validación del parser operacional con logs reales sanitizados de `.40`:
1. Leer muestra temporal de `/var/log/unifi/ids.log`
2. Ejecutar collector dry-run con parser operacional
3. Verificar que parsed > 0 y errores mínimos
4. No commitear logs reales
5. Ajustar parser si hay falsos positivos o patrones no cubiertos
