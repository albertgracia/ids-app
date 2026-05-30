"use client";

import { useMemo, useState, useEffect } from "react";
import type { CoreStatus, AnalyticsStatus } from "@/lib/types";
import { L } from "@/lib/soc-labels";

interface Props {
  coreStatus: CoreStatus | null;
  coreError: string | null;
  analyticsStatus: AnalyticsStatus | null;
  analyticsError: string | null;
  lastUpdated: Date;
  criticalCount: number;
  highCount: number;
}

type HealthLed = "healthy" | "warning" | "critical";

export default function SocHeader({
  coreStatus,
  coreError,
  analyticsStatus,
  analyticsError,
  lastUpdated,
  criticalCount,
  highCount,
}: Props) {
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    const tick = () => setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  const healthLed: HealthLed = useMemo(() => {
    if (!coreStatus || coreError) return "critical";
    if (criticalCount > 0) return "critical";
    if (highCount > 3) return "warning";
    return "healthy";
  }, [coreStatus, coreError, criticalCount, highCount]);

  const healthLabel =
    healthLed === "healthy" ? "OK" : healthLed === "warning" ? "ATEN" : "CRIT";

  const services = [
    { name: L.services.core, ok: !!coreStatus && !coreError },
    { name: L.services.analytics, ok: !!analyticsStatus && !analyticsError },
    { name: L.services.mcp, ok: !!coreStatus },
    { name: L.services.web, ok: true },
  ];

  const unreviewed =
    criticalCount > 0
      ? `${criticalCount} cr\u00EDtico${criticalCount > 1 ? "s" : ""}`
      : highCount > 0
        ? `${highCount} alto${highCount > 1 ? "s" : ""}`
        : null;

  return (
    <header className="soc-header">
      <div className="soc-header-left">
        <div className="soc-logo">
          <span className="soc-logo-icon">&#x25C8;</span>
          <div>
            <h1 className="soc-title">{L.header.title}</h1>
            <span className="soc-env">{L.header.env}</span>
          </div>
        </div>

        <div className="health-led-group">
          <span className={`health-led ${healthLed}`} title={`Estado global: ${healthLabel}`} />
          <span className="soc-label" style={{ fontSize: "0.65rem" }}>
            {healthLabel}
          </span>
        </div>

        {unreviewed && (
          <span className={`alarm-badge ${healthLed === "critical" ? "" : "warn"}`}>
            &#x26A0; {unreviewed} sin revisar
          </span>
        )}
      </div>

      <div className="soc-header-center">
        {services.map((s) => (
          <span key={s.name} className={`soc-svc-badge ${s.ok ? "svc-ok" : "svc-down"}`}>
            <span className="svc-dot" /> {s.name}
          </span>
        ))}
      </div>

      <div className="soc-header-right">
        <span className="soc-label">{L.header.updated}</span>
        <span className="updated-ago">
          hace {secondsAgo < 60 ? `${secondsAgo}s` : `${Math.floor(secondsAgo / 60)}m`}
        </span>
        {coreStatus && (
          <>
            <span className="soc-label">{L.header.storage}</span>
            <span className="soc-value">{coreStatus.storage_mode}</span>
          </>
        )}
      </div>
    </header>
  );
}
