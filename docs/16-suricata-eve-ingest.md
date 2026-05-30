# Suricata EVE JSON Ingest — ids-core

## Purpose

The Suricata EVE JSON ingest layer connects the EVE parser to the runtime event pipeline. Ingested events are parsed, validated, stored in the EventRepository, and made available through the standard API endpoints.

## Architecture

```
POST /api/v1/suricata/eve
        │
        ▼
   EVEIngestor.IngestJSON
        │
        ▼
   suricata.ParseEVEJSON
        │
        ▼
   domain.Event (validated)
        │
        ▼
   EventRepository.Save
        │
        ▼
   memory / PostgreSQL
        │
        ▼
   GET /api/v1/events/recent
        │
        ▼
   dashboard / analytics scoring
```

## Endpoints

### POST /api/v1/suricata/eve

Ingests a single Suricata EVE JSON event.

**Request:** Content-Type: application/json, body: single EVE JSON object

**Response 200:**
```json
{
  "item": { "...domain.Event..." },
  "source": "suricata_eve",
  "count": 1
}
```

### POST /api/v1/suricata/eve/batch

Ingests multiple EVE JSON events (JSON Lines format, one event per line).

**Request:** body: JSON Lines (multiple event objects, one per line)

**Response 200:**
```json
{
  "items": [ "...domain.Event..." ],
  "source": "suricata_eve",
  "count": 2
}
```

**Limits:**
- Max 100 events per batch (HTTP 400 if exceeded)
- Empty body returns HTTP 400

## Supported Fixtures

All 9 synthetic samples from `packages/contracts/suricata/samples/`:

- alert-scan-detected.json → scan_detected, high, modbus, ot
- flow-normal-it.json → network_connection, info, https, it
- dns-query.json → network_connection, info, dns, it
- http-request.json → network_connection, info, http, it
- tls-handshake.json → network_connection, info, https, it
- ssh-session.json → network_connection, info, ssh, it
- rdp-session.json → network_connection, info, rdp, it
- smb-session.json → network_connection, info, smb, it
- modbus-read.json → ot_command, info, modbus, ot

## Storage Modes

- **Memory**: works immediately, no setup required
- **PostgreSQL**: requires `IDS_STORAGE_MODE=postgres` and `DATABASE_URL`

## Capabilities

- `suricata_eve_parser` — EVE JSON parsing available
- `suricata_eve_ingest` — EVE JSON ingest endpoints available

## Quick Test

```powershell
# Terminal 1: Start ids-core
cd services/ids-core
go run ./cmd/ids-core

# Terminal 2: Ingest an EVE event
curl.exe -X POST http://127.0.0.1:8088/api/v1/suricata/eve -H "Content-Type: application/json" --data-binary "@packages/contracts/suricata/samples/alert-scan-detected.json"

# Verify
curl.exe http://127.0.0.1:8088/api/v1/events/recent?limit=3
```

## Out of Scope

- Suricata sensor deployment
- Real eve.json file reading
- Continuous file tailing
- PCAP captures
- SPAN/mirror configuration
- Sensor daemon
