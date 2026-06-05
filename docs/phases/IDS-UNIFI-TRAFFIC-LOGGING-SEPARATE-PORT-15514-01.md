# Fase: IDS-UNIFI-TRAFFIC-LOGGING-SEPARATE-PORT-15514-01

## Resultado: PASS

---

## Datos del repositorio

- Rama: `scaffold/ids-v2-dev-env-01`
- HEAD inicial: `efcd52b`
- HEAD final: `efcd52b` (commit documental posterior)
- Working tree: limpio

---

## Motivo

Separar el canal de Traffic Logging (CyberSecure) del canal de Activity/Operational Logging (SIEM) en puertos rsyslog distintos:

- **1514** → Activity/System Logging (CEF, operacional, administración) → `/var/log/unifi/ids.log`
- **15514** → Traffic Logging (iptables format, firewall/IPS) → `/var/log/unifi/traffic.log`

Esto permite que ambos canales convivan sin mezclarse, facilitando parsers diferenciados y futura ingesta separada.

---

## Preflight

| Componente | Estado |
|---|---|
| IDS health (ids-core) | ok |
| IDS health (ids-web) | ok |
| IDS health (analytics-api) | ok |
| IDS health (ids-mcp) | ok |
| rsyslog service | active (v8.2512.0) |
| 1514 TCP (before) | LISTEN 0.0.0.0:1514, [::]:1514 |
| 1514 UDP (before) | UNCONN 0.0.0.0:1514, [::]:1514 |
| 15514 (before) | libre (no listeners) |
| `/var/log/unifi/` | existe, 908K, 3384 líneas en ids.log |
| rsyslog config 1514 | `/etc/rsyslog.d/30-unifi-ids-tcp.conf` (402 bytes, imtcp+imudp+1514) |

---

## Backup

| Archivo | Tamaño |
|---|---|
| `/etc/rsyslog.conf.bak-unifi-traffic-20260605-221642` | 1.2K |
| `/tmp/rsyslog.d.bak-unifi-traffic-20260605-221642.tgz` | 1.3K |
| `/etc/rsyslog.d/30-unifi-ids-tcp.conf.bak-traffic-20260605-221642` | 402 bytes |

---

## Config nueva

Archivo: `/etc/rsyslog.d/31-unifi-traffic-15514.conf`

```
# Traffic logs from UniFi CyberSecure (iptables format) - PORT 15514
# Modules imtcp/imudp already loaded by 30-unifi-ids-tcp.conf

template(name="UnifiTrafficFormat" type="string"
         string="%timegenerated% %HOSTNAME% %syslogtag%%msg%\n")

ruleset(name="unifi_traffic_15514") {
    action(type="omfile"
           file="/var/log/unifi/traffic.log"
           template="UnifiTrafficFormat")
    stop
}

input(type="imtcp" port="15514" ruleset="unifi_traffic_15514")
input(type="imudp" port="15514" ruleset="unifi_traffic_15514")
```

Destino: `/var/log/unifi/traffic.log`

Propietario: `syslog:adm` (640)

Nota: Se eliminaron los `module(load="imtcp")` y `module(load="imudp")` de la nueva config porque ya están cargados por `30-unifi-ids-tcp.conf`. Rsyslog v8.2512.0 rechaza módulos duplicados (error 2221).

---

## Validación rsyslogd -N1

```
rsyslogd: version 8.2512.0, config validation run (level 1), master config /etc/rsyslog.conf
rsyslogd: End of config validation run. Bye.
```

PASS.

---

## Receiver

| Acción | Resultado |
|---|---|
| `systemctl restart rsyslog` | active (running) |
| 1514 TCP after | LISTEN 0.0.0.0:1514, [::]:1514 |
| 1514 UDP after | UNCONN 0.0.0.0:1514, [::]:1514 |
| **15514 TCP after** | **LISTEN 0.0.0.0:15514, [::]:15514** |
| **15514 UDP after** | **UNCONN 0.0.0.0:15514, [::]:15514** |

