"use client"

import { ProtocolBadge } from "./protocol-badge"
import { AssetBadge } from "./asset-badge"
import { SeverityBadge } from "./severity-badge"
import { formatBytes } from "@/lib/v0-network/mock-data"
import type { AssetInfo, AssetType } from "@/lib/v0-network/real-data-adapter"
import type { EnrichedConnection } from "@/lib/v0-network/real-data-adapter"

interface ConnectionTrackerProps {
  connections: EnrichedConnection[]
  assetByIp?: Record<string, AssetInfo>
  isEventMode?: boolean
}

export function ConnectionTracker({ connections, assetByIp, isEventMode }: ConnectionTrackerProps) {

  function getAssetType(ip: string): AssetType | undefined {
    return assetByIp?.[ip]?.assetType
  }

  if (isEventMode) {
    return (
      <div className="v0-card">
        <div className="v0-conn-header">
          <h3 className="v0-card-title">Conexiones</h3>
        </div>
        <div className="v0-conn-list">
          <div style={{ padding: "24px", textAlign: "center" }}>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", fontFamily: "monospace", lineHeight: 1.6 }}>
              Los eventos UniFi actuales no incluyen conexiones IP completas con origen, destino y puertos.
            </p>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px", fontFamily: "monospace", marginTop: "8px" }}>
              Las conexiones L3/L4 estarán disponibles cuando se reciban eventos con direcciones IP (Suricata EVE, tráfico de red directo).
            </p>
          </div>
        </div>
      </div>
    )
  }

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
              <div style={{ display: "flex", gap: "4px", alignItems: "center", flexWrap: "wrap" }}>
                <SeverityBadge severity={conn.severity} />
                <ProtocolBadge protocol={conn.protocol} />
                <span className="v0-conn-state">{conn.state}</span>
              </div>
              <span className="v0-mono-xs-dim">{((Date.now() - conn.startTime) / 1000).toFixed(0)}s</span>
            </div>
            <div className="v0-conn-ips">
              <span style={{ color: "#06b6d4" }}>{conn.sourceIp}</span>
              {(() => { const at = getAssetType(conn.sourceIp); return at ? <AssetBadge assetType={at} /> : null })()}
              <span style={{ color: "rgba(255,255,255,0.3)" }}>:</span>
              <span>{conn.sourcePort}</span>
              <span style={{ color: "rgba(255,255,255,0.3)" }}>↔</span>
              <span style={{ color: "#06b6d4" }}>{conn.destIp}</span>
              {(() => { const at = getAssetType(conn.destIp); return at ? <AssetBadge assetType={at} /> : null })()}
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
