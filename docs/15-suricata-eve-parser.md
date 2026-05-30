# Suricata EVE JSON Parser — ids-core

## Purpose

The Suricata EVE JSON parser converts Suricata EVE JSON events into `domain.Event` objects for processing, storage, and scoring within `ids-app`.

## Input

The parser accepts Suricata EVE JSON events as byte slices. It uses the synthetic samples from `packages/contracts/suricata/samples/` as test fixtures.

## Supported Event Types

| EVE event_type | domain.Event.Type |
|---------------|-------------------|
| alert (scan/recon) | scan_detected |
| alert (auth/login) | auth_failure |
| alert (malware/trojan) | malware_indicator |
| alert (other) | policy_violation |
| flow | network_connection |
| dns | network_connection |
| http | network_connection |
| tls | network_connection |
| ssh | network_connection |
| rdp | network_connection |
| smb | network_connection |
| modbus | ot_command |
| unknown | network_connection |

## Severity Mapping

| alert.severity | domain.Severity |
|---------------|-----------------|
| 1 | critical |
| 2 | high |
| 3 | medium |
| 4 | low |
| no alert | info |

## Protocol Mapping

Priority: `app_proto` > `event_type` > `proto` > `unknown`.

| Input | domain.Protocol |
|-------|-----------------|
| modbus | modbus |
| dns | dns |
| http | http |
| tls | https |
| ssh | ssh |
| rdp | rdp |
| smb | smb |
| TCP | tcp |
| UDP | udp |
| ICMP | icmp |

## Zone Inference

| IP Range | Zone |
|----------|------|
| 172.16.100.0/24 | ot |
| 10.10.0.0/16 | it |

## Direction Inference

- IT ↔ OT: lateral
- IT ↔ IT: internal
- OT ↔ OT: internal
- External → internal: inbound
- Internal → external: outbound

## Metadata Preserved

- suricata.event_type, suricata.flow_id, suricata.interface, suricata.app_proto
- alert.signature_id, alert.category
- dns.rrname, dns.rrtype
- http.hostname, http.url
- tls.sni, tls.version
- ssh.client_proto, ssh.server_proto
- rdp.cookie, rdp.client_name
- smb.command, smb.share, smb.filename
- modbus.function_code, modbus.unit_id

## Limitations

- No real Suricata deployment
- No real-time ingestion
- Zone/direction inference is heuristic and uses synthetic IP ranges
- TLS is mapped to HTTPS protocol (not ideal but functional)
- Only 9 event types covered initially
- Not connected to ids-core runtime ingest yet
