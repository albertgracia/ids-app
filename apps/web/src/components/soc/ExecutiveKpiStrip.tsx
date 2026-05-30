"use client";

import type { EventItem } from "@/lib/types";

interface Props {
  events: EventItem[];
}

function severityCounts(events: EventItem[]) {
  const sev: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  let ot = 0, it = 0;
  for (const e of events) {
    sev[e.severity] = (sev[e.severity] || 0) + 1;
    if (e.zone === "ot") ot++;
    else if (e.zone === "it") it++;
  }
  return { sev, ot, it, total: events.length };
}

export default function ExecutiveKpiStrip({ events }: Props) {
  const { sev, ot, it, total } = severityCounts(events);
  const highCrit = sev.high + sev.critical;

  return (
    <div className="kpi-strip">
      <KpiCard label="Total Events" value={total} />
      <KpiCard label="Critical" value={sev.critical} color="var(--critical)" />
      <KpiCard label="High" value={sev.high} color="var(--high)" />
      <KpiCard label="Medium" value={sev.medium} color="var(--medium)" />
      <KpiCard label="OT Events" value={ot} />
      <KpiCard label="IT Events" value={it} />
      <KpiCard label="High/Critical" value={highCrit} color="var(--critical)" />
      <KpiCard label="Services" value={6} suffix="ok" />
    </div>
  );
}

function KpiCard({ label, value, color, suffix }: { label: string; value: number; color?: string; suffix?: string }) {
  return (
    <div className="kpi-card">
      <div className="kpi-value" style={color ? { color } : undefined}>{value}{suffix ? <small>/{suffix}</small> : null}</div>
      <div className="kpi-label">{label}</div>
    </div>
  );
}
