# IDS-UNIFI-IDSLOG-SOURCE-REVIEW-01

**Resultado:** PASS

**Objetivo:** Revisar read-only configuración rsyslog en .40 para determinar por qué `/var/log/unifi/ids.log` no recibe datos mientras `/var/log/unifi/traffic.log` sí crece.

---

## Repo

| Item | Valor |
|------|-------|
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `909708c` |
| HEAD final | (por commit) |
| Git status final | Limpio |
| Push | (por realizar) |

## Baseline .40

| Item | Resultado |
|------|-----------|
| Host | `ubuntu-server` |
| rsyslog | active |
| Puerto 1514 | TCP+UDP LISTEN |
| Puerto 15514 | TCP+UDP LISTEN |
| ids.log metadata | 978581 bytes, 3658 líneas, mtime Jun 5 22:21 |
| traffic.log metadata | 3791285 bytes, 14124 líneas, mtime Jun 6 12:29 (creciendo) |

## Rsyslog Config

### Ficheros revisados

| Fichero | Rol |
|---------|-----|
| `/etc/rsyslog.conf` | Config base — incluye `/etc/rsyslog.d/*.conf` |
| `/etc/rsyslog.d/30-unifi-ids-tcp.conf` | **Puerto 1514 → /var/log/unifi/ids.log** |
| `/etc/rsyslog.d/31-unifi-traffic-15514.conf` | **Puerto 15514 → /var/log/unifi/traffic.log** |
| `/etc/rsyslog.d/20-ufw.conf` | UFW → /var/log/ufw.log (no relacionado) |
| `/etc/rsyslog.d/50-default.conf` | Reglas por defecto del sistema |

### Reglas detalladas

**30-unifi-ids-tcp.conf:**
```
input(type="imtcp" port="1514" ruleset="unifi_ids")
input(type="imudp" port="1514" ruleset="unifi_ids")
→ omfile: /var/log/unifi/ids.log
→ Sin filtro — todo lo que llega al puerto 1514 va a ids.log
```

**31-unifi-traffic-15514.conf:**
```
input(type="imtcp" port="15514" ruleset="unifi_traffic_15514")
input(type="imudp" port="15514" ruleset="unifi_traffic_15514")
→ omfile: /var/log/unifi/traffic.log
→ Sin filtro — todo lo que llega al puerto 15514 va a traffic.log
```

### Timelines de cambios

| Fecha/Hora | Evento |
|-----------|--------|
| Jun 5 20:54 | `30-unifi-ids-tcp.conf` creado (TCP only) |
| Jun 5 22:16 | `30-unifi-ids-tcp.conf` actualizado (UDP añadido) |
| Jun 5 22:16 | Backup `bak-traffic` creado |
| Jun 5 22:18 | `31-unifi-traffic-15514.conf` creado (nuevo puerto 15514) |
| Jun 5 22:21 | **Última línea en ids.log** — desde entonces no recibe datos |
| En adelante | traffic.log sigue creciendo (~2.5KB/min) |

### Conclusión de la revisión

Ambos puertos (1514 y 15514) están LISTEN. La regla de ids.log es correcta y no tiene filtros. Si llegaran datos al puerto 1514, se escribirían en ids.log.

**La causa es que el gateway UniFi dejó de enviar al puerto 1514.** La configuración del gateway probablemente se actualizó para enviar solo al puerto 15514 (cuando se añadió el 22:18), o el gateway cambió su destino de syslog.

## Conteos sin Contenido

| Patrón | traffic.log | ids.log |
|--------|-------------|---------|
| Líneas totales | 14,124 | 3,658 |
| blocked/bloqueado/firewall/amenaza/threat/alert/security/detect | 12 | 13 |
| DROP/REJECT | 0 | 0 |
| SRC=/DST= | 2 | 3 |
| IN=/OUT= | 0 | 0 |
| CyberSecure | 0 | 0 |
| HUE | 0 | — |
| kernel/iptables | 2 | 0 |
| ubnt-idsips-daemon | 19 | 3 |

### Evidencia de eventos de seguridad

- **En traffic.log:** 12 coincidencias con patrones de seguridad, 19 líneas de `ubnt-idsips-daemon`, 2 con SRC=/DST=
- **En ids.log:** 13 coincidencias (mayoría histórica), 3 de `ubnt-idsips-daemon`, 3 con SRC=/DST=
- Ambos logs contienen el **mismo tipo de datos** (syslog operacional: coredns, odhcp6c, dpi, earlyoom, etc.)
- Ninguno contiene eventos de bloqueo (`DROP/REJECT=0`) ni formato iptables

## Clasificación

**A / C — Eventos están en traffic.log, puerto 15514 es el activo**

- **A:** El syslog operacional que antes iba a ids.log (puerto 1514) ahora llega a traffic.log (puerto 15514). La distribución de procesos es esencialmente la misma.
- **C:** El gateway UniFi cambió su envío de syslog del puerto 1514 al 15514.

**Causa probable:**
El gateway UniFi fue reconfigurado para enviar Registro de Actividad/SIEM al puerto 15514. El puerto 1514 quedó huérfano. `ids.log` no recibe datos porque ningún emisor envía al 1514.

## Decisión

| Item | Resultado |
|------|-----------|
| Collector debe seguir usando ids.log | **No** — está stale |
| traffic.log debe evaluarse como fuente | **Sí** — contiene los mismos datos operacionales y está activo |
| Rsyslog routing debe corregirse | **No** — rsyslog está bien configurado, el problema es el emisor |

## Validación Posterior

| Item | Resultado |
|------|-----------|
| rsyslog posterior | active (sin cambios) |
| Nada modificado | Sí |

## Tests

| Suite | Resultado |
|-------|-----------|
| `go test ./...` | OK |

## Documentación

| Item | Resultado |
|------|-----------|
| Informe creado | `docs/phases/IDS-UNIFI-IDSLOG-SOURCE-REVIEW-01.md` |
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

**`IDS-UNIFI-COLLECTOR-TRAFFICLOG-SOURCE-PLAN-01`**

Planificar la adaptación del collector UniFi para leer de `/var/log/unifi/traffic.log` (puerto 15514) en lugar de `/var/log/unifi/ids.log`. La fase debe:

1. Confirmar que el formato de traffic.log es compatible con `ParseOperationalSyslog`
2. Determinar si traffic.log necesita su propio state-file o puede compartir lógica
3. Evaluar si se debe mantener soporte para ids.log como fuente alternativa
4. Planificar el cambio mínimo en el collector (flag `--tail-file` ya es configurable — solo cambiar la ruta)
5. No modificar rsyslog, no redirigir puertos
