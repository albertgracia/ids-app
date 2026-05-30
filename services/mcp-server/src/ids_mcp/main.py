"""
IDS MCP Server — Read-Only Agent Interface.

This server provides read-only access to ids-app capabilities.
It does NOT execute system commands, modify files, block IPs,
or interact with firewalls.

Transport: stdio JSON (MCP protocol) + HTTP (health/status endpoints).
"""

from __future__ import annotations

import json
import sys
import threading
from typing import Any

import uvicorn

from ids_mcp import config
from ids_mcp.http_server import app as http_app
from ids_mcp.tools import (
    ids_get_core_status,
    ids_get_mcp_status,
    ids_get_recent_events,
    ids_list_capabilities,
    ids_read_suricata_plan,
    ids_score_event_readonly,
    ids_summarize_recent_events,
)

TOOL_REGISTRY: dict[str, dict[str, Any]] = {
    "ids_get_mcp_status": {"fn": ids_get_mcp_status, "params": []},
    "ids_list_capabilities": {"fn": ids_list_capabilities, "params": []},
    "ids_get_core_status": {"fn": ids_get_core_status, "params": []},
    "ids_get_recent_events": {
        "fn": ids_get_recent_events,
        "params": [{"name": "limit", "type": "int", "default": 20, "description": "Number of events (1-100)"}],
    },
    "ids_summarize_recent_events": {"fn": ids_summarize_recent_events, "params": []},
    "ids_score_event_readonly": {
        "fn": ids_score_event_readonly,
        "params": [{"name": "event", "type": "object", "description": "Normalized IDS event to score"}],
    },
    "ids_read_suricata_plan": {"fn": ids_read_suricata_plan, "params": []},
}


def handle_request(request: dict) -> dict:
    tool_name = request.get("tool", "")
    params = request.get("params", {}) or {}
    if not config.READ_ONLY:
        return {"error": "MCP is not in read-only mode — operation blocked"}
    entry = TOOL_REGISTRY.get(tool_name)
    if not entry:
        return {"error": f"Unknown tool: {tool_name}"}
    try:
        fn = entry["fn"]
        result = fn(**params)
        return {"result": result}
    except TypeError as e:
        return {"error": f"Invalid parameters for {tool_name}: {e}"}
    except Exception as e:
        return {"error": f"{tool_name} failed: {e}"}


def run_stdin() -> None:
    """Read JSON requests from stdin, write JSON responses to stdout."""
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            request = json.loads(line)
            response = handle_request(request)
        except json.JSONDecodeError as e:
            response = {"error": f"Invalid JSON: {e}"}
        except Exception as e:
            response = {"error": str(e)}
        sys.stdout.write(json.dumps(response) + "\n")
        sys.stdout.flush()


def main() -> None:
    port = int(config.IDS_CORE_BASE_URL.split(":")[-1]) + 3 if ":" in config.IDS_CORE_BASE_URL else 8091
    http_port = port

    http_thread = threading.Thread(target=uvicorn.run, args=(http_app,), kwargs={"host": "127.0.0.1", "port": http_port, "log_level": "info"}, daemon=True)
    http_thread.start()

    run_stdin()


if __name__ == "__main__":
    main()
