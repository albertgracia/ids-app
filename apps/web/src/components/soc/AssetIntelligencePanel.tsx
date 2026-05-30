"use client";

import { useMemo } from "react";
import type { EventItem } from "@/lib/types";
import { inferZone } from "@/lib/soc-utils";
import { L } from "@/lib/soc-labels";

interface Props {
  events: EventItem[];
}

interface AssetRow {
  ip: string;
  zone: string;
  protocols: string;
  eventCount: number;
  critHigh: number;
  firstSeen: Date;
  lastSeen: Date;
  criticality: "critical" | "high" | "medium" | "low";
}

const ZONE_ORDER = ["external", "dmz", "it", "ot"];

export default function AssetIntelligencePanel({ events }: Props) {
  const assets = useMemo(() => {
    const ipMap = new Map<string, AssetRow>();
    for (const e of events) {
      for (const ep of [e.source, e.destination]) {
        const existing = ipMap.get(ep.ip);
        const ts = new Date(e.timestamp);
        const isCrit = e.severity === "critical" || e.severity === "high";
        if (existing) {
          existing.eventCount++;
          if (isCrit) existing.critHigh++;
          if (!existing.protocols.includes(e.protocol)) {
            existing.protocols += ", " + e.protocol;
          }
          if (ts < existing.firstSeen) existing.firstSeen = ts;
          if (ts > existing.lastSeen) existing.lastSeen = ts;
        } else {
          ipMap.set(ep.ip, {
            ip: ep.ip,
            zone: "",
            protocols: e.protocol,
            eventCount: 1,
            critHigh: isCrit ? 1 : 0,
            firstSeen: ts,
            lastSeen: ts,
            criticality: "low",
          });
        }
      }
    }

    const rows: AssetRow[] = [];
    for (const [ip, row] of ipMap) {
      row.zone = inferZone(ip, events);
      const ratio = row.critHigh / row.eventCount;
      if (ratio > 0.3) row.criticality = "critical";
      else if (ratio > 0.15) row.criticality = "high";
      else if (ratio > 0.05) row.criticality = "medium";
      else row.criticality = "low";
      rows.push(row);
    }

    const zonePriority: Record<string, number> = {};
    ZONE_ORDER.forEach((z, i) => (zonePriority[z] = i));
    rows.sort((a, b) => {
      const za = zonePriority[a.zone] ?? 99;
      const zb = zonePriority[b.zone] ?? 99;
      if (za !== zb) return za - zb;
      return b.critHigh - a.critHigh;
    });

    return rows;
  }, [events]);

  const critSevClass = (c: string) => {
    switch (c) {
      case "critical": return "sev-critical";
      case "high": return "sev-high";
      case "medium": return "sev-medium";
      default: return "sev-low";
    }
  };

  if (assets.length === 0) {
    return (
      <div className="panel asset-panel">
        <div className="panel-header">{L.panels.assets}</div>
        <div className="empty-state">{L.assets.noAssets}</div>
      </div>
    );
  }

  return (
    <div className="panel asset-panel">
      <div className="panel-header">
        {L.panels.assets}
        <span className="panel-sub">{assets.length} IPs</span>
      </div>
      <div className="asset-table-wrap">
        <table className="asset-table">
          <thead>
            <tr>
              <th>{L.assets.ip}</th>
              <th>{L.events.zone}</th>
              <th>{L.assets.events}</th>
              <th>{L.assets.critHigh}</th>
              <th>{L.assets.criticality}</th>
              <th>{L.assets.protocols}</th>
              <th>{L.assets.lastSeen}</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.ip}>
                <td className="cell-mono">{a.ip}</td>
                <td>
                  <span className={`zone-tag zone-${a.zone}`}>
                    {a.zone}
                  </span>
                </td>
                <td className="cell-mono">{a.eventCount}</td>
                <td className={`cell-mono ${a.critHigh > 0 ? "sev-high" : ""}`}>
                  {a.critHigh}
                </td>
                <td>
                  <span className={`sev-badge-expanded ${critSevClass(a.criticality)}`}>
                    {a.criticality === "critical"
                      ? L.severity.critical
                      : a.criticality === "high"
                        ? L.severity.high
                        : a.criticality === "medium"
                          ? L.severity.medium
                          : L.severity.low}
                  </span>
                </td>
                <td className="cell-mono cell-protos">{a.protocols}</td>
                <td className="cell-mono">{a.lastSeen.toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
