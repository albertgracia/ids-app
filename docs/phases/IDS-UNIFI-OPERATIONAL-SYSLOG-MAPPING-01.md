# Fase: IDS-UNIFI-OPERATIONAL-SYSLOG-MAPPING-01

## Resultado: PASS

---

## Datos del repositorio

- Rama: `scaffold/ids-v2-dev-env-01`
- HEAD inicial: `821fed3`
- HEAD final: `821fed3` (commit documental posterior)

---

## Motivo

Tras cerrar la línea de Threats directos por syslog/API en la fase checkpoint (IDS-UNIFI-THREAT-EXPORT-DECISION-CHECKPOINT-01), se requiere analizar y clasificar los logs operacionales reales de UniFi que ya llegan a `/var/log/unifi/ids.log` para sentar las bases del parser y la taxonomía de eventos.

Esta fase es READ-ONLY + documental: no implementa código ni modifica operación.

---

## Estado de canales

| Canal | Estado | Uso |
|---|---|---|
| Syslog 1514 | Activo | Recibe logs operacionales UniFi reales |
| Syslog 15514 | Activo | Contenido redundante (mismos logs que 1514) |
| API oficial UniFi | Funciona | No utilizada en esta fase |

---

## Conteos agregados de ids.log

- **Líneas totales**: 3658
- **Tamaño**: 956 KB (978581 bytes)
- **Última modificación**: 2026-06-05 22:21

### Por fuente/proceso

| Fuente | Ocurrencias | % del total |
|---|---|---|
| coredns | 1691 | 46.2% |
| odhcp6c | 840 | 23.0% |
| DPI/dpi | 458 | 12.5% |
| earlyoom | 107 | 2.9% |
| syslog-ng | 68 | 1.9% |
| dnsmasq | 30 | 0.8% |
| firewall | 7 | 0.2% |
| CEF | 3 | 0.1% |

### Por formato

| Formato | Conteo |
|---|---|
| CEF | 3 (sintéticos de fases anteriores) |
| JSON | 1648 (coredns) |
| iptables-like | 0 |
| key=value | Parcial (odhcp6c tiene formato mixto) |
| plain syslog | Resto (earlyoom, syslog-ng, DPI) |

### Por palabra clave

| Palabra clave | Conteo |
|---|---|
| dns | 1736 |
| fail/denied/blocked/drop/reject | 1135 |
| dhcp/ipv6 | 874 |
| dpi | 458 |
| error | 156 |
| warn/warning | 113 |
| memory/oom | 109 |
| threat/alert/critical | 4 (incluye sintéticos previos) |
| kernel | 0 |

---

## Fuentes observadas y formatos

### Sistema de registro remoto (rsyslog)

Los logs llegan a `.40` con formato enriquecido por rsyslog:

```
Mon DD HH:MM:SS HOSTNAME HOSTNAME process[pid]: mensaje
```

El primer `HOSTNAME` lo añade rsyslog local, el segundo es el hostname original del remitente (Cloud-Gateway-Fiber-Labraza). Esto implica que el parser deberá extraer el `process[pid]` del segundo campo después del timestamp.

### coredns (46.2%)

**Proceso**: `coredns[pid]`

**Subtipos identificados**:

1. **dnsAdBlock (JSON)** — eventos de DNS bloqueado por categoría (ADVERTISMENT). Formato JSON con campos: `timestamp`, `type`, `category`, `domain`, `ip`, `mac`, `src_ip`, `src_port`, `dst_ip`, `dst_port`, `protocol`.

2. **unifi-mq-broker failure** — errores de conexión del message broker interno: `unifi-mq-broker[pid]: Failed to send request to coredns: Post "http://localhost/api/get_domain_by_ip": dial unix /run/utm/.cd_domain: connect: resource temporarily unavailable`.

**Campos extraíbles**:
- JSON: timestamp, type, category, domain, ip, mac, src_ip, src_port, dst_ip, dst_port, protocol
- Error broker: process (unifi-mq-broker), endpoint, error type

**Severidad propuesta**: info para dnsAdBlock, low para errores broker

### odhcp6c (23.0%)

**Proceso**: `odhcp6c[pid]` (a veces envuelto por `ubios-udapi-server[pid]`)

**Patrón**: `(ubios-udapi-server[pid]: )?odhcp6c[pid]: Failed to send SOLICIT message to ff02::1:2 (Cannot assign requested address)`

