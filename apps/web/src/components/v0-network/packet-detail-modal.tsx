"use client"

import { X, AlertTriangle } from "lucide-react"
import { ProtocolBadge } from "./protocol-badge"
import { formatBytes, formatTimestamp } from "@/lib/v0-network/mock-data"
import type { PacketHeader } from "@/lib/v0-network/mock-data"

interface PacketDetailModalProps {
  packet: PacketHeader | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PacketDetailModal({ packet, open, onOpenChange }: PacketDetailModalProps) {
  if (!packet || !open) return null

  return (
    <div className="v0-modal-overlay" onClick={() => onOpenChange(false)}>
      <div className="v0-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="v0-modal-header">
          <h2 className="v0-modal-title">
            Detalles del Paquete
            {packet.isSuspicious && <span className="v0-badge-destructive">Sospechoso</span>}
          </h2>
          <button className="v0-modal-close" onClick={() => onOpenChange(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="v0-modal-body">
          <div className="v0-detail-row">
            <div>
              <span className="v0-detail-label">Protocolo</span>
              <ProtocolBadge protocol={packet.protocol} />
            </div>
            <div>
              <span className="v0-detail-label">Timestamp</span>
              <span style={{ fontFamily: "monospace", fontSize: "13px" }}>{formatTimestamp(packet.timestamp)}</span>
            </div>
          </div>

          <div className="v0-detail-section">
            <h3>Capa de Red</h3>
            <div className="v0-detail-grid">
              <div><span className="v0-detail-label">IP Origen</span><span style={{ color: "#06b6d4", fontFamily: "monospace" }}>{packet.sourceIp}</span></div>
              <div><span className="v0-detail-label">IP Destino</span><span style={{ color: "#06b6d4", fontFamily: "monospace" }}>{packet.destIp}</span></div>
              <div><span className="v0-detail-label">Puerto Origen</span><span style={{ fontFamily: "monospace" }}>{packet.sourcePort}</span></div>
              <div><span className="v0-detail-label">Puerto Destino</span><span style={{ fontFamily: "monospace" }}>{packet.destPort}</span></div>
            </div>
          </div>

          <div className="v0-detail-section">
            <h3>Información del Paquete</h3>
            <div className="v0-detail-grid">
              <div><span className="v0-detail-label">Tamaño</span><span style={{ fontFamily: "monospace" }}>{formatBytes(packet.size)}</span></div>
              <div><span className="v0-detail-label">TTL</span><span style={{ fontFamily: "monospace" }}>{packet.ttl}</span></div>
              {packet.flags.length > 0 && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <span className="v0-detail-label">Flags</span>
                  <div className="v0-flags-row">
                    {packet.flags.map((flag) => (
                      <span key={flag} className="v0-flag">{flag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {(packet.country || packet.city) && (
            <div className="v0-detail-section">
              <h3>Geolocalización</h3>
              <div className="v0-detail-grid">
                {packet.city && <div><span className="v0-detail-label">Ciudad</span><span>{packet.city}</span></div>}
                {packet.country && <div><span className="v0-detail-label">País</span><span>{packet.country}</span></div>}
              </div>
            </div>
          )}

          {packet.suricata && (
            <div className="v0-detail-section">
              <h3>Suricata EVE</h3>
              <div className="v0-detail-grid">
                <div><span className="v0-detail-label">Tipo</span><span style={{ fontFamily: "monospace" }}>{packet.suricata.eventType}</span></div>
                {packet.suricata.signature && <div style={{ gridColumn: "1 / -1" }}><span className="v0-detail-label">Firma</span><span style={{ fontFamily: "monospace", fontSize: "12px", color: "rgba(255,255,255,0.8)" }}>{packet.suricata.signature}</span></div>}
                {packet.suricata.category && <div><span className="v0-detail-label">Categoría</span><span style={{ fontFamily: "monospace" }}>{packet.suricata.category}</span></div>}
                {packet.suricata.appProto && <div><span className="v0-detail-label">App Proto</span><span style={{ fontFamily: "monospace" }}>{packet.suricata.appProto}</span></div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
