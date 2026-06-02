"use client"

import { useMemo } from "react"
import type { PacketHeader } from "@/lib/v0-network/mock-data"

interface LocationCardsProps {
  packets: PacketHeader[]
}

const FLAGS: Record<string, string> = {
  "United States": "🇺🇸", "United Kingdom": "🇬🇧", Germany: "🇩🇪", Japan: "🇯🇵",
  Canada: "🇨🇦", France: "🇫🇷", Singapore: "🇸🇬", Australia: "🇦🇺",
}

const PROTOCOL_COLORS: Record<string, string> = {
  TCP: "#3b82f6", UDP: "#a855f7", HTTP: "#22c55e",
  HTTPS: "#10b981", DNS: "#f97316", SSH: "#ec4899", FTP: "#eab308",
}

function getDominantProtocol(protocols: Record<string, number>): string {
  let max = 0; let dominant = ""
  for (const [p, c] of Object.entries(protocols)) {
    if (c > max) { max = c; dominant = p }
  }
  return dominant
}

export function LocationCards({ packets }: LocationCardsProps) {
  const locationData = useMemo(() => {
    const map = new Map<string, { country: string; totalCount: number; protocols: Record<string, number> }>()
    packets.forEach((p) => {
      if (!p.country) return
      const existing = map.get(p.country)
      if (existing) {
        existing.totalCount++
        existing.protocols[p.protocol] = (existing.protocols[p.protocol] || 0) + 1
      } else {
        map.set(p.country, { country: p.country, totalCount: 1, protocols: { [p.protocol]: 1 } })
      }
    })
    return Array.from(map.values()).sort((a, b) => b.totalCount - a.totalCount).slice(0, 4)
  }, [packets])

  if (locationData.length === 0) return null

  return (
    <div className="v0-location-cards">
      {locationData.map((loc) => {
        const domProtocol = getDominantProtocol(loc.protocols)
        return (
          <div key={loc.country} className="v0-loc-card">
            <span className="v0-loc-flag">{FLAGS[loc.country] || "🌐"}</span>
            <div className="v0-loc-info">
              <span className="v0-loc-country">{loc.country}</span>
              <span className="v0-loc-count">{loc.totalCount} paquetes</span>
            </div>
            <span className="v0-loc-protocol" style={{ color: PROTOCOL_COLORS[domProtocol] || "#9ca3af" }}>
              {domProtocol}
            </span>
          </div>
        )
      })}
    </div>
  )
}
