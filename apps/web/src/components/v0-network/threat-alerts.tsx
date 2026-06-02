"use client"

import type { ThreatAlert } from "@/lib/v0-network/mock-data"
import { formatTimestamp } from "@/lib/v0-network/mock-data"
import { AlertTriangle, AlertCircle, Info, XCircle, X } from "lucide-react"

interface ThreatAlertsProps {
  alerts: ThreatAlert[]
  onDismiss: (alertId: string) => void
  onClearAll: () => void
}

export function ThreatAlerts({ alerts, onDismiss, onClearAll }: ThreatAlertsProps) {
  if (alerts.length === 0) return null

  const getIcon = (severity: ThreatAlert["severity"]) => {
    switch (severity) {
      case "critical": return <XCircle size={18} color="#ef4444" />
      case "high": return <AlertTriangle size={18} color="#f97316" />
      case "medium": return <AlertCircle size={18} color="#eab308" />
      case "low": return <Info size={18} color="#3b82f6" />
    }
  }

  const getColors = (severity: ThreatAlert["severity"]) => {
    switch (severity) {
      case "critical": return { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)", text: "#fca5a5" }
      case "high": return { bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.3)", text: "#fdba74" }
      case "medium": return { bg: "rgba(234,179,8,0.1)", border: "rgba(234,179,8,0.3)", text: "#fde047" }
      case "low": return { bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.3)", text: "#93c5fd" }
    }
  }

  return (
    <div className="v0-card v0-threat-alerts">
      <div className="v0-threat-header">
        <h3 className="v0-card-title">
          <AlertTriangle size={16} color="#f97316" />
          Alertas de Amenaza ({alerts.length})
        </h3>
        <button className="v0-btn-ghost-sm" onClick={onClearAll}>Limpiar Todo</button>
      </div>
      <div className="v0-threat-list">
        {alerts.map((alert) => {
          const c = getColors(alert.severity)
          return (
            <div
              key={alert.id}
              className="v0-threat-item"
              style={{ background: c.bg, borderColor: c.border, color: c.text }}
            >
              <button className="v0-threat-dismiss" onClick={() => onDismiss(alert.id)}>
                <X size={14} />
              </button>
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                {getIcon(alert.severity)}
                <div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                    <strong>{alert.title}</strong>
                    <span className="v0-threat-sev">{alert.severity.toUpperCase()}</span>
                  </div>
                  <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", margin: "0 0 4px" }}>{alert.description}</p>
                  <span style={{ fontSize: "11px", fontFamily: "monospace", color: "rgba(255,255,255,0.4)" }}>
                    {formatTimestamp(alert.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
