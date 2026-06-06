# FASE: IDS-UNIFI-FILE-TAIL-LOCAL-SMOKE-01

**Resultado:** PASS

**Fecha:** 2026-06-06

---

## 1. Resultado

Se ejecuto el smoke local completo del pipeline:

`tail-file sintetico -> state-file -> parser -> batch builder -> send=true -> ids-core local -> endpoint interno`

Todo se hizo en localhost, sin usar logs reales y sin tocar `.40`.

## 2. Estado del repositorio

| Item | Valor |
|---|---|
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `682bcaa` |
| HEAD final | pendiente del commit documental |
| Working tree inicial | limpio |

## 3. Entorno local

| Item | Estado |
|---|---|
| Docker Desktop | disponible pero no operativo |
| Docker usado | no |
| Metodo de arranque ids-core | `go run ./cmd/ids-core` |
| Puerto local | `18088` |
| Storage mode | `memory` |

Token temporal usado solo en entorno local del proceso:

- `IDS_UNIFI_INGEST_TOKEN=local-tail-smoke-token`

No persistido en `.env` ni en repo.

## 4. Arranque local de ids-core

Se levanto localmente `ids-core` con:

- `IDS_CORE_PORT=18088`
- `IDS_UNIFI_INGEST_TOKEN=local-tail-smoke-token`

El servicio quedo operativo en localhost y luego se detuvo al final de la fase.

## 5. Health local

| Endpoint | Resultado |
|---|---|
| `/healthz` | HTTP 200 |
| `/readyz` | HTTP 200 |
| `/api/v1/status` | HTTP 200 |

`/api/v1/status` reporto `storage_mode=memory` y capability `unifi_internal_ingest_dry_run`.

## 6. Tail smoke principal

### Beginning first send

Archivo sintetico inicial:

- `coredns`
- `MCA`
- `dpi-flow-stats`

Ejecucion:

- `--tail-file`
- `--state-file`
- `--start-position beginning`
- `--once`
- `--ingest-batch`
- `--send=true`
- endpoint local `127.0.0.1:18088`

Resultado:

- `lines_read=3`
- `parsed=3`
- `batch_events=3`
- `accepted=3`
- `rejected=0`
- `duplicates=0`
- `offset_after=348`

### Re-ejecucion sin cambios

Resultado:

- `lines_read=0`
- `parsed=0`
- `batch_events=0`
- no se reenviaron eventos
- `offset_after` sin cambios (`348`)

### Append/resume

Se añadieron 2 lineas nuevas sinteticas:

- `odhcp6c`
- `earlyoom`

Resultado de la siguiente ejecucion:

- `lines_read=2`
- `parsed=2`
- `batch_events=2`
- `accepted=2`
- `rejected=0`
- `duplicates=0`
- `offset_after=572`

Re-ejecucion posterior sin cambios:

- `lines_read=0`
- `parsed=0`
- `batch_events=0`

## 7. Dedupe cross-request

Se forzo una relectura completa desde `beginning` con un `state-file` nuevo (`state-dup.json`) sobre el mismo archivo ya enviado.

Resultado:

- `lines_read=5`
- `parsed=5`
- `batch_events=5`
- `accepted=0`
- `duplicates=5`

Conclusion: el dedupe cross-request in-memory del endpoint quedo observado correctamente.

## 8. start-position=end

Archivo nuevo con 2 lineas existentes.

### Primera ejecucion

- `start-position=end`
- `lines_read=0`
- `parsed=0`
- `batch_events=0`
- `offset_after=243`
- no se hizo envio efectivo

### Segunda ejecucion tras append de 1 linea nueva

- `lines_read=1`
- `parsed=1`
- `batch_events=1`
- `accepted=1`

Conclusion: `end` no reenvia historico y solo procesa nuevas lineas.

## 9. Partial line

Archivo con:

- 1 linea completa
- 1 linea parcial sin newline

### Primera ejecucion

- `lines_read=1`
- `lines_partial=1`
- `parsed=1`
- `accepted=1`
- `offset_after=100`

### Segunda ejecucion tras completar la linea parcial

- `lines_read=1`
- `lines_partial=0`
- `parsed=1`
- `accepted=1`
- `offset_after=205`

Conclusion: la linea parcial no se envio hasta completarse con newline.

## 10. State-file

- creado: si
- offset avanza: si
- contiene raw/secrets: no
- eliminado al final: si

El state-file persistio offset y `last_line_hash` correctamente durante la prueba.

## 11. Guardrail anti-.40

Se intento ejecutar con endpoint:

- `http://192.168.1.40:8088/api/internal/v1/ingest/events/unifi`

Resultado:

- rechazo controlado
- mensaje: `refusing to send to non-local endpoint in local dry-run mode`
- no POST

## 12. Events recent

Se consulto:

- `GET http://127.0.0.1:18088/api/v1/events/recent`

Resultado:

- HTTP 200
- eventos visibles: si
- el endpoint devolvio eventos de las ejecuciones locales del smoke

No se incluyen eventos completos en el informe.

## 13. Tests

### `go test ./... -count=1`

PASS

### `task check`

PASS con solo issues preexistentes fuera de scope:

- `apps/web` ESLint 10 circular JSON
- `services/mcp-server` ruff `F401 uvicorn`

## 14. Limpieza

- token temporal eliminado del entorno del shell
- temporales eliminados en `%TEMP%\ids-unifi-tail-smoke`
- `ids-core` local detenido

Comprobacion final:

- `Test-Path $env:TEMP\ids-unifi-tail-smoke` -> `False`
- proceso `ids-core` -> no presente

## 15. Qué NO se tocó

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

## 16. Próxima fase recomendada

**IDS-UNIFI-STAGING-40-TAIL-DEPLOY-PLAN-01**