---

## Tests sintéticos

### TCP 15514

Enviado: `TRAFFIC_TEST_TCP action=ACCEPT proto=TCP`

- Líneas en traffic.log: 1
- Match: 1
- Bytes: 162

**PASS**

### UDP 15514

Enviado: `TRAFFIC_TEST_UDP action=ACCEPT proto=UDP`

- Líneas en traffic.log: 2
- Match UDP: 1
- Bytes: 323

**PASS**

### 1514 intacto

Enviado: `CEF:0|Ubiquiti|UniFi Network|test|IDS_ALERT|TEST synthetic 1514 still alive`

- Match en ids.log: 1
- ids.log creció de 3384 a 3470 líneas

**PASS**

---

## Go tests

```
ok  github.com/albertgracia/ids-app/services/ids-core/cmd/unifi-cef-dryrun
ok  github.com/albertgracia/ids-app/services/ids-core/cmd/unifi-parallel-collector
ok  github.com/albertgracia/ids-app/services/ids-core/internal/api
ok  github.com/albertgracia/ids-app/services/ids-core/internal/domain
ok  github.com/albertgracia/ids-app/services/ids-core/internal/ingest
ok  github.com/albertgracia/ids-app/services/ids-core/internal/storage
ok  github.com/albertgracia/ids-app/services/ids-core/internal/suricata
ok  github.com/albertgracia/ids-app/services/ids-core/internal/unifi
```

PASS.

## task check

- `lint`: apps/web → ESLint 10 circular JSON (pre-existing)
- `lint`: analytics-api → PASS
- `lint`: mcp-server → F401 uvicorn (pre-existing)
- `typecheck`: PASS
- `test`: todos PASS
- `validate:suricata-contract`: PASS

Sin issues nuevos introducidos.

---

## Cambio en UniFi

- **Realizado por el agente**: NO
- **Operador puede cambiar a 15514**: SÍ

El operador debe acceder a UniFi Console → **CyberSecure > Traffic Logging** y configurar:

| Campo | Valor |
|---|---|
| Output | Syslog |
| Server | 192.168.1.40 |
| Port | 15514 |
| Protocol | TCP o UDP (ambos soportados) |

---

## Rollback

Disponible:

```bash
sudo rm -f /etc/rsyslog.d/31-unifi-traffic-15514.conf
sudo systemctl restart rsyslog
```

Ejecutado: NO (no fue necesario).

---

## Qué NO se tocó

- ✅ No se tocó UniFi
- ✅ No se cambió SIEM
- ✅ No se activó NetFlow/IPFIX
- ✅ No se cambió modo IDS/IPS
- ✅ No se activó bloqueo
- ✅ No se ejecutó BlackSun
- ✅ No se hicieron escaneos/ataques
- ✅ No se modificó Promtail
- ✅ No se reinició Promtail
- ✅ No se tocó Loki/Grafana
- ✅ No se tocó Docker
- ✅ No se tocó firewall
- ✅ No se hizo POST/live ingest
- ✅ No se imprimieron logs sensibles
- ✅ No se commitearon logs reales/sanitizados
- ✅ No se imprimieron secretos

---

## Archivos modificados

Solo `docs/phases/IDS-UNIFI-TRAFFIC-LOGGING-SEPARATE-PORT-15514-01.md`

---

## Próxima fase recomendada

**IDS-UNIFI-TRAFFIC-LOGGING-15514-LIVE-VALIDATION-01**

1. Operador activa CyberSecure > Traffic Logging → `.40:15514`
2. Operador ejecuta BlackSun (u otra actividad generadora de tráfico)
3. Verificar que `/var/log/unifi/traffic.log` recibe logs en formato iptables
4. Desarrollar parser para iptables/traffic format
5. Validar integración con ids-core collector
