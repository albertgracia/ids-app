# Fase: IDS-UNIFI-THREAT-EXPORT-DECISION-CHECKPOINT-01

## Resultado: PASS

---

## Datos del repositorio

- Rama: `scaffold/ids-v2-dev-env-01`
- HEAD inicial: `c72c1ea`
- HEAD final: `c72c1ea` (commit documental posterior)
- Working tree: limpio

---

## Motivo

Checkpoint documental de decisión tras 10 fases de investigación sobre exportación de alertas IDS/IPS desde UniFi Cloud Gateway Fiber. Se cierra formalmente la línea "Threats directos por syslog/API oficial en modo Notificar" como no viable en este entorno, y se define el nuevo rumbo de desarrollo de ids-app.

---

## Resumen ejecutivo

UniFi Cloud Gateway Fiber detecta amenazas IDS/IPS correctamente (probado con BlackSun, alerta visible en UI). Sin embargo, **ningún canal de exportación oficial probado** (syslog 1514 CEF, syslog 15541, API Integration v1, API Controller v2) entrega esas alertas fuera de la UI en modo Notificar. Tras 10 fases de investigación, se abandona la vía de obtener Threats directos de UniFi y se pivota a construir valor con los datos reales que sí están disponibles: logs operacionales por syslog, inventario por API, y telemetría de red.

---

## Hechos demostrados

### Detección UI

- **BlackSun oficial generó alerta visible en UniFi UI** (fase IDS-UNIFI-OFFICIAL-IDS-TEST-BLACKSUN-01, PARTIAL).
- IDS/IPS de UniFi funciona correctamente a nivel UI con 5/5 categorías en Hacking y Exploits.

### Syslog

- **.40 recibe syslog real UniFi** desde que se añadió UDP 1514 (fase IDS-UNIFI-RSYSLOG-DUAL-PROTOCOL-RECEIVER-40-01).
- **1514 TCP+UDP funciona** — rsyslog v8.2512.0, LISTEN dual stack.
- **15514 TCP+UDP preparado** como receptor separado (fase IDS-UNIFI-TRAFFIC-LOGGING-SEPARATE-PORT-15514-01).
- **UniFi envía realmente por UDP** aunque la UI muestre TCP (confirmado con tcpdump).
- **Syslog actual entrega logs operacionales**: coredns (JSON), DPI, odhcp6c, earlyoom, syslog-ng, ubios-udapi-server, unifi-mq-broker.
- **No se observó CEF IDS alert por syslog** en modo Notificar — CEF count = 2 (sintéticos de fase anterior) en todo el período de pruebas con BlackSun.

### API oficial

- **Integration API v1 funciona**: `/sites` (200), `/devices` (200), `/clients` (200).
- **Classic Controller API funciona** con `default` como site reference y API key: `stat/health`, `stat/device`, `stat/alluser`, `stat/sta`, `stat/dpi`, `rest/alarm`, `rest/setting`, `rest/firewallrule`, `self`.
- **No hay endpoint oficial útil de Threats/IDS Events** — `stat/threat`, `stat/event`, `stat/blocked`, `rest/event`, `rest/threat`, `cybersecure/threats` todos 404/400.
- **`rest/alarm` existe pero devuelve vacío** (`data:[]`) con API key, incluso con filtros de archivado.
- API oficial puede servir para **inventario/contexto**, no para alertas IDS.

### Parser/collector

- **CEF parser funciona** correctamente con muestras sintéticas.
- **Syslog envelope CEF parser funciona** (extrae CEF de líneas con prefijo temporal + hostname).
- **Collector dry-run funciona** (unifi-parallel-collector).
- **Falta parser para syslog operacional real** (coredns JSON, DPI, odhcp6c) y para iptables si se decide usar ese canal.

---

## Hipótesis descartadas

| Hipótesis | Estado | Evidencia |
|---|---|---|
| "El receptor .40 no funciona" | **Descartada** | TCP+UDP funcionan, tests sintéticos y reales PASS |
| "UniFi no envía syslog" | **Descartada** | 570+ líneas reales recibidas inmediatamente tras añadir UDP |
| "El problema es solo de parser" | **Descartada** | No llegó alerta IDS exportada que parsear — CEF count = 2 constante |
| "La API oficial expone Threats" | **Descartada** | Todos los endpoints de threats/events devuelven 404/400 |
| "Activity Logging SIEM en modo Notificar exporta BlackSun" | **No demostrado** | BlackSun visible en UI pero ausente en syslog y API |

---

## Canales funcionando

| Canal | Estado | Contenido | Utilidad para ids-app |
|---|---|---|---|
| Syslog 1514 | ✅ Activo | Logs operacionales (coredns, DPI, odhcp6c, etc.) + CEF sintético | Alta — fuente principal de telemetría |
| Syslog 15514 | ✅ Preparado | Mismo contenido que 1514 (redundante) | Media — disponible si se necesita segregación |
| API Integration v1 | ✅ Funciona | Sites, devices, clients | Media — inventario de red |
| API Controller v2 | ✅ Funciona (con `default`) | Health, devices, users, alarms, settings, firewall | Media — contexto operativo |
| CEF Parser | ✅ Funciona | CEF events sintéticos | Alta — preparado para CEF real si llega |

## Canales no viables por ahora

