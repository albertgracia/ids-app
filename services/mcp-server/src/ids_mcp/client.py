"""HTTP client for ids-core and analytics-api."""

from __future__ import annotations

from typing import Any

import httpx

from ids_mcp import config


class CoreClient:
    """Client for ids-core REST API."""

    def __init__(self, base_url: str | None = None, timeout: int | None = None):
        self.base_url = (base_url or config.IDS_CORE_BASE_URL).rstrip("/")
        self.timeout = timeout or config.MCP_TIMEOUT_SECONDS

    def get_status(self) -> dict[str, Any]:
        return self._get("/api/v1/status")

    def get_recent_events(self, limit: int = 20) -> dict[str, Any]:
        return self._get(f"/api/v1/events/recent?limit={limit}")

    def _get(self, path: str) -> dict[str, Any]:
        url = f"{self.base_url}{path}"
        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.get(url)
                resp.raise_for_status()
                return resp.json()
        except httpx.ConnectError:
            return {"status": "unavailable", "error": f"cannot connect to {self.base_url}"}
        except httpx.TimeoutException:
            return {"status": "unavailable", "error": f"timeout connecting to {self.base_url}"}
        except httpx.HTTPStatusError as e:
            return {"status": "error", "error": f"HTTP {e.response.status_code}: {e.response.text[:200]}"}


class AnalyticsClient:
    """Client for analytics-api REST API."""

    def __init__(self, base_url: str | None = None, timeout: int | None = None):
        self.base_url = (base_url or config.IDS_ANALYTICS_BASE_URL).rstrip("/")
        self.timeout = timeout or config.MCP_TIMEOUT_SECONDS

    def score_event(self, event: dict) -> dict[str, Any]:
        url = f"{self.base_url}/api/v1/score/event"
        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.post(url, json=event)
                resp.raise_for_status()
                return resp.json()
        except httpx.ConnectError:
            return {"status": "unavailable", "error": f"cannot connect to {self.base_url}"}
        except httpx.TimeoutException:
            return {"status": "unavailable", "error": f"timeout connecting to {self.base_url}"}
        except httpx.HTTPStatusError as e:
            return {"status": "error", "error": f"HTTP {e.response.status_code}: {e.response.text[:200]}"}
