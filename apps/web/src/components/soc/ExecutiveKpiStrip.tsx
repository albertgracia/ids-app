"use client";

import { useRef, useEffect, useMemo, useState } from "react";
import type { CoreStatus, EventItem } from "@/lib/types";
import { L } from "@/lib/soc-labels";

interface Props {
  events: EventItem[];
  coreStatus: CoreStatus | null;
  vertical?: boolean;
}

function severityCounts(events: EventItem[]) {
  const sev: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  let ot = 0,
    it = 0;
  for (const e of events) {
    sev[e.severity] = (sev[e.severity] || 0) + 1;
    if (e.zone === "ot") ot++;
    else if (e.zone === "it") it++;
  }
  const total = events.length;
  const riskScore = total > 0
    ? Math.min(100, Math.round(
        ((sev.critical * 25 + sev.high * 15 + sev.medium * 8 + sev.low * 2) / total) * 5
      ))
    : 0;
  return { sev, ot, it, total, riskScore };
}

export default function ExecutiveKpiStrip({ events, coreStatus, vertical }: Props) {
  const { sev, ot, it, total, riskScore } = severityCounts(events);

  const prevRef = useRef<Record<string, number>>({});
  const [flashKeys, setFlashKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const current: Record<string, number> = {
      total,
      critical: sev.critical,
      high: sev.high,
      medium: sev.medium,
      ot,
      it,
      riskScore,
    };
    const prev = prevRef.current;
    const flashed = new Set<string>();

    for (const key of Object.keys(current)) {
      if (prev[key] !== undefined && current[key] > prev[key]) {
        flashed.add(key);
      }
    }

    prevRef.current = current;

    if (flashed.size > 0) {
      setFlashKeys(flashed);
      const t = setTimeout(() => setFlashKeys(new Set()), 1600);
      return () => clearTimeout(t);
    }
  });

  const riskTrend =
    riskScore >= 70 ? "ALTO" : riskScore >= 40 ? "MED" : "BAJO";
  const riskColor =
    riskScore >= 70
      ? "var(--critical)"
      : riskScore >= 40
        ? "var(--high)"
        : riskScore >= 20
          ? "var(--medium)"
          : "var(--ok)";

  const cards = [
    { key: "total", label: L.kpi.totalEvents, value: total, color: undefined, trend: undefined },
    { key: "critical", label: L.kpi.critical, value: sev.critical, color: "var(--critical)", trend: undefined },
    { key: "high", label: L.kpi.high, value: sev.high, color: "var(--high)", trend: undefined },
    { key: "medium", label: L.kpi.medium, value: sev.medium, color: "var(--medium)", trend: undefined },
    { key: "ot", label: L.kpi.otEvents, value: ot, color: undefined, trend: undefined },
    { key: "it", label: L.kpi.itEvents, value: it, color: undefined, trend: undefined },
    { key: "riskScore", label: L.kpi.riskScore, value: riskScore, color: riskColor, trend: riskTrend },
  ];

  const containerClass = vertical ? "kpi-sidebar" : "kpi-strip";

  return (
    <div className={containerClass}>
      {cards.map((c) => (
        <KpiCard
          key={c.key}
          label={c.label}
          value={c.value}
          color={c.color}
          trend={c.trend}
          flashing={flashKeys.has(c.key)}
        />
      ))}
    </div>
  );
}

function KpiCard({
  label,
  value,
  color,
  trend,
  flashing,
}: {
  label: string;
  value: number;
  color?: string;
  trend?: string;
  flashing?: boolean;
}) {
  const isCritical = color === "var(--critical)";
  const flashClass = flashing
    ? isCritical
      ? "flash-critical"
      : "flash-high"
    : "";

  return (
    <div className={`kpi-card ${flashClass}`}>
      <div className="kpi-value-row">
        <span
          className={`kpi-value ${isCritical ? "kpi-critical" : ""}`}
          style={color && !isCritical ? { color } : undefined}
        >
          {value}
          {trend ? <small> {trend}</small> : null}
        </span>
      </div>
      <div className="kpi-label">{label}</div>
    </div>
  );
}
