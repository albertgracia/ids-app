# IDS-UNIFI-STAGING-40-TAIL-DEPLOY-PLAN-01

## 1. Contexto

El pipeline UniFi ya esta validado localmente extremo a extremo:

- parser operacional
- state-file local
- batch builder
- sender HTTP local
- endpoint interno `ids-core`
- auth Bearer
- dedupe
- `events/recent`

Tambien existe un diseno aprobado del modo `file-tail` para leer `/var/log/unifi/ids.log` de forma incremental.

La siguiente necesidad no es desplegar aun, sino definir un plan seguro para pasar del smoke local a staging en `.40` minimizando riesgo sobre un host que ya ejecuta observabilidad y `ids-app`.

## 2. Objetivo

Definir el plan de despliegue futuro del collector UniFi file-tail en `.40`, incluyendo:

- artefactos
- rutas
- permisos
- modo dry-run inicial
- modo send-smoke posterior
- systemd futuro
- rollback
- gates de seguridad antes de tocar el host

## 3. No objetivos

Esta fase NO persigue:

- instalar binarios en `.40`
- crear usuarios o grupos
- crear directorios o env files
- crear unidades `systemd`
- reiniciar servicios
- hacer `POST` al endpoint real
- leer contenido de `/var/log/unifi/ids.log`
- modificar `rsyslog`, Docker, Promtail, Loki o Grafana

## 4. Estado local validado

Ya esta demostrado localmente:

- `ids-core` local en `18088`
- auth `401/403` correcta
- tail `beginning/end`
- append/resume
- partial line handling
- dedupe cross-request
- guardrail anti-`.40`
- pipeline `tail -> batch -> send -> endpoint -> storage`

Esto reduce el riesgo tecnico del collector, pero no elimina los riesgos operativos del despliegue en `.40`.

## 5. Inventario `.40` read-only

### Host

- host: `ubuntu-server`
- usuario SSH observado: `albert`
- server reachable: si

### ids-app / servicios locales

- `ids-core`: healthy
- `ids-web`: healthy
- `ids-mcp`: healthy
- `ids-analytics`: healthy
- `ids-postgres`: healthy
- `ids-redis`: healthy

### Health local

- `http://127.0.0.1:8088/healthz` -> OK
- `http://127.0.0.1:8088/readyz` -> OK
- `http://127.0.0.1:8088/api/v1/status` -> OK

Observacion importante:

- `storage_mode` actual en `.40`: `memory`
- la capability expuesta por `/api/v1/status` no anuncia `unifi_internal_ingest_dry_run`

Esto sugiere que antes de cualquier send-smoke sera necesario verificar que la version desplegada de `ids-core` en `.40` incorpora efectivamente el endpoint interno UniFi o actualizar el stack en una fase separada y controlada.

### Rsyslog y puertos

- `rsyslog`: `active`
- `1514`: TCP+UDP LISTEN
- `15514`: TCP+UDP LISTEN
- `8088`: TCP LISTEN

### Logs (solo metadata)

- `/var/log/unifi/ids.log`: existe, ~956 KB
- `/var/log/unifi/traffic.log`: existe, ~3.5 MB

### Rutas futuras

Existente:

- `/home/albert/docker/ids-app`

No confirmadas como existentes:

- `/var/lib/ids-app`
- `/etc/ids-app`
- `/opt/ids-app`

## 6. Rutas futuras recomendadas

### Binario

Opciones evaluadas:

- A. reutilizar binario dentro del despliegue del stack IDS
- B. copiar binario dedicado a `/opt/ids-app/bin/unifi-parallel-collector`
- C. ejecutar desde contenedor futuro

Decision recomendada:

- **B para el primer dry-run en `.40`**
- ruta sugerida: `/opt/ids-app/bin/unifi-parallel-collector`

Motivo:

- desacopla collector del contenedor `ids-core`
- facilita checksum, rollback y sustitucion controlada
- evita mezclar despliegue del backend y del tailer en una sola pieza

### State file

- `/var/lib/ids-app/unifi-collector/state.json`

### Spool futuro

- `/var/lib/ids-app/unifi-collector/spool/`

### Env file

- `/etc/ids-app/unifi-collector.env`

### Unit file futuro

- `/etc/systemd/system/ids-unifi-collector.service`

## 7. Usuario y permisos

### Usuario futuro recomendado

Preferencia:

- usuario dedicado `ids-app`

Alternativa:

- usuario existente del stack IDS, si ya existe y su alcance es adecuado

### Necesidades minimas

- read access a `/var/log/unifi/ids.log`
- write access a `/var/lib/ids-app/unifi-collector`
- read access a `/etc/ids-app/unifi-collector.env`
- sin acceso innecesario a otros secretos del host

### Grupo / ACL

Como el log real suele estar en algo equivalente a `syslog:adm 640`, la recomendacion es:

- añadir el usuario collector al grupo `adm`
  o
- aplicar ACL especifica de solo lectura al archivo/log dir

Evitar:

- `chmod 777`
- ejecutar el collector como root por conveniencia

## 8. Dry-run futuro en `.40`

Primer paso operativo recomendado en `.40`:

- `send=false`
- `start-position=end`
- `once`
- sin replay historico
- state-file controlado
- salida solo summary

Comando orientativo futuro:

