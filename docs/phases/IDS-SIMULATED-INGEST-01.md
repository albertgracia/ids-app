# Fase: IDS-SIMULATED-INGEST-01 — Informe

**Fecha:** 2026-05-30
**Rama:** `scaffold/ids-v2-dev-env-01`
**Ruta local:** `E:\opencode\ids-app\`
**Repo:** `https://github.com/albertgracia/ids-app`

---

## RESULTADO: PASS

---

## Cambios realizados

### Archivos creados

| Archivo | Propósito |
|---------|-----------|
| `internal/ingest/store.go` | EventStore — thread-safe ring buffer en memoria (máx 5000) |
| `internal/ingest/simulator.go` | Simulator + 7 escenarios + Scenario type |
| `internal/ingest/store_test.go` | 12 tests (store + simulator) |
| `internal/api/handler.go` | Handlers HTTP para eventos recientes y simulación |
| `cmd/ids-core/main.go` | *modificado* — wiring de store/simulator/handler + capability |store/simulator/handler + capability |
| `docs/07-simulated-ingest.md` | Documentación de la ingesta simulada |

### Endpoints añadidos

| Método | Ruta | Propósito |
|--------|------|-----------|
| GET | `/api/v1/events/recent` | Eventos recientes (limit opcional, máx 500) |
| POST | `/api/v1/simulate/events` | Generar eventos simulados (máx 100 por batch) |

### Escenarios

- `normal_it_connection`, `ot_modbus_read`, `ot_s7_command`, `scan_detected`, `auth_failure`, `protocol_anomaly`, `malware_indicator`

---

## Tests: 46/46 PASS (12 ingest + 21 asset + 13 event)

---

## Validaciones

| Validación | Resultado |
|-----------|-----------|
| `go build ./cmd/ids-core` | ✅ |
| `go test ./... -count=1` | ✅ (46/46) |
| `task check` | ✅ (web lint warning known) |
| Manual: GET /healthz | ✅ `{"status":"ok"}` |
| Manual: GET /api/v1/status | ✅ `capabilities: [event_model, asset_inventory_model, simulated_ingest]` |
| Manual: GET /api/v1/events/recent (empty) | ✅ `{"items":[],"count":0,"limit":50}` |
| Manual: POST simulate (2 scan_detected) | ✅ 2 eventos generados + almacenados |
| Manual: POST invalid scenario | ✅ 400 error |
| Manual: POST count > 100 | ✅ 400 error |

---

## Git sync

| Paso | Estado |
|------|--------|
| Commit local creado | ✅ `feat(core): add simulated IDS event ingest` |
| Push realizado | ✅ `origin/scaffold/ids-v2-dev-env-01` |
| HEAD local/remoto sincronizado | ✅ |

---

## Confirmaciones

- ✅ No se tocó `192.168.1.40`.
- ✅ No se desplegó nada.
- ✅ No se usaron PCAPs reales.
- ✅ No se copiaron secretos.
- ✅ No se copiaron binarios legacy.
- ✅ Sin dependencias externas (solo stdlib).

---

## Próxima fase recomendada

`IDS-CORE-PERSISTENCE-POSTGRES-01` — Persistencia de eventos en PostgreSQL.
