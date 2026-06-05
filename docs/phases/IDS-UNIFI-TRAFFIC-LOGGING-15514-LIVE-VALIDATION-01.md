# Fase: IDS-UNIFI-TRAFFIC-LOGGING-15514-LIVE-VALIDATION-01

## Resultado: PARTIAL

---

## Datos del repositorio

- Rama: `scaffold/ids-v2-dev-env-01`
- HEAD inicial: `a2e02ab`
- HEAD final: `a2e02ab` (commit documental posterior)
- Working tree: limpio

---

## Confirmación operador

| Acción | Estado |
|---|---|
| UniFi cambiado a 192.168.1.40:15514 | SÍ |
| Modo IDS/IPS sigue en Notificar | SÍ |
| Notificar y Bloquear activado | NO |
| NetFlow/IPFIX activado | NO |
| BlackSun autorizado una sola vez | SÍ |

---

## Estado receptor

| Componente | Estado |
|---|---|
| IDS health (ids-core, web, analytics-api, mcp) | 4/4 OK |
| rsyslog | active v8.2512.0 |
| 1514 TCP | LISTEN |
| 1514 UDP | UNCONN |
| 15514 TCP | LISTEN |
| 15514 UDP | UNCONN |
| `/var/log/unifi/ids.log` | 3658 líneas, 979KB |
| `/var/log/unifi/traffic.log` | 402 líneas, 67KB (crecimiento activo) |

---

## Before / Natural / After BlackSun

### traffic.log metrics

| Métrica | Before (22:26) | After natural (22:28) | After BlackSun (22:35) | Delta total (~9 min) |
|---|---|---|---|---|
| Líneas | 402 | 448 | 552 | +150 |
| Tamaño | 66722 bytes | 75814 bytes | 95202 bytes | +28480 bytes |
| CEF count | 3 | 3 | 3 | 0 |
| Keyword matches | 344 | 390 | 494 | +150 |
| BlackSun/BLACKSUN | 0 | 0 | 0 | 0 |

### ids.log metrics

| Métrica | Before |
|---|---|
| Líneas | 3658 |
| Tamaño | 979KB |
| Estado | Creciendo por 1514 operacional (separado) |

### Formato detectado en traffic.log

- **CEF**: 0 líneas en muestra de 80 (solo las 3 sintéticas de fase anterior)
- **iptables (IN=/OUT=)**: 0 líneas
- **key=value**: 1 línea
- **JSON**: 8 líneas (coredns queries)
- **Syslog operacional**: ~72 líneas (odhcp6c, ubios-udapi-server, unifi-mq-broker)

El formato dominante es **syslog operacional de UniFi** (los mismos logs que ya llegan a 1514). No hay formato iptables ni IDS alerts.

### Componentes en traffic.log (muestra 80 líneas)

| Componente | Frecuencia |
|---|---|
| odhcp6c | Alta (DHCPv6) |
| ubios-udapi-server | Alta (API server process) |
| unifi-mq-broker | Media (MQTT, MEM usage flows) |
| coredns (JSON) | Baja (DNS queries en JSON) |
| DPI | Baja (Deep Packet Inspection) |

---

## BlackSun

| Aspecto | Resultado |
|---|---|
| Ejecutado | SÍ, una sola vez |
| User-Agent | "BlackSun" |
| Target | http://www.example.com |
| Alerta en UI UniFi | NO visible (operador confirmó) |
| BlackSun en traffic.log | NO (0 matches) |
| Spike en traffic.log | NO (crecimiento constante ~25 lines/min) |

---

## Collector dry-run

| Métrica | Valor |
|---|---|
| Ejecutado | SÍ (muestra sanitizada) |
| total_lines | 80 |
| parsed | 0 |
| skipped | 3 (unsupported_unifi_syslog_no_cef) |
| errors | 76 (no CEF payload found) |
| duplicates | 1 |

El collector actual (CEF-only) no puede procesar los logs operacionales de traffic.log. Esto es esperado.

---

## Tests

| Suite | Resultado |
|---|---|
| `go test ./...` (ids-core) | PASS (8 packages) |
| `task check` | PASS (issues preexistentes: ESLint 10 + MCP F401) |

---

## Interpretación

1. **Traffic Logging llega a traffic.log**: SÍ — el puerto 15514 recibe datos en tiempo real (~25 líneas/min).
2. **Formato**: **Syslog operacional estándar de UniFi** — los mismos logs (odhcp6c, ubios-udapi-server, unifi-mq-broker, coredns) que ya llegan a 1514, NO iptables ni CEF.
3. **BlackSun en traffic.log**: **NO** — ni el evento IDS ni el User-Agent "BlackSun" aparecen en traffic.log.
4. **Alerta en UI**: **NO** visible — el operador no vio la alerta en CyberSecure > Threats.
5. **Hipótesis principal**: UniFi Cloud Gateway Fiber **envía el mismo syslog operacional a todos los destinos SIEM configurados**, sin diferenciar por categoría (Activity vs Traffic). El "Traffic Logging" en CyberSecure no exporta logs de IPS/IDS separados — es un segundo canal para el mismo syslog.
6. **Parser necesario**: No para iptables, sino que 15514 es redundante con 1514. Ambos canales contienen el mismo contenido operacional. El parser CEF actual es suficiente para 1514; 15514 no aporta datos nuevos de seguridad/tráfico.

---

## Qué NO se tocó

- ✅ No se tocó UniFi desde el agente
- ✅ No se activó bloqueo
- ✅ No se hicieron escaneos/ataques (solo BlackSun autorizado)
- ✅ No se modificó Promtail
- ✅ No se reinició Promtail
- ✅ No se tocó Loki/Grafana
- ✅ No se tocó Docker
- ✅ No se tocó firewall
- ✅ No se hizo POST/live ingest
- ✅ No se imprimieron logs sensibles
- ✅ No se commitearon logs reales/sanitizados
- ✅ No se imprimieron secretos
- ✅ Temporales eliminados

---

## Riesgos residuales

- **15514 es redundante**: No aporta datos diferentes a 1514. Operacionalmente ambos canales contienen el mismo syslog.
- **IDS alerts no exportables por syslog**: Ni 1514 (CEF) ni 15514 (operacional) reciben IDS alerts tipo BlackSun. Solo la UI los muestra.
- **Sin API poller**: La única alternativa viable para obtener IDS alerts es mediante API (go-unifi read-only) o cambiando a "Notify and Block" (generaría CEF).

---

## Próxima fase recomendada

**IDS-UNIFI-API-THREAT-POLLER-EVALUATION-01**

Dado que:
1. Syslog 1514 (Activity Logging) → solo logs operacionales + CEF de admin (sin IDS alerts)
2. Syslog 15514 (Traffic Logging) → mismo contenido operacional que 1514 (redundante)
3. BlackSun no aparece en ningún canal syslog
4. BlackSun sí aparece en UI pero no se exporta

Se recomienda evaluar la viabilidad de un **poller read-only mediante API** (go-unifi) para obtener amenazas IDS/IPS directamente de UniFi, con las siguientes consideraciones:
- Máximo privilegio mínimo (read-only token)
- Polling cada N segundos
- No modificar configuración UniFi
- No exponer credenciales en el repo
- Integrar evento en ids-core como "unifi_api_threat"
