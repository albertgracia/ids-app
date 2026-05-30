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
  liveStatus?: string;
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
  liveStatus,
}: Props) {
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    const tick = () => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
      setTimeStr(new Date().toLocaleTimeString("es-ES"));
    };
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
    healthLed === "healthy" ? "OPERATIVO" : healthLed === "warning" ? "DEGRADADO" : "CRÍTICO";

  const services = [
    { name: L.services.core, ok: !!coreStatus && !coreError },
    { name: L.services.analytics, ok: !!analyticsStatus && !analyticsError },
    { name: L.services.mcp, ok: !!coreStatus },
    { name: L.services.web, ok: true },
  ];

  const totalAlarms = criticalCount + highCount;

  return (
    <header className="soc-header">
      {/* Row 1: Main header bar */}
      <div className="soc-header-top">
        <div className="soc-header-left">
          <div className="soc-logo">
            <span className="soc-logo-icon">&#x1F6E1;</span>
            <div>
              <h1 className="soc-title">{L.header.title}</h1>
              <span className="soc-env">{L.header.env} · v2.4.1</span>
            </div>
          </div>
        </div>

        <div className="soc-header-center">
          {services.map((s) => (
            <span key={s.name} className={`soc-svc-badge ${s.ok ? "svc-ok" : "svc-down"}`}>
              <span className="svc-dot" /> {s.name}
            </span>
          ))}
          {liveStatus && (
            <span className={`soc-svc-badge ${liveStatus === "connected" ? "svc-ok" : liveStatus === "reconnecting" ? "svc-warn" : "svc-down"}`}>
              <span className={`svc-dot ${liveStatus === "connected" ? "svc-pulse" : ""}`} />
              {liveStatus === "connected" ? "EN VIVO" : liveStatus === "reconnecting" ? "Reconectando..." : "Polling"}
            </span>
          )}
        </div>

        <div className="soc-header-right">
          <div className="health-led-group">
            <span className="soc-label">Estado</span>
            <span className={`health-led ${healthLed}`} />
            <span className="soc-health-label">{healthLabel}</span>
          </div>

          {totalAlarms > 0 && (
            <span className={`alarm-badge ${healthLed === "warning" ? "warn" : ""}`}>
              &#x26A0; {totalAlarms} Alarma{totalAlarms > 1 ? "s" : ""}
            </span>
          )}

          <span className="updated-ago">
            hace {secondsAgo < 60 ? `${secondsAgo}s` : `${Math.floor(secondsAgo / 60)}m`}
          </span>

          <span className="soc-header-time">{timeStr}</span>
        </div>
      </div>

      {/* Row 2: Tech capability badges */}
      <div className="soc-header-row2">
        <span className="cap-badge cap-suricata">
          &#x1F6E1; Suricata: parser EVE JSON preparado
        </span>
        <span className="cap-badge cap-mcp">
          &#x1F4E1; MCP: read-only activo
        </span>
        <span className="cap-badge cap-analytics">
          &#x1F4CA; Analytics: scoring disponible
        </span>
        {coreStatus && (
          <span className="cap-badge cap-analytics">
            Almacenamiento: {coreStatus.storage_mode}
          </span>
        )}
      </div>
    </header>
  );
}
