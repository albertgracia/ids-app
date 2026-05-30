"""
MCP HTTP Server — provides health endpoints for Docker container orchestration.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ids_mcp import config
from ids_mcp.tools import ids_get_mcp_status, ids_list_capabilities

app = FastAPI(title="IDS MCP Server", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:3000", "http://localhost:3000"],
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.get("/healthz")
def healthz():
    return {"service": "ids-mcp", "status": "ok", "mode": "read_only" if config.READ_ONLY else "unknown"}


@app.get("/api/v1/status")
def status():
    mcp = ids_get_mcp_status()
    caps = ids_list_capabilities()
    return {
        "service": "ids-mcp",
        "status": mcp["status"],
        "mode": mcp["mode"],
        "version": "0.1.0",
        "capabilities": [c["name"] for c in caps],
    }
