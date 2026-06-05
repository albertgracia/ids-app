# FASE: IDS-UNIFI-INGEST-CONTRACT-DRYRUN-LOCAL-01

**Resultado:** PASS

**Fecha:** 2026-06-06

---

## 1. Resultado

Se implemento localmente el endpoint interno de ingest UniFi en `ids-core`:

- `POST /api/internal/v1/ingest/events/unifi`

La implementacion es solo local/dry-run:

- no toca `.40`
- no hace live ingest real
- no usa logs reales
- valida auth por Bearer token en env var local
- acepta payload batch sintetico
- responde `accepted / rejected / duplicates`

## 2. Estado del repositorio

| Item | Valor |
|---|---|
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `cb7d07d` |
| HEAD final | pendiente del commit |
| Working tree inicial | limpio |

## 3. Endpoint implementado

### Ruta

`POST /api/internal/v1/ingest/events/unifi`

### Registro

Se registro en `services/ids-core/cmd/ids-core/main.go` sin modificar el comportamiento de:

- `POST /api/v1/suricata/eve`
- `POST /api/v1/suricata/eve/batch`
- `POST /api/v1/simulate/events`

## 4. Auth

### Mecanismo

- header: `Authorization: Bearer <IDS_UNIFI_INGEST_TOKEN>`
- env var requerida: `IDS_UNIFI_INGEST_TOKEN`

### Comportamiento

- env var ausente -> `503`
- header ausente -> `401`
- token incorrecto -> `403`
- token correcto -> continua

No se loguea el token.

## 5. Contrato implementado

### Modelos nuevos

Archivo:

- `services/ids-core/internal/ingest/unifi_contract.go`

Tipos añadidos:

- `UniFiIngestBatchRequest`
- `UniFiIngestEvent`
- `UniFiIngestError`
- `UniFiIngestBatchResponse`

### Payload batch

Campos de lote:

- `source`
- `source_host`
- `collector_id`
- `batch_id`
- `observed_at`
- `events[]`

Campos por evento:

- `idempotency_key`
- `raw_hash`
- `kind`
- `event_type`
- `severity`
- `timestamp`
- `process`
- `message`
- `metadata`

### Respuesta

- `accepted`
- `rejected`
- `duplicates`
- `errors`
- `batch_id`

## 6. Validaciones implementadas

### Top-level

- `source == "unifi"`
- `source_host` obligatorio
- `collector_id` obligatorio
- `batch_id` obligatorio
- `observed_at` obligatorio
- `events` no vacio
- maximo `100` eventos

### Por evento

- `idempotency_key` obligatorio
- `raw_hash` obligatorio
- `kind` obligatorio
- `event_type` obligatorio y valido
- `severity` obligatoria y valida
- `timestamp` obligatorio
- `process` obligatorio
- `message` obligatoria
- longitud maxima de `message`
- longitud maxima de `process`
- limite de entries y tamaño de `metadata`

### JSON / payload

- `Content-Type: application/json` obligatorio
- `DisallowUnknownFields()` activo
- payload maximo: `256 KB`
- cuerpo malformado -> `400`
- body demasiado grande -> `413`

## 7. Dedupe

### Implementado

Archivo:

- `services/ids-core/internal/api/unifi_ingest_handler.go`

### Reglas

- dedupe dentro del mismo batch por `idempotency_key`
- dedupe cross-request en memoria dentro del mismo proceso
- ventana temporal: `5 minutos`

### Limitaciones

- dedupe cross-request no es persistente
- se pierde en restart
- no hay dedupe semantico aun entre `odhcp6c` y wrapper `ubios-udapi-server`
- no hay indice/tabla persistente de `idempotency_key`

## 8. Mapping a domain.Event

### Implementado en

- `BuildUniFiDomainEvent(...)`

### Mapping

- `dns_gateway_event` -> `dns_query`
- `dpi_event` -> `network_connection`
- `dpi_flow_stats_event` -> `network_connection`
- `dhcp_ipv6_event` -> `network_connection`
- `gateway_health_event` -> `system`
- `syslog_operational_event` -> `system`
- `systemd_event` -> `system`
- `mca_event` -> `system`
- `unclassified_unifi_syslog` -> `unclassified_event`

### Metadata segura añadida

- `source`
- `source_host`
- `collector_id`
- `batch_id`
- `process`
- `event_kind`
- `raw_hash`
- `idempotency_key`

No se mete `raw` completo en el evento.

## 9. Ajuste mínimo en domain

Se completo `eventTypeNames` en `services/ids-core/internal/domain/event_type.go` para que `domain.Event.Validate()` funcione correctamente con tipos ya existentes pero incompletos en `String()`:

- `blocked_connection`
- `dns_query`
- `management_event`
- `unclassified_event`

Fue un fix minimo y necesario para validar eventos UniFi correctamente.

## 10. Tests

Archivo nuevo:

- `services/ids-core/internal/api/unifi_ingest_handler_test.go`

Cobertura añadida:

1. Unauthorized sin header -> `401`
2. Forbidden token incorrecto -> `403`
3. Missing env token -> `503`
4. Valid batch single event -> `accepted=1`
5. Duplicate `idempotency_key` en el mismo batch -> `duplicates=1`
6. Invalid source -> `400`
7. Empty events -> `400`
8. Too many events -> `400`
9. Invalid severity -> `rejected=1`
10. Missing `idempotency_key` -> `rejected=1`
11. Mapping `dns_gateway_event` -> `dns_query`
12. Mapping `mca_event` -> `system`
13. Duplicate cross-request in-memory -> `duplicates=1`

## 11. Local smoke

- Ejecutado: no
- Motivo: la cobertura HTTP local con `httptest` y `go test` ya valida auth, routing, payload, dedupe y mapping sin necesidad de levantar proceso adicional ni persistir token temporal fuera del test.
- Token persistido: no

## 12. Tests globales

### `go test ./... -count=1`

PASS

### `task check`

PASS con solo issues preexistentes fuera de scope:

- `apps/web` ESLint 10 circular JSON
- `services/mcp-server` ruff `F401 uvicorn`

## 13. Qué NO se tocó

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
- No se creo migration

## 14. Próxima fase recomendada

**IDS-UNIFI-COLLECTOR-BATCH-SENDER-LOCAL-DRYRUN-01**