| Canal | Estado | Motivo |
|---|---|---|
| Syslog IDS alerts (modo Notificar) | ❌ No viable | BlackSun no exportado por syslog ni CEF |
| API Threats endpoint | ❌ No existe | Todos los endpoints probados devuelven 404/400 |
| API interna UI | ❌ Descartada | Riesgo de rotura por updates, no oficial, requiere cookie/sesión |
| Notify and Block | ⏸️ Opcional futuro | No probado aún; requiere autorización y ventana controlada |

---

## Decisión técnica

### Decisión principal

**Cerrar por ahora la línea: "UniFi Threats directos por syslog/API oficial en modo Notificar"**

Estado: **No viable / no demostrada en este entorno.**

Tras 10 fases de investigación, se confirma que UniFi Cloud Gateway Fiber en modo Notificar **no exporta las alertas IDS/IPS visibles en la UI** por ninguno de los canales oficiales disponibles (syslog CEF, syslog iptables, Integration API, Controller API).

### Mantener

- Syslog **1514** para logs operacionales
- Syslog **15514** como receptor preparado para Traffic Logging futuro
- **API oficial** como fuente de inventario/contexto (sites, devices, clients, health, settings)
- **Parser CEF** existente
- **Collector dry-run** existente

### No perseguir ahora

- API interna UI (riesgo de rotura, no oficial)
- Más pruebas BlackSun en modo Notificar (no aporta nuevo conocimiento)
- Cambios a "Notify and Block" salvo fase opcional futura con autorización explícita
- Live ingest antes de tener parser y contrato definidos para los datos disponibles

### Pivot

Construir valor inmediato con los datos reales ya disponibles:

1. **Operational syslog mapping** — analizar y clasificar los logs que ya llegan a 1514
2. **Parser de logs operacionales UniFi** — crear parser para coredns JSON, DPI, odhcp6c, eventos de gateway
3. **API inventory enrichment** — usar API oficial para enriquecer assets sin exponer datos sensibles
4. **Dashboard telemetry** — mostrar telemetría UniFi en el dashboard IDS
5. **Suricata/sensor real futuro** — fuente dedicada de alertas IDS cuando esté disponible

---

## Arquitectura actual recomendada

```
UniFi Cloud Gateway Fiber
  │
  ├─ UDP 1514 ─── rsyslog .40 ─── /var/log/unifi/ids.log
  │                                    └─── unifi-parallel-collector (CEF)
  │
  ├─ UDP 15514 ─── rsyslog .40 ─── /var/log/unifi/traffic.log
  │                                    └─── futuro parser iptables/traffic
  │
  └─ HTTPS ─────── proxy ──────── Integration API v1 (sites/devices/clients)
                                  Controller API v2 (health/device/alluser/sta)
```

---

## Roadmap inmediato

### Siguiente fase

**IDS-UNIFI-OPERATIONAL-SYSLOG-MAPPING-01**

Analizar de forma sanitizada/agregada los logs reales que ya llegan a 1514:

- coredns (JSON)
- DPI
- odhcp6c
- earlyoom
- syslog-ng
- gateway operational events
- ubios-udapi-server
- unifi-mq-broker

Crear taxonomía de eventos:
- `dns_gateway_event`
- `dpi_event`
- `gateway_health_event`
- `dhcp_ipv6_event`
- `system_resource_event`
- `syslog_operational_event`
- `unclassified_unifi_syslog`

### Después

**IDS-UNIFI-OPERATIONAL-SYSLOG-PARSER-01**

Crear parser real para los formatos operacionales identificados.

### Después

**IDS-UNIFI-API-INVENTORY-ENRICHMENT-DESIGN-01**

Usar API oficial para enriquecer assets/devices/clients sin exponer datos sensibles.

### Después

**IDS-DASHBOARD-UNIFI-TELEMETRY-INTEGRATION-01**

Mostrar telemetría UniFi en dashboard IDS.

### Opcional futuro

**IDS-UNIFI-NOTIFY-AND-BLOCK-EVALUATION-01**

Solo si el operador acepta el riesgo, con:
- Ventana corta y controlada
- Rollback inmediato a Notificar
- BlackSun oficial una sola vez
- Sin escaneos ni ataques adicionales

---

## Riesgos residuales

- IDs-app no tendrá alertas IDS/IPS en tiempo real hasta que se implemente una fuente alternativa (Suricata, sensor dedicado, o NiB)
- `rest/networkconf` expone `wan_username` por API — sensible, requerirá sanitización
- Los logs operacionales contienen IPs internas, MACs, nombres de host — requerirán manejo cuidadoso
- 15514 es redundante con 1514 en la configuración actual de UniFi — no aporta datos diferentes

---

## Qué NO se tocó

- ✅ No se tocó UniFi
- ✅ No se cambió SIEM
- ✅ No se activó NetFlow/IPFIX
- ✅ No se cambió modo IDS/IPS
- ✅ No se ejecutó BlackSun
- ✅ No se hicieron escaneos/ataques
- ✅ No se usó API key
- ✅ No se modificó rsyslog
- ✅ No se reinició rsyslog
- ✅ No se modificó Promtail
- ✅ No se tocó Loki/Grafana
- ✅ No se tocó Docker/firewall
- ✅ No se hizo POST/live ingest
- ✅ No se modificó código funcional
- ✅ No se imprimieron secretos
- ✅ No se imprimieron logs sensibles
- ✅ No se commitearon logs/API responses

---

## Próxima fase recomendada

**IDS-UNIFI-OPERATIONAL-SYSLOG-MAPPING-01**

Analizar y clasificar los logs operacionales reales que ya fluyen a 1514, creando la taxonomía de eventos que servirá de base para el parser y la ingesta.
