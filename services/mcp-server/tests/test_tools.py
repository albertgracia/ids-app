"""Tests for MCP tools."""

from unittest.mock import MagicMock

from ids_mcp import config
from ids_mcp.tools import (
    ids_get_core_status,
    ids_get_mcp_status,
    ids_get_recent_events,
    ids_list_capabilities,
    ids_read_suricata_plan,
    ids_score_event_readonly,
    ids_summarize_recent_events,
)


def test_mcp_status_read_only():
    result = ids_get_mcp_status()
    assert result["service"] == "ids-mcp"
    assert result["status"] == "ok"
    assert result["mode"] == "read_only"
    assert "read_mcp_status" in result["capabilities"]


def test_list_capabilities():
    caps = ids_list_capabilities()
    assert len(caps) >= 6
    names = [c["name"] for c in caps]
    assert "read_core_status" in names
    assert "read_recent_events" in names
    assert "summarize_recent_events" in names
    assert "score_event_readonly" in names
    assert "read_suricata_plan" in names


def test_recent_events_limit_validation():
    result = ids_get_recent_events(limit=0)
    assert "error" in result
    result = ids_get_recent_events(limit=101)
    assert "error" in result


def test_recent_events_uses_mock_client():
    mock = MagicMock()
    mock.get_recent_events.return_value = {"items": [], "count": 0, "limit": 5}
    result = ids_get_recent_events(limit=5, core_client=mock)
    assert result["count"] == 0


def test_summarize_recent_events():
    mock = MagicMock()
    mock.get_recent_events.return_value = {
        "items": [
            {"severity": "critical", "protocol": "tcp", "zone": "ot", "type": "malware_indicator"},
            {"severity": "high", "protocol": "modbus", "zone": "ot", "type": "protocol_anomaly"},
            {"severity": "medium", "protocol": "http", "zone": "it", "type": "auth_failure"},
            {"severity": "low", "protocol": "dns", "zone": "it", "type": "network_connection"},
            {"severity": "info", "protocol": "tcp", "zone": "dmz", "type": "network_connection"},
        ],
        "count": 5,
        "limit": 100,
    }
    summary = ids_summarize_recent_events(core_client=mock)
    assert summary["total"] == 5
    assert summary["by_severity"]["critical"] == 1
    assert summary["by_severity"]["high"] == 1
    assert summary["by_protocol"]["modbus"] == 1
    assert summary["by_zone"]["ot"] == 2
    assert summary["high_critical_count"] == 2


def test_core_unavailable_returns_controlled_error():
    mock = MagicMock()
    mock.get_status.return_value = {"status": "unavailable", "error": "cannot connect"}
    result = ids_get_core_status(core_client=mock)
    assert result["status"] == "unavailable"


def test_analytics_unavailable_returns_controlled_error():
    mock = MagicMock()
    mock.score_event.return_value = {"status": "unavailable", "error": "cannot connect"}
    result = ids_score_event_readonly({"id": "test"}, analytics_client=mock)
    assert result["status"] == "unavailable"


def test_score_event_readonly_does_not_mutate():
    mock = MagicMock()
    mock.score_event.return_value = {"event_id": "test", "score": 50}
    event = {"id": "test", "severity": "high"}
    original_id = event["id"]
    result = ids_score_event_readonly(event, analytics_client=mock)
    assert event["id"] == original_id
    assert result["event_id"] == "test"


def test_suricata_plan_readonly():
    plan = ids_read_suricata_plan()
    assert plan["status"] == "planned"
    assert "Suricata" in plan["description"]
    assert "EVE JSON" in plan["format"]
    assert len(plan["security_rules"]) >= 1


def test_config_read_only_flag():
    assert config.READ_ONLY is True
