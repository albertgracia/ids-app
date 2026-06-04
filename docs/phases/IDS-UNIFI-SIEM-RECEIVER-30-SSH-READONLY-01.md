# IDS-UNIFI-SIEM-RECEIVER-30-SSH-READONLY-01

## 1. Resultado

PASS.

Se pudo completar el inventario read-only de `192.168.1.30` usando `ssh ailab`, confirmar el estado del listener `1514`, identificar el proceso/stack asociado, obtener evidencia limitada de actividad UniFi/CEF sin exponer logs sensibles y validar conectividad read-only desde `.30` hacia los health endpoints de `.40`.

## 2. Rama / HEAD

- Rama: `scaffold/ids-v2-dev-env-01`
- HEAD inicial: `7aa4733`
- HEAD final: pendiente del commit documental de esta fase

## 3. Relacion con la fase PARTIAL anterior

La fase previa `IDS-UNIFI-SIEM-RECEIVER-30-READONLY-INVENTORY-01` quedo en `PARTIAL` porque no existia SSH no interactivo a `.30`.

En esta fase se uso el alias ya validado por operador:

```bash
ssh ailab
```

Resultado confirmado:

- hostname: `ubuntu-ialab`
- usuario: `albert`
- home: `/home/albert`

Esto permitio cerrar el inventario read-only que habia quedado bloqueado.

## 4. Confirmacion de uso de ssh ailab

Comando ejecutado:

```bash
ssh ailab "hostname && whoami && pwd"
```

Salida observada:

```text
ubuntu-ialab
albert
/home/albert
```

## 5. Estado IDS .40

### Identidad del host

- Hostname: `ubuntu-server`
- Usuario: `albert`
- PWD: `/home/albert`

### Fecha / uptime

- Fecha observada: `jue 04 jun 2026 02:47:56 CEST`
- Uptime observado: `16:53`

### Compose ids-app

Servicios observados con `docker compose ps`:

- `ids-core`: `Up` / `healthy`
- `ids-web`: `Up` / `healthy`
- `ids-analytics`: `Up` / `healthy`
- `ids-mcp`: `Up` / `healthy`
- `ids-postgres`: `Up` / `healthy`
- `ids-redis`: `Up` / `healthy`

### Restart count / status

Todos los contenedores inspeccionados mostraron:

- `restartCount=0`
- `status=running`
- `health=healthy`

### Health endpoints locales

- `ids-core`: `{"service":"ids-core","status":"ok"}`
- `ids-web`: `{"service":"ids-web","status":"ok","mode":"development"}`
- `analytics`: `{"service":"analytics-api","status":"ok"}`
- `mcp`: `{"service":"ids-mcp","status":"ok","mode":"read_only"}`

## 6. Inventario .30

### Identidad del host

- Hostname: `ubuntu-ialab`
- Usuario: `albert`

### Fecha / uptime

- Fecha observada: `jue 04 jun 2026 02:48:35 CEST`
- Uptime observado: `16:54`

### Interfaces

Interfaces principales observadas:

- `lo`: `127.0.0.1/8`, `::1/128`
- `eth0`: `192.168.1.30/24`
- `br-5c62d2455d93`: `172.18.0.1/16`
- `docker0`: `172.17.0.1/16` (`DOWN`)

Tambien existen multiples interfaces `veth*`, consistentes con workload Docker activo.

### Rutas

- default via `192.168.1.1` dev `eth0`
- `192.168.1.0/24` por `eth0`
- `172.18.0.0/16` por bridge Docker
- `172.17.0.0/16` por `docker0`

### Puerto 1514

Comprobacion read-only:

```bash
ss -ltnp 'sport = :1514'
```

Resultado:

- listener TCP en `0.0.0.0:1514`
- listener TCP en `[::]:1514`

### Proceso / stack asociado

Aunque `ss` sin privilegios no mostro el nombre del proceso, `docker ps` y `docker inspect` aportan evidencia suficiente de que el listener `1514/tcp` esta expuesto por el contenedor:

- contenedor: `promtail`
- imagen: `grafana/promtail:3.4.2`
- puertos: `0.0.0.0:1514->1514/tcp`, `[::]:1514->1514/tcp`
- comando: `-config.file=/etc/promtail/promtail.yml`

Mount relevante del contenedor:

- `/opt/ai-lab/stacks/promtail/promtail.yml` -> `/etc/promtail/promtail.yml`

### Servicios log / collector presentes

#### systemd

- `rsyslog.service`: `loaded`, `active`, `running`

#### Docker

- `promtail` presente y escuchando `1514/tcp`

### Conclusión operativa sobre el receptor

- `rsyslog` esta activo en el host, pero no aparece configurado como listener de `514` en `/etc/rsyslog.conf`.
- El receptor real de `1514/tcp` es `promtail` en contenedor.

## 7. Configs

### Config paths encontrados en /etc

- `/etc/rsyslog.conf`
- `/etc/rsyslog.d/20-ufw.conf`
- `/etc/rsyslog.d/21-cloudinit.conf`
- `/etc/rsyslog.d/50-default.conf`
- varios paths auxiliares de `rsyslog`

