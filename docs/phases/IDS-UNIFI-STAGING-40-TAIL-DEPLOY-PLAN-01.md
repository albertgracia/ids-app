# FASE: IDS-UNIFI-STAGING-40-TAIL-DEPLOY-PLAN-01

**Resultado:** PASS

**Fecha:** 2026-06-06

---

## 1. Motivo

Tras validar el smoke local completo del tailer UniFi en localhost, el siguiente paso seguro es definir el plan de despliegue futuro en `.40` sin instalar ni modificar nada aun.

## 2. Estado del repositorio

| Item | Valor |
|---|---|
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `d3cb112` |
| HEAD final | pendiente del commit documental |
| Working tree inicial | limpio |

## 3. Inventario `.40`

### Host

- host: `ubuntu-server`
- usuario observado: `albert`

### ids-core health

- `/healthz`: OK
- `/readyz`: OK
- `/api/v1/status`: OK
- `storage_mode`: `memory`

### Servicios y puertos

- `rsyslog`: `active`
- `1514`: TCP+UDP LISTEN
- `15514`: TCP+UDP LISTEN
- `8088`: TCP LISTEN

### Contenedores IDS

- `ids-core`: healthy
- `ids-web`: healthy
- `ids-mcp`: healthy
- `ids-analytics`: healthy
- `ids-postgres`: healthy
- `ids-redis`: healthy

### Log metadata

- `/var/log/unifi/ids.log`: existe, ~956 KB
- `/var/log/unifi/traffic.log`: existe, ~3.5 MB

### Rutas futuras existentes

Existente:

- `/home/albert/docker/ids-app`

No confirmadas como existentes:

- `/var/lib/ids-app`
- `/etc/ids-app`
- `/opt/ids-app`

## 4. Hallazgo importante

El `status` actual de `.40` no anuncia explicitamente la capability `unifi_internal_ingest_dry_run`.

Conclusión operativa:

- antes de cualquier `send-smoke` en `.40`, hay que verificar que la versión desplegada de `ids-core` incluye realmente el endpoint interno UniFi o planificar su actualización en una fase separada.

## 5. Plan de despliegue futuro

### Binario

Recomendación:

- usar binario controlado en `/opt/ids-app/bin/unifi-parallel-collector`
- con checksum y rollback documentados

### State-file

- `/var/lib/ids-app/unifi-collector/state.json`

### Spool futuro

- `/var/lib/ids-app/unifi-collector/spool/`

### Env file

- `/etc/ids-app/unifi-collector.env`

### Endpoint futuro

- `http://127.0.0.1:8088/api/internal/v1/ingest/events/unifi`

## 6. Plan de permisos

Usuario recomendado futuro:

- `ids-app`

Grupo recomendado si aplica:

- `adm`

Permisos mínimos:

- lectura de `/var/log/unifi/ids.log`
- escritura en `/var/lib/ids-app/unifi-collector`
- lectura de `/etc/ids-app/unifi-collector.env`

Evitar:

- root por comodidad
- `chmod 777`

## 7. Plan dry-run futuro en `.40`

Primer paso futuro:

- `send=false`
- `start-position=end`
- `once`
- sin replay histórico
- state-file persistente
- salida solo summary

Objetivo:

- validar permisos
- validar lectura incremental
- validar state-file
- validar que no hay replay accidental

## 8. Plan send-smoke futuro en `.40`

Solo tras dry-run PASS.

Condiciones:

- ventana corta
- endpoint loopback `127.0.0.1:8088`
- token temporal en env file
- batch-size bajo (`10` o `25`)
- `start-position=end`
- observar solo nuevas lineas
- rollback inmediato

## 9. Systemd futuro

Unidad propuesta:

- `ids-unifi-collector.service`

Con:

- `User=ids-app`
- `Group=adm`
- `EnvironmentFile=/etc/ids-app/unifi-collector.env`
- `Restart=on-failure`
- `ReadWritePaths=/var/lib/ids-app/unifi-collector`

No se creó ni se modificó en esta fase.

## 10. Rollback

Rollback futuro:

1. stop del servicio
2. disable del servicio
3. no tocar rsyslog
4. no tocar UniFi
5. conservar state-file
6. retirar env token si se aborta
7. confirmar health de `ids-core`
8. confirmar no hay nuevos POSTs
9. documentar último offset confirmado

## 11. Gates

### Antes de dry-run `.40`

- repo sync
- `.40` healthy
- `8088` healthy
- `ids.log` existe
- permisos planificados
- binario local validado
- rollback listo
- `send=false`
- `start-position=end`

### Antes de send-smoke `.40`

- dry-run `.40` PASS
- endpoint loopback verificado
- versión de `ids-core` confirma endpoint UniFi
- env token creado fuera repo
- batch-size bajo
- rollback listo

## 12. Riesgos

- permisos de lectura del log
- token mal protegido
- state-file corrupto
- replay histórico accidental
- `memory` storage no persistente
- `ids-core` desplegado sin endpoint UniFi actualizado
- ráfagas de eventos
- rotación real Linux no validada
- hardening `systemd` puede requerir ajustes

## 13. Qué NO se tocó

- No se tocó UniFi
- No se cambió SIEM
- No se activó NetFlow/IPFIX
- No se cambió modo IDS/IPS
- No se ejecutó BlackSun
- No se hicieron escaneos/ataques
- No se usó API key UniFi
- No se modificó rsyslog
- No se reinició rsyslog
- No se modificó Promtail
- No se tocó Loki/Grafana
- No se tocó Docker/firewall de `.40`
- No se instalaron binarios en `.40`
- No se crearon usuarios/directorios/env/systemd en `.40`
- No se hizo POST/live ingest contra `.40`
- No se leyó contenido de `/var/log/unifi/ids.log`
- No se modificó código funcional
- No se commitearon logs/secretos/tokens

## 14. Próxima fase recomendada

**IDS-UNIFI-STAGING-40-TAIL-DRYRUN-01**
