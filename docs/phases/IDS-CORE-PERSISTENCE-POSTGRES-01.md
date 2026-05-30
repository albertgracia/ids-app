# Fase: IDS-CORE-PERSISTENCE-POSTGRES-01 — Informe

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
| `internal/storage/event_repository.go` | Interfaz `EventRepository` |
| `internal/storage/memory_event_repository.go` | Repositorio en memoria (thread-safe, max 5000) |
| `internal/storage/postgres_event_repository.go` | Repositorio PostgreSQL (pgx/v5) |
| `internal/storage/migrations.go` | Migración inicial de schema + índices |
| `internal/storage/scan_helpers.go` | Helpers para scan de null/JSONB |
| `internal/storage/storage_test.go` | 8 tests (7 memory + 1 postgres integration) |

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `cmd/ids-core/main.go` | Wiring de storage mode + status con `storage_mode` |
| `internal/api/handler.go` | Ahora usa `EventRepository` interfaz |
| `internal/domain/event_type.go` | Añadido `ParseEventTypeSafe` |
| `internal/domain/severity.go` | Añadido `ParseSeveritySafe` |
| `internal/domain/protocol.go` | Añadido `ParseProtocolSafe` |
| `internal/domain/direction.go` | Añadido `ParseDirectionSafe` |
| `internal/domain/zone.go` | Añadido `ParseZoneSafe` |
| `.env.example` | Añadido `IDS_STORAGE_MODE` y `DATABASE_URL` |
| `go.mod` / `go.sum` | Añadida dependencia `pgx/v5` |

---

## Persistencia

| Aspecto | Estado |
|---------|--------|
| Interfaz EventRepository | ✅ Save, Recent, Count, Close |
| Memory repository | ✅ Thread-safe, FIFO eviction, max 5000 |
| Postgres repository | ✅ Save (ON CONFLICT DO NOTHING), Recent (ORDER BY timestamp DESC), Count |
| Migración | ✅ Tabla events + 6 índices |
| Storage mode switch | ✅ `IDS_STORAGE_MODE=memory|postgres` |
| Status endpoint | ✅ Muestra `storage_mode` |

---

## Schema

- **21 columnas**: id, timestamp, type, severity, protocol, direction, zone, source/destination (ip, port, hostname, asset_id, mac), title, description, tags (JSONB), metadata (JSONB), created_at
- **6 índices**: timestamp DESC, type, severity, protocol, source_ip, destination_ip

---

## Tests

**55 tests total** (8 storage + 12 ingest + 21 asset + 13 event + 1 skip), **0 failures**

| Test suite | Resultado |
|-----------|-----------|
| `internal/domain` | ✅ 34/34 |
| `internal/ingest` | ✅ 12/12 |
| `internal/storage` (memory) | ✅ 7/7 |
| `internal/storage` (postgres) | ⏭️ SKIP (DATABASE_URL not set in CI) |

---

## Validaciones

| Validación | Resultado |
|-----------|-----------|
| `go build ./cmd/ids-core` | ✅ |
| `go test ./... -count=1` | ✅ (55 tests, 1 skip) |
| `task check` | ✅ |
| `task compose:up` / `docker ps` | ✅ PostgreSQL + Redis healthy |
| Memory mode server test | ✅ healthz, status, simulate, recent |
| Postgres mode server test | ✅ full CRUD flow verified |
| `task compose:down` / no containers | ✅ |

---

## Docker

- `task compose:up` ✅ PostgreSQL + Redis arrancaron
- `task compose:down` ✅ Contenedores eliminados
- Contenedores restantes: **ninguno**

---

## Git sync

| Paso | Estado |
|------|--------|
| Commit local creado | ✅ `feat(core): add Postgres event persistence` |
| Push realizado | ✅ `origin/scaffold/ids-v2-dev-env-01` |
| HEAD local/remoto sincronizado | ✅ |

---

## Confirmaciones

- ✅ No se tocó `192.168.1.40`.
- ✅ No se desplegó nada.
- ✅ No se usaron PCAPs reales.
- ✅ No se copiaron secretos.
- ✅ No se copiaron binarios legacy.
- ✅ No quedaron contenedores activos.
- ✅ Dependencia añadida: `pgx/v5` (driver PostgreSQL moderno, sin ORM).

---

## Próxima fase recomendada

`IDS-CONSOLE-DASHBOARD-MVP-01` — Dashboard web MVP con Next.js.
