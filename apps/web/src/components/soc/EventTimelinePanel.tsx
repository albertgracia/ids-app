"use client";

import type { EventItem } from "@/lib/types";

interface Props {
  events: EventItem[];
}

export default function EventTimelinePanel({ events }: Props) {
  const recent = events.slice(0, 15);
  return (
    <div className="panel timeline-panel">
      <div className="panel-header">Event Timeline</div>
      <div className="timeline-list">
        {recent.length === 0 && <div className="empty-state">No events</div>}
        {recent.map((e, i) => (
          <div key={e.id} className={`timeline-item sev-border-${e.severity}`}>
            <span className="tl-time">{new Date(e.timestamp).toLocaleTimeString()}</span>
            <span className={`tl-sev sev-${e.severity}`}>{e.severity}</span>
            <span className="tl-type">{e.type}</span>
            <span className="tl-proto">{e.protocol}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
