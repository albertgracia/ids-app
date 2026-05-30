"use client";

import { useMemo } from "react";
import type { EventItem } from "@/lib/types";
import { L } from "@/lib/soc-labels";

interface Props {
  events: EventItem[];
}

const MALICIOUS_TYPES = new Set([
  "scan_detected",
  "auth_failure",
  "malware_indicator",
  "protocol_anomaly",
]);

interface IocRow {
  sourceIp: string;
  type: string;
  severity: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  destIps: Set<string>;
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

export default function IocThreatPanel({ events }: Props) {
  const iocs = useMemo(() => {
    const map = new Map<string, IocRow>();
    for (const e of events) {
      if (!MALICIOUS_TYPES.has(e.type)) continue;
      const key = `${e.source.ip}|${e.type}|${e.severity}`;
      const ts = new Date(e.timestamp);
      const existing = map.get(key);
      if (existing) {
        existing.count++;
        existing.destIps.add(e.destination.ip);
        if (ts < existing.firstSeen) existing.firstSeen = ts;
        if (ts > existing.lastSeen) existing.lastSeen = ts;
      } else {
        map.set(key, {
          sourceIp: e.source.ip,
          type: e.type,
          severity: e.severity,
          count: 1,
          firstSeen: ts,
          lastSeen: ts,
          destIps: new Set([e.destination.ip]),
        });
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [events]);

  if (iocs.length === 0) {
    return (
      <div className="panel ioc-panel">
        <div className="panel-header">{L.panels.ioCs}</div>
        <div className="empty-state">{L.ioCs.noIoCs}</div>
      </div>
    );
  }

  return (
    <div className="panel ioc-panel">
      <div className="panel-header">
        {L.panels.ioCs}
        <span className="panel-sub">{iocs.length} indicadores</span>
      </div>
      <div className="ioc-table-wrap">
        <table className="ioc-table">
          <thead>
            <tr>
              <th>{L.ioCs.sourceIp}</th>
              <th>{L.ioCs.threatType}</th>
              <th>{L.events.severity}</th>
              <th>{L.ioCs.count}</th>
              <th>{L.ioCs.targets}</th>
              <th>{L.assets.lastSeen}</th>
            </tr>
          </thead>
          <tbody>
            {iocs.slice(0, 20).map((ioc, idx) => (
              <tr key={`${ioc.sourceIp}-${ioc.type}-${idx}`}>
                <td className="cell-mono">{ioc.sourceIp}</td>
                <td>
                  <span className="ioc-type-tag">
                    {ioc.type.replace(/_/g, " ")}
                  </span>
                </td>
                <td>
                  <span className={`sev-badge-expanded ${sevClass(ioc.severity)}`}>
                    {L.severity[ioc.severity as keyof typeof L.severity]}
                  </span>
                </td>
                <td className="cell-mono">{ioc.count}</td>
                <td className="cell-mono" style={{ fontSize: "0.65rem" }}>
                  {[...ioc.destIps].slice(0, 3).join(", ")}
                  {ioc.destIps.size > 3 ? ` +${ioc.destIps.size - 3}` : ""}
                </td>
                <td className="cell-mono">
                  {ioc.lastSeen.toLocaleTimeString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
