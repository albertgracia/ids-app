# IDS-UNIFI-RECEIVER-PLACEMENT-DECISION-01

## 1. Resultado

PASS.

Se decidió formalmente mover el receptor UniFi IDS de `.30` (AI-LAB) a `.40` (IDS/observabilidad). La arquitectura correcta es:

```
UniFi Cloud Gateway Fiber
  -> TCP 1514
  -> 192.168.1.40
  -> rsyslog imtcp
  -> /var/log/unifi/ids.log
  -> unifi-parallel-collector
  -> futuro ids-core local .40
```

## 2. Rama / HEAD

- Rama: `scaffold/ids-v2-dev-env-01`
- HEAD inicial: `0ffe19d`
- HEAD final: pendiente del commit documental de esta fase

## 3. Motivo de la decisión

La fase previa `IDS-UNIFI-REAL-LOG-SOURCE-DISCOVERY-01` demostró FAIL operativo: **no llegan datos CEF de UniFi a Loki**. El pipeline UniFi -> Promtail .30 -> Loki .40 está roto en dos puntos:

1. **Protocolo**: UniFi usa TCP (única opción que ofrece), Promtail escucha TCP 1514, pero el formato syslog BSD (RFC 3164) de UniFi es rechazado por el parser RFC 5424 estricto de Promtail.
2. **Red Docker**: Promtail (172.18.0.8, bridge `proxy`) no puede enrutar a `192.168.1.40:3100` — errores `"no route to host"`.

Además, el ADR previo (ADR-IDS-UNIFI-PARALLEL-COLLECTOR-01) eligió `.30` como ubicación del collector paralelo bajo el supuesto de que no se tocaría UniFi. Ese supuesto queda invalidado por:

- UniFi solo permite TCP — no hay opción UDP.
- El operador acepta cambiar el destino SIEM a `.40`.
- `.30` demostró no poder entregar datos útiles a Loki.
- Mantener el receptor en `.30` añade un salto innecesario.

## 4. Dato nuevo del operador

- UniFi SIEM: **solo TCP** (no UDP).
- Destino actual: `192.168.1.30:1514`.
- Operador acepta cambiar a `192.168.1.40:1514` **cuando se valide el receptor en `.40`**.
- No cambiar todavía — requiere fase de implementación separada.

## 5. Inventario .40 (ids-observabilidad)

### IDS Health

| Servicio | Estado |
|----------|--------|
| ids-core | ok |
| ids-web | ok (development) |
| analytics-api | ok |
| ids-mcp | ok (read_only) |

### Puertos

| Puerto | Estado |
|--------|--------|
| TCP 1514 | **LIBRE** — sin listener |
| UDP 1514 | **LIBRE** — sin listener |
| TCP 3100 | LISTEN — Loki 3.7.1 |

### rsyslog

- Servicio: **active (running)**, v8.2512.0
- Inputs imtcp/imudp: **comentados** en `/etc/rsyslog.conf` (puerto 514)
- No hay reglas personalizadas en `/etc/rsyslog.d/`

### Firewall

- `ufw`: no instalado
- `iptables`: no hay reglas restrictivas visibles

### Conclusión .40

- Puerto 1514 TCP disponible.
- rsyslog activo y listo para configurar imtcp.
- Sin firewall bloqueante.
- Todos los servicios IDS saludables.

## 6. Inventario .30 (ailab / AI-LAB)

### Puertos

| Puerto | Estado |
|--------|--------|
| TCP 1514 | LISTEN — Promtail |
| UDP 1514 | **SIN listener** |

### Promtail

- Contenedor: `promtail` (grafana/promtail:3.4.2)
- Estado: Up 8 hours
- Config: `job_name: unifi-ids`, `listen_protocol: tcp`, puerto 1514
- Push a: `http://192.168.1.40:3100/loki/api/v1/push`
- Problema: **no route to host** hacia Loki .40
- Datos entregados a Loki para `{job="unifi-ids"}`: **0 entradas**

### rsyslog

- Servicio: **active (running)**, v8.2512.0
- Inputs imtcp/imudp: **comentados**

### Conclusión .30

- Promtail sigue ocupando TCP 1514 pero no entrega datos útiles a IDS.
- rsyslog disponible pero inputs desactivados.
- No es el lugar correcto para el receptor IDS primario.

## 7. Comparación .30 vs .40

### Opción A — Receptor en .30

| Aspecto | Valoración |
|---------|------------|
| Cambiar UniFi | No necesario (ya apunta a .30) |
| TCP 1514 disponible | Ocupado por Promtail |
| Entrega a IDS .40 | Requiere salto adicional .30 -> .40 |
| Promtail | Demostró no poder entregar a Loki |
| Rol del servidor | AI-LAB (no IDS) |
| Mantenimiento | Mezcla roles observabilidad + IDS |
| Riesgo | Alto — canalizar eventos IDS por AI-LAB legacy |

### Opción B — Receptor en .40 (elegida)

| Aspecto | Valoración |
|---------|------------|
| Cambiar UniFi | Requiere cambio de destino (aceptado por operador) |
| TCP 1514 disponible | **LIBRE** |
| Entrega a IDS | Directa, sin salto intermedio |
| rsyslog | Instalado y activo — solo falta configurar imtcp |
| Rol del servidor | IDS/observabilidad |
| ids-core | Misma máquina — integración directa futura |
| Loki | Misma máquina — envío opcional futuro |
| Mantenimiento | Un solo punto para recepción IDS |
| Riesgo | Bajo — arquitectura limpia |

### Decisión

**Opción B — receptor primario en `.40` por TCP 1514.**

