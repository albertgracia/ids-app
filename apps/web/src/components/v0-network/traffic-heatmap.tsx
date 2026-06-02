"use client"

import { useMemo } from "react"
import type { PacketHeader } from "@/lib/v0-network/mock-data"

interface TrafficHeatmapProps {
  packets: PacketHeader[]
}

const HOURS = 24
const MINUTES_PER_BLOCK = 15
const BLOCKS_PER_HOUR = 60 / MINUTES_PER_BLOCK

export function TrafficHeatmap({ packets }: TrafficHeatmapProps) {
  const heatmapData = useMemo(() => {
    const now = Date.now()
    const data: number[][] = Array.from({ length: HOURS }, () => Array(BLOCKS_PER_HOUR).fill(0))
    packets.forEach((packet) => {
      const age = now - packet.timestamp
      const hoursAgo = Math.floor(age / (1000 * 60 * 60))
      const minutesIntoHour = Math.floor((age % (1000 * 60 * 60)) / (1000 * 60))
      const block = Math.floor(minutesIntoHour / MINUTES_PER_BLOCK)
      if (hoursAgo < HOURS && block < BLOCKS_PER_HOUR) {
        data[HOURS - 1 - hoursAgo][block]++
      }
    })
    return data
  }, [packets])

  const maxValue = Math.max(...heatmapData.flat(), 1)

  const getColor = (value: number) => {
    if (value === 0) return "#0f172a"
    const intensity = Math.min(value / (maxValue * 0.7), 1)
    if (intensity < 0.2) return "#172554"
    if (intensity < 0.4) return "#1e3a5f"
    if (intensity < 0.6) return "#1d4ed8"
    if (intensity < 0.8) return "#ea580c"
    return "#dc2626"
  }

  return (
    <div className="v0-card">
      <h3 className="v0-card-title v0-card-padded">Intensidad de Tráfico (Últimas 24h)</h3>
      <div style={{ padding: "0 12px 12px" }}>
        <div style={{ display: "flex", gap: "2px", marginBottom: "4px" }}>
          <div style={{ width: "48px" }} />
          {Array.from({ length: BLOCKS_PER_HOUR }, (_, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>
              {i * MINUTES_PER_BLOCK === 0 ? ":00" : i * MINUTES_PER_BLOCK === 30 ? ":30" : ""}
            </div>
          ))}
        </div>
        {heatmapData.map((hourData, hi) => (
          <div key={hi} style={{ display: "flex", gap: "2px", alignItems: "center", marginBottom: "2px" }}>
            <div style={{ width: "48px", textAlign: "right", fontSize: "10px", color: "rgba(255,255,255,0.4)", paddingRight: "4px" }}>
              {new Date(Date.now() - (HOURS - 1 - hi) * 3600000).toLocaleTimeString("es-ES", { hour: "2-digit", hour12: false })}
            </div>
            {hourData.map((value, bi) => (
              <div
                key={bi}
                style={{
                  flex: 1, height: "18px", borderRadius: "2px", background: getColor(value),
                  transition: "all 0.2s", cursor: "pointer",
                }}
                title={`${value} paquetes`}
              />
            ))}
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "12px", marginTop: "8px", fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
          <span>Menos</span>
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((i) => (
            <div key={i} style={{
              width: "14px", height: "14px", borderRadius: "3px",
              background: getColor(i === 0 ? 0 : i * maxValue * 0.7),
            }} />
          ))}
          <span>Más</span>
        </div>
      </div>
    </div>
  )
}
