"""
Deterministic scoring engine for IDS events.

Heuristic rules assign risk scores 0-100 based on event attributes.
No ML, no external calls, fully testable.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ids_analytics.models import Event, ScoreFactor, ScoreResponse

SEVERITY_SCORES = {
    "info": 5,
    "low": 15,
    "medium": 35,
    "high": 60,
    "critical": 80,
}

ZONE_SCORES = {
    "ot": 15,
    "dmz": 10,
    "management": 10,
    "it": 5,
    "internet": 10,
    "unknown": 5,
}

DIRECTION_SCORES = {
    "lateral": 10,
    "inbound": 10,
    "external": 15,
    "internal": 5,
    "outbound": 5,
    "unknown": 3,
}

OT_PROTOCOLS = {
    "modbus", "s7comm", "profinet", "ethernet_ip",
    "cip", "opcua", "bacnet", "dnp3", "iec104",
}

SENSITIVE_IT_PROTOCOLS = {"ssh", "rdp", "smb"}

OT_PORTS = {502, 102, 44818, 4840, 20000}

EVENT_TYPE_SCORES = {
    "malware_indicator": 25,
    "protocol_anomaly": 20,
    "scan_detected": 15,
    "auth_failure": 15,
    "ot_command": 15,
    "policy_violation": 10,
    "asset_discovered": 5,
    "network_connection": 0,
    "system": 0,
}


def _clamp(score: int) -> int:
    return max(0, min(100, score))


def _risk_level(score: int) -> str:
    if score >= 80:
        return "critical"
    if score >= 60:
        return "high"
    if score >= 40:
        return "medium"
    if score >= 20:
        return "low"
    return "info"


def _recommendations(factors: list[ScoreFactor]) -> list[str]:
    recs: list[str] = []
    seen = set()
    for f in factors:
        name = f.name
        if name == "severity" and f.impact >= 60:
            _add(recs, seen, "Prioritize investigation and preserve related evidence.")
        if name == "ot_protocol":
            _add(recs, seen, "Validate whether the OT protocol exposure is expected.")
        if name == "ot_port":
            _add(recs, seen, "Review whether the OT port exposure is authorized.")
        if name == "lateral_movement":
            _add(recs, seen, "Review lateral traffic path between source and destination.")
        if name == "scan_detected":
            _add(recs, seen, "Check whether the source host is performing unauthorized discovery.")
        if name == "auth_failure":
            _add(recs, seen, "Review authentication logs and account lockout policy.")
        if name == "malware_indicator":
            _add(recs, seen, "Isolate affected host if confirmed and collect forensic evidence.")
        if name == "direction" and f.impact >= 10:
            _add(recs, seen, "Review external traffic source and destination.")
    if not recs:
        _add(recs, seen, "Monitor the event for further activity.")
    return recs


def _add(recs: list[str], seen: set[str], rec: str) -> None:
    if rec not in seen:
        seen.add(rec)
        recs.append(rec)


def score_event(event: Event) -> ScoreResponse:
    """Score a single event and return a detailed ScoreResponse."""
    from ids_analytics.models import ScoreFactor as SF

    factors: list[ScoreFactor] = []
    total = 0

    # Severity
    sev_score = SEVERITY_SCORES.get(event.severity.lower(), 0)
    if sev_score > 0:
        factors.append(SF(name="severity", impact=sev_score, reason=f"Event severity is {event.severity}"))
        total += sev_score

    # Zone
    zone_score = ZONE_SCORES.get(event.zone.lower(), 0)
    if zone_score > 0:
        factors.append(SF(name="zone", impact=zone_score, reason=f"Zone is {event.zone}"))
        total += zone_score

    # Direction
    dir_score = DIRECTION_SCORES.get(event.direction.lower(), 0)
    if dir_score > 0:
        factors.append(SF(name="direction", impact=dir_score, reason=f"Direction is {event.direction}"))
        total += dir_score

    # OT protocol
    proto = event.protocol.lower()
    if proto in OT_PROTOCOLS:
        factors.append(SF(name="ot_protocol", impact=15, reason=f"Protocol {proto} is an OT/industrial protocol"))
        total += 15
    elif proto in SENSITIVE_IT_PROTOCOLS:
        factors.append(SF(name="sensitive_protocol", impact=10, reason=f"Protocol {proto} is a sensitive IT protocol"))
        total += 10

    # Event type
    type_score = EVENT_TYPE_SCORES.get(event.type.lower(), 0)
    if type_score > 0:
        factors.append(SF(name="event_type", impact=type_score, reason=f"Event type is {event.type}"))
        total += type_score

    # OT zone + high severity boost
    if event.zone.lower() == "ot" and event.severity.lower() in ("high", "critical"):
        factors.append(SF(name="ot_high_severity", impact=10, reason="OT zone with high or critical severity"))
        total += 10

    # OT protocol + lateral boost
    if proto in OT_PROTOCOLS and event.direction.lower() == "lateral":
        factors.append(SF(name="lateral_movement", impact=10, reason="Lateral movement with OT protocol"))
        total += 10

    # Known OT port
    dst_port = event.destination.port
    if dst_port and dst_port in OT_PORTS:
        factors.append(SF(name="ot_port", impact=10, reason=f"Destination port {dst_port} is a known OT port"))
        total += 10

    # Scan detected specific
    if event.type.lower() == "scan_detected":
        factors.append(SF(name="scan_detected", impact=0, reason="Scan detected — possible reconnaissance"))
        # 0 impact, just informative

    # Auth failure specific
    if event.type.lower() == "auth_failure":
        factors.append(SF(name="auth_failure", impact=0, reason="Authentication failure detected"))
        # 0 impact, just informative

    # Malware indicator specific
    if event.type.lower() == "malware_indicator":
        factors.append(SF(name="malware_indicator", impact=0, reason="Malware indicator triggered"))
        # 0 impact, just informative

    score = _clamp(total)
    level = _risk_level(score)
    recommendations = _recommendations(factors)

    from ids_analytics.models import ScoreResponse as SR
    return SR(
        event_id=event.id,
        score=score,
        risk_level=level,
        factors=factors,
        recommendations=recommendations,
    )
