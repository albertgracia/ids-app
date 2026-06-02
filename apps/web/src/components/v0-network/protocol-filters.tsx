"use client"

import type { Protocol } from "@/lib/v0-network/mock-data"
import { X } from "lucide-react"

const ALL_PROTOCOLS: Protocol[] = ["TCP", "UDP", "HTTP", "HTTPS", "DNS", "ICMP", "SSH", "FTP"]

const PROTOCOL_COLORS: Record<string, string> = {
  TCP: "#3b82f6", UDP: "#a855f7", HTTP: "#22c55e", HTTPS: "#10b981",
  DNS: "#f97316", ICMP: "#06b6d4", SSH: "#ec4899", FTP: "#eab308",
}

interface ProtocolFiltersProps {
  activeFilters: Set<Protocol>
  onToggleFilter: (protocol: Protocol) => void
  onClearFilters: () => void
}

export function ProtocolFilters({ activeFilters, onToggleFilter, onClearFilters }: ProtocolFiltersProps) {
  return (
    <div className="v0-card v0-protocol-filters">
      <div className="v0-pf-header">
        <h3 className="v0-pf-title">Filtros de Protocolo</h3>
        {activeFilters.size > 0 && (
          <button className="v0-btn-ghost-sm" onClick={onClearFilters}>
            <X size={12} /> Limpiar
          </button>
        )}
      </div>
      <div className="v0-pf-buttons">
        {ALL_PROTOCOLS.map((protocol) => {
          const isActive = activeFilters.has(protocol)
          return (
            <button
              key={protocol}
              className={`v0-pf-btn ${isActive ? "v0-pf-btn-active" : ""}`}
              onClick={() => onToggleFilter(protocol)}
            >
              <span style={isActive ? {} : { color: PROTOCOL_COLORS[protocol] || "#9ca3af" }}>
                {protocol}
              </span>
              {isActive && <span className="v0-pf-badge">Activo</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
