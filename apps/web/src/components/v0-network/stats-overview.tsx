"use client"

import { formatBytes, formatPacketsPerSecond } from "@/lib/v0-network/mock-data"
import type { TrafficStats } from "@/lib/v0-network/mock-data"
import type { EventStats } from "@/lib/types"
import { Zap, Activity, Network, AlertTriangle } from "lucide-react"

interface StatsOverviewProps {
  stats: TrafficStats
  eventStats?: EventStats | null
}

export function StatsOverview({ stats, eventStats }: StatsOverviewProps) {
  const items = [
    {
      label: eventStats ? "Eventos Totales" : "Total Paquetes",
      value: eventStats ? eventStats.total_events.toLocaleString() : stats.totalPackets.toLocaleString(),
      icon: Zap,
      color: "#3b82f6",
    },
    {
      label: eventStats ? "Eventos Recientes" : "Total Bytes",
      value: eventStats ? eventStats.recent_events.toLocaleString() : formatBytes(stats.totalBytes),
      icon: Activity,
      color: "#22c55e",
    },
    {
      label: eventStats ? "Eventos/min" : "Paquetes/s",
      value: eventStats ? formatPacketsPerSecond(eventStats.events_per_minute / 60) : formatPacketsPerSecond(stats.packetsPerSecond),
      icon: Network,
      color: "#a855f7",
    },
    {
      label: "Sospechosos",
      value: eventStats ? eventStats.suspicious_events.toString() : stats.suspiciousCount.toString(),
      icon: AlertTriangle,
      color: "#ef4444",
    },
  ]

  return (
    <div className="v0-stats-grid">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <div key={item.label} className="v0-kpi-card">
            <div className="v0-kpi-inner">
              <div>
                <p className="v0-kpi-label">{item.label}</p>
                <p className="v0-kpi-value">{item.value}</p>
              </div>
              <Icon size={28} color={item.color} strokeWidth={1} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
