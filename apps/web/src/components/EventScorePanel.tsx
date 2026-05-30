"use client";

import { useState } from "react";
import type { EventItem, ScoreResponse } from "@/lib/types";
import { scoreEvent } from "@/lib/analytics-api";

interface Props {
  event: EventItem | null;
}

function riskColor(level: string): string {
  switch (level) {
    case "critical": return "var(--critical)";
    case "high": return "var(--high)";
    case "medium": return "var(--medium)";
    case "low": return "var(--low)";
    default: return "var(--info)";
  }
}

export default function EventScorePanel({ event }: Props) {
  const [score, setScore] = useState<ScoreResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleScore = async () => {
    if (!event) return;
    setLoading(true);
    setError("");
    setScore(null);
    try {
      const result = await scoreEvent(event);
      setScore(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Scoring failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h3 style={{ margin: 0, fontSize: "0.95rem" }}>Event Scoring</h3>
        <button className="refresh-btn" onClick={handleScore} disabled={loading || !event}>
          {loading ? "Scoring..." : "Score selected event"}
        </button>
      </div>

      {!event && <p className="empty">Select an event to score.</p>}

      {error && <p style={{ color: "var(--critical)", fontSize: "0.85rem" }}>{error}</p>}

      {score && (
        <div>
          <div style={{ display: "flex", gap: "2rem", alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <div style={{ fontSize: "2.5rem", fontWeight: 700, color: riskColor(score.risk_level) }}>{score.score}</div>
              <div className="label">Score</div>
            </div>
            <div>
              <div style={{ fontSize: "1.2rem", fontWeight: 600, color: riskColor(score.risk_level) }}>{score.risk_level}</div>
              <div className="label">Risk Level</div>
            </div>
          </div>

          {score.factors.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <div className="label" style={{ marginBottom: "0.3rem" }}>Factors</div>
              <table style={{ width: "100%", fontSize: "0.8rem" }}>
                <thead>
                  <tr><th>Factor</th><th>Impact</th><th>Reason</th></tr>
                </thead>
                <tbody>
                  {score.factors.filter(f => f.impact > 0).map((f, i) => (
                    <tr key={i}>
                      <td><code>{f.name}</code></td>
                      <td><strong>+{f.impact}</strong></td>
                      <td>{f.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {score.recommendations.length > 0 && (
            <div>
              <div className="label" style={{ marginBottom: "0.3rem" }}>Recommendations</div>
              <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.8rem" }}>
                {score.recommendations.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
