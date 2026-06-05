# IDS-UNIFI-RSYSLOG-TCP-RECEIVER-40-PLAN-01

## 1. Resultado

PASS.

Receptor rsyslog TCP 1514 instalado y validado en `.40` con test sintético y collector dry-run.

## 2. Rama / HEAD

- Rama: `scaffold/ids-v2-dev-env-01`
- HEAD inicial: `02e6022`
- HEAD final: pendiente del commit documental de esta fase

## 3. Preflight

| Verificación | Estado |
|-------------|--------|
| IDS health: ids-core | ok |
| IDS health: ids-web | ok |
| IDS health: analytics-api | ok |
| IDS health: ids-mcp | ok |
| TCP 1514 antes | **LIBRE** |
| rsyslog | active (v8.2512.0) |
| UFW | no instalado |

## 4. Backups

| Archivo | Tamaño |
|---------|--------|
| `/etc/rsyslog.conf.bak-unifi-ids-20260605-191816` | 1.2K |
| `/tmp/rsyslog.d.bak-unifi-ids-20260605-191816.tgz` | 1019B |

## 5. Config creada

- Archivo: `/etc/rsyslog.d/30-unifi-ids-tcp.conf`
- Destino log: `/var/log/unifi/ids.log`
- Puerto: TCP 1514
- Módulo: imtcp
- Ruleset propio con `stop` para no interferir con syslog del sistema

### rsyslogd -N1

```
rsyslogd: version 8.2512.0, config validation run (level 1), master config /etc/rsyslog.conf
rsyslogd: End of config validation run. Bye.
```

PASS — sin errores.

## 6. Receiver

| Verificación | Estado |
|-------------|--------|
| Restart rsyslog | OK — active |
| TCP 1514 después | **LISTEN** (0.0.0.0:1514 + [::]:1514) |
| `/var/log/unifi/ids.log` | Creado |

## 7. Test sintético

- Mensaje enviado: `<134>Jun 5 12:00:00 TEST-UCG CEF:0|Ubiquiti|...|TEST synthetic IDS event|...`
- Destino: `127.0.0.1:1514` TCP
- Protocolo: nc (netcat)

### Verificación

| Métrica | Valor |
|---------|-------|
| Líneas en `/var/log/unifi/ids.log` | 1 |
| Coincidencias "TEST synthetic" | 1 |
| Coincidencias "CEF:" | 1 |

### Collector dry-run

Ejecutado `unifi-parallel-collector` sobre la línea sintética:

```
parsed:     1
errors:     0
skipped:    0
event_type: threat_detected
severity:   critical
warnings:   syslog_envelope_detected, embedded_cef_extracted
raw_hash:   sha256:1942f52d...
```

PASS — pipeline completo validado.

## 8. Rollback

Disponible y documentado:

```bash
sudo rm -f /etc/rsyslog.d/30-unifi-ids-tcp.conf
sudo systemctl restart rsyslog
ss -tulpn | grep ':1514'  # debe mostrar sin listener
```

No fue necesario ejecutar.

## 9. Cambio UniFi

**RECEPTOR .40 VALIDADO.**
**OPERADOR PUEDE CAMBIAR UNIFI A 192.168.1.40:1514 TCP.**

El agente NO cambió UniFi.

## 10. Qué NO se tocó

- UniFi (no se cambió destino SIEM)
- NetFlow/IPFIX
- Promtail / promtail.yml
- Loki / Grafana
- Docker
- Firewall / iptables
- DB / Redis / Postgres
- Nginx / Cloudflare
- `.env`
- staging
- No se generaron eventos reales
- No se capturó tráfico
- No se imprimieron logs sensibles
- No se imprimieron secretos

## 11. Próxima fase recomendada

`IDS-UNIFI-LIVE-VALIDATION-01`

Validación con tráfico UniFi real tras el cambio de destino SIEM por parte del operador.
