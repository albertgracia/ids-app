"""Read-only MCP tools for ids-app.

Each tool is a pure function that can be called from the MCP handler.
Tools do NOT modify state, execute system commands, or call external services
beyond the configured ids-core and analytics-api URLs.
"""

from __future__ import annotations

from typing import Any

from ids_mcp import config
from ids_mcp.client import AnalyticsClient, CoreClient

CAPABILITIES: dict[str, str] = {
    "read_mcp_status": "Read MCP server status and mode",
    "read_core_status": "Read ids-core service status",
    "read_recent_events": "Read recent IDS events from ids-core",
    "summarize_recent_events": "Summarize recent events by severity, protocol, zone",
    "score_event_readonly": "Score a single event via analytics-api (read-only)",
    "read_suricata_plan": "Read the Suricata integration roadmap",
}

SURICATA_PLAN_SUMMARY = {
    "status": "planned",
    "description": "Suricata will be integrated as a future IDS sensor/engine.",
    "format": "EVE JSON",
    "mapping": "EVE JSON fields are mapped to ids-core domain.Event (see docs/11-suricata-eve-json-integration.md)",
    "priority_event_types": ["alert", "flow", "dns", "http", "tls", "ssh", "modbus"],
    "deployment": "Dedicated sensor (Mini-PC or VM) with SPAN/mirror port",
    "security_rules": [
        "No real PCAPs in repository",
        "No automatic blocking",
        "No firewall automation",
        "Sensor isolated from observability stack",
    ],
    "read_more": "docs/11-suricata-eve-json-integration.md",
}


def ids_get_mcp_status() -> dict[str, Any]:
    return {
        "service": "ids-mcp",
        "status": "ok",
        "mode": "read_only" if config.READ_ONLY else "unknown",
        "capabilities": list(CAPABILITIES.keys()),
    }


def ids_list_capabilities() -> list[dict[str, str]]:
    return [{"name": name, "description": desc} for name, desc in CAPABILITIES.items()]


def ids_get_core_status(core_client: CoreClient | None = None) -> dict[str, Any]:
    client = core_client or CoreClient()
    return client.get_status()


def ids_get_recent_events(limit: int = 20, core_client: CoreClient | None = None) -> dict[str, Any]:
    if limit < 1:
        return {"error": "limit must be >= 1"}
    if limit > 100:
        return {"error": "limit must be <= 100"}
    client = core_client or CoreClient()
    return client.get_recent_events(limit)


def ids_summarize_recent_events(core_client: CoreClient | None = None) -> dict[str, Any]:
    client = core_client or CoreClient()
    raw = client.get_recent_events(100)
    if "error" in raw:
        return raw
    items = raw.get("items", [])
    total = len(items)
    by_severity: dict[str, int] = {}
    by_protocol: dict[str, int] = {}
    by_zone: dict[str, int] = {}
    by_type: dict[str, int] = {}
    high_critical = 0

    for evt in items:
        sev = evt.get("severity", "unknown")
        by_severity[sev] = by_severity.get(sev, 0) + 1
        proto = evt.get("protocol", "unknown")
        by_protocol[proto] = by_protocol.get(proto, 0) + 1
        zone = evt.get("zone", "unknown")
        by_zone[zone] = by_zone.get(zone, 0) + 1
        etype = evt.get("type", "unknown")
        by_type[etype] = by_type.get(etype, 0) + 1
        if sev in ("high", "critical"):
            high_critical += 1

    return {
        "total": total,
        "by_severity": by_severity,
        "by_protocol": by_protocol,
        "by_zone": by_zone,
        "by_type": by_type,
        "high_critical_count": high_critical,
    }


def ids_score_event_readonly(
    event: dict[str, Any],
    analytics_client: AnalyticsClient | None = None,
) -> dict[str, Any]:
    client = analytics_client or AnalyticsClient()
    return client.score_event(event)


def ids_read_suricata_plan() -> dict[str, Any]:
    return dict(SURICATA_PLAN_SUMMARY)
