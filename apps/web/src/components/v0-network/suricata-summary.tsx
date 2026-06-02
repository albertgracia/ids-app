"use client"

import { useMemo } from "react"
import type { SuricataInfo } from "@/lib/v0-network/mock-data"
import { suricataEventTypeLabel, suricataEventTypeColor, buildV0SuricataSummary } from "@/lib/v0-network/real-data-adapter"
import { Shield, Eye } from "lucide-react"

interface SuricataSummaryProps {
  suricataById: Record<string, SuricataInfo>
}

export function SuricataSummary({ suricataById }: SuricataSummaryProps) {
  const summary = useMemo(() => buildV0SuricataSummary(suricataById), [suricataById])
  const entries = Object.entries(summary).filter(([, c]) => c > 0)
  const total = Object.values(summary).reduce((s, c) => s + c, 0)

  if (total === 0) return null

  return (
    <div className="v0-card suricata-summary">
      <div className="v0-adv-card-header">
        <Eye size={16} color="#a855f7" />
        <span>Eventos Suricata EVE ({total})</span>
      </div>
      <div
        className="v0-adv-card-body"
        style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "12px" }}
      >
        {entries.map(([eventType, count]) => {
          const pct = (count / total) * 100
          const color = suricataEventTypeColor(eventType)
          return (
            <div
              key={eventType}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 10px",
                borderRadius: "6px",
                background: `${color}11`,
                border: `1px solid ${color}33`,
                fontSize: "12px",
                fontFamily: "monospace",
              }}
            >
              <Shield size={12} color={color} />
              <span style={{ color }}>{suricataEventTypeLabel(eventType)}</span>
              <span style={{ color: "rgba(255,255,255,0.5)" }}>{count} ({pct.toFixed(1)}%)</span>
            </div>
          )
        })}
        <div
          style={{
            fontSize: "10px",
            color: "rgba(255,255,255,0.35)",
            width: "100%",
            textAlign: "center",
            paddingTop: "4px",
          }}
        >
          Visualización pasiva — no se bloquea ni modifica tráfico
        </div>
      </div>
    </div>
  )
}
