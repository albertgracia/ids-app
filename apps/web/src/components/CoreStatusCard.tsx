"use client";

import type { CoreStatus } from "@/lib/types";

interface Props {
  status: CoreStatus | null;
  error: string | null;
  loading: boolean;
}

export default function CoreStatusCard({ status, error, loading }: Props) {
  if (loading) {
    return <div className="status-card"><p>Loading core status...</p></div>;
  }

  if (error || !status) {
    return (
      <div className="status-card status-error">
        <h3>ids-core unavailable</h3>
        <p>{error || "Could not connect to ids-core"}</p>
        <p className="hint">Ensure ids-core is running on port 8088</p>
      </div>
    );
  }

  return (
    <div className="status-card">
      <div className="status-grid">
        <div><span className="label">Service</span><span>{status.service}</span></div>
        <div><span className="label">Status</span><span className={`badge badge-${status.status}`}>{status.status}</span></div>
        <div><span className="label">Mode</span><span>{status.mode}</span></div>
        <div><span className="label">Version</span><span>{status.version}</span></div>
        <div><span className="label">Storage</span><span>{status.storage_mode}</span></div>
      </div>
      {status.capabilities && status.capabilities.length > 0 && (
        <div className="capabilities">
          <span className="label">Capabilities</span>
          <div className="cap-list">
            {status.capabilities.map((c) => (
              <span key={c} className="cap-badge">{c}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