### Grep limitado en /etc

Hallazgos relevantes:

- `imudp` y `imtcp` para `514` aparecen comentados en `/etc/rsyslog.conf`
- no aparece evidencia en `/etc` de que `rsyslog` este escuchando `1514`

### Config de promtail

Sin leer secretos ni destinos completos, el grep limitado sobre `/opt/ai-lab/stacks/promtail/promtail.yml` mostro:

- `http_listen_port: 9080`
- `grpc_listen_port: 0`
- bloque `syslog:`
- `listen_address: 0.0.0.0:1514`
- `listen_protocol: tcp`

Esto confirma que `promtail` esta preparado para recibir syslog por TCP/1514.

## 8. Evidencia de logs sin contenido sensible

### Log files candidatos

Se localizaron:

- `/var/log/syslog`
- rotaciones asociadas `/var/log/syslog.1`, `/var/log/syslog.2.gz`, `/var/log/syslog.3.gz`

### Conteo limitado

En `/var/log/syslog`, el conteo case-insensitive de `unifi`, `ubiquiti` y `cef` devolvio:

- `61`

### Tamaño de log

- `/var/log/syslog`: `7.1M`

Interpretacion:

- existe evidencia indirecta de actividad relacionada con UniFi/CEF en el host `.30`;
- no se imprimieron lineas reales ni contenido sensible;
- el conteo no sustituye una validacion end-to-end de pipeline, pero es consistente con que `.30` esta recibiendo o al menos procesando eventos relacionados.

## 9. Conectividad .30 -> .40

Comprobaciones read-only desde `.30`:

- `http://192.168.1.40:8088/healthz` -> OK
- `http://192.168.1.40:3002/api/health` -> OK
- `http://192.168.1.40:8090/healthz` -> OK
- `http://192.168.1.40:8091/healthz` -> OK

Interpretacion:

- `.30` alcanza `ids-core`, `ids-web`, `analytics` y `mcp` en `.40` por HTTP local de health;
- desde red, no se observa bloqueo obvio para un futuro relay controlado `.30 -> .40`.

## 10. Opciones evaluadas

### Opcion A — `.30` receiver + relay a `.40`

Recomendada.

Motivos:

- UniFi ya apunta a `.30:1514`.
- `.30` escucha efectivamente `1514/tcp`.
- el listener corresponde a `promtail`, no a un placeholder vacio.
- existe evidencia limitada de actividad UniFi/CEF en logs del host.
- `.30` puede alcanzar todos los health endpoints relevantes de `.40`.
- evita tocar UniFi en la siguiente fase.

### Opcion B — cambiar UniFi a `.40` en futura fase

No recomendada como siguiente paso inmediato.

Motivo:

- implicaria tocar arquitectura/red/receiver en `.40` sin necesidad inmediata, cuando `.30` ya esta operativo como punto de entrada.

### Opcion C — configurar receiver minimo en `.30` en futura fase

No recomendada como siguiente paso, porque el receiver ya existe.

Motivo:

- `.30` ya tiene un receiver funcional en `1514/tcp`.

### Opcion D — seguir dry-run offline

No recomendada como opcion principal.

Motivo:

- ya no estamos bloqueados por falta de visibilidad: el inventario de `.30` es suficiente para avanzar a una fase controlada de integracion.

## 11. Recomendacion

### Opcion recomendada

**Opcion A — mantener `.30` como receiver principal y planificar relay/control de integracion hacia `.40`.**

### Motivo

- respeta la configuracion actual de UniFi;
- minimiza cambios en la fuente;
- aprovecha un receiver ya existente (`promtail`);
- `.30` y `.40` ya muestran conectividad y salud suficientes para una siguiente fase controlada.

### Riesgos residuales

- el listener es `TCP/1514`; hay que confirmar que la configuracion efectiva de UniFi usa TCP y no UDP;
- el conteo en `syslog` sugiere actividad, pero no demuestra por si solo el pipeline exacto ni la entrega final hacia `.40`;
- no se inspeccionaron secretos ni destinos completos de `promtail`, asi que el estado exacto del downstream no se afirma en esta fase.

## 12. Que NO se toco

- UniFi
- destino SIEM configurado
- NetFlow/IPFIX
- firewall
- servicios systemd
- Docker en modo destructivo
- contenedores en ejecucion
- `.env`
- DB / Redis / Postgres
- Nginx / Cloudflare
- puertos
- staging
- trafico real
- logs sensibles
- secretos

## 13. Proxima fase recomendada

`IDS-UNIFI-SIEM-RECEIVER-30-TO-40-RELAY-PLAN-01`

Objetivo sugerido:

- documentar el camino exacto `.30 -> .40`;
- decidir si el relay sera via syslog reenviado, pipeline Loki/promtail, transformacion a ingest HTTP o collector dedicado;
- confirmar protocolo efectivo de UniFi (`TCP/1514`) y estrategia de validacion end-to-end sin interrumpir el receiver actual.
