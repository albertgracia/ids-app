"use client";

import { useRef, useEffect } from "react";
import type { CoreStatus, EventItem } from "@/lib/types";

interface Props {
  events: EventItem[];
  coreStatus: CoreStatus | null;
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

export default function ExecutiveKpiStrip({ events, coreStatus }: Props) {
  const { sev, ot, it, total } = severityCounts(events);
  const highCrit = sev.high + sev.critical;

  const prevRef = useRef<Record<string, number>>({});
  const trendRef = useRef<Record<string, "up" | "down" | "flat">>({});

  useEffect(() => {
    const current: Record<string, number> = {
      total,
      critical: sev.critical,
      high: sev.high,
      medium: sev.medium,
      ot,
      it,
      highCrit,
    };
    const prev = prevRef.current;
    const trends: Record<string, "up" | "down" | "flat"> = {};
    for (const key of Object.keys(current)) {
      if (prev[key] !== undefined && current[key] !== prev[key]) {
        trends[key] = current[key] > prev[key] ? "up" : "down";
      } else {
        trends[key] = "flat";
      }
    }
    trendRef.current = trends;
    prevRef.current = current;
  });

  const svcCount = coreStatus?.capabilities?.length ?? 0;

  return (
    <div className="kpi-strip">
      <KpiCard
        label="Total eventos"
        value={total}
        trend={trendRef.current["total"]}
      />
      <KpiCard
        label="Críticos"
        value={sev.critical}
        color="var(--critical)"
        trend={trendRef.current["critical"]}
      />
      <KpiCard
        label="Altos"
        value={sev.high}
        color="var(--high)"
        trend={trendRef.current["high"]}
      />
      <KpiCard
        label="Medios"
        value={sev.medium}
        color="var(--medium)"
        trend={trendRef.current["medium"]}
      />
      <KpiCard
        label="Eventos OT"
        value={ot}
        trend={trendRef.current["ot"]}
      />
      <KpiCard
        label="Eventos IT"
        value={it}
        trend={trendRef.current["it"]}
      />
      <KpiCard
        label="Altos/Críticos"
        value={highCrit}
        color="var(--critical)"
        trend={trendRef.current["highCrit"]}
      />
      <KpiCard
        label="Servicios"
        value={svcCount}
        suffix={coreStatus ? "activo" : "?"}
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  color,
  suffix,
  trend,
}: {
  label: string;
  value: number;
  color?: string;
  suffix?: string;
  trend?: "up" | "down" | "flat";
}) {
  const trendTitle = trend === "up" ? "Incrementando" : trend === "down" ? "Decrementando" : "";
  return (
    <div className="kpi-card">
      <div className="kpi-value-row">
        <span className="kpi-value" style={color ? { color } : undefined}>
          {value}
          {suffix ? <small>/{suffix}</small> : null}
        </span>
        {trend && trend !== "flat" && (
          <span
            className={`kpi-trend kpi-trend-${trend}`}
            title={trendTitle}
          >
            {trend === "up" ? "▲" : "▼"}
          </span>
        )}
      </div>
      <div className="kpi-label">{label}</div>
    </div>
  );
}
