# FASE: IDS-UNIFI-COLLECTOR-BATCH-SENDER-LOCAL-DRYRUN-01

**Resultado:** PASS

**Fecha:** 2026-06-06

---

## 1. Resultado

Se extendio `unifi-parallel-collector` para construir lotes compatibles con:

- `POST /api/internal/v1/ingest/events/unifi`

La implementacion es exclusivamente local/dry-run:

- `--send=false` por defecto
- sender HTTP probado con `httptest`
- guardrail anti-`.40` activo
- sin uso de logs reales
- sin POST a `.40`

## 2. Estado del repositorio

| Item | Valor |
|---|---|
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `d4111ac` |
| HEAD final | pendiente del commit |
| Working tree inicial | limpio |

## 3. Flags añadidos

En `services/ids-core/cmd/unifi-parallel-collector/main.go`:

- `--ingest-batch`
- `--send`
- `--endpoint`
- `--token-env`
- `--collector-id`
- `--source-host`
- `--batch-size`
- `--print-payload-summary`

### Defaults

- `--ingest-batch=false`
- `--send=false`
- `--token-env=IDS_UNIFI_INGEST_TOKEN`
- `--collector-id=unifi-parallel-collector-local`
- `--source-host=unifi-gateway`
- `--batch-size=50`
- `--print-payload-summary=true`

## 4. Batch builder

Archivo nuevo:

- `services/ids-core/cmd/unifi-parallel-collector/batch.go`

### Construccion del lote

Cabecera:

- `source=unifi`
- `source_host` por flag
- `collector_id` por flag
- `batch_id` generado localmente
- `observed_at` UTC actual

Por evento:

- `idempotency_key = "unifi:" + raw_hash`
- `raw_hash` reutiliza el hash existente del collector
- `kind` desde `unifi.event_kind`
- `event_type` desde el evento normalizado
- `severity` desde `domain_event.severity`
- `timestamp` del evento si existe, si no `observed_at`
- `process` desde metadata segura
- `message` safe
- `metadata` minima segura

No se incluye `raw` completo.

### Soporte actual

El builder solo incluye eventos UniFi operacionales con `unifi.event_kind` presente.

Consecuencia:

- eventos CEF siguen funcionando en la CLI normal;
- si se usa `--ingest-batch`, los eventos puramente CEF se omiten del lote por no pertenecer al contrato operacional actual.

## 5. Dedupe local

Implementado en el builder:

- dedupe local por `idempotency_key` antes de formar el payload
- el payload sale ya filtrado de duplicates internos

Resumen adicional:

- `filtered_duplicates`
- `skipped_unsupported`

El endpoint sigue manteniendo su propio dedupe por si aun llegase ruido.

## 6. Sender HTTP

Implementado en `batch.go`.

### Comportamiento

- `--send=false`: nunca hace `POST`
- `--send=true`: requiere `--ingest-batch`
- `--send=true`: requiere `--endpoint`
- `--send=true`: requiere token presente en la env var indicada por `--token-env`

### Request

- metodo `POST`
- `Authorization: Bearer <token>`
- `Content-Type: application/json`
- timeout `5s`

### Response handling

- parsea `accepted/rejected/duplicates/errors/batch_id`
- maneja `200/201`, `400`, `401`, `403`, `413`, `500` como estados de interes
- no imprime token
- no imprime payload completo por defecto

## 7. Guardrail anti-.40

Implementado en `validateLocalEndpoint(...)`.

Bloquea endpoints que contengan:

- `192.168.1.40`
- `ids-observabilidad`
- cualquier host no local

Permite solo hosts locales:

- `127.0.0.1`
- `localhost`
- `::1`

Mensaje de rechazo:

- `refusing to send to non-local endpoint in local dry-run mode`

## 8. Tests añadidos

Archivo nuevo:

- `services/ids-core/cmd/unifi-parallel-collector/batch_test.go`

Cobertura:

1. Build batch desde `coredns.json.log`
2. Build batch mixto respetando `--batch-size`
3. Dedupe local por `idempotency_key`
4. `--send=false` no hace request HTTP
5. `--send=true` sin endpoint -> error controlado
6. `--send=true` sin token -> error controlado
7. `--send=true` con `httptest` 200 -> parsea response
8. `--send=true` con `httptest` 401 -> error controlado
9. guardrail a `192.168.1.40` -> rechazo

Regresiones mantenidas:

- collector tests existentes PASS
- operational samples PASS
- CEF regression PASS

## 9. Validacion CLI local

### coredns batch

Comando ejecutado con:

- `--ingest-batch`
- `--send=false`
- `--collector-id unifi-collector-local`
- `--source-host synthetic-gateway`
- `--print-payload-summary`

Resultado:

- parsed: `2`
- batch events: `2`
- batches: `1`
- `filtered_duplicates=0`
- `skipped_unsupported=0`
- no POST

### mixed batch

Inputs:

- `coredns.json.log`
- `mca.log`
- `dpi-flow-stats.log`
- `systemd.log`

Resultado:

- parsed: `8`
- batch events: `8`
- batches: `1`
- `filtered_duplicates=0`
- `skipped_unsupported=0`
- no POST

### CEF regression

- collector CEF sigue PASS
- `threat_detected` intacto en tests

## 10. Tests globales

### `go test ./... -count=1`

PASS

### `task check`

PASS con solo preexistentes:

- `apps/web` ESLint 10 circular JSON
- `services/mcp-server` ruff `F401 uvicorn`

## 11. Limitaciones

- el sender solo se probo con `httptest`, no contra `ids-core` levantado localmente; eso queda para la siguiente fase
- el builder omite eventos CEF al construir ingest batch porque el contrato actual es de UniFi operacional
- el dedupe del builder es exacto por `idempotency_key`, no semantico
- no hay spool, retry avanzado ni backpressure persistente en esta fase
- no hay envio live ni lectura de logs reales

## 12. Qué NO se tocó

- No se toco UniFi
- No se cambio SIEM
- No se activo NetFlow/IPFIX
- No se cambio modo IDS/IPS
- No se ejecuto BlackSun
- No se hicieron escaneos/ataques
- No se uso API key UniFi
- No se modifico rsyslog
- No se reinicio rsyslog
- No se modifico Promtail
- No se toco Loki/Grafana
- No se toco Docker/firewall de `.40`
- No se hizo POST/live ingest contra `.40`
- No se usaron logs reales
- No se commitearon logs reales/sanitizados
- No se commitearon secretos

## 13. Próxima fase recomendada

**IDS-UNIFI-INGEST-LOCAL-SMOKE-01**