La opción A queda descartada porque:
- Promtail .30 no puede entregar datos a Loki.
- Añade complejidad innecesaria.
- Mezcla dominios AI-LAB e IDS.
- El ADR previo (colector paralelo en .30) queda superado por los nuevos datos.

## 8. Diseño futuro rsyslog TCP 1514 en .40

### Pipeline objetivo

```
UniFi Cloud Gateway Fiber
  -> TCP 1514
  -> 192.168.1.40
  -> rsyslog imtcp
  -> /var/log/unifi/ids.log
  -> unifi-parallel-collector
  -> ids-core local .40
```

### Config rsyslog futura

Archivo: `/etc/rsyslog.d/30-unifi-ids-tcp.conf`

```
module(load="imtcp")

template(name="UnifiIDSFormat" type="string"
         string="%timegenerated% %HOSTNAME% %syslogtag%%msg%\n")

ruleset(name="unifi_ids_tcp") {
    action(type="omfile"
           file="/var/log/unifi/ids.log"
           template="UnifiIDSFormat")
    stop
}

input(type="imtcp" port="1514" ruleset="unifi_ids_tcp")
```

### Log destino

- `/var/log/unifi/ids.log`
- Rotación estándar por rsyslog o logrotate futuro

### Relación con collector

El `unifi-parallel-collector` leerá `/var/log/unifi/ids.log` (one-shot o tail) y normalizará CEF. En fase posterior, enviará a `ids-core` local en `.40`.

## 9. Preflight futuro

1. Verificar que TCP 1514 está libre en `.40` (confirmado en esta fase).
2. Backup de `/etc/rsyslog.conf` y `/etc/rsyslog.d/`.
3. Crear directorio `/var/log/unifi/`.
4. Validar sintaxis: `rsyslogd -N1`.
5. Copiar `30-unifi-ids-tcp.conf` a `/etc/rsyslog.d/`.
6. Verificar permisos y SELinux/AppArmor si aplica.
7. Validar sintaxis de nuevo: `rsyslogd -N1`.
8. **Solo entonces**: `systemctl restart rsyslog`.
9. Verificar listener: `ss -tlnp | grep 1514`.
10. Test sintético local: `echo '<PRI>...' | nc 127.0.0.1 1514`.
11. Verificar `/var/log/unifi/ids.log` recibe líneas.
12. Ejecutar `unifi-parallel-collector --input /var/log/unifi/ids.log` en dry-run.
13. **Solo entonces**: operador cambia UniFi a `192.168.1.40:1514`.

## 10. Validación futura

- `ss -tlnp | grep 1514` debe mostrar rsyslogd escuchando.
- `/var/log/unifi/ids.log` debe contener líneas tras evento UniFi real.
- `unifi-parallel-collector` debe parsear CEF correctamente.
- Si se habilita envío a `ids-core`, verificar eventos en dominio.

## 11. Rollback

1. Retirar `/etc/rsyslog.d/30-unifi-ids-tcp.conf`.
2. `systemctl restart rsyslog`.
3. Verificar: `ss -tlnp | grep 1514` debe mostrar **sin listener**.
4. Si UniFi se cambió, operador lo revierte a `.30`.
5. Opcional: archivar o eliminar `/var/log/unifi/ids.log`.

## 12. Relación con Promtail/Loki/Grafana

- **Promtail .30** se deja intacto. No se modifica `promtail.yml`. No se reinicia.
- **Loki .40** se deja intacto. No se modifica.
- **Grafana .30** se deja intacto.
- El receptor `.40` es **independiente** del pipeline Promtail/Loki.
- El problema de red Promtail .30 -> Loki .40 queda como **deuda de observabilidad**, no bloqueante para IDS.
- En fase futura, si se desea, se puede añadir envío de eventos normalizados a Loki/Alloy, pero no es requisito IDS.

## 13. Riesgos

- Cambiar UniFi a `.40` requiere ventana operativa y coordinación con operador.
- rsyslog en `.40` no ha recibido tráfico TCP 1514 antes — probar primero con test sintético.
- Si rsyslog se configurara incorrectamente, podría afectar al syslog del sistema (por eso se usa ruleset separado con `stop`).
- El volumen de eventos UniFi es desconocido — monitorizar tamaño de `/var/log/unifi/ids.log`.
- El ADR previo (ADR-IDS-UNIFI-PARALLEL-COLLECTOR-01) queda **reemplazado parcialmente** en lo relativo a la ubicación del receptor: pasa de `.30` a `.40`.
- `ids-core` sigue con `storage_mode=memory` — no hacer live ingest sin persistencia.

## 14. Qué NO se tocó

- UniFi (no se cambió destino SIEM)
- NetFlow/IPFIX
- Promtail / promtail.yml
- Loki
- Grafana
- rsyslog (no se modificó, no se reinició)
- Docker
- Firewall / iptables
- DB / Redis / Postgres
- Nginx / Cloudflare
- `.env`
- staging
- No se abrió puerto 1514 en `.40`
- No se instaló collector en `.40`
- No se generaron eventos
- No se capturó tráfico
- No se imprimieron logs sensibles
- No se imprimieron secretos

## 15. Próxima fase recomendada

`IDS-UNIFI-RSYSLOG-TCP-RECEIVER-40-PLAN-01`

Implementar el receptor rsyslog TCP 1514 en `.40` siguiendo el diseño de esta fase:
1. Backup rsyslog.
2. Crear `/var/log/unifi/`.
3. Instalar `30-unifi-ids-tcp.conf`.
4. Validar con `rsyslogd -N1`.
5. Reiniciar rsyslog.
6. Test sintético TCP local.
7. Validar escritura en `/var/log/unifi/ids.log`.
8. Ejecutar collector en dry-run.
9. Operador cambia UniFi a `.40`.
10. Validar pipeline completo.
