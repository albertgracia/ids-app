"""
IDS MCP Server — Read-Only Agent Interface.

This server provides read-only access to ids-app capabilities.
It does NOT execute system commands, modify files, block IPs,
or interact with firewalls.
"""

import json
import sys

CAPABILITIES = {
    "read_status": "Read current system status",
    "read_events_future": "Read detection events (future)",
    "read_assets_future": "Read asset inventory (future)",
    "explain_alerts_future": "Explain detection alerts (future)",
    "generate_reports_future": "Generate summary reports (future)",
}


def ids_get_status() -> dict:
    return {
        "service": "mcp-server",
        "status": "ok",
        "mode": "read-only",
        "version": "0.1.0",
    }


def ids_list_capabilities() -> list[dict]:
    return [
        {"name": name, "description": desc}
        for name, desc in CAPABILITIES.items()
    ]


def handle_request(request: dict) -> dict:
    tool = request.get("tool", "")
    if tool == "ids_get_status":
        return {"result": ids_get_status()}
    elif tool == "ids_list_capabilities":
        return {"result": ids_list_capabilities()}
    else:
        return {"error": f"Unknown tool: {tool}"}


def main():
    """
    Entry point. Reads JSON requests from stdin and writes JSON responses
    to stdout — compatible with MCP stdio transport.
    """
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


if __name__ == "__main__":
    main()
