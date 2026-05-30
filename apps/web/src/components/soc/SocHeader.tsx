"use client";

import type { CoreStatus, AnalyticsStatus } from "@/lib/types";
import { L } from "@/lib/soc-labels";

interface Props {
  coreStatus: CoreStatus | null;
  coreError: string | null;
  analyticsStatus: AnalyticsStatus | null;
  analyticsError: string | null;
  lastUpdated: Date;
}

export default function SocHeader({ coreStatus, coreError, analyticsStatus, analyticsError, lastUpdated }: Props) {
  const services = [
    { name: L.services.core, ok: !!coreStatus && !coreError },
    { name: L.services.analytics, ok: !!analyticsStatus && !analyticsError },
    { name: L.services.mcp, ok: !!coreStatus },
    { name: L.services.web, ok: true },
  ];

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
        <span className="soc-value">{lastUpdated.toLocaleTimeString()}</span>
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
