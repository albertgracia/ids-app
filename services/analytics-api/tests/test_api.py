"""Tests for the analytics API endpoints."""

from fastapi.testclient import TestClient

from ids_analytics.main import app

client = TestClient(app)


def test_healthz():
    res = client.get("/healthz")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_status():
    res = client.get("/api/v1/status")
    assert res.status_code == 200
    data = res.json()
    assert data["service"] == "analytics-api"
    assert "event_scoring" in data["capabilities"]
    assert "risk_explanation" in data["capabilities"]
    assert "recommendations" in data["capabilities"]


def test_score_event_endpoint():
    payload = {
        "id": "evt-api-1",
        "timestamp": "2026-05-30T12:00:00Z",
        "type": "scan_detected",
        "severity": "high",
        "protocol": "modbus",
        "source": {"ip": "10.0.0.10", "port": 49152},
        "destination": {"ip": "192.168.1.20", "port": 502},
        "direction": "lateral",
        "zone": "ot",
        "title": "OT scan detected",
    }
    res = client.post("/api/v1/score/event", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["event_id"] == "evt-api-1"
    assert data["score"] >= 40
    assert data["risk_level"] in ("medium", "high", "critical")
    assert len(data["factors"]) >= 3
    assert len(data["recommendations"]) >= 1


def test_score_events_endpoint():
    payload = {
        "items": [
            {
                "id": "batch-1",
                "timestamp": "2026-05-30T12:00:00Z",
                "type": "auth_failure",
                "severity": "medium",
                "protocol": "ssh",
                "direction": "inbound",
                "zone": "dmz",
                "title": "SSH auth failure",
            },
            {
                "id": "batch-2",
                "timestamp": "2026-05-30T12:00:00Z",
                "type": "ot_command",
                "severity": "high",
                "protocol": "s7comm",
                "direction": "lateral",
                "zone": "ot",
                "title": "S7 command",
            },
        ]
    }
    res = client.post("/api/v1/score/events", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["count"] == 2
    assert len(data["items"]) == 2


def test_batch_rejects_empty():
    res = client.post("/api/v1/score/events", json={"items": []})
    assert res.status_code == 400


def test_batch_rejects_too_many():
    items = [
        {
            "id": f"evt-{i}",
            "timestamp": "2026-05-30T12:00:00Z",
            "type": "system",
            "severity": "info",
            "protocol": "tcp",
            "title": "bulk",
        }
        for i in range(101)
    ]
    res = client.post("/api/v1/score/events", json={"items": items})
    assert res.status_code == 400