**Detalles importantes**:
- Cada evento genera **dos entradas**: una desde `ubios-udapi-server` y otra desde `odhcp6c` directamente
- Esto implica una tasa de duplicación del 50% para estos eventos
- La deduplicación deberá considerar el PID como indicador

**Campos extraíbles**:
- process, pid, message_type (SOLICIT/RS), target (ff02::1:2), error

**Severidad propuesta**: low

### DPI/dpi (12.5%)

**Proceso**: `ubios-udapi-server[pid]`

**Subtipos**:

1. `[error] ubnt-dpi-util: connect: The socket was closed due to a timeout` — recurrente cada ~30 min
2. `[warn ] ubnt-dpi-util: dpi ml request failed` — recurrente cada ~30 min (alternado con error)
3. `config-migrate-helper: Migrating config .../dpi from 1 to 2` — único/arranque
4. `svc-dpi-service: +(services): Keep running service dpi` — único/arranque

**Campos extraíbles**:
- severity ([error]/[warn]), module (ubnt-dpi-util/dpi), action, details

**Severidad propuesta**: warning para timeout/ML failures, info para lifecycle

### earlyoom (2.9%)

**Proceso**: `earlyoom[pid]`

**Patrón**: `mem avail: X of Y MiB (Z%), swap free: W of V MiB (U%)`

**Frecuencia**: cada 60 minutos aproximadamente

**Valores típicos**:
- Memoria disponible: ~20-26% de 2891 MiB
- Swap libre: 90.13% de 1445 MiB

**Campos extraíbles**:
- mem_avail_mib, mem_total_mib, mem_avail_pct, swap_free_mib, swap_total_mib, swap_free_pct

**Severidad propuesta**: info (no hay presión de memoria real), medium si < 10%

### syslog-ng (1.9%)

**Proceso**: `syslog-ng[pid]`

**Patrón**: `syslog-ng starting up; version='X.x.x'` / `Reloading configuration;`

**Campos extraíbles**:
- action, version

**Severidad propuesta**: info

---

## Collector baseline

Ejecutado sobre muestra de 100 líneas sanitizadas (que preservan las proporciones reales):

| Métrica | Valor |
|---|---|
| total_lines | 100 |
| parsed | 1 (la línea CEF sintética) |
| skipped | 2 (marcadas como `unsupported_unifi_syslog_no_cef`) |
| errors | 94 (todas `no CEF payload found`) |
| duplicates | 3 |
| **Exit code** | **1** (por los errores de parseo) |

**Conclusión**: El collector actual es **CEF-only**. El 99% del contenido operacional no se procesa. Esto confirma la necesidad del parser operacional.

---

## Taxonomía propuesta

### 1. `dns_gateway_event`
- **Fuente**: coredns
- **Subtipos**: dnsAdBlock (DNS bloqueado), dnsError (broker failure)
- **Campos**: query_domain (sanitizado), category (ADS, etc.), client_ip (sanitizada), client_mac (sanitizada)
- **Severidad base**: info
- **Uso IDS**: detección de volúmenes anómalos, dominios sospechosos

### 2. `dpi_event`
- **Fuente**: DPI/ubios-udapi-server/ubnt-dpi-util
- **Subtipos**: dpi_timeout (socket timeout), dpi_ml_failure (ML request failed), dpi_lifecycle (startup/migration)
- **Campos**: module, action, severity
- **Severidad base**: warning (timeout/ML failures), info (lifecycle)
- **Uso IDS**: salud del motor DPI, degradación del gateway

### 3. `dhcp_ipv6_event`
- **Fuente**: odhcp6c
- **Subtipos**: dhcpv6_solicit_failure, dhcpv6_rs_failure
- **Campos**: message_type (SOLICIT/RS), error_description, target_address
- **Severidad base**: low
- **Nota**: implementar deduplicación (cada evento llega duplicado de odhcp6c + ubios-udapi-server)

### 4. `gateway_health_event`
- **Fuente**: earlyoom
- **Subtipos**: memory_status (reporte periódico)
- **Campos**: mem_avail_mib, mem_total_mib, mem_avail_pct, swap_free_mib, swap_total_mib, swap_free_pct
- **Severidad base**: info (normal), medium (< 10% memoria disponible)
- **Uso IDS**: tendencias de salud del gateway, degradación

### 5. `syslog_operational_event`
- **Fuente**: syslog-ng, otros procesos internos no clasificados
- **Subtipos**: service_start, config_reload
- **Campos**: action, version
- **Severidad base**: info
- **Uso IDS**: observabilidad operacional

