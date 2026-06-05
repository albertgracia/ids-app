# IDS-UNIFI-FILE-TAIL-DESIGN-01

## 1. Contexto

La telemetria UniFi util para `ids-app` llega hoy a `.40` por syslog operacional y se guarda en:

- `/var/log/unifi/ids.log`

Ya existen y estan validados localmente:

- parser operacional UniFi
- endpoint interno `POST /api/internal/v1/ingest/events/unifi`
- auth Bearer por `IDS_UNIFI_INGEST_TOKEN`
- contrato batch
- sender local dry-run
- dedupe de endpoint en memoria
- smoke local end-to-end

La siguiente necesidad no es desplegar aun en `.40`, sino definir como debe funcionar un futuro tailer de archivo incremental en esa maquina sin tocar operacion hasta que existan gates claros.

## 2. Objetivo

Definir el diseno del futuro modo `file-tail` del collector UniFi para leer incrementalmente `ids.log`, construir batches seguros y enviarlos al endpoint interno de `ids-core` con control de offsets, rotacion, retry y backpressure.

## 3. No objetivos

Esta fase NO persigue:

- implementar el modo tail;
- leer `.40` realmente;
- crear un servicio `systemd`;
- desplegar en `.40`;
- modificar `rsyslog`;
- tocar UniFi;
- activar live ingest;
- introducir spool persistente o migraciones.

## 4. Arquitectura propuesta

Arquitectura futura recomendada en `.40`:

```text
/var/log/unifi/ids.log
  -> unifi-parallel-collector --tail-file
  -> parser operacional / CEF fallback
  -> batch builder
  -> sender HTTP local
  -> POST http://127.0.0.1:8088/api/internal/v1/ingest/events/unifi
  -> ids-core repository + broadcaster
```

Principios:

- lector desacoplado de `ids-core`;
- offsets confirmados solo tras envio exitoso;
- endpoint local interno;
- `send=false` por defecto;
- no raw completo;
- no dependencia de `.30`, Promtail o Loki.

## 5. Flags propuestos

Modo futuro del collector:

```text
unifi-parallel-collector --tail-file /var/log/unifi/ids.log
```

Flags recomendados:

- `--tail-file <path>`
- `--state-file <path>`
- `--endpoint <url>`
- `--token-env IDS_UNIFI_INGEST_TOKEN`
- `--collector-id <id>`
- `--source-host <gateway>`
- `--batch-size 50`
- `--flush-interval 5s`
- `--max-payload-bytes 262144`
- `--start-position end|beginning`
- `--dry-run`
- `--send`
- `--print-summary`
- `--once`
- `--poll-interval 1s`

Reglas de seguridad:

- `--dry-run` o `--send=false` por defecto;
- `--start-position=end` por defecto;
- `--state-file` obligatorio en modo live;
- `--beginning` solo explicito;
- `--send=true` requiere endpoint + token;
- se mantienen guardrails de destino permitido.

## 6. State file / offsets

Formato propuesto:

```json
{
  "version": 1,
  "path": "/var/log/unifi/ids.log",
  "inode": 123456,
  "device": 2049,
  "offset": 987654,
  "last_line_hash": "sha256:...",
  "updated_at": "2026-06-06T00:00:00Z",
  "collector_id": "unifi-collector-40"
}
```

Campos obligatorios:

- `version`
- `path`
- `inode`
- `device`
- `offset`
- `last_line_hash`
- `updated_at`
- `collector_id`

Ubicacion sugerida futura:

- `/var/lib/ids-app/unifi-collector/state.json`

Permisos sugeridos:

- owner del servicio dedicado
- `0600` o `0640`

Escritura:

- siempre atomica: escribir a temp + rename
- nunca guardar token
- nunca guardar raw completo

## 7. Lectura incremental

### Flujo normal

1. abrir `tail-file`
2. leer desde `offset` guardado
3. acumular hasta newline
4. procesar solo lineas completas
5. parsear -> batch -> enviar
6. confirmar offset solo tras resultado terminal

### Start position

- `end` por defecto: evita replay historico masivo al primer arranque
- `beginning` solo cuando se quiera backfill controlado

### Modo `--once`

- lee hasta EOF actual
- procesa y sale
- util para dry-run sobre archivo local sintético

## 8. Log rotation handling

### Caso 1 - Archivo crece normalmente

- mismo inode/device
- offset < size actual
- continuar desde offset

### Caso 2 - Archivo truncado

- mismo inode/device pero `offset > size actual`
- tratar como truncado
- politica recomendada:
  - si truncado con mismo inode: reiniciar en `0`
  - registrar warning de truncado

### Caso 3 - Inode cambia

- asumir rotacion/logrotate
- cerrar handle antiguo
- abrir nuevo archivo
- comenzar en `0` del nuevo archivo para no perder eventos nuevos

### Caso 4 - Archivo desaparece temporalmente

- no crash permanente
- retry con backoff
- mantener ultimo state valido

### Caso 5 - Linea parcial

- mantener buffer en memoria
- no procesar hasta recibir newline
- si el proceso se detiene con linea parcial, esa linea no se confirma

## 9. Confirmacion de offset

Regla central:

El offset solo se persiste despues de:

1. leer linea completa
2. parsear o clasificar terminalmente
3. construir batch
4. enviar batch
5. recibir respuesta terminal (`accepted`, `duplicates`, `rejected` controlado)

### Casos

#### accepted

- avanzar offset

