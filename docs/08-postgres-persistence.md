# PostgreSQL Persistence — ids-core

## Purpose

The PostgreSQL persistence layer allows `ids-core` to store IDS events in a relational database for durable storage, historical queries, and future analytics.

## Architecture

```
POST /api/v1/simulate/events → Simulator → EventRepository (interface)
                                                ↓
                          ┌──────────────────────────┐
                          │     EventRepository      │
                          │  Save / Recent / Count   │
                          └────────────┬─────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │                                     │
        MemoryEventRepository               PostgresEventRepository
        (in-memory, max 5000)               (PostgreSQL via pgx/v5)
        default mode                        opt-in via IDS_STORAGE_MODE=postgres
```

## Modes

### Memory (default)

- No setup required.
- Max 5000 events (FIFO eviction).
- Events lost on restart.
- Thread-safe, returns copies.

### PostgreSQL

- Requires `IDS_STORAGE_MODE=postgres` and `DATABASE_URL`.
- Durable storage with indexed queries.
- JSONB for tags and metadata.
- ON CONFLICT DO NOTHING for idempotent saves.

## Schema

```sql
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    protocol TEXT NOT NULL,
    direction TEXT NOT NULL,
    zone TEXT NOT NULL,
    source_ip TEXT,
    source_port INTEGER,
    source_hostname TEXT,
    source_asset_id TEXT,
    source_mac TEXT,
    destination_ip TEXT,
    destination_port INTEGER,
    destination_hostname TEXT,
    destination_asset_id TEXT,
    destination_mac TEXT,
    title TEXT NOT NULL,
    description TEXT,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Indexes

- `idx_events_timestamp_desc` on `(timestamp DESC)`
- `idx_events_type` on `(type)`
- `idx_events_severity` on `(severity)`
- `idx_events_protocol` on `(protocol)`
- `idx_events_source_ip` on `(source_ip)`
- `idx_events_destination_ip` on `(destination_ip)`

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `IDS_STORAGE_MODE` | `memory` | Storage backend: `memory` or `postgres` |
| `DATABASE_URL` | — | PostgreSQL connection string (required for postgres mode) |

Example connection string:

```text
postgres://ids_user:ids_dev_password@127.0.0.1:5433/ids_dev?sslmode=disable
```

## API

### GET /api/v1/status

Returns `storage_mode` field:

```json
{
  "storage_mode": "memory"
}
```

Or when using PostgreSQL:

```json
{
  "storage_mode": "postgres"
}
```

## Local Testing

```powershell
# Start PostgreSQL
task compose:up

# Run integration tests
$env:DATABASE_URL="postgres://ids_user:ids_dev_password@127.0.0.1:5433/ids_dev?sslmode=disable"
cd services/ids-core
go test ./internal/storage/ -run TestPostgres -v

# Start server in postgres mode
$env:IDS_STORAGE_MODE="postgres"
go run ./cmd/ids-core

# Test endpoints
curl.exe -X POST http://127.0.0.1:8088/api/v1/simulate/events -H "Content-Type: application/json" -d "{\"scenario\":\"scan_detected\",\"count\":2}"
curl.exe http://127.0.0.1:8088/api/v1/events/recent?limit=3
```

## Out of Scope

- Asset persistence (future phase)
- Event retention policies / TTL
- Migration tooling (CLI)
- Connection pooling tuning for production
- Read replicas
