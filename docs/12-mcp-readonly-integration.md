# MCP Read-Only Integration — ids-mcp

## Purpose

The MCP (Model Context Protocol) server provides a read-only agent interface for `ids-app`. AI agents can query system status, recent events, analytics scoring, and project documentation — without executing any destructive actions.

## Read-Only Design

- `READ_ONLY = True` enforced at the config level
- No tools that modify state, data, or configuration
- No system command execution
- No firewall or network changes
- No database mutations
- All HTTP calls use GET or safe POST (read-only scoring)

## Tools

| Tool | Description |
|------|-------------|
| `ids_get_mcp_status` | MCP server status and capabilities |
| `ids_list_capabilities` | List all available tools |
| `ids_get_core_status` | Query ids-core `/api/v1/status` |
| `ids_get_recent_events` | Query recent events (limit 1-100) |
| `ids_summarize_recent_events` | Aggregate summary by severity, protocol, zone |
| `ids_score_event_readonly` | Score a single event via analytics-api (no save) |
| `ids_read_suricata_plan` | Read Suricata integration roadmap |

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `IDS_CORE_BASE_URL` | `http://127.0.0.1:8088` | ids-core API URL |
| `IDS_ANALYTICS_BASE_URL` | `http://127.0.0.1:8090` | analytics-api URL |
| `IDS_MCP_MODE` | `read_only` | Operation mode (must be read_only) |
| `IDS_MCP_TIMEOUT_SECONDS` | `5` | HTTP client timeout |

## Error Handling

All tools handle connection errors gracefully:

```json
{
  "status": "unavailable",
  "error": "cannot connect to http://127.0.0.1:8088"
}
```

## Transport

Uses MCP stdio transport: reads JSON requests from stdin, writes JSON responses to stdout.

## Relation to Other Services

- **ids-core**: provides event data and status
- **analytics-api**: provides event scoring
- **Suricata**: future sensor, documented in `ids_read_suricata_plan`

## Out of Scope

- Write/modify tools
- Suricata live integration
- Real-time event streaming
- Authentication/authorization
- WebSocket transport
