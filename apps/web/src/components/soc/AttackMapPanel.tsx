"use client";

import type { EventItem } from "@/lib/types";

interface Props {
  events: EventItem[];
}

export default function AttackMapPanel({ events }: Props) {
  const external = events.filter((e) => e.direction === "inbound" || e.direction === "external");
  const lateral = events.filter((e) => e.direction === "lateral");
  const highCrit = events.filter((e) => e.severity === "high" || e.severity === "critical");

  return (
    <div className="panel attack-map-panel">
      <div className="panel-header">Synthetic Attack Surface Map</div>
      <div className="attack-map-grid">
        <div className="attack-zone zone-ext">
          <div className="zone-label">🌐 External</div>
          <div className="zone-count">{external.length}</div>
        </div>
        <div className="attack-arrow">→</div>
        <div className="attack-zone zone-dmz">
          <div className="zone-label">🛡 DMZ</div>
          <div className="zone-count">-</div>
        </div>
        <div className="attack-arrow">→</div>
        <div className="attack-zone zone-it">
          <div className="zone-label">💻 IT</div>
          <div className="zone-count">{events.filter((e) => e.zone === "it").length}</div>
        </div>
        <div className="attack-arrow">→</div>
        <div className="attack-zone zone-ot">
          <div className="zone-label">⚙ OT</div>
          <div className="zone-count">{events.filter((e) => e.zone === "ot").length}</div>
        </div>
      </div>
      <div className="attack-lines">
        {highCrit.length > 0 && <div className="attack-line-active">{highCrit.length} active threat paths</div>}
        {lateral.length > 0 && <div className="attack-line-lateral">{lateral.length} lateral movements</div>}
      </div>
    </div>
  );
}
