"""Tests for the scoring engine."""

from datetime import datetime, timezone

from ids_analytics.models import Endpoint, Event
from ids_analytics.scoring import score_event


def _make_event(
    id: str = "evt-1",
    severity: str = "info",
    protocol: str = "tcp",
    direction: str = "unknown",
    zone: str = "unknown",
    type: str = "network_connection",
    dst_port: int | None = None,
) -> Event:
    return Event(
        id=id,
        timestamp=datetime.now(timezone.utc),
        type=type,
        severity=severity,
        protocol=protocol,
        direction=direction,
        zone=zone,
        title="Test event",
        source=Endpoint(ip="10.0.0.1", port=49152),
        destination=Endpoint(ip="10.0.0.2", port=dst_port) if dst_port else Endpoint(ip="10.0.0.2"),
    )


def test_score_info_event():
    """An info event with no special attributes should score low."""
    evt = _make_event(severity="info")
    res = score_event(evt)
    assert res.score <= 19
    assert res.risk_level == "info"
    assert res.event_id == "evt-1"


def test_score_critical_malware_event():
    """A critical malware event should score very high."""
    evt = _make_event(
        severity="critical",
        type="malware_indicator",
        zone="it",
        direction="outbound",
    )
    res = score_event(evt)
    assert res.score >= 80
    assert res.risk_level == "critical"
    assert len(res.factors) >= 3


def test_score_ot_protocol_adds_risk():
    """OT protocol should add risk via ot_protocol factor."""
    evt = _make_event(severity="low", protocol="modbus")
    res = score_event(evt)
    factor_names = [f.name for f in res.factors]
    assert "ot_protocol" in factor_names


def test_score_lateral_ot_adds_risk():
    """Lateral movement with OT protocol should add lateral_movement factor."""
    evt = _make_event(
        severity="medium",
        protocol="s7comm",
        direction="lateral",
        zone="ot",
    )
    res = score_event(evt)
    factor_names = [f.name for f in res.factors]
    assert "lateral_movement" in factor_names


def test_score_known_ot_port_adds_risk():
    """Destination on a known OT port should add ot_port factor."""
    evt = _make_event(severity="medium", protocol="modbus", dst_port=502)
    res = score_event(evt)
    factor_names = [f.name for f in res.factors]
    assert "ot_port" in factor_names


def test_risk_level_boundaries():
    """Verify risk level mapping at boundaries."""
    assert score_event(_make_event(severity="info")).risk_level == "info"
    assert score_event(_make_event(severity="low")).risk_level == "low"
    assert score_event(_make_event(severity="medium")).risk_level == "medium"
    assert score_event(_make_event(severity="high")).risk_level == "high"
    assert score_event(_make_event(severity="critical")).risk_level == "critical"


def test_score_ot_high_severity_boost():
    """OT zone + high/critical severity adds ot_high_severity factor."""
    evt = _make_event(severity="high", zone="ot")
    res = score_event(evt)
    factor_names = [f.name for f in res.factors]
    assert "ot_high_severity" in factor_names


def test_score_sensitive_it_protocol():
    """SSH, RDP, SMB should add sensitive_protocol factor."""
    for proto in ["ssh", "rdp", "smb"]:
        evt = _make_event(severity="low", protocol=proto)
        res = score_event(evt)
        factor_names = [f.name for f in res.factors]
        assert "sensitive_protocol" in factor_names, f"missing for {proto}"


def test_recommendations_not_empty():
    """Every scored event should have at least one recommendation."""
    evt = _make_event(severity="info")
    res = score_event(evt)
    assert len(res.recommendations) >= 1


def test_score_never_exceeds_100():
    """Score should never exceed 100."""
    evt = _make_event(
        severity="critical",
        type="malware_indicator",
        protocol="modbus",
        direction="lateral",
        zone="ot",
        dst_port=502,
    )
    res = score_event(evt)
    assert 0 <= res.score <= 100
