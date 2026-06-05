# FASE: IDS-UNIFI-FILE-TAIL-LOCAL-DRYRUN-01

**Resultado:** PASS

**Fecha:** 2026-06-06

---

## 1. Resultado

Se implemento localmente el modo `--tail-file` del `unifi-parallel-collector` para leer archivos sinteticos incrementales sin hacer `POST` y sin tocar `.40`.

El modo local soporta:

- `--tail-file`
- `--state-file`
- `--start-position beginning|end`
- `--once`
- `--poll-interval` (reservado, no activo sin `--once`)
- integracion con `--ingest-batch`
- `send=false` por defecto

## 2. Estado del repositorio

| Item | Valor |
|---|---|
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `31ce097` |
| HEAD final | pendiente del commit |
| Working tree inicial | limpio |

## 3. Flags implementados

En `services/ids-core/cmd/unifi-parallel-collector/main.go`:

- `--tail-file`
- `--state-file`
- `--start-position`
- `--once`
- `--poll-interval`
- `--dry-run`

### Comportamiento actual

- `--tail-file` activa modo tail local
- `--once` es obligatorio en esta fase
- modo polling continuo queda pendiente para una fase posterior
- `--start-position=end` por defecto
- `--send=false` por defecto

## 4. Tail reader

Archivo nuevo:

- `services/ids-core/cmd/unifi-parallel-collector/tail.go`

Implementa:

- apertura de archivo local regular
- rechazo de rutas UNC remotas en local dry-run
- lectura desde offset persistido
- procesamiento solo de lineas completas terminadas en `\n`
- no procesa linea parcial final
- genera resumen seguro por `stderr`

## 5. State-file

Formato JSON implementado:

- `version`
- `path`
- `inode`
- `device`
- `offset`
- `last_line_hash`
- `updated_at`
- `collector_id`

### Detalles

- escritura atomica: `state.json.tmp` + rename
- `offset` en bytes
- `last_line_hash` del ultimo raw completo procesado
- sin secretos
- sin raw completo

### Limitacion Windows

- `inode` y `device` se guardan como `0` en esta fase por portabilidad local Windows
- la deteccion completa por inode/device queda para Linux/.40

## 6. Start-position

### `beginning`

- primera ejecucion: procesa el contenido completo existente
- offset inicial `0`

### `end`

- primera ejecucion: no procesa lineas existentes
- offset inicial = tamaño actual del archivo

## 7. Append / resume

Comportamiento confirmado:

- si existe `state-file`, la siguiente ejecucion reanuda desde `offset`
- solo procesa lineas nuevas añadidas
- no reprocesa lineas ya confirmadas

## 8. Partial lines

Comportamiento implementado:

- la linea parcial sin newline no se procesa
- el `offset` no avanza sobre la parte parcial
- cuando se completa con newline en la siguiente ejecucion, entonces se procesa

Este punto quedo validado tanto por tests como por CLI local.

## 9. Truncation / rotation

### Implementado en esta fase

- si `state.offset > tamaño_actual`, se detecta truncado
- politica implementada: reinicio desde `0`
- no panic
- warning en `stderr`: truncation detected

### Pendiente

- deteccion robusta de inode/device real en Linux
- rotacion por rename/inode nuevo en entorno Linux real

## 10. CLI validation

### beginning

- primera ejecucion: `parsed=2`, `batch_events=2`, `offset_after=226`
- segunda tras append: `parsed=1`, `batch_events=1`, `offset_after=326`

### end

- primera ejecucion: `parsed=0`, `batch_events=0`, `offset_after=226`
- segunda tras append: `parsed=1`, `batch_events=1`, `offset_after=318`

### partial line

- primera ejecucion: `parsed=1`, `lines_partial=1`, `offset_after=110`
- segunda tras completar la linea: `parsed=1`, `lines_partial=0`, `offset_after=225`

### ingest-batch

- funciona sobre tail local
- construye batch sin enviar
- `send=false`

## 11. Tests añadidos

Archivo nuevo:

- `services/ids-core/cmd/unifi-parallel-collector/tail_test.go`

Cobertura:

1. `tail beginning` procesa lineas completas existentes
2. `tail end` salta lineas existentes
3. `resume` procesa solo append
4. `partial line` espera al newline
5. `state-file` se escribe de forma atomica
6. `truncation` se maneja sin panic
7. `ingest-batch` desde tail construye eventos

Regresiones:

- tests previos del collector siguen PASS
- guardrail anti-.40 sigue PASS
- no raw por defecto sigue PASS

## 12. Tests globales

### `go test ./... -count=1`

PASS

### `task check`

PASS con solo preexistentes:

- `apps/web` ESLint 10 circular JSON
- `services/mcp-server` ruff `F401 uvicorn`

## 13. Limitaciones

- modo tail sin `--once` no se implemento aun en esta fase
- `poll-interval` queda reservado para modo continuo futuro
- `inode/device` reales no se detectan aun en Windows
- rotacion por inode nuevo queda pendiente para fase Linux/.40
- no hay envio HTTP en esta fase

## 14. Qué NO se tocó

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
- No se usaron logs reales
- No se commitearon logs reales/sanitizados
- No se commitearon secretos/tokens
- No se commitearon state/temp files

## 15. Próxima fase recomendada

**IDS-UNIFI-FILE-TAIL-LOCAL-SMOKE-01**
