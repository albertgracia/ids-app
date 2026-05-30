"use client";

import type { EventItem } from "@/lib/types";

interface Props {
  events: EventItem[];
}

export default function SeveritySummary({ events }: Props) {
  const total = events.length;
  const counts: Record<string, number> = {};
  const protocols: Record<string, number> = {};
  let otCount = 0;
  let itCount = 0;

  for (const e of events) {
    counts[e.severity] = (counts[e.severity] || 0) + 1;
    protocols[e.protocol] = (protocols[e.protocol] || 0) + 1;
    if (e.zone === "ot") otCount++;
    else if (e.zone === "it") itCount++;
  }

  return (
    <div className="section summary-grid">
      <div className="summary-card">
        <span className="summary-value">{total}</span>
        <span className="summary-label">Total Events</span>
      </div>
      <div className="summary-card">
        <span className="summary-value sev-critical">{counts["critical"] || 0}</span>
        <span className="summary-label">Critical</span>
      </div>
      <div className="summary-card">
        <span className="summary-value sev-high">{counts["high"] || 0}</span>
        <span className="summary-label">High</span>
      </div>
      <div className="summary-card">
        <span className="summary-value sev-medium">{counts["medium"] || 0}</span>
        <span className="summary-label">Medium</span>
      </div>
      <div className="summary-card">
        <span className="summary-value">{counts["low"] || 0}</span>
        <span className="summary-label">Low</span>
      </div>
      <div className="summary-card">
        <span className="summary-value">{counts["info"] || 0}</span>
        <span className="summary-label">Info</span>
      </div>
      <div className="summary-card">
        <span className="summary-value">{otCount}</span>
        <span className="summary-label">OT Events</span>
      </div>
      <div className="summary-card">
        <span className="summary-value">{itCount}</span>
        <span className="summary-label">IT Events</span>
      </div>
    </div>
  );
}
