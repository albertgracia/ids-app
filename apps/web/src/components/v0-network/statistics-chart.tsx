"use client"

import { useMemo } from "react"
import type { PacketHeader } from "@/lib/v0-network/mock-data"
import { formatBytes } from "@/lib/v0-network/mock-data"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts"

interface StatisticsChartProps {
  packets: PacketHeader[]
}

export function StatisticsChart({ packets }: StatisticsChartProps) {
  const bandwidthData = useMemo(() => {
    const data: { time: string; bytes: number }[] = []
    const now = Date.now()
    for (let i = 29; i >= 0; i--) {
      const window = now - i * 1000
      const wp = packets.filter((p) => p.timestamp >= window && p.timestamp < window + 1000)
      data.push({
        time: new Date(window).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }),
        bytes: wp.reduce((s, p) => s + p.size, 0),
      })
    }
    return data
  }, [packets])

  const protocolData = useMemo(() => {
    const dist: Record<string, number> = {}
    packets.forEach((p) => { dist[p.protocol] = (dist[p.protocol] || 0) + 1 })
    return Object.entries(dist).map(([protocol, count]) => ({ protocol, count }))
  }, [packets])

  return (
    <div className="v0-charts-grid">
      <div className="v0-card">
        <h3 className="v0-card-title v0-card-padded">Ancho de Banda en el Tiempo</h3>
        <div style={{ padding: "0 12px 12px" }}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={bandwidthData}>
              <defs>
                <linearGradient id="bwGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="time" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} tickFormatter={(v) => v.split(":").slice(1).join(":")} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} tickFormatter={(v) => formatBytes(v)} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px" }}
                labelStyle={{ color: "rgba(255,255,255,0.9)" }}
                formatter={(v) => [formatBytes(Number(v ?? 0)), "Bytes"]}
              />
              <Area type="monotone" dataKey="bytes" stroke="#3b82f6" strokeWidth={2} fill="url(#bwGrad)" animationDuration={300} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="v0-card">
        <h3 className="v0-card-title v0-card-padded">Distribución de Protocolos</h3>
        <div style={{ padding: "0 12px 12px" }}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={protocolData}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={1} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="protocol" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px" }}
                labelStyle={{ color: "rgba(255,255,255,0.9)" }}
              />
              <Bar dataKey="count" fill="url(#barGrad)" radius={[4, 4, 0, 0]} animationDuration={300} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
