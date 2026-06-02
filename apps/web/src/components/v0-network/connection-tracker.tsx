"use client"

import { ProtocolBadge } from "./protocol-badge"
import { formatBytes } from "@/lib/v0-network/mock-data"
import type { Connection } from "@/lib/v0-network/mock-data"

interface ConnectionTrackerProps {
  connections: Connection[]
}

export function ConnectionTracker({ connections }: ConnectionTrackerProps) {
  return (
    <div className="v0-card">
      <div className="v0-conn-header">
        <h3 className="v0-card-title">Conexiones Activas</h3>
        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>{connections.length} activas</span>
      </div>
      <div className="v0-conn-list">
        {connections.map((conn) => (
          <div key={conn.id} className="v0-conn-row">
            <div className="v0-conn-top">
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <ProtocolBadge protocol={conn.protocol} />
                <span className="v0-conn-state">{conn.state}</span>
              </div>
              <span className="v0-mono-xs-dim">{((Date.now() - conn.startTime) / 1000).toFixed(0)}s</span>
            </div>
            <div className="v0-conn-ips">
              <span style={{ color: "#06b6d4" }}>{conn.sourceIp}</span>
              <span style={{ color: "rgba(255,255,255,0.3)" }}>:</span>
              <span>{conn.sourcePort}</span>
              <span style={{ color: "rgba(255,255,255,0.3)" }}>↔</span>
              <span style={{ color: "#06b6d4" }}>{conn.destIp}</span>
              <span style={{ color: "rgba(255,255,255,0.3)" }}>:</span>
              <span>{conn.destPort}</span>
            </div>
            <div className="v0-conn-bytes">
              <span>↓ {formatBytes(conn.bytesReceived)}</span>
              <span>↑ {formatBytes(conn.bytesSent)}</span>
            </div>
          </div>
        ))}
        {connections.length === 0 && (
          <div className="v0-empty">Sin conexiones activas</div>
        )}
      </div>
    </div>
  )
}
