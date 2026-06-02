"use client"

import { useState, useRef, useEffect } from "react"
import { ProtocolBadge } from "./protocol-badge"
import { AssetBadge } from "./asset-badge"
import { PacketDetailModal } from "./packet-detail-modal"
import { formatTimestamp, formatBytes, type PacketHeader } from "@/lib/v0-network/mock-data"
import type { AssetInfo, AssetType } from "@/lib/v0-network/real-data-adapter"
import { AlertTriangle, Maximize2, Minimize2 } from "lucide-react"

interface PacketStreamProps {
  packets: PacketHeader[]
  maxHeight?: number
  assetByIp?: Record<string, AssetInfo>
}

export function PacketStream({ packets, maxHeight = 600, assetByIp }: PacketStreamProps) {

  function getAssetType(ip: string): AssetType | undefined {
    return assetByIp?.[ip]?.assetType
  }
  const [selectedPacket, setSelectedPacket] = useState<PacketHeader | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem("packet-view-expanded")
    if (saved !== null) setIsExpanded(saved === "true")
  }, [])

  useEffect(() => {
    if (autoScroll && scrollRef.current) scrollRef.current.scrollTop = 0
  }, [packets, autoScroll])

  const handleScroll = () => {
    if (scrollRef.current) setAutoScroll(scrollRef.current.scrollTop < 50)
  }

  const handleClick = (packet: PacketHeader) => {
    setSelectedPacket(packet)
    setModalOpen(true)
  }

  const toggleView = () => {
    const v = !isExpanded
    setIsExpanded(v)
    localStorage.setItem("packet-view-expanded", String(v))
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
        <button className="v0-btn-outline-sm" onClick={toggleView}>
          {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          {isExpanded ? " Vista Compacta" : " Vista Expandida"}
        </button>
      </div>

      <div className="v0-card v0-packet-stream" ref={scrollRef} onScroll={handleScroll} style={{ maxHeight }}>
        <div className="v0-packet-list">
          {packets.map((packet) => (
            isExpanded ? (
              <div
                key={packet.id}
                className={`v0-packet-row-expanded ${packet.isSuspicious ? "v0-packet-suspicious" : ""}`}
                onClick={() => handleClick(packet)}
              >
                <div className="v0-packet-exp-header">
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {packet.isSuspicious && <AlertTriangle size={14} color="#ef4444" />}
                      <span className="v0-mono-xs-dim">{formatTimestamp(packet.timestamp)}</span>
                      <ProtocolBadge protocol={packet.protocol} />
                      {(() => { const at = getAssetType(packet.destIp); return at ? <AssetBadge assetType={at} /> : null })()}
                    </div>
                  <span className="v0-mono-xs-dim">{formatBytes(packet.size)}</span>
                </div>
                <div className="v0-packet-exp-body">
                  <div>
                    <span className="v0-mono-label">Origen</span>
                    <div className="v0-ip-row">
                      <span style={{ color: "#06b6d4" }}>{packet.sourceIp}</span>
                      <span style={{ color: "rgba(255,255,255,0.4)" }}>:</span>
                      <span>{packet.sourcePort}</span>
                    </div>
                    {packet.city && <span className="v0-mono-xs-dim">{packet.city}, {packet.country}</span>}
                  </div>
                  <div>
                    <span className="v0-mono-label">Destino</span>
                    <div className="v0-ip-row">
                      <span style={{ color: "#06b6d4" }}>{packet.destIp}</span>
                      <span style={{ color: "rgba(255,255,255,0.4)" }}>:</span>
                      <span>{packet.destPort}</span>
                    </div>
                  </div>
                </div>
                {packet.flags.length > 0 && (
                  <div style={{ display: "flex", gap: "4px", marginTop: "6px", flexWrap: "wrap" }}>
                    {packet.flags.map((flag) => (
                      <span key={flag} className="v0-flag">{flag}</span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div
                key={packet.id}
                className={`v0-packet-row ${packet.isSuspicious ? "v0-packet-suspicious" : ""}`}
                onClick={() => handleClick(packet)}
              >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: 0 }}>
                    {packet.isSuspicious && <AlertTriangle size={14} color="#ef4444" style={{ flexShrink: 0 }} />}
                    <span className="v0-mono-xs-dim" style={{ whiteSpace: "nowrap" }}>{formatTimestamp(packet.timestamp)}</span>
                    <ProtocolBadge protocol={packet.protocol} />
                    {(() => { const at = getAssetType(packet.destIp); return at ? <AssetBadge assetType={at} /> : null })()}
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontFamily: "monospace", overflow: "hidden" }}>
                    <span style={{ color: "#06b6d4" }}>{packet.sourceIp}</span>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>:</span>
                    <span>{packet.sourcePort}</span>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>→</span>
                    <span style={{ color: "#06b6d4" }}>{packet.destIp}</span>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>:</span>
                    <span>{packet.destPort}</span>
                  </div>
                </div>
                <span className="v0-mono-xs-dim" style={{ whiteSpace: "nowrap" }}>{packet.size} bytes</span>
              </div>
            )
          ))}
          {packets.length === 0 && (
            <div className="v0-empty">No se han capturado paquetes aún...</div>
          )}
        </div>
      </div>

      <PacketDetailModal packet={selectedPacket} open={modalOpen} onOpenChange={setModalOpen} />
    </>
  )
}
