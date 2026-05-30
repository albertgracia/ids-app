# Suricata EVE JSON Sample Contract

## Purpose

Defines the sample contract for Suricata EVE JSON integration with `ids-app`. These synthetic samples serve as test fixtures for the future EVE parser and validate the mapping from EVE JSON to `domain.Event`.

## Samples

| Sample | event_type | Source IP | Dest IP | Protocol | Expected Event.Type | Expected Zone |
|--------|-----------|-----------|---------|----------|-------------------|---------------|
| alert-scan-detected.json | alert | 10.10.1.10 (lab) | 172.16.100.20 (OT) | TCP/modbus | scan_detected | ot |
| flow-normal-it.json | flow | 10.10.1.10 (lab) | 198.51.100.42 (test) | TCP/TLS | network_connection | it |
| dns-query.json | dns | 10.10.1.5 (lab) | 203.0.113.53 (test) | UDP | network_connection | it |
| http-request.json | http | 10.10.1.10 (lab) | 198.51.100.80 (test) | TCP | network_connection | it |
| tls-handshake.json | tls | 10.10.1.10 (lab) | 198.51.100.90 (test) | TCP | network_connection | it |
| ssh-session.json | ssh | 10.10.1.1 (lab) | 10.10.1.10 (lab) | TCP | network_connection | it |
| rdp-session.json | rdp | 10.10.1.20 (lab) | 10.10.1.5 (lab) | TCP | network_connection | it |
| smb-session.json | smb | 10.10.1.10 (lab) | 10.10.1.30 (lab) | TCP | network_connection | it |
| modbus-read.json | modbus | 172.16.100.5 (OT) | 172.16.100.20 (OT) | TCP/modbus | ot_command | ot |

## Common Fields

All samples include:

| Field | Type | Required |
|-------|------|----------|
| `timestamp` | string | yes |
| `event_type` | string | yes |
| `src_ip` | string | yes |
| `dest_ip` | string | yes |
| `proto` | string | yes |
| `flow_id` | integer | recommended |
| `in_iface` | string | recommended |
| `src_port` | integer | recommended |
| `dest_port` | integer | recommended |
| `app_proto` | string | if applicable |

## Type-Specific Fields

| event_type | Specific block | Key fields |
|-----------|---------------|------------|
| alert | `alert` | signature_id, signature, category, severity |
| flow | `flow` | pkts_toserver, bytes_toserver, state, age |
| dns | `dns` | rrname, rrtype, type (query/response) |
| http | `http` | hostname, url, http_method, status |
| tls | `tls` | sni, version, fingerprint, subject |
| ssh | `ssh` | version, client_proto, server_proto |
| rdp | `rdp` | cookie, client_build, client_name |
| smb | `smb` | command, status, filename, share |
| modbus | `modbus` | function_code, unit_id, address, count |

## Data Sanitization Rules

- All IPs use documentation/test ranges (RFC 5735, RFC 2606)
- No real public IPs, domain names, or hostnames
- No real credentials, tokens, or secrets
- No real customer or homelab data
- MAC addresses use `02:00:00:*` prefix (locally administered)
- Hostnames use `example.*` or `lab-*` or `ot-*` prefixes

## Usage

These samples will be used by the EVE parser in phase `IDS-SENSOR-SURICATA-EVE-PARSER-01` to:

1. Validate the parser handles each event type correctly
2. Verify mapping to `domain.Event` fields
3. Provide test fixtures for integration tests
4. Ensure zone/direction inference works with CIDR ranges

## Out of Scope

- Real EVE JSON files
- PCAP captures
- Suricata configuration or rules
- Parser implementation (future phase)
- Real-time ingestion
