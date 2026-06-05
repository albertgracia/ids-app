# IDS-UNIFI-OFFICIAL-IDS-TEST-BLACKSUN-01

## 1. Resultado

PARTIAL.

UniFi Cloud Gateway Fiber **SÍ generó** la alerta IDS/IPS por User-Agent BlackSun (visible en la UI), pero **NO envió la alerta por syslog** a `.40:1514`. El receptor rsyslog TCP+UDP solo recibe mensajes operacionales (coredns, DPI, odhcp6c, earlyoom).

## 2. Rama / HEAD

- Rama: `scaffold/ids-v2-dev-env-01`
- HEAD inicial: `2f03c0b`
- HEAD final: pendiente del commit documental de esta fase

## 3. Prueba oficial BlackSun (Ubiquiti)

Comando ejecutado por el operador desde `192.168.1.40` (red protegida IDS/IPS):

```
curl -A "BlackSun" http://www.example.com
```

Respuesta: HTTP 200 OK (Example Domain). Sin bloqueo (modo Notificar).

## 4. Estado UniFi

| Parámetro | Valor |
|-----------|-------|
| IDS/IPS | Activo |
| Modo | Notificar (sin bloqueo) |
| Hacking y Exploits | 5/5 |
| Malicious User Agents | Cubierto por Hacking 5/5 |
| Red protegida | Incluye 192.168.1.0/24 |
| SIEM destino | 192.168.1.40:1514 |
| Bloqueo activado | NO |

## 5. Estado receptor .40

| Verificación | Estado |
|-------------|--------|
| ids-core healthz | ok |
| ids-web health | ok |
| analytics-api health | ok |
| ids-mcp health | ok |
| rsyslog | active (v8.2512.0) |
| TCP 1514 | LISTEN (0.0.0.0 + [::]) |
| UDP 1514 | LISTEN (0.0.0.0 + [::]) |
| Log file | `/var/log/unifi/ids.log` presente |

## 6. Before / After

| Métrica | Before (21:09) | After 2min (21:13) | After 5min (21:16) | Delta total |
|---------|---------------|--------------------|--------------------|-------------|
| Lines | 838 | 904 | 963 | **+125** |
| Size | 183687 bytes | 195780 bytes | 206275 bytes | **+22588** |
| CEF count | 2 | 2 | 2 | **0** |
| Keyword matches | 797 | 853 | 904 | **+107** |

El crecimiento de líneas y tamaño corresponde a mensajes operacionales de fondo (coredns, DPI, syslog-ng), no a alertas IDS.

## 7. Confirmación UI UniFi

- **Alerta visible en UI: SÍ** (el operador confirmó que apareció en Threats)
- Categoría: IDS/IPS detectó el User-Agent "BlackSun"
- Timestamp: ~21:10 (aproximadamente 1 min post-test)
- **No llegó por syslog a .40:1514** (CEF count sin cambio)

## 8. Collector

### Muestra real
No se tomó muestra porque no hubo crecimiento CEF. El log creció solo con mensajes operacionales del mismo tipo ya documentado en la fase `IDS-UNIFI-RSYSLOG-DUAL-PROTOCOL-RECEIVER-40-01`.

### Control sintético

```
parsed:     1
errors:     0
```

PASS. El collector parsea correctamente el CEF sintético de control.

## 9. Tests

```
go test ./... -count=1 → ALL PASS
```

## 10. Interpretación

### Alerta generada pero no reenviada
UniFi Cloud Gateway Fiber **detectó** el User-Agent BlackSun y generó una alerta IDS/IPS visible en la UI (Threats), pero **no la envió por syslog** a `192.168.1.40:1514`.

### Causas posibles
1. **El syslog de UniFi no incluye alertas IDS/IPS.** El gateway envía únicamente syslog operacional (coredns, DPI, odhcp6c, etc.) y las alertas de seguridad se quedan en la UI local.
2. **Configuración de syslog incompleta.** Quizás se necesita seleccionar un nivel o categoría específica de syslog (ej. "alert" en vez del genérico) para que las alertas IDS se reenvíen.
3. **La alerta IDS se envía por un mecanismo diferente.** Puede requerir API, SNMP, o un formato/protocolo distinto al syslog BSD estándar que configuramos.
4. **Latencia.** Tal vez la alerta se envía por syslog con retraso mayor a los 5 minutos de observación (aunque los logs operacionales sí llegan en tiempo real).

### El pipeline funciona
El receptor rsyslog y el collector están operativos:
- Logs operacionales de UniFi llegan por UDP 1514 correctamente
- El collector parsea CEF sintético y clasifica correctamente los mensajes no-CEF
- No hay errores de infraestructura

## 11. Qué NO se tocó

- UniFi config (read-only — operador confirmó visualmente)
- SIEM, Promtail, Loki, Grafana, Docker
- Firewall, NetFlow/IPFIX
- DB / Redis / Postgres
- Nginx / Cloudflare
- POST a ids-core / live ingest
- No se hicieron escaneos, ataques, ni fuerza bruta
- No se activó bloqueo
- No se imprimieron logs sensibles ni secretos

## 12. Próxima fase recomendada

`IDS-UNIFI-IDS-ALERT-SYSLOG-FORMAT-RESEARCH-01`

Acciones:
1. Investigar en documentación de UniFi / Ubiquiti si las alertas IDS/IPS se envían por syslog o solo quedan en la UI local.
2. Verificar si existe un nivel de syslog específico (emerg/alert/crit) que contenga IDS alerts.
3. Probar con puerto syslog estándar 514 UDP si el gateway trata las alertas de forma distinta.
4. Alternativa: considerar recoger alertas mediante la API local de UniFi si no hay soporte syslog para IDS.
5. Si no hay soporte syslog para IDS alerts, documentar limitación y evaluar estrategia alternativa (ej. polling de la API de UniFi, o solo detección Suricata local en la red).
