# IDS-UNIFI-REAL-LOG-SOURCE-DISCOVERY-01

## 1. Resultado

FAIL.

No se encontraron logs CEF de UniFi en ninguna de las fuentes investigadas. La canalización está rota en dos puntos independientes: (1) UniFi envía syslog BSD (UDP) y Promtail solo escucha TCP RFC 5424, y (2) Promtail no puede enrutar a Loki desde la red Docker `proxy`.

## 2. Rama / HEAD

- Rama: `scaffold/ids-v2-dev-env-01`
- HEAD inicial: `c47955c`
- HEAD final: pendiente del commit documental de esta fase

## 3. Investigación

### 3.1. Estado de Loki

- `job=unifi-ids` en Loki: **0 entradas**
- Labels disponibles en Loki: `docker`, `journald`, `rioja-marketplace`, `windows-eventlog` — **no aparece `unifi-ids`**
- Loki versión 3.7.1 en `.40:3100`, responde correctamente (ready OK)

### 3.2. Estado de Promtail

- Contenedor `promtail` (grafana/promtail:3.4.2) corriendo en `.30`
- Config en `/etc/promtail/promtail.yml`:
  - `job_name: unifi-ids` con listener syslog en `0.0.0.0:1514`
  - Protocolo: **solo TCP** (`listen_protocol: tcp`)
  - Max message length: 8192
  - Label `job=unifi-ids` asignada via `relabel_configs`
- Promtail se conecta a `http://192.168.1.40:3100/loki/api/v1/push`
- Puerto `1514/tcp` abierto y escuchando (`ss -tlnp` confirma)
- **No hay listener UDP en 1514** (`ss -ulnp` vacío)
- Último intento de push a Loki: `09:10:15 UTC` — error `"connection refused"` (Loki estaba iniciando)
- Push anteriores: `"no route to host"` — la red Docker `proxy` (bridge `172.18.0.0/16`) no puede enrutar a `192.168.1.40:3100`

### 3.3. Prueba de conectividad TCP 1514

Se envió manualmente un mensaje RFC 5424 + CEF a `127.0.0.1:1514` desde `.30`:

| Mensaje | Resultado Promtail |
|---------|-------------------|
| RFC 5424 sin structured data nil | `"expecting a structured data section containing one or more elements or a nil value [col 39]"` |
| RFC 5424 con `- - -` | Mismo error — necesita formato exacto |
| BSD syslog (RFC 3164) | `"expecting a version value in the range 1-999 [col 5]"` — incompatible |

**Conclusión**: Promtail acepta conexiones TCP en 1514 pero el parser syslog exige RFC 5424 estricto. UniFi usa BSD syslog (RFC 3164) sobre UDP.

### 3.4. rsyslog en `.30`

- Servicio `rsyslog` activo (running)
- Inputs UDP/TCP en puerto 514 **comentados** en `/etc/rsyslog.conf`
- No hay receptor syslog alternativo

### 3.5. `/var/log/syslog` en `.30`

- Búsqueda `grep -i 'unifi\|ubiquiti\|cef'` en `/var/log/syslog`: **0 coincidencias**
- No hay mensajes UniFi en el syslog del sistema

### 3.6. UniFi Gateway

- `192.168.1.1` responde en puerto 8443 (controller UI, requiere TLS) y 443 (nginx)
- Alcanzable desde `.30` (ping 0.413ms)
- Operador activó "Contenido" en UniFi syslog apuntando a `192.168.1.30:1514`

## 4. Análisis de la rotura

### Punto de fallo 1: Protocolo de transporte

```
UniFi (UDP BSD syslog) ──X──> Promtail (TCP RFC 5424 :1514)
```

UniFi envía syslog en formato BSD (RFC 3164) sobre UDP por defecto. Promtail solo escucha TCP y espera RFC 5424. Incluso si UniFi usara TCP, el formato BSD sería rechazado.

### Punto de fallo 2: Red Docker

```
Promtail (172.18.0.8 / proxy bridge) ──X──> Loki (192.168.1.40:3100)
```

El contenedor Promtail está en la red bridge `proxy` (172.18.0.0/16). No hay ruta a `192.168.1.40:3100` desde esa red. Los logs de Promtail muestran `"no route to host"` y `"connection refused"`.

## 5. Tests

### go test

```
cd services/ids-core
go test ./...
```

Resultado: PASS.

### task check

Ejecutado, con fallos preexistentes fuera de scope:
- `apps/web`: ESLint 10 / `Converting circular structure to JSON`
- `services/mcp-server`: `ruff` `F401` por `uvicorn` importado y no usado

## 6. Qué NO se tocó

- UniFi
- Promtail config / restart
- Loki config / restart
- rsyslog config
- Docker compose
- iptables / firewall
- DB / Redis / Postgres
- Nginx / Cloudflare
- `.env`
- staging

## 7. Riesgos residuales

- No hay muestra real CEF para validar el parser Go
- No se ha interceptado ni un solo paquete UniFi en ningún nivel
- El parser `UniFi` en `ids-core` no puede probarse contra datos reales
- `ids-core` sigue sin conexión a la fuente de eventos UniFi

## 8. Próxima fase recomendada

`IDS-UNIFI-INFRASTRUCTURE-FIX-01`

La fase debe habilitar la recepción de syslog UniFi, ya sea mediante:

**Opción A** (mínimo cambio): Activar input UDP 514 en rsyslog en `.30`, escribir a archivo, y configurar Promtail para leer ese archivo (scrape `job_name: unifi-ids` sobre `filename` en vez de syslog listener).

**Opción B** (cambio Promtail): Cambiar `listen_protocol: tcp` a `listen_protocol: udp` en `promtail.yml`, o añadir ambos. Verificar que el parser de Promtail acepte RFC 3164 o configurar `isRFC3164: true`.

**Opción C** (red Docker): Conectar Promtail a una red Docker con salida a `192.168.1.40` (ej. red `host` o macvlan) o añadir ruta estática en el bridge `proxy`.

Cualquier opción requiere modificar infraestructura (rompe la restricción read-only de esta fase).
