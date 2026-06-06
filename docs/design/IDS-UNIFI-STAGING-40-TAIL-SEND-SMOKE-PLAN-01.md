# IDS-UNIFI-STAGING-40-TAIL-SEND-SMOKE-PLAN-01

## 1. Contexto

El collector UniFi file-tail ya ha superado:

- pruebas locales de parser, batch builder y sender
- smoke local completo con `send=true` contra `ids-core` local
- dry-run temporal en `.40` con:
  - binario temporal en `/tmp`
  - `--tail-file /var/log/unifi/ids.log`
  - `--start-position=end`
  - `--send=false`
  - state-file temporal correcto

Por tanto, el siguiente paso lógico es planificar un smoke controlado con envío real en `.40`, sin ejecutarlo todavía.

## 2. Objetivo

Definir el plan operativo exacto para un futuro smoke controlado en `.40` con:

- `--send=true`
- endpoint loopback local `127.0.0.1`
- token temporal local
- ventana corta
- sin replay histórico
- con rollback documentado

## 3. No objetivos

Esta fase NO persigue:

- ejecutar `--send=true`
- crear env files permanentes
- crear `systemd`
- instalar binario permanente
- modificar Docker, UniFi, rsyslog, Promtail o firewall
- leer contenido real de `/var/log/unifi/ids.log`

## 4. Estado previo validado

### Local

- endpoint interno `POST /api/internal/v1/ingest/events/unifi` probado
- auth `401/403` OK
- dedupe de endpoint observado
- tail local smoke completo PASS

### `.40`

- `ids-core` healthy en `127.0.0.1:8088`
- `rsyslog` activo
- `1514` y `15514` abiertos
- `ids.log` existe y puede leerse mediante el collector
- dry-run con `send=false` PASS

### Hallazgo crítico

- `/api/v1/status` en `.40` no anuncia explícitamente capability UniFi interna.

Antes del send-smoke hay que confirmar si la versión desplegada del backend en `.40` realmente incorpora el endpoint UniFi o, si no lo hace, planificar una fase previa de actualización del stack.

## 5. Endpoint objetivo

El smoke futuro debe usar solo loopback:

- `http://127.0.0.1:8088/api/internal/v1/ingest/events/unifi`

No usar:

- `http://192.168.1.40:8088/...`

Motivo:

- el guardrail actual del collector bloquea destinos no locales
- loopback reduce superficie de red y se alinea con el diseño aprobado

## 6. Token / env

### Ubicación futura

- `/etc/ids-app/unifi-collector.env`

Contenido futuro:

```text
IDS_UNIFI_INGEST_TOKEN=<temporal-token>
```

Reglas:

- token temporal
- generado fuera del repo
- permisos restrictivos (`0600` o equivalente)
- eliminado o rotado tras el smoke si se considera necesario

No crear este archivo en esta fase.

## 7. Binario y rutas

### Binario futuro

Recomendado:

- `/opt/ids-app/bin/unifi-parallel-collector`

### State file

- `/var/lib/ids-app/unifi-collector/state.json`

### Spool futuro

- `/var/lib/ids-app/unifi-collector/spool/`

### Collector ID

- `unifi-collector-40`

### Source host

- `Cloud-Gateway-Fiber-Labraza`

## 8. Parámetros operativos recomendados

### Para el smoke

- `--tail-file /var/log/unifi/ids.log`
- `--state-file /var/lib/ids-app/unifi-collector/state.json`
- `--start-position end`
- `--once`
- `--ingest-batch`
- `--send=true`
- `--endpoint http://127.0.0.1:8088/api/internal/v1/ingest/events/unifi`
- `--token-env IDS_UNIFI_INGEST_TOKEN`
- `--collector-id unifi-collector-40`
- `--source-host Cloud-Gateway-Fiber-Labraza`
- `--batch-size 10` o `25`
- `--print-payload-summary`

### Defaults operativos buscados

- ventana corta
- no replay histórico
- lotes pequeños
- solo nuevas líneas