#### duplicates

- avanzar offset
- el endpoint ya conoce el evento

#### rejected no recuperable

- avanzar offset
- registrar contador y resumen del rechazo
- evitar bloqueo infinito por poison event

#### error temporal HTTP 5xx / timeout

- no avanzar offset
- reintentar

#### linea no parseable

- politica recomendada por defecto:
  - registrar hash/error resumido
  - avanzar offset
  - contar `parse_errors_total`

Razon:

- no permitir que una linea corrupta bloquee toda la cola.

## 10. Backpressure y retry

### Batch

- `batch_size` inicial: 50
- max batch: 100
- max payload: 256 KB
- flush interval: 5s

### Queue

- cola en memoria bounded
- limite inicial: 1000 eventos

Comportamiento al llenarse:

- pausar lectura del archivo
- registrar warning
- no dropear por defecto

### Retry

- exponential backoff con jitter
- base: 1s
- max: 60s
- attempts configurables

Politica:

- `4xx` terminales: no reintentar, salvo `429`
- `429`: reintento con backoff
- `5xx` y timeout: reintentar

### Spool

- no en primera version
- diseño futuro sugerido:
  - `/var/lib/ids-app/unifi-collector/spool/`
  - segmentos append-only o batches serializados

## 11. Seguridad

### Auth

- `IDS_UNIFI_INGEST_TOKEN` en env var
- nunca en state file
- nunca en repo
- nunca en logs

### Red

Destino futuro recomendado en `.40`:

- `http://127.0.0.1:8088/api/internal/v1/ingest/events/unifi`

No exponer por:

- Nginx
- Cloudflare
- red publica

### Guardrails

- mantener allowlist estricta de destinos permitidos
- permitir loopback por defecto
- bloquear destinos externos salvo fase futura explícita

## 12. Privacidad

Reglas:

- no raw completo en logs del collector
- `message` safe del parser
- metadata saneada
- logs del collector solo agregados
- no IP/MAC/client names si no son imprescindibles y redacted

El state file solo guarda metadatos tecnicos del lector, no contenido del log.

## 13. Systemd futuro

Unidad futura propuesta:

- `ids-unifi-collector.service`

Propiedades sugeridas:

- `User=ids-app` o usuario dedicado
- `WorkingDirectory=/opt/ids-app`
- `EnvironmentFile=/etc/ids-app/unifi-collector.env`
- `ExecStart=...`
- `Restart=on-failure`
- `RestartSec=5`
- `NoNewPrivileges=true`
- `PrivateTmp=true`
- `ReadWritePaths=/var/lib/ids-app/unifi-collector`

Recomendacion operativa:

- no marcar `/var/log/unifi/ids.log` como `ReadOnlyPaths` porque eso aplica al namespace del servicio, no al archivo de entrada de forma aislada; es mejor abrir el archivo en modo lectura y documentar permisos de usuario/ACL de forma explicita.

## 14. Rollback

Rollback futuro debe incluir:

1. detener servicio collector
2. deshabilitar servicio
3. conservar state-file
4. no tocar rsyslog
5. no tocar UniFi
6. no borrar logs fuente
7. retirar token si procede
8. confirmar `ids-core` sano
9. confirmar que no queda cola activa
10. documentar ultimo offset confirmado

## 15. Observabilidad del collector

Metricas futuras recomendadas:

- `lines_read_total`
- `lines_parsed_total`
- `events_sent_total`
- `events_accepted_total`
- `events_rejected_total`
- `events_duplicates_total`
- `send_errors_total`
- `parse_errors_total`
- `queue_depth`
- `last_success_timestamp`
- `current_offset`
- `current_inode`
- `batch_latency_ms`
- `retry_count`

Logs futuros:

- resumen cada N segundos
- sin raw
- sin tokens
- sin datos sensibles

Health/estado futuro:

- modo `dry-run/send`
- endpoint reachability
- lag bytes
- queue depth

## 16. Fases futuras

1. `IDS-UNIFI-FILE-TAIL-LOCAL-DRYRUN-01`
   - implementar tailer sobre archivo local sintético
2. `IDS-UNIFI-FILE-TAIL-LOCAL-SMOKE-01`
   - ids-core local + tailer local + archivo creciente sintético
3. `IDS-UNIFI-STAGING-40-TAIL-DEPLOY-PLAN-01`
   - plan de despliegue en `.40`
4. `IDS-UNIFI-STAGING-40-TAIL-DRYRUN-01`
   - collector en `.40` con `send=false`
5. `IDS-UNIFI-STAGING-40-TAIL-SEND-SMOKE-01`
   - ventana corta con `send=true` a loopback local

## 17. Riesgos abiertos

- `memory` storage en `ids-core` sigue siendo volatil si se usara sin Postgres;
- sin spool persistente, una caida larga del backend puede hacer crecer la memoria del tailer hasta el limite de cola;
- duplicates semanticos `odhcp6c` / wrapper seguiran existiendo hasta una fase posterior;
- logrotate real en `.40` debe validarse con pruebas controladas antes de producción.

## 18. Decision final

La recomendacion es implementar primero un modo `--tail-file` solo en local, con:

- `start-position=end` por defecto
- `state-file` persistente y atomico
- confirmacion de offset tras respuesta terminal
- cola bounded + pause lectura
- retry con backoff
- destino loopback interno
- despliegue posterior como servicio controlado en `.40` solo tras dry-run local y plan de rollback.