### 6. `unclassified_unifi_syslog`
- **Fallback seguro** para logs con formato desconocido
- **Severidad base**: info
- Sin extracción de campos específicos
- Para evitar falsos positivos

---

## Campos extraíbles por tipo

| Tipo | Campos |
|---|---|
| dns_gateway_event | timestamp, host, process, pid, type, category, domain, client_ip, client_mac, src_port, dst_ip, dst_port, protocol |
| dpi_event | timestamp, host, process, pid, severity_level, module, action, details |
| dhcp_ipv6_event | timestamp, host, process, pid, message_type, error, target |
| gateway_health_event | timestamp, host, process, pid, mem_avail_mib, mem_total_mib, mem_avail_pct, swap_free_mib, swap_total_mib, swap_free_pct |
| syslog_operational_event | timestamp, host, process, pid, action, version |
| unclassified | timestamp, host, process, pid, raw_syslog (sanitizada) |

---

## Severidad inicial propuesta

| Evento | Severidad |
|---|---|
| dns_gateway_event (dnsAdBlock) | info |
| dns_gateway_event (broker error) | low |
| dpi_event (timeout/ML failure) | warning |
| dpi_event (lifecycle) | info |
| dhcp_ipv6_event | low |
| gateway_health_event (mem > 10%) | info |
| gateway_health_event (mem < 10%) | medium |
| syslog_operational_event | info |
| unclassified | info |

---

## Riesgos de privacidad

Los logs operacionales contienen:

- **IPs internas** (192.168.x.x) — sanitizar a 192.168.1.10
- **MACs** de clientes — sanitizar a AA:BB:CC:DD:EE:FF
- **Nombres de host** — sanitizar
- **Dominios DNS** consultados — sanitizar a example.com
- **Nombres de dispositivos** (hostname del gateway) — sanitizar a GATEWAY-REDACTED

Reglas para el parser:
- Todos los campos IP/MAC/host deben sanitizarse antes de persistir
- No imprimir valores reales en logs del parser
- Mantener consistencia en la sanitización (mismos valores fake para toda la sesión)

---

## Qué NO se tocó

- No se tocó UniFi.
- No se cambió SIEM.
- No se activó NetFlow/IPFIX.
- No se cambió modo IDS/IPS.
- No se ejecutó BlackSun.
- No se hicieron escaneos/ataques.
- No se usó API key.
- No se modificó rsyslog.
- No se reinició rsyslog.
- No se modificó Promtail.
- No se tocó Loki/Grafana.
- No se tocó Docker/firewall.
- No se hizo POST/live ingest.
- No se modificó código funcional.
- No se imprimieron secretos.
- No se imprimieron logs sensibles.
- No se commitearon logs/sanitizados.

---

## Parser futuro recomendado

### Fase: IDS-UNIFI-OPERATIONAL-SYSLOG-PARSER-01

Debe implementar:

1. **Parser de envelope syslog operacional**: extraer `process[pid]` y mensaje del formato `Mon DD HH:MM:SS HOSTNAME HOSTNAME process[pid]: mensaje`
2. **Clasificador por process name**: coredns, odhcp6c, ubios-udapi-server, earlyoom, syslog-ng
3. **Subclasificación por tipo de mensaje**: dnsAdBlock (JSON), error/warning vs lifecycle, etc.
4. **Extracción segura de campos con sanitización automática** de IPs, MACs, dominios, hostnames
5. **Deduplicación** específica para odhcp6c (50% de duplicación natural)
6. **Mapping a domain.Event** siguiendo la taxonomía propuesta
7. **Tests con samples sintéticos** (no derivados de logs reales)
8. **Severidad conservadora** — solo reportar problemas reales

### Samples sintéticos propuestos (no crear en esta fase)

```
packages/contracts/unifi/samples/operational/coredns.json
packages/contracts/unifi/samples/operational/dpi.log
packages/contracts/unifi/samples/operational/odhcp6c.log
packages/contracts/unifi/samples/operational/earlyoom.log
packages/contracts/unifi/samples/operational/syslog-ng.log
```

Cada sample debe ser sintético (creado manualmente, no derivado de logs reales).

---

## Próxima fase

**IDS-UNIFI-OPERATIONAL-SYSLOG-PARSER-01**: Implementar el parser para logs operacionales UniFi basado en la taxonomía y formatos identificados en esta fase.
