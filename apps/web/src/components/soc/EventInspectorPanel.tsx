"use client";

import type { EventItem, ScoreResponse } from "@/lib/types";

interface Props {
  event: EventItem | null;
  score: ScoreResponse | null;
  scoring: boolean;
  onScore: () => void;
  scoreError: string;
}

export default function EventInspectorPanel({ event, score, scoring, onScore, scoreError }: Props) {
  if (!event) return <div className="panel inspector-panel"><div className="panel-header">Event Inspector</div><div className="empty-state">Select an event</div></div>;

  return (
    <div className="panel inspector-panel">
      <div className="panel-header">
        Event Inspector
        <button className="btn-score" onClick={onScore} disabled={scoring}>{scoring ? "Scoring..." : "Score selected event"}</button>
      </div>
      <div className="inspector-grid">
        <div><span className="ilabel">ID</span><code className="cell-mono">{event.id}</code></div>
        <div><span className="ilabel">Time</span><span>{new Date(event.timestamp).toLocaleString()}</span></div>
        <div><span className="ilabel">Severity</span><span className={`sev-${event.severity}`}>{event.severity}</span></div>
        <div><span className="ilabel">Type</span><span>{event.type}</span></div>
        <div><span className="ilabel">Protocol</span><span>{event.protocol}</span></div>
        <div><span className="ilabel">Zone</span><span>{event.zone}</span></div>
        <div><span className="ilabel">Direction</span><span>{event.direction}</span></div>
        <div><span className="ilabel">Source</span><code className="cell-mono">{event.source.ip}:{event.source.port}</code></div>
        <div><span className="ilabel">Destination</span><code className="cell-mono">{event.destination.ip}:{event.destination.port}</code></div>
        <div className="inspector-title"><span className="ilabel">Title</span><span>{event.title}</span></div>
      </div>
      {event.tags && event.tags.length > 0 && <div className="inspector-tags">{event.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>}

      {scoreError && <div className="msg-error">{scoreError}</div>}

      {score && (
        <div className="score-section">
          <div className="score-header">
            <span className="score-num" style={{ color: score.risk_level === "critical" ? "var(--critical)" : score.risk_level === "high" ? "var(--high)" : "var(--medium)" }}>{score.score}</span>
            <span className="risk-level">{score.risk_level}</span>
          </div>
          <div className="score-factors">
            <div className="ilabel">Factors</div>
            {score.factors.filter((f) => f.impact > 0).map((f, i) => (
              <div key={i} className="factor-row"><code>{f.name}</code><span className="factor-impact">+{f.impact}</span><span>{f.reason}</span></div>
            ))}
          </div>
          <div className="score-recs">
            <div className="ilabel">Recommendations</div>
            <ul>{score.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
          </div>
        </div>
      )}
    </div>
  );
}
