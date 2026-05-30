"use client";

import type { EventItem } from "@/lib/types";

interface Props {
  events: EventItem[];
}

const SEV_COLORS: Record<string, string> = {
  critical: "#f85149",
  high: "#d29922",
  medium: "#db6d28",
  low: "#58a6ff",
  info: "#6e7b8c",
};

export default function SafeTimelinePanel({ events }: Props) {
  const recent = events.slice(0, 20);
  const lastTime = recent.length > 0 ? new Date(recent[0].timestamp).toLocaleTimeString("es-ES") : "";

  return (
    <div className="panel safe-timeline-panel" style={{ overflow: "hidden", maxHeight: "220px", overflowY: "auto" }}>
      <div className="panel-header">
        Línea temporal
        {lastTime && <span style={{ fontWeight: 400, fontSize: "0.65rem", color: "var(--text-dim)", marginLeft: "0.5rem" }}>Último: {lastTime}</span>}
      </div>
      {recent.length === 0 && <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", padding: "1rem", textAlign: "center" }}>Sin eventos</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
        {recent.map((e, i) => (
          <div
            key={e.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.2rem 0.3rem",
              borderLeft: `3px solid ${SEV_COLORS[e.severity] || "#6e7b8c"}`,
              background: i === 0 ? "rgba(88,166,255,0.06)" : undefined,
              fontSize: "0.72rem",
            }}
          >
            <span style={{ fontFamily: "monospace", fontSize: "0.7rem", color: "var(--text-dim)", minWidth: "55px" }}>
              {new Date(e.timestamp).toLocaleTimeString("es-ES")}
            </span>
            <span style={{ color: SEV_COLORS[e.severity], fontWeight: 600, minWidth: "55px", fontSize: "0.7rem" }}>
              {e.severity}
            </span>
            <span style={{ minWidth: "60px", fontSize: "0.7rem" }}>{e.type}</span>
            <span style={{ minWidth: "50px", fontSize: "0.7rem", color: "var(--text-dim)" }}>{e.protocol}</span>
            <code style={{ fontSize: "0.7rem", fontFamily: "monospace", color: "var(--accent)" }}>
              {e.source.ip.slice(0, 15)} → {e.destination.ip.slice(0, 15)}
            </code>
          </div>
        ))}
      </div>
    </div>
  );
}