## 9. Secuencia propuesta del futuro smoke

### Paso 0 - Pre-checks

- `git status` limpio local
- `.40` healthy
- endpoint local accesible
- versión de `ids-core` verificada

### Paso 1 - Preparación temporal

- copiar binario temporal a `/tmp/...`
- crear env temporal fuera del repo si está autorizado en esa fase
- preparar `state-file` controlado

### Paso 2 - Primera ejecución `send=true`

Con:

- `start-position=end`
- `once`
- `batch-size` bajo

Resultado esperado:

- si no hay líneas nuevas: `accepted=0`, sin error
- si hay líneas nuevas: `accepted>0`, `rejected=0`

### Paso 3 - Segunda ejecución inmediata

Resultado esperado:

- sin replay histórico
- `accepted=0`
- si se repiten eventos: `duplicates>=0`

### Paso 4 - Validación backend

- consultar `GET /api/v1/events/recent`
- validar presencia de eventos UniFi recientes
- no imprimir payloads reales completos

### Paso 5 - Limpieza

- borrar binario temporal
- borrar state temporal si procede
- borrar env temporal si se definió así en el plan

## 10. Validaciones del smoke

Debe validar al menos:

- auth efectiva con token local
- endpoint loopback funcional
- `accepted/rejected/duplicates`
- no replay histórico
- `state-file` correcto
- `events/recent` refleja eventos
- sin logs reales impresos

## 11. Criterios PASS / FAIL futuros

### PASS

- collector envía con `send=true` a loopback
- `accepted>0` o, si no hubo líneas nuevas, ejecución limpia sin replay
- `rejected=0`
- segunda ejecución no reenvía histórico
- `events/recent` refleja eventos si hubo envío
- limpieza completa

### PARTIAL

- no hay nuevas líneas reales durante la ventana, pero el collector y el endpoint responden sanamente
- o el envío funciona pero no se puede confirmar por falta de actividad real

### FAIL

- endpoint local falla
- auth falla
- replay histórico
- `rejected>0` inesperados
- logs reales impresos
- cambios permanentes no autorizados

## 12. Rollback

Rollback futuro mínimo:

1. detener el proceso temporal si sigue corriendo
2. no tocar `rsyslog`
3. no tocar UniFi
4. eliminar binario temporal
5. eliminar state-file temporal si corresponde
6. retirar env temporal/token si se creó para la fase
7. validar `ids-core` healthy
8. documentar último offset observado

## 13. Gates antes de ejecutar SEND-SMOKE-01

### Gate 1 - Backend real verificado

- confirmar que `.40` ejecuta la versión de `ids-core` con endpoint UniFi interno

### Gate 2 - Endpoint loopback

- usar solo `127.0.0.1`

### Gate 3 - Token temporal

- creado fuera repo y con permisos restrictivos

### Gate 4 - Storage comprendido

- aceptar que `storage_mode=memory` es volátil o mover a fase previa de postgres si se considera obligatorio

### Gate 5 - Ventana controlada

- duración corta
- operador disponible
- rollback preparado

### Gate 6 - Sin replay

- `start-position=end`
- `state-file` controlado

## 14. Riesgos

- el endpoint UniFi puede no estar realmente desplegado en `.40` pese al código local validado
- `memory` storage implica pérdida tras restart
- puede no haber nuevas líneas durante la ventana del smoke
- el collector puede enviar 0 eventos y aun así estar técnicamente sano
- permisos del env temporal/token pueden quedar demasiado abiertos si no se controlan

## 15. Fase futura recomendada

La siguiente fase operativa debe ser:

- `IDS-UNIFI-STAGING-40-TAIL-SEND-SMOKE-01`

solo si los gates anteriores se cumplen.

## 16. Decisión final

El smoke con `send=true` en `.40` debe ejecutarse solo contra loopback local, con token temporal, batch pequeño y `start-position=end`, en una ventana corta y con rollback inmediato preparado.
