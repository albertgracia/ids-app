"use client";

import type { EventItem } from "@/lib/types";

interface Props {
  events: EventItem[];
  selectedId: string | null;
  onSelect: (e: EventItem) => void;
}

const SEV_ABBREV: Record<string, string> = {
  critical: "C",
  high: "A",
  medium: "M",
  low: "B",
  info: "I",
};

function sevClass(s: string) {
  switch (s) {
    case "critical": return "sev-critical";
    case "high": return "sev-high";
    case "medium": return "sev-medium";
    case "low": return "sev-low";
    default: return "sev-info";
  }
}

export default function RecentEventsPanel({ events, selectedId, onSelect }: Props) {
  return (
    <div className="panel recent-panel">
      <div className="panel-header">Eventos recientes</div>
      <div className="recent-table-wrap">
        <table className="recent-table">
          <thead>
            <tr>
              <th>Hora</th>
              <th>Sev</th>
              <th>Tipo</th>
              <th>Proto</th>
              <th>Origen</th>
              <th>Destino</th>
              <th>Zona</th>
              <th>Título</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e, idx) => (
              <tr
                key={e.id}
                className={`recent-row ${selectedId === e.id ? "selected" : ""}`}
                onClick={() => onSelect(e)}
                style={{ animationDelay: `${idx * 20}ms` }}
              >
                <td className="cell-mono">{new Date(e.timestamp).toLocaleTimeString()}</td>
                <td>
                  <span className={`sev-badge ${sevClass(e.severity)}`}>
                    {SEV_ABBREV[e.severity] || e.severity.slice(0, 1)}
                  </span>
                </td>
                <td>{e.type.replace(/_/g, " ")}</td>
                <td>{e.protocol}</td>
                <td className="cell-mono">{e.source.ip}{e.source.port ? `:${e.source.port}` : ""}</td>
                <td className="cell-mono">{e.destination.ip}{e.destination.port ? `:${e.destination.port}` : ""}</td>
                <td>{e.zone}</td>
                <td className="cell-title">{e.title}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
