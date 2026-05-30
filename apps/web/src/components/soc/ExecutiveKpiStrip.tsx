"use client";

import { useRef, useEffect, useMemo, useState } from "react";
import type { CoreStatus, EventItem } from "@/lib/types";
import { L } from "@/lib/soc-labels";

interface Props {
  events: EventItem[];
  coreStatus: CoreStatus | null;
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

export default function ExecutiveKpiStrip({ events, coreStatus }: Props) {
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

  const svcCount = coreStatus?.capabilities?.length ?? 0;

  return (
    <div className="kpi-strip">
      <KpiCard
        label={L.kpi.totalEvents}
        value={total}
        flashing={flashKeys.has("total")}
      />
      <KpiCard
        label={L.kpi.critical}
        value={sev.critical}
        color="var(--critical)"
        critical
        flashing={flashKeys.has("critical")}
      />
      <KpiCard
        label={L.kpi.high}
        value={sev.high}
        color="var(--high)"
        flashing={flashKeys.has("high")}
      />
      <KpiCard
        label={L.kpi.medium}
        value={sev.medium}
        color="var(--medium)"
        flashing={flashKeys.has("medium")}
      />
      <KpiCard
        label={L.kpi.otEvents}
        value={ot}
        flashing={flashKeys.has("ot")}
      />
      <KpiCard
        label={L.kpi.itEvents}
        value={it}
        flashing={flashKeys.has("it")}
      />
      <KpiCard
        label={L.kpi.riskScore}
        value={riskScore}
        suffix={riskScore >= 70 ? "ALTO" : riskScore >= 40 ? "MED" : "BAJO"}
        color={
          riskScore >= 70
            ? "var(--critical)"
            : riskScore >= 40
              ? "var(--high)"
              : riskScore >= 20
                ? "var(--medium)"
                : "var(--ok)"
        }
        flashing={flashKeys.has("riskScore")}
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  color,
  suffix,
  critical,
  flashing,
}: {
  label: string;
  value: number;
  color?: string;
  critical?: boolean;
  suffix?: string;
  flashing?: boolean;
}) {
  const flashClass = flashing
    ? critical
      ? "flash-critical"
      : "flash-high"
    : "";

  return (
    <div className={`kpi-card ${flashClass}`}>
      <div className="kpi-value-row">
        <span
          className={`kpi-value ${critical ? "kpi-critical" : ""}`}
          style={color && !critical ? { color } : undefined}
        >
          {value}
          {suffix ? <small> {suffix}</small> : null}
        </span>
      </div>
      <div className="kpi-label">{label}</div>
    </div>
  );
}
