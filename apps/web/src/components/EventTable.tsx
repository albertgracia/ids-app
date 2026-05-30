"use client";

import type { EventItem } from "@/lib/types";

interface Props {
  events: EventItem[];
  loading: boolean;
  onSelectEvent?: (event: EventItem) => void;
  selectedId?: string | null;
}

function severityClass(s: string): string {
  switch (s) {
    case "critical": return "sev-critical";
    case "high": return "sev-high";
    case "medium": return "sev-medium";
    case "low": return "sev-low";
    default: return "sev-info";
  }
}

export default function EventTable({ events, loading, onSelectEvent, selectedId }: Props) {
  if (loading) {
    return <div className="section"><p>Loading events...</p></div>;
  }

  if (events.length === 0) {
    return (
      <div className="section">
        <p className="empty">No events yet. Use the simulation panel to generate events.</p>
      </div>
    );
  }

  return (
    <div className="section table-container">
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Severity</th>
            <th>Type</th>
            <th>Protocol</th>
            <th>Source</th>
            <th>Destination</th>
            <th>Zone</th>
            <th>Title</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr
              key={e.id}
              onClick={() => onSelectEvent?.(e)}
              style={{ cursor: onSelectEvent ? "pointer" : undefined, background: selectedId === e.id ? "var(--bg)" : undefined }}
            >
              <td className="cell-mono">{new Date(e.timestamp).toLocaleTimeString()}</td>
              <td><span className={`sev-badge ${severityClass(e.severity)}`}>{e.severity}</span></td>
              <td>{e.type}</td>
              <td>{e.protocol}</td>
              <td className="cell-mono">{e.source.ip}{e.source.port ? `:${e.source.port}` : ""}</td>
              <td className="cell-mono">{e.destination.ip}{e.destination.port ? `:${e.destination.port}` : ""}</td>
              <td>{e.zone}</td>
              <td>{e.title}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
