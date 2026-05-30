"use client";

import { useRef, useMemo } from "react";
import type { EventItem } from "@/lib/types";
import { L } from "@/lib/soc-labels";

interface Props {
  events: EventItem[];
  selectedId: string | null;
  onSelect: (e: EventItem) => void;
}

function sevRowClass(s: string) {
  switch (s) {
    case "critical": return "sev-critical-row";
    case "high": return "sev-high-row";
    case "medium": return "sev-medium-row";
    case "low": return "sev-low-row";
    default: return "sev-info-row";
  }
}

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
  const seenIds = useRef(new Set<string>());

  return (
    <div className="panel recent-panel">
      <div className="panel-header">
        {L.panels.recentEvents}
        <span className="panel-sub">{events.length} {L.kpi.totalEvents.toLowerCase()}</span>
      </div>
      <div className="recent-table-wrap">
        <table className="recent-table">
          <thead>
            <tr>
              <th>{L.events.time}</th>
              <th>{L.events.severity}</th>
              <th>{L.events.type}</th>
              <th>{L.events.protocol}</th>
              <th>{L.events.source}</th>
              <th>{L.events.destination}</th>
              <th>{L.events.zone}</th>
              <th>{L.events.titleCol}</th>
              <th style={{ width: "50px" }}>{L.assets.criticality}</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => {
              const isNew = e.severity === "critical" || e.severity === "high"
                ? !seenIds.current.has(e.id)
                : false;
              if (e.severity === "critical" || e.severity === "high") {
                seenIds.current.add(e.id);
              }

              return (
                <tr
                  key={e.id}
                  className={`event-row ${sevRowClass(e.severity)} ${selectedId === e.id ? "selected" : ""}`}
                  onClick={() => onSelect(e)}
                >
                  <td className="cell-mono">
                    {isNew && <span className="cell-new-indicator" />}
                    {new Date(e.timestamp).toLocaleTimeString()}
                  </td>
                  <td>
                    <span className={`sev-badge-expanded ${sevClass(e.severity)}`}>
                      {L.severity[e.severity as keyof typeof L.severity]}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.68rem" }}>{e.type?.replace(/_/g, " ")}</td>
                  <td className="cell-mono">{e.protocol}</td>
                  <td className="cell-mono">
                    {e.source.ip}{e.source.port ? `:${e.source.port}` : ""}
                  </td>
                  <td className="cell-mono">
                    {e.destination.ip}{e.destination.port ? `:${e.destination.port}` : ""}
                  </td>
                  <td>
                    <span className={`zone-tag zone-${e.zone || "unknown"}`}>
                      {e.zone || "?"}
                    </span>
                  </td>
                  <td className="cell-title">{e.title}</td>
                  <td className="cell-mono" style={{ textAlign: "right", color: "var(--text-dim)" }}>
                    {e.metadata?.score ? `${e.metadata.score}` : "\u2014"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
