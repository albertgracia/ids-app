# Suricata EVE JSON Contract

This directory defines the sample contract for Suricata EVE JSON integration with `ids-app`.

## Directory Structure

```
suricata/
├── README.md
├── eve-json-minimal.schema.json
├── samples/
│   ├── alert-scan-detected.json
│   ├── flow-normal-it.json
│   ├── dns-query.json
│   ├── http-request.json
│   ├── tls-handshake.json
│   ├── ssh-session.json
│   ├── rdp-session.json
│   ├── smb-session.json
│   └── modbus-read.json
└── tests/
    └── validate_suricata_samples.py
```

## Samples

| File | event_type | Description |
|------|-----------|-------------|
| alert-scan-detected.json | alert | Synthetic TCP scan alert against OT host |
| flow-normal-it.json | flow | Normal HTTPS flow from workstation |
| dns-query.json | dns | DNS query for updates.example.com |
| http-request.json | http | HTTP request to intranet.example.com |
| tls-handshake.json | tls | TLS 1.3 handshake to secure.example.com |
| ssh-session.json | ssh | SSH administrative session |
| rdp-session.json | rdp | RDP session from workstation |
| smb-session.json | smb | SMB file access |
| modbus-read.json | modbus | Modbus read request to OT PLC |

## Data Rules

All samples use synthetic/documentation IP ranges:

- `192.0.2.0/24` — TEST-NET-1
- `198.51.100.0/24` — TEST-NET-2
- `203.0.113.0/24` — TEST-NET-3
- `10.10.0.0/16` — synthetic lab network
- `172.16.100.0/24` — synthetic OT network

Domains use `example.com`, `example.org` (RFC 2606).

No real IPs, domains, hostnames, MACs, or credentials are used.

## Validation

Run the contract validation:

```bash
python packages/contracts/suricata/tests/validate_suricata_samples.py
```

Or via task:

```bash
task validate:suricata-contract
```

## Mapping to ids-core Event

See `docs/14-suricata-eve-sample-contract.md` for the full mapping table.