```bash
/opt/ids-app/bin/unifi-parallel-collector \
  --tail-file /var/log/unifi/ids.log \
  --state-file /var/lib/ids-app/unifi-collector/state.json \
  --start-position end \
  --once \
  --ingest-batch \
  --send=false \
  --collector-id unifi-collector-40 \
  --source-host Cloud-Gateway-Fiber-Labraza \
  --batch-size 50 \
  --print-payload-summary
```

Objetivo del dry-run en `.40`:

- validar permisos
- validar lectura incremental del archivo real
- validar escritura del state-file
- validar que no hay replay historico accidental
- validar que el parser no rompe con el contenido operativo actual

## 9. Send-smoke futuro en `.40`

Solo despues de un dry-run PASS.

Caracteristicas:

- ventana corta y controlada
- endpoint loopback:
  - `http://127.0.0.1:8088/api/internal/v1/ingest/events/unifi`
- token temporal local en env file
- batch-size bajo (`10` o `25`)
- `start-position=end`
- observar solo nuevas lineas reales
- rollback inmediato si algo falla

Comando orientativo futuro:

```bash
/opt/ids-app/bin/unifi-parallel-collector \
  --tail-file /var/log/unifi/ids.log \
  --state-file /var/lib/ids-app/unifi-collector/state.json \
  --start-position end \
  --once \
  --ingest-batch \
  --send=true \
  --endpoint http://127.0.0.1:8088/api/internal/v1/ingest/events/unifi \
  --token-env IDS_UNIFI_INGEST_TOKEN \
  --collector-id unifi-collector-40 \
  --source-host Cloud-Gateway-Fiber-Labraza \
  --batch-size 10 \
  --print-payload-summary
```

## 10. Systemd futuro

Unidad futura recomendada:

`ids-unifi-collector.service`

Propiedades sugeridas:

```ini
[Unit]
Description=IDS UniFi operational syslog collector
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=simple
User=ids-app
Group=adm
EnvironmentFile=/etc/ids-app/unifi-collector.env
ExecStart=/opt/ids-app/bin/unifi-parallel-collector ...
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=/var/lib/ids-app/unifi-collector
ReadOnlyPaths=/var/log/unifi/ids.log

[Install]
WantedBy=multi-user.target
```

Nota:

- el hardening real debe validarse en una fase posterior porque `ProtectSystem` y `ReadOnlyPaths` pueden necesitar ajustes según el layout final.

## 11. Rollback

Rollback futuro minimo:

1. `systemctl stop ids-unifi-collector`
2. `systemctl disable ids-unifi-collector`
3. no tocar `rsyslog`
4. no tocar UniFi
5. no borrar `/var/log/unifi/ids.log`
6. conservar `state.json`
7. retirar env token si se aborta la ruta
8. validar `ids-core` sano
9. confirmar que no hay POSTs nuevos
10. documentar ultimo offset confirmado

## 12. Gates antes de tocar `.40`

### Antes de `IDS-UNIFI-STAGING-40-TAIL-DRYRUN-01`

- repo local/origin sincronizados
- `.40` health OK
- `ids-core` en `8088` OK
- `/var/log/unifi/ids.log` existe
- permisos planificados
- binario local build PASS
- rollback documentado
- `start-position=end`
- `send=false`
- ventana controlada

### Antes de `IDS-UNIFI-STAGING-40-TAIL-SEND-SMOKE-01`

- dry-run `.40` PASS
- endpoint loopback `127.0.0.1:8088` verificado
- version desplegada de `ids-core` confirma endpoint UniFi interno
- env token creado fuera repo
- batch-size bajo
- `send=true` solo ventana corta
- storage mode entendido y aceptado
- rollback listo

## 13. Riesgos y mitigaciones

### Riesgos

- permisos insuficientes de lectura en `/var/log/unifi/ids.log`
- token mal protegido en env file
- `state-file` corrupto
- replay historico accidental
- `memory` storage no persistente
- `ids-core` caido o version sin endpoint UniFi
- rafagas de eventos mayores que la cola
- rotacion real no validada en Linux
- el guardrail actual bloquearia usar `192.168.1.40` como endpoint, por lo que el plan debe usar `127.0.0.1`
- hardening `systemd` puede requerir ajustes de paths y permisos

### Mitigaciones

- dry-run primero, siempre `send=false`
- `start-position=end`
- endpoint loopback
- token solo en env file con permisos restrictivos
- batch-size bajo para send-smoke
- rollback escrito antes de ejecutar
- confirmar capability/version de `ids-core` antes de send-smoke

## 14. Fases futuras

1. `IDS-UNIFI-STAGING-40-TAIL-DRYRUN-01`
2. `IDS-UNIFI-STAGING-40-TAIL-SEND-SMOKE-01`
3. `IDS-UNIFI-STAGING-40-TAIL-SERVICE-HARDENING-01`
4. `IDS-UNIFI-OPERATIONAL-DASHBOARD-DESIGN-01`

## 15. Decision final

El despliegue futuro recomendado en `.40` es:

- collector como binario controlado fuera del contenedor principal
- lectura de `/var/log/unifi/ids.log`
- state-file persistente en `/var/lib/ids-app/unifi-collector`
- env token en `/etc/ids-app/unifi-collector.env`
- dry-run primero con `send=false`
- send-smoke posterior solo a loopback local y ventana corta
- servicio `systemd` solo despues de validar dry-run y send-smoke.
