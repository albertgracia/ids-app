# FASE: IDS-UNIFI-FILE-TAIL-DESIGN-01

**Resultado:** PASS

**Fecha:** 2026-06-06

---

## 1. Motivo

Tras validar localmente el endpoint interno de ingest UniFi, el sender batch y el smoke end-to-end en localhost, el siguiente paso seguro es definir como deberia funcionar un futuro tailer de archivo en `.40` sin tocar aun operacion real.

## 2. Estado del repositorio

| Item | Valor |
|---|---|
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `31e0e36` |
| HEAD final | pendiente del commit documental |
| Working tree inicial | limpio |

## 3. Resumen ejecutivo

Se recomienda un futuro modo:

`unifi-parallel-collector --tail-file /var/log/unifi/ids.log`

con estas propiedades:

- `send=false` por defecto
- `start-position=end` por defecto
- `state-file` persistente y atomico
- confirmacion de offset solo tras resultado terminal
- retry con backoff
- queue bounded con pausa de lectura
- destino local `127.0.0.1:8088`
- despliegue futuro como servicio controlado solo tras fases locales y staging dry-run

## 4. Diseño elegido

### Arquitectura

`ids.log -> tailer -> parser -> batch builder -> sender -> endpoint interno ids-core`

### Eleccion

- no integrar tailing dentro de `ids-core`
- mantener el collector como proceso separado
- usar state-file para offsets
- desacoplar lectura del archivo y confirmacion de envio

## 5. Decisiones clave

### Flags futuros

- `--tail-file`
- `--state-file`
- `--flush-interval`
- `--start-position=end|beginning`
- `--poll-interval`
- `--once`

### State file

JSON con:

- `path`
- `inode`
- `device`
- `offset`
- `last_line_hash`
- `updated_at`
- `collector_id`

Ubicacion sugerida futura:

- `/var/lib/ids-app/unifi-collector/state.json`

### Rotation / truncado

- mismo inode + offset valido -> continuar
- offset mayor que size -> truncado, reiniciar desde `0`
- inode cambia -> rotacion, abrir nuevo archivo desde `0`
- archivo desaparece -> retry/backoff
- linea parcial -> buffer hasta newline

### Offset confirmation

El offset solo se persiste despues de:

- parseo/control terminal
- construccion de batch
- envio
- respuesta terminal (`accepted`, `duplicates`, `rejected` no recuperable)

### Backpressure / retry

- batch inicial `50`
- max `100`
- payload `256 KB`
- flush `5s`
- cola bounded `1000`
- retry exponencial con jitter `1s -> 60s`
- pausar lectura si la cola se llena

### Security / privacy

- token solo por env var
- destino loopback interno
- no raw completo
- logs solo agregados
- guardrails de destino permitidos

### systemd futuro

- `ids-unifi-collector.service`
- usuario dedicado
- `Restart=on-failure`
- `EnvironmentFile` fuera del repo
- `ReadWritePaths` para state/spool

### Rollback

- stop/disable servicio
- conservar state-file
- no tocar rsyslog ni UniFi
- documentar ultimo offset confirmado

## 6. Riesgos

- sin spool persistente inicial, una indisponibilidad larga del backend presiona la memoria del tailer
- duplicates semanticos `odhcp6c` / wrapper seguiran pendientes de una fase futura
- `memory` storage en `ids-core` sigue siendo no apto para live estable si no se valida `postgres`
- logrotate real en `.40` requiere smoke controlado antes de produccion

## 7. Gates antes de implementación

### Local dry-run

- implementar `--tail-file` sobre archivo sintético local

### Local smoke

- ids-core local + sender local + archivo creciente sintético

### Staging `.40` dry-run

- desplegar tailer en `.40` con `send=false`
- leer `ids.log` sin enviar

### Staging `.40` send smoke

- ventana corta
- `send=true` a loopback local con token
- rollback definido

## 8. Qué NO se tocó

- No se toco UniFi
- No se cambio SIEM
- No se activo NetFlow/IPFIX
- No se cambio modo IDS/IPS
- No se ejecuto BlackSun
- No se hicieron escaneos/ataques
- No se uso API key UniFi
- No se hizo SSH a `.40`
- No se leyo `/var/log/unifi/ids.log` real
- No se modifico rsyslog
- No se reinicio rsyslog
- No se modifico Promtail
- No se toco Loki/Grafana
- No se toco Docker/firewall de `.40`
- No se hizo POST/live ingest contra `.40`
- No se modifico codigo funcional
- No se crearon servicios systemd
- No se commitearon logs reales/sanitizados
- No se commitearon secretos

## 9. Próxima fase recomendada

**IDS-UNIFI-FILE-TAIL-LOCAL-DRYRUN-01**
