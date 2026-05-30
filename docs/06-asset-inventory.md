# Asset Inventory Model — ids-core

## Purpose

The asset inventory model defines the standard data structure for representing OT/IT assets in `ids-app`. Assets are discovered through network observation, event correlation, or manual declaration.

## Core Types

### Asset

The primary structure representing a network asset:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique asset identifier (auto-generated) |
| `name` | string | Human-readable asset name |
| `type` | AssetType | Classification of the asset |
| `status` | AssetStatus | Current status in the inventory |
| `criticality` | Criticality | Business/operational impact level |
| `zone` | Zone | Network zone |
| `ips` | []string | Observed IP addresses |
| `macs` | []string | Observed MAC addresses |
| `hostnames` | []string | Resolved hostnames |
| `vendor` | string | Equipment vendor |
| `model` | string | Equipment model |
| `firmware` | string | Firmware version |
| `protocols` | []Protocol | Observed network protocols |
| `tags` | []string | Categorization tags |
| `first_seen` | time.Time | First observation timestamp (UTC) |
| `last_seen` | time.Time | Last observation timestamp (UTC) |
| `metadata` | map[string]string | Extensible key-value metadata |

## Enums

### AssetType

| Value | Description |
|-------|-------------|
| `unknown` | Unclassified |
| `workstation` | User workstation |
| `server` | Server (IT) |
| `network_device` | Generic network device |
| `firewall` | Firewall appliance |
| `router` | Router |
| `switch` | Network switch |
| `access_point` | Wireless access point |
| `camera` | IP camera |
| `printer` | Network printer |
| `plc` | Programmable Logic Controller |
| `hmi` | Human-Machine Interface |
| `scada` | SCADA system |
| `rtu` | Remote Terminal Unit |
| `iot` | IoT device |
| `sensor` | Sensor |
| `controller` | Industrial controller |
| `database` | Database server |
| `application` | Application server |

### AssetStatus

| Value | Description |
|-------|-------------|
| `unknown` | Not yet classified |
| `observed` | First seen on the network |
| `known` | Identified and cataloged |
| `trusted` | Verified and trusted |
| `suspicious` | Flagged for review |
| `retired` | Removed from service |
| `offline` | Currently not reachable |

### Criticality

| Value | Description |
|-------|-------------|
| `unknown` | Not yet assessed |
| `low` | Limited impact |
| `medium` | Moderate impact |
| `high` | Significant impact |
| `critical` | Maximum impact |

### Zone

Reuses the Zone enum from the event model (`domain.Zone`): `it`, `ot`, `dmz`, `management`, `guest`, `internet`, `unknown`.

### Protocol

Reuses the Protocol enum from the event model (`domain.Protocol`): all IT and OT/industrial protocols.

## Helpers

| Method | Description |
|--------|-------------|
| `NewAsset(assetType, name)` | Creates Asset with auto-ID, timestamps, defaults |
| `Touch(t)` | Updates LastSeen (and FirstSeen if zero) |
| `AddIP(ip)` | Adds validated IP, de-duplicates |
| `AddMAC(mac)` | Adds validated MAC, de-duplicates |
| `AddProtocol(protocol)` | Adds validated protocol, de-duplicates |

## Validation

`Validate()` checks:
- ID is non-empty
- Name is non-empty
- Type is a valid enum
- Status is a valid enum
- Criticality is a valid enum
- Zone is a valid enum
- FirstSeen and LastSeen are non-zero
- LastSeen is not before FirstSeen
- All IPs are valid addresses (if present)
- All MACs are valid (if present)
- All protocols are valid (if present)

## Relation to Events

`Event.Source.AssetID` and `Event.Destination.AssetID` can reference `Asset.ID`. The inventory will be populated in future phases from simulated events, sensor data, logs, or passive discovery.

## Out of Scope (this phase)

- Database persistence (PostgreSQL)
- Real asset discovery from network
- Event-to-asset correlation
- Asset lifecycle management
- UI for asset inventory
- Real sensor/OT protocol fingerprinting
