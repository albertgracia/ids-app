"use client";

import type { CoreStatus, AnalyticsStatus } from "@/lib/types";

interface Props {
  coreStatus: CoreStatus | null;
  coreError: string | null;
  analyticsStatus: AnalyticsStatus | null;
  analyticsError: string | null;
  lastUpdated: Date;
}

export default function SocHeader({ coreStatus, coreError, analyticsStatus, analyticsError, lastUpdated }: Props) {
  const services = [
    { name: "ids-core", ok: !!coreStatus && !coreError },
    { name: "analytics-api", ok: !!analyticsStatus && !analyticsError },
  ];

  return (
    <header className="soc-header">
      <div className="soc-header-left">
        <div className="soc-logo">
          <span className="soc-logo-icon">◈</span>
          <div>
            <h1 className="soc-title">Consola IDS OT/IT</h1>
            <span className="soc-env">SOC Staging</span>
          </div>
        </div>
      </div>
      <div className="soc-header-center">
        {services.map((s) => (
          <span key={s.name} className={`soc-svc-badge ${s.ok ? "svc-ok" : "svc-down"}`}>
            <span className="svc-dot" /> {s.name}
          </span>
        ))}
      </div>
      <div className="soc-header-right">
        <span className="soc-label">Actualizado</span>
        <span className="soc-value">{lastUpdated.toLocaleTimeString()}</span>
        {coreStatus && (
          <>
            <span className="soc-label">Almacenamiento</span>
            <span className="soc-value">{coreStatus.storage_mode}</span>
          </>
        )}
      </div>
    </header>
  );
}
