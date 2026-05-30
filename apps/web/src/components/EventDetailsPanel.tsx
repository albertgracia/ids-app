"use client";

import type { EventItem } from "@/lib/types";

interface Props {
  event: EventItem | null;
}

export default function EventDetailsPanel({ event }: Props) {
  if (!event) {
    return <div className="section"><p className="empty">Select an event from the table to view details.</p></div>;
  }
  return (
    <div className="section">
      <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem" }}>Event Details</h3>
      <div className="details-grid">
        <div><span className="label">ID</span><code className="cell-mono">{event.id}</code></div>
        <div><span className="label">Timestamp</span><span>{new Date(event.timestamp).toLocaleString()}</span></div>
        <div><span className="label">Severity</span><span>{event.severity}</span></div>
        <div><span className="label">Type</span><span>{event.type}</span></div>
        <div><span className="label">Protocol</span><span>{event.protocol}</span></div>
        <div><span className="label">Zone</span><span>{event.zone}</span></div>
        <div><span className="label">Direction</span><span>{event.direction}</span></div>
        <div><span className="label">Source</span><code className="cell-mono">{event.source.ip}{event.source.port ? `:${event.source.port}` : ""}</code></div>
        <div><span className="label">Destination</span><code className="cell-mono">{event.destination.ip}{event.destination.port ? `:${event.destination.port}` : ""}</code></div>
        <div><span className="label">Title</span><span>{event.title}</span></div>
        {event.tags && event.tags.length > 0 && (
          <div><span className="label">Tags</span><span>{event.tags.join(", ")}</span></div>
        )}
      </div>
    </div>
  );
}
