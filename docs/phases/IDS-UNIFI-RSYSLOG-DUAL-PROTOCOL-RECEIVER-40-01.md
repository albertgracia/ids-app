# IDS-UNIFI-RSYSLOG-DUAL-PROTOCOL-RECEIVER-40-01

## 1. Resultado

PASS (parcial: recibe syslog operacional, no CEF IDS).

Se añadió recepción UDP 1514 a rsyslog en `.40`. Inmediatamente comenzaron a llegar logs reales del UniFi Cloud Gateway Fiber (`Cloud-Gateway-Fiber-Labraza`). Confirmación definitiva de que UniFi emite por UDP aunque su UI muestre configuración TCP.

## 2. Rama / HEAD

- Rama: `scaffold/ids-v2-dev-env-01`
- HEAD inicial: `0a3e6b3`
- HEAD final: pendiente del commit documental de esta fase

## 3. Before / After

| Métrica | Before | After | Delta |
|---------|--------|-------|-------|
| TCP 1514 | LISTEN | LISTEN | = |
| UDP 1514 | absent | LISTEN | **+** |
| Lines en ids.log | 3 | 576+ | **+573** |
| Size | 259 bytes | ~130 KB | **+500x** |
| CEF count | 1 (synthetic) | 2 (both synthetic) | = |
| Real UniFi data | 0 | 570+ | **+570** |

## 4. Configuración final

`/etc/rsyslog.d/30-unifi-ids-tcp.conf` (dual TCP+UDP):

```
module(load="imtcp")
module(load="imudp")

template(name="UnifiIDSFormat" type="string"
         string="%timegenerated% %HOSTNAME% %syslogtag%%msg%\n")

ruleset(name="unifi_ids") {
    action(type="omfile"
           file="/var/log/unifi/ids.log"
           template="UnifiIDSFormat")
    stop
}

input(type="imtcp" port="1514" ruleset="unifi_ids")
input(type="imudp" port="1514" ruleset="unifi_ids")
```

## 5. Verificaciones

| Verificación | Resultado |
|-------------|-----------|
| Config syntax (`rsyslogd -N1`) | PASS |
| Restart rsyslog | active |
| TCP 1514 LISTEN | 0.0.0.0 + [::] |
| UDP 1514 LISTEN | 0.0.0.0 + [::] |
| Synthetic UDP local test | Escrito y verificado |
| Real UniFi data arrives | **SÍ — 570+ líneas inmediatas** |
| Collector dry-run | 2 parsed (CEF), 8 skipped (syslog no CEF), 208 errors (non-UniFi) |
| go test ./... | PASS |
| `task check` (lint+typecheck) | PASS (MCP unused import pre-existente) |

## 6. Muestra (sanitizada)

Las líneas reales de UniFi son mensajes operacionales del gateway:

```
... Cloud-Gateway-Fiber-Labraza syslog-ng[85394]: Syslog connection broken; ... :1514
... Cloud-Gateway-Fiber-Labraza ubios-udapi-server[5397]: odhcp6c[5397]: Failed to send RS ...
... Cloud-Gateway-Fiber-Labraza coredns[5926]: {"timestamp":"...","type":"dnsAdBlock",...}
... Cloud-Gateway-Fiber-Labraza dpi-flow-stats[2036]: ubnt-dpi-util: connect: ...
... Cloud-Gateway-Fiber-Labraza earlyoom[787]: mem avail:   733 of  2891 MiB ...
... USWFlex25G8PoE ...: MCA: Send normal inform to [http://192.168.1.1:8080/inform]
```

**No hay CEF IDS alerts reales.** Los 2 CEF contados son los mensajes sintéticos de prueba.

## 7. Observaciones técnicas

### UniFi emite UDP a pesar de config TCP
- La UI de UniFi Network muestra destino `192.168.1.40:1514` TCP
- Confirmado por operador con tcpdump: los paquetes llegan por **UDP** desde `192.168.1.1:46142` → `.40:1514`
- El syslog-ng interno del gateway también intenta conexiones TCP que fallan con "Connection refused"

### El log contiene datos operacionales, no IDS alerts
Los ~570 mensajes recibidos incluyen:
- coredns dnsAdBlock (bloqueo de publicidad DNS)
- odhcp6c errores DHCPv6
- ubnt-dpi-util errores de conexión DPI
- earlyoom estado de memoria
- syslog-ng intentos de conexión TCP a .40:1514

No se generaron eventos de seguridad IDS/IPS porque no ocurrió tráfico malicioso durante la ventana de observación (~2 minutos después de iniciar UDP).

### Comportamiento del collector
- `parsed: 2` → mensajes CEF sintéticos (correcto)
- `skipped: 8` → mensajes UniFi sin CEF ("unsupported_unifi_syslog_no_cef")
- `errors: 208` → mensajes de switch USW y otros dispositivos no-UniFi
- `duplicates: 358` → dedup por hash (el mismo mensaje llega por TCP y UDP)
- El exit code 1 es esperado (líneas no-CEF presentes)

## 8. Qué NO se tocó

- UniFi config (read-only)
- SIEM, Promtail, Loki, Grafana, Docker
- Firewall, NetFlow/IPFIX
- DB / Redis / Postgres
- Nginx / Cloudflare
- POST a ids-core / live ingest
- Staging deployment

## 9. Backups disponibles

En `.40`:
- `/etc/rsyslog.d/30-unifi-ids-tcp.conf.bak-dual-20260605-205427`
- `/etc/rsyslog.conf.bak-unifi-dual-20260605-205427`
- `/tmp/rsyslog.d.bak-unifi-dual-20260605-205427.tgz`

Rollback: restaurar `30-unifi-ids-tcp.conf` desde backup (versión solo TCP), reiniciar rsyslog.

## 10. Próxima fase recomendada

`IDS-UNIFI-LIVE-IDS-ALERT-CAPTURE-01`

Objetivo: Capturar un evento IDS/IPS CEF real de UniFi.

Opciones:
1. Operador ejecuta un escaneo de puertos o prueba de penetración controlada contra la red para disparar IDS/IPS.
2. Esperar a que ocurra un evento de seguridad natural.
3. Confirmar si el gateway requiere configuración adicional en la sección IDS/IPS del controller para emitir alerts por syslog.
