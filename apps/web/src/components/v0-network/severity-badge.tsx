"use client"

import type { SeverityLevel } from "@/lib/v0-network/real-data-adapter"
import { severityToLabelEs, severityToColor } from "@/lib/v0-network/real-data-adapter"

interface SeverityBadgeProps {
  severity: SeverityLevel
  score?: number
}

export function SeverityBadge({ severity, score }: SeverityBadgeProps) {
  const color = severityToColor(severity)
  const label = severityToLabelEs(severity)
  const title = score !== undefined ? `${label} (${score})` : label

  return (
    <span
      className="v0-severity-badge"
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "3px",
        padding: "0 5px",
        borderRadius: "3px",
        fontSize: "10px",
        fontFamily: "monospace",
        fontWeight: 600,
        lineHeight: "18px",
        border: `1px solid ${color}44`,
        background: `${color}18`,
        color,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
      {label}
    </span>
  )
}
