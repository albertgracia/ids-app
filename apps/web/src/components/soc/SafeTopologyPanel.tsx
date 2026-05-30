"use client";

import type { EventItem } from "@/lib/types";

interface Props {
  events: EventItem[];
}

export default function SafeTopologyPanel({ events }: Props) {
  const byZone: Record<string, Set<string>> = {};
  for (const e of events) {
    const z = e.zone || "unknown";
    if (!byZone[z]) byZone[z] = new Set();
    if (e.source.ip) byZone[z].add(e.source.ip);
    if (e.destination.ip) byZone[z].add(e.destination.ip);
  }

  const zoneOrder = ["external", "dmz", "it", "ot"];
  const zoneLabels: Record<string, string> = { external: "🌐 Externo", dmz: "🛡 DMZ", it: "💻 IT", ot: "⚙ OT" };

  return (
    <div className="panel safe-topo-panel" style={{ overflow: "hidden", maxHeight: "340px", overflowY: "auto" }}>
      <div className="panel-header">Topología OT/IT</div>
      {zoneOrder.map((z) => {
        const ips = byZone[z];
        if (!ips || ips.size === 0) return null;
        return (
          <div key={z} style={{ marginBottom: "0.5rem" }}>
            <div className="label" style={{ marginBottom: "0.2rem" }}>{zoneLabels[z] || z} ({ips.size})</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
              {[...ips].slice(0, 10).map((ip) => (
                <code key={ip} style={{ background: "var(--bg)", padding: "0.15rem 0.4rem", borderRadius: "3px", fontSize: "0.7rem" }}>
                  {ip}
                </code>
              ))}
              {ips.size > 10 && <span style={{ fontSize: "0.65rem", color: "var(--text-dim)" }}>+{ips.size - 10} más</span>}
            </div>
          </div>
        );
      })}
      <div style={{ marginTop: "0.5rem", fontSize: "0.65rem", color: "var(--text-dim)" }}>
        {events.length} eventos · {Object.values(byZone).reduce((a, s) => a + s.size, 0)} IPs únicas · {Object.keys(byZone).length} zonas
      </div>
    </div>
  );
}
