# Event Model — ids-core

## Purpose

The event model defines the standard data structure for representing IDS events in `ids-app`. It provides a normalized format for security events across OT/IT networks, supporting detection, analytics, and reporting.

## Core Types

### Event

The primary structure representing a security event:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique event identifier (auto-generated) |
| `timestamp` | time.Time | Event timestamp (UTC) |
| `type` | EventType | Classification of the event |
| `severity` | Severity | Impact level |
| `protocol` | Protocol | Network protocol detected |
| `source` | Endpoint | Origin endpoint |
| `destination` | Endpoint | Target endpoint |
| `direction` | Direction | Traffic direction relative to network |
| `zone` | Zone | Network zone classification |
| `title` | string | Short event summary |
| `description` | string | Detailed event information (optional) |
| `tags` | []string | Categorization tags (optional) |
| `metadata` | map[string]string | Extensible key-value metadata (optional) |

### Endpoint

Represents a network endpoint involved in an event:

| Field | Type | Description |
|-------|------|-------------|
| `ip` | string | IP address |
| `port` | int | Port number (optional) |
| `hostname` | string | Hostname (optional) |
| `asset_id` | string | Reference to asset inventory (optional) |
| `mac` | string | MAC address (optional) |

## Enums

### EventType

| Value | Description |
|-------|-------------|
| `network_connection` | Standard network connection |
| `scan_detected` | Port or network scan |
| `protocol_anomaly` | Protocol violation or anomaly |
| `auth_failure` | Authentication failure |
| `policy_violation` | Security policy violation |
| `asset_discovered` | New asset detected on network |
| `ot_command` | OT/industrial protocol command |
| `malware_indicator` | Malware or IOC detected |
| `system` | System-level event |

### Severity

| Value | Order |
|-------|-------|
| `info` | 0 (lowest) |
| `low` | 1 |
| `medium` | 2 |
| `high` | 3 |
| `critical` | 4 (highest) |

### Protocol (IT)

| Value | Description |
|-------|-------------|
| `tcp` | TCP |
| `udp` | UDP |
| `icmp` | ICMP |
| `http` | HTTP |
| `https` | HTTPS |
| `dns` | DNS |
| `ssh` | SSH |
| `rdp` | RDP |
| `smb` | SMB |

### Protocol (OT/Industrial)

| Value | Description |
|-------|-------------|
| `modbus` | Modbus TCP/RTU |
| `s7comm` | Siemens S7 Communication |
| `profinet` | PROFINET |
| `ethernet_ip` | EtherNet/IP |
| `cip` | Common Industrial Protocol |
| `opcua` | OPC UA |
| `bacnet` | BACnet |
| `dnp3` | DNP3 |
| `iec104` | IEC 60870-5-104 |
| `unknown` | Unrecognized protocol |

### Direction

| Value | Description |
|-------|-------------|
| `inbound` | Entering the network |
| `outbound` | Leaving the network |
| `lateral` | Between internal assets |
| `internal` | Within the same zone |
| `external` | To/from external networks |
| `unknown` | Direction not determined |

### Zone

| Value | Description |
|-------|-------------|
| `it` | Information Technology network |
| `ot` | Operational Technology network |
| `dmz` | Demilitarized Zone |
| `management` | Management network |
| `guest` | Guest network |
| `internet` | External/Internet |
| `unknown` | Zone not classified |

## Validation

Every Event can be validated using the `Validate()` method, which checks:

- `ID` is non-empty
- `Timestamp` is non-zero
- `Type` is a valid enum value
- `Severity` is a valid enum value
- `Protocol` is a valid enum value
- `Source.IP` is a valid IP address (if present)
- `Destination.IP` is a valid IP address (if present)
- Ports are in range 0–65535
- `Title` is non-empty

## Constructor

`NewEvent(eventType, severity, title)` creates an Event with:

- Auto-generated ID (UUID-like random hex)
- Current UTC timestamp
- Protocol set to `unknown`
- Direction set to `unknown`
- Zone set to `unknown`
- Empty Tags and Metadata slices

## Out of Scope (this phase)

- Persistence (PostgreSQL)
- Event ingestion from network
- Event correlation
- Scoring or risk calculation
- Dashboard or visualization
- Real network capture (PCAP)
- Suricata/Zeek integration
