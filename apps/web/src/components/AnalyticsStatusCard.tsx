"use client";

import type { AnalyticsStatus } from "@/lib/types";

interface Props {
  status: AnalyticsStatus | null;
  error: string | null;
  loading: boolean;
}

export default function AnalyticsStatusCard({ status, error, loading }: Props) {
  if (loading) {
    return <div className="section"><p>Loading analytics status...</p></div>;
  }
  if (error || !status) {
    return (
      <div className="section status-error" style={{ borderColor: "var(--critical)" }}>
        <h3 style={{ color: "var(--critical)", margin: "0 0 0.5rem" }}>analytics-api unavailable</h3>
        <p style={{ margin: "0.25rem 0", color: "var(--text-dim)" }}>{error || "Could not connect to analytics-api"}</p>
      </div>
    );
  }
  return (
    <div className="section">
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem" }}>
        <div><span className="label">Service</span><div>{status.service}</div></div>
        <div><span className="label">Status</span><div><span className={`badge badge-${status.status}`}>{status.status}</span></div></div>
        <div><span className="label">Mode</span><div>{status.mode}</div></div>
        <div><span className="label">Version</span><div>{status.version}</div></div>
      </div>
      {status.capabilities && status.capabilities.length > 0 && (
        <div style={{ marginTop: "0.75rem" }}>
          <span className="label">Capabilities</span>
          <div className="cap-list" style={{ marginTop: "0.3rem" }}>
            {status.capabilities.map((c) => <span key={c} className="cap-badge">{c}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}
