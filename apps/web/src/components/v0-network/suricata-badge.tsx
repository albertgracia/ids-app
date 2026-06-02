"use client"

import { suricataEventTypeLabel, suricataEventTypeColor } from "@/lib/v0-network/real-data-adapter"

interface SuricataBadgeProps {
  eventType: string
}

export function SuricataBadge({ eventType }: SuricataBadgeProps) {
  const label = suricataEventTypeLabel(eventType)
  const color = suricataEventTypeColor(eventType)
  return (
    <span
      className="v0-suricata-badge"
      style={{
        background: `${color}22`,
        borderColor: `${color}44`,
        color,
      }}
    >
      EVE {label}
    </span>
  )
}
