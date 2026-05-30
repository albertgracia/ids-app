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

export default function EventInspectorPanel({ event, score, scoring, onScore, scoreError }: Props) {
  if (!event) {
    return (
      <div className="panel inspector-panel">
        <div className="panel-header">{L.panels.investigation}</div>
        <div className="empty-state">{L.events.selectEvent}</div>
      </div>
    );
  }

  const sevLabel = L.severity[event.severity as keyof typeof L.severity] ?? event.severity;
  const zoneLabel = event.zone ? L.zones[event.zone as keyof typeof L.zones] ?? event.zone : "?";

  return (
    <div className="panel inspector-panel">
      <div className="panel-header">
        {L.panels.investigation}
        <button className="btn-score" onClick={onScore} disabled={scoring}>
          {scoring ? L.scoring.scoring : L.scoring.scoreEvent}
        </button>
      </div>

      <div className="inspector-grid">
        <div>
          <span className="ilabel">{L.events.id}</span>
          <code className="cell-mono">{event.id}</code>
        </div>
        <div>
          <span className="ilabel">{L.events.time}</span>
          <span>{new Date(event.timestamp).toLocaleString()}</span>
        </div>
        <div>
          <span className="ilabel">{L.events.severity}</span>
          <span className={`sev-${event.severity}`}>{sevLabel}</span>
        </div>
        <div>
          <span className="ilabel">{L.events.type}</span>
          <span>{event.type?.replace(/_/g, " ")}</span>
        </div>
        <div>
          <span className="ilabel">{L.events.protocol}</span>
          <code className="cell-mono">{event.protocol}</code>
        </div>
        <div>
          <span className="ilabel">{L.events.zone}</span>
          <span>{zoneLabel}</span>
        </div>
        <div>
          <span className="ilabel">{L.events.direction}</span>
          <span>{event.direction}</span>
        </div>
        <div>
          <span className="ilabel">{L.events.source}</span>
          <code className="cell-mono">
            {event.source.ip}:{event.source.port}
          </code>
        </div>
        <div>
          <span className="ilabel">{L.events.destination}</span>
          <code className="cell-mono">
            {event.destination.ip}:{event.destination.port}
          </code>
        </div>
        <div className="inspector-title">
          <span className="ilabel">{L.events.titleCol}</span>
          <span>{event.title}</span>
        </div>
      </div>

      {event.tags && event.tags.length > 0 && (
        <div className="inspector-tags">
          <span className="ilabel" style={{ marginTop: 0 }}>{L.events.tags}:</span>
          {event.tags.map((t) => (
            <span key={t} className="tag">{t}</span>
          ))}
        </div>
      )}

      {scoreError && <div className="msg-error">{scoreError}</div>}

      {score && (
        <div className="score-section">
          <div className="score-header">
            <span
              className="score-num"
              style={{
                color:
                  score.risk_level === "critical"
                    ? "var(--critical)"
                    : score.risk_level === "high"
                      ? "var(--high)"
                      : "var(--medium)",
              }}
            >
              {score.score}
            </span>
            <span className="risk-level">{score.risk_level}</span>
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
        </div>
      )}
    </div>
  );
}
