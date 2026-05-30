"use client";

import type { EventItem, ScoreResponse } from "@/lib/types";
import { L } from "@/lib/soc-labels";

interface Props {
  event: EventItem | null;
  score: ScoreResponse | null;
  scoring: boolean;
  onScore: () => void;
  scoreError: string;
}

const SEV_CLASSES: Record<string, string> = {
  critical: "sev-critical",
  high: "sev-high",
  medium: "sev-medium",
  low: "sev-low",
  info: "sev-info",
};

function zoneLabel(zone: string | undefined): string {
  if (!zone) return "?";
  return (L.zones as Record<string, string>)[zone] ?? zone.toUpperCase();
}

export default function EventInspectorPanel({ event, score, scoring, onScore, scoreError }: Props) {
  if (!event) {
    return (
      <div className="panel inspector-panel">
        <div className="panel-header">{L.panels.investigation}</div>
        <div className="empty-state">{L.events.selectEvent}</div>
      </div>
    );
  }

  const sevLabel = (L.severity as Record<string, string>)[event.severity] ?? event.severity;
  const zLabel = zoneLabel(event.zone);

  return (
    <div className="panel inspector-panel">
      <div className="panel-header">
        <span>{L.panels.investigation}</span>
        <span className="panel-sub">{event.id}</span>
      </div>

      <div className="inspector-grid">
        {/* Title */}
        <div className="inspector-title">
          <span className="ilabel">{L.events.titleCol}</span>
          <span style={{ fontWeight: 600 }} className={SEV_CLASSES[event.severity]}>
            {event.title}
          </span>
        </div>
        {/* Timestamp */}
        <div>
          <span className="ilabel">{L.events.time}</span>
          <span className="cell-mono">
            {new Date(event.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            {" — "}
            {new Date(event.timestamp).toLocaleDateString("es-ES")}
          </span>
        </div>
        {/* Severity */}
        <div>
          <span className="ilabel">{L.events.severity}</span>
          <span className={`sev-badge-expanded ${SEV_CLASSES[event.severity]}`}>
            {sevLabel}
          </span>
        </div>
        {/* Type */}
        <div>
          <span className="ilabel">{L.events.type}</span>
          <span className="cell-mono">{event.type?.replace(/_/g, " ")}</span>
        </div>
        {/* Protocol */}
        <div>
          <span className="ilabel">{L.events.protocol}</span>
          <span className="cell-mono">{event.protocol?.toUpperCase()}</span>
        </div>
        {/* Direction */}
        <div>
          <span className="ilabel">{L.events.direction}</span>
          <span>
            {event.direction === "inbound" ? "Entrante" :
             event.direction === "outbound" ? "Saliente" :
             event.direction === "lateral" ? "Lateral" : event.direction}
          </span>
        </div>
        {/* Zone */}
        <div>
          <span className="ilabel">{L.events.zone}</span>
          <span className={`zone-tag zone-${event.zone || "unknown"}`}>
            {zLabel}
          </span>
        </div>
        {/* Source */}
        <div>
          <span className="ilabel">{L.events.source}</span>
          <span className="cell-mono">
            {event.source.ip}{event.source.port ? `:${event.source.port}` : ""}
          </span>
        </div>
        {/* Destination */}
        <div>
          <span className="ilabel">{L.events.destination}</span>
          <span className="cell-mono">
            {event.destination.ip}{event.destination.port ? `:${event.destination.port}` : ""}
          </span>
        </div>
      </div>

      {/* Tags */}
      {event.tags && event.tags.length > 0 && (
        <div className="inspector-tags">
          {event.tags.map((t) => (
            <span key={t} className="tag">{t}</span>
          ))}
        </div>
      )}
      {/* Always show type/protocol/direction/zone tags */}
      <div className="inspector-tags">
        <span className="tag">{event.type}</span>
        <span className="tag">{event.protocol?.toUpperCase()}</span>
        <span className="tag">{event.direction}</span>
        <span className="tag">zona:{event.zone || "?"}</span>
      </div>

      {/* --- Asset Affected --- */}
      <div className="asset-section">
        <span className="section-label">&#x1F3AF; Activo Afectado</span>
        <div className="asset-card">
          <div className="asset-row">
            <span className="ilabel">Nombre</span>
            <span style={{ fontWeight: 600, color: "var(--accent)" }}>
              {event.destination.hostname || event.destination.ip}
            </span>
          </div>
          <div className="asset-row">
            <span className="ilabel">IP</span>
            <span className="cell-mono">{event.destination.ip}</span>
          </div>
          <div className="asset-row">
            <span className="ilabel">Zona</span>
            <span className={`zone-tag zone-${event.zone || "unknown"}`}>
              {zLabel}
            </span>
          </div>
          <div className="asset-row">
            <span className="ilabel">Puerto</span>
            <span className="cell-mono">{event.destination.port ?? "—"}</span>
          </div>
        </div>
      </div>

      {/* --- Attack Route --- */}
      <div className="attack-route-section">
        <span className="section-label">&#x1F5FA; Ruta de Ataque</span>
        <div className="attack-route-viz">
          <div className="route-node">
            <span className="route-label">ORIGEN</span>
            <span className="cell-mono" style={{ fontSize: "0.55rem" }}>
              {event.source.ip}{event.source.port ? `:${event.source.port}` : ""}
            </span>
            <span
              className="zone-tag"
              style={{
                marginTop: 1,
                background: "rgba(248,81,73,0.15)",
                color: "var(--critical)",
              }}
            >
              {event.direction === "outbound" ? (event.zone || "?").toUpperCase() : "EXT"}
            </span>
          </div>
          <div className="route-arrow-svg">
            <svg width="60" height="24" viewBox="0 0 60 24">
              <line
                x1={0} y1={12} x2={42} y2={12}
                stroke="var(--critical)" strokeWidth={2}
                strokeDasharray="4 2" opacity={0.7}
              />
              <polygon points="42,6 54,12 42,18" fill="var(--critical)" opacity={0.9} />
              <text x={22} y={11} textAnchor="middle" fill="var(--text-dim)" fontSize="7" fontFamily="monospace">
                {event.protocol?.toUpperCase()}
              </text>
            </svg>
          </div>
          <div className="route-node">
            <span className="route-label">DESTINO</span>
            <span className="cell-mono" style={{ fontSize: "0.55rem" }}>
              {event.destination.ip}{event.destination.port ? `:${event.destination.port}` : ""}
            </span>
            <span
              className={`zone-tag zone-${event.zone || "unknown"}`}
              style={{ marginTop: 1 }}
            >
              {zLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Scoring section */}
      <div className="score-section" style={{ marginTop: "0.65rem", borderTop: "1px solid var(--border)", paddingTop: "0.5rem" }}>
        <div className="score-header">
          <button className="btn-score" onClick={onScore} disabled={scoring}>
            {scoring ? L.scoring.scoring : L.scoring.scoreEvent}
          </button>
        </div>

        {scoreError && <div className="msg-error">{scoreError}</div>}

        {score && (
          <>
            <div className="score-header" style={{ marginTop: "0.35rem" }}>
              <span
                className="score-num"
                style={{
                  color:
                    score.risk_level === "critical"
                      ? "var(--critical)"
                      : score.risk_level === "high"
                        ? "var(--high)"
                        : score.risk_level === "medium"
                          ? "var(--medium)"
                          : "var(--accent)",
                }}
              >
                {score.score}
              </span>
              <span
                className="risk-level"
                style={{
                  color:
                    score.risk_level === "critical"
                      ? "var(--critical)"
                      : score.risk_level === "high"
                        ? "var(--high)"
                        : "var(--medium)",
                }}
              >
                Riesgo {score.risk_level?.toUpperCase()}
              </span>
            </div>
            <div className="score-factors">
              <div className="ilabel">{L.scoring.factors}</div>
              {score.factors
                .filter((f) => f.impact > 0)
                .map((f, i) => (
                  <div key={i} className="factor-row">
                    <code>{f.name}</code>
                    <span className="factor-impact">+{f.impact}</span>
                    <span>{f.reason}</span>
                  </div>
                ))}
            </div>
            <div className="score-recs">
              <div className="ilabel">{L.scoring.recommendations}</div>
              <ul>
                {score.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
