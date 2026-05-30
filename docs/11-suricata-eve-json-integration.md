# Suricata EVE JSON Integration

## 1. Purpose

Suricata will serve as a future IDS sensor/engine for `ids-app`, generating network security events in EVE JSON format. This document defines the integration strategy, mapping rules, and deployment options.

## 2. Position in Architecture

```
Network TAP / SPAN / Mirror
        │
        ▼
Suricata Sensor
        │
        ▼
eve.json
        │
        ▼
ids-suricata-ingest (future service)
        │
        ▼
EVE JSON Parser / Normalizer
        │
        ▼
ids-core domain.Event
        │
        ▼
EventRepository
        │
        ├──► PostgreSQL
        │
        ├──► analytics-api scoring
        │
        └──► Next.js console / MCP
```

Suricata is a **sensor** — separate from the central platform. It captures and analyzes network traffic, then sends normalized events to `ids-core` for storage, scoring, and display.

## 3. What Suricata Provides

- **Alert events**: signature-based detection with severity, category, and metadata
- **Flow events**: connection summaries with protocol, bytes, duration
- **Protocol metadata**: DNS queries, HTTP URIs, TLS certificates, SSH banners, SMB pipes, Modbus requests
- **OT protocol events**: Modbus (built-in), potentially OPC UA (via emerging rules/plugins)
- **Evidence for scoring**: alert severity, protocol anomalies, known-bad indicators
- **Asset enrichment**: observed IPs, MACs, hostnames, TLS SNI, HTTP User-Agent

## 4. Priority EVE JSON Event Types

### MVP Priority

| event_type | Purpose | Priority |
|-----------|---------|----------|
| `alert` | Signature-based alerts | P0 |
| `flow` | Connection metadata | P0 |
| `dns` | DNS query logging | P1 |
| `http` | HTTP request metadata | P1 |
| `tls` | TLS handshake metadata | P1 |
| `ssh` | SSH connection metadata | P1 |
| `rdp` | RDP connection metadata | P2 |
| `smb` | SMB protocol metadata | P2 |
| `modbus` | Modbus protocol events | P1 (OT) |

### Phase 2

| event_type | Purpose |
|-----------|---------|
| `fileinfo` | File extraction metadata |
| `anomaly` | Protocol anomaly events |
| `stats` | Suricata performance stats |
| `dhcp` | DHCP lease metadata |
| `ntp` | NTP request metadata |
| `mqtt` | MQTT protocol (verify Suricata support) |
| `opcua` | OPC UA (verify — likely needs custom rules/plugin) |

## 5. EVE JSON → ids-core Event Mapping

| EVE JSON field | ids-core Event field | Notes |
|---------------|---------------------|-------|
| `timestamp` | `Event.Timestamp` | Parse RFC 3339 / Suricata timestamp format |
| `event_type` | `Event.Type` | See event type mapping below |
| `src_ip` | `Event.Source.IP` | Always present on network events |
| `src_port` | `Event.Source.Port` | Optional, 0 if not applicable |
| `dest_ip` | `Event.Destination.IP` | Always present on network events |
| `dest_port` | `Event.Destination.Port` | Optional, 0 if not applicable |
| `proto` | — | Fallback for protocol if `app_proto` absent |
| `app_proto` | `Event.Protocol` | Preferred — application-layer protocol name |
| `alert.severity` | `Event.Severity` | Map 1–3 to severity levels |
| `alert.signature` | `Event.Title` | Alert signature text |
| `alert.category` | `Event.Tags` / `Event.Metadata` | Add to tags or metadata |
| `alert.signature_id` | `Event.Metadata["suricata.sid"]` | Preserve for reference |
| `alert.gid` | `Event.Metadata["suricata.gid"]` | Generator ID |
| `flow_id` | `Event.Metadata["suricata.flow_id"]` | Flow correlation |
| `in_iface` | `Event.Metadata["suricata.interface"]` | Ingress interface |
| `community_id` | `Event.Metadata["suricata.community_id"]` | Flow correlation ID |
| `tx_id` | `Event.Metadata["suricata.tx_id"]` | Transaction ID |

### Event Type Mapping

| EVE event_type + alert category | ids-core Event.Type |
|--------------------------------|-------------------|
| `alert` + category contains "malware" / "trojan" / "botnet" | `malware_indicator` |
| `alert` + category contains "attempt" / "recon" / "scan" | `scan_detected` |
| `alert` + category contains "auth" / "login" | `auth_failure` |
| `alert` + protocol `modbus`, `s7comm`, `dnp3` | `protocol_anomaly` |
| `alert` + other categories | `policy_violation` |
| `flow` | `network_connection` |
| `dns` | `network_connection` |
| `http` | `network_connection` |
| `tls` | `network_connection` |
| `ssh` | `network_connection` |
| `modbus` (non-alert) | `ot_command` |
| Others / unknown | `system` |

