"""MCP Server configuration."""

import os

READ_ONLY = True

IDS_CORE_BASE_URL = os.getenv("IDS_CORE_BASE_URL", "http://127.0.0.1:8088")
IDS_ANALYTICS_BASE_URL = os.getenv("IDS_ANALYTICS_BASE_URL", "http://127.0.0.1:8090")
MCP_TIMEOUT_SECONDS = int(os.getenv("IDS_MCP_TIMEOUT_SECONDS", "5"))
