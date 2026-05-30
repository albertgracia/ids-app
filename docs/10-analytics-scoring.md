# Analytics Scoring — ids-analytics

## Purpose

The analytics scoring module provides deterministic risk scoring for IDS events. It evaluates each event against heuristic rules and produces a risk score (0–100), explanatory factors, and investigation recommendations.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/healthz` | Service health |
| GET | `/api/v1/status` | Status + capabilities |
| POST | `/api/v1/score/event` | Score a single event |
| POST | `/api/v1/score/events` | Score a batch of events (max 100) |

## Scoring Heuristics

Score is computed by summing impacts from multiple weighted factors, clamped to 0–100.

### Severity

| Level | Impact |
|-------|--------|
| info | 5 |
| low | 15 |
| medium | 35 |
| high | 60 |
| critical | 80 |

### Zone

| Zone | Impact |
|------|--------|
| ot | 15 |
| dmz | 10 |
| management | 10 |
| internet | 10 |
| it | 5 |
| unknown | 5 |

### Direction

| Direction | Impact |
|-----------|--------|
| external | 15 |
| lateral | 10 |
| inbound | 10 |
| internal | 5 |
| outbound | 5 |
| unknown | 3 |

### Event Type

| Type | Impact |
|------|--------|
| malware_indicator | 25 |
| protocol_anomaly | 20 |
| scan_detected | 15 |
| auth_failure | 15 |
| ot_command | 15 |
| policy_violation | 10 |
| asset_discovered | 5 |

### Protocol

| Category | Impact |
|----------|--------|
| OT protocol (modbus, s7comm, profinet, etc.) | 15 |
| Sensitive IT (ssh, rdp, smb) | 10 |

### Compound Rules

- OT zone + high/critical severity: +10
- OT protocol + lateral direction: +10
- Destination port is known OT port (502, 102, 44818, 4840, 20000): +10

## Risk Level

| Score | Level |
|-------|-------|
| 0–19 | info |
| 20–39 | low |
| 40–59 | medium |
| 60–79 | high |
| 80–100 | critical |

## Factors

Each scoring rule produces a `ScoreFactor` with:

- `name`: machine-readable identifier
- `impact`: numeric contribution to total score
- `reason`: human-readable explanation

## Recommendations

Generated dynamically based on active factors. Examples:

- "Prioritize investigation and preserve related evidence."
- "Validate whether the OT protocol exposure is expected."
- "Review lateral traffic path between source and destination."
- "Check whether the source host is performing unauthorized discovery."

No destructive actions are recommended.

## Suricata Integration (Future)

The scoring engine accepts events in the ids-core normalized format. Future Suricata EVE JSON events will be mapped to this same format before scoring. No parser is implemented yet.

## Suricata Integration

Analytics scoring is designed for normalized `domain.Event` objects. Future Suricata EVE JSON events will be mapped to `domain.Event` (see `docs/11-suricata-eve-json-integration.md`) before scoring. No scoring is applied directly to raw EVE JSON.

## Limitations

- No ML or AI
- No external API calls
- No automatic blocking recommendations
- No real-time streaming (future via MCP or WebSocket)