### Severity Mapping

| Suricata alert.severity | ids-core Severity |
|------------------------|-------------------|
| 1 | `critical` |
| 2 | `high` |
| 3 | `medium` |
| No alert (flow/protocol) | `info` or `low` based on context |

*Note: This mapping must be validated against real rule sets and may be refined per deployment.*

### Protocol Mapping

- If `app_proto` exists, use it as `Event.Protocol` (e.g., `modbus`, `http`, `dns`, `tls`, `ssh`)
- If `event_type = modbus`, force `Event.Protocol = modbus`
- If `proto = TCP` and no `app_proto`, fallback to `tcp`
- If `proto = UDP` and no `app_proto`, fallback to `udp`
- Otherwise: `unknown`

### Zone and Direction Inference

Zone and direction are not provided by Suricata directly. They must be inferred:

- **Direction**: compare `src_ip` against known network ranges (RFC 1918, configured OT ranges). If the event is an `alert` with external source → `inbound`. If source is internal → `internal` or `lateral`.
- **Zone**: match `src_ip` / `dest_ip` against configured CIDR ranges for each zone (it, ot, dmz, management).

Initial implementation can use a simple CIDR-based zone mapper. Configured ranges would come from ids-core config.

## 6. Asset Inventory Enrichment

EVE JSON fields that can contribute to asset inventory:

| EVE field | Asset field |
|-----------|-------------|
| `src_ip` / `dest_ip` | `Asset.IPs` |
| `mac` (if available in dhcp or flow) | `Asset.MACs` |
| `dns.rrname` (passive DNS) | `Asset.Hostnames` |
| `http.hostname` | `Asset.Hostnames` |
| `tls.sni` | `Asset.Hostnames` |
| `dhcp.hostname` (if dhcp event added) | `Asset.Hostnames` |

This enrichment would happen in a future phase within the EVE parser/normalizer or as a separate enrichment pipeline in ids-core.

## 7. Analytics Scoring Integration

Events normalized from Suricata EVE JSON will flow through the same scoring pipeline as simulated events:

```
ids-core Event → EventRepository → analytics-api POST /api/v1/score/event
```

The scoring engine already evaluates:

- `severity` — directly mapped from `alert.severity`
- `protocol` — from `app_proto` or `proto`
- `zone` — inferred from CIDR ranges
- `direction` — inferred from IP comparison
- `event_type` — mapped from `alert.category`
- `destination.port` — available on most network events

**No scoring is applied directly to raw EVE JSON.** All events must first be normalized to `domain.Event`.

## 8. Deployment Options

### Option A — Dedicated Sensor (Recommended)

```
[SPAN port] ──► [Mini-PC / VM] ──► eve.json ──► ids-agent ──► ids-core
```

- Separate hardware or VM with dedicated SPAN/mirror port
- Suricata runs in IDS mode (no blocking)
- `ids-agent` tailes `eve.json` and sends normalized events to `ids-core`
- Recommended for any real traffic capture

### Option B — Suricata on 192.168.1.40

- Only viable if the server has network visibility (SPAN/mirror or bridge)
- Not recommended initially without a dedicated capture interface
- Must not interfere with existing observability stack

### Option C — Offline / Lab Import

- Use synthetic EVE JSON files or sanitized captures
- Import via CLI tool or script
- Safe for development and testing without real traffic
- No network capture required

## 9. Security and Privacy

- **No real PCAPs** in the repository
- **No real eve.json** with sensitive IPs or payloads
- Sanitize any sample data before importing
- Do not publish sensitive rule metadata or environment fingerprints
- **No automatic blocking** — Suricata runs in IDS mode only
- **No firewall automation** from Suricata events
- Sensor network should be isolated from observability stack
- All destructive actions require human approval

## 10. Future Phases

| Phase | Description |
|-------|-------------|
| `IDS-SENSOR-SURICATA-EVE-SAMPLE-CONTRACT-01` | Define sample EVE JSON structures and test data |
| `IDS-SENSOR-SURICATA-EVE-PARSER-01` | Implement EVE JSON parser/normalizer (Go or Python) |
| `IDS-SENSOR-SURICATA-EVE-INGEST-01` | Integrate parser with ids-core ingest pipeline |
| `IDS-SENSOR-SURICATA-LAB-DEPLOY-01` | Deploy Suricata in lab/VM for testing |
| `IDS-SENSOR-SURICATA-SPAN-MIRROR-PLAN-01` | Plan SPAN/mirror port deployment |
| `IDS-SENSOR-SURICATA-RULES-GOVERNANCE-01` | Rule management, updates, and tuning policy |

## 11. Out of Scope (This Phase)

- Suricata installation
- EVE JSON parser implementation
- Real traffic capture
- PCAP analysis
- Suricata rule writing
- Sensor deployment
- Integration with existing observability stack
