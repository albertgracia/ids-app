"use client"

import { useMemo, useState } from "react"
import type { PacketHeader } from "@/lib/v0-network/mock-data"

interface TrafficMapProps {
  packets: PacketHeader[]
}

interface LocationData {
  lat: number; lng: number; country: string; city: string
  totalCount: number; protocols: Record<string, number>
}

const PROTOCOL_COLORS: Record<string, string> = {
  TCP: "#3b82f6", UDP: "#a855f7", HTTP: "#22c55e",
  HTTPS: "#10b981", DNS: "#f97316", SSH: "#ec4899", FTP: "#eab308",
}

function projectPoint(lat: number, lng: number, w: number, h: number) {
  const x = ((lng + 180) / 360) * w
  const y = ((90 - lat) / 180) * h
  return { x, y }
}

function getDominantProtocol(protocols: Record<string, number>): string {
  let max = 0; let dominant = ""
  for (const [p, c] of Object.entries(protocols)) {
    if (c > max) { max = c; dominant = p }
  }
  return dominant
}

export function TrafficMap({ packets }: TrafficMapProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const validPackets = useMemo(() =>
    packets.filter((p) => p.geolocation && p.geolocation.lat !== undefined && p.geolocation.lng !== undefined),
    [packets])

  const locationData = useMemo(() => {
    const map = new Map<string, LocationData>()
    validPackets.forEach((p) => {
      const key = `${p.geolocation.lat},${p.geolocation.lng}`
      const existing = map.get(key)
      if (existing) {
        existing.totalCount++
        existing.protocols[p.protocol] = (existing.protocols[p.protocol] || 0) + 1
      } else {
        map.set(key, {
          lat: p.geolocation.lat, lng: p.geolocation.lng,
          country: p.country, city: p.city,
          totalCount: 1,
          protocols: { [p.protocol]: 1 },
        })
      }
    })
    return Array.from(map.values())
  }, [validPackets])

  const W = 800; const H = 400

  return (
    <div className="v0-card">
      <div className="v0-map-header">
        <div>
          <h3 className="v0-card-title">Mapa de Orígenes de Tráfico</h3>
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>Pase el cursor para más info</span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "20px", fontWeight: 700 }}>{validPackets.length.toLocaleString()}</div>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{locationData.length} ubicaciones</div>
        </div>
      </div>

      <div className="v0-map-container" style={{ position: "relative" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", background: "#020617" }}>
          {/* Simple world outline */}
          <rect width={W} height={H} fill="#020617" />

          {/* Simplified continent shapes */}
          <g fill="rgba(30,41,59,0.5)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5">
            {/* North America */}
            <path d="M120,60 L220,50 L260,70 L270,110 L260,130 L200,140 L140,130 L100,150 L80,120 L100,80 Z" />
            {/* South America */}
            <path d="M180,160 L210,160 L220,200 L200,260 L180,280 L160,240 L170,190 Z" />
            {/* Europe */}
            <path d="M380,50 L450,40 L480,60 L470,80 L420,90 L390,85 L370,70 Z" />
            {/* Africa */}
            <path d="M380,90 L440,85 L460,120 L450,180 L410,210 L370,190 L360,130 Z" />
            {/* Asia */}
            <path d="M480,40 L600,30 L680,50 L700,80 L680,120 L620,130 L560,120 L500,100 L470,80 Z" />
            {/* Australia */}
            <path d="M620,220 L660,200 L700,210 L690,250 L650,260 L620,240 Z" />
            {/* Japan/Korea */}
            <rect x="700" y="55" width="10" height="30" rx="2" />
            {/* UK */}
            <rect x="360" y="42" width="12" height="18" rx="2" />
            {/* Indonesia */}
            <ellipse cx="620" cy="170" rx="25" ry="8" />
          </g>

          {/* Grid lines */}
          <g stroke="rgba(255,255,255,0.03)" strokeWidth="0.5">
            {[0, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660, 720, 780].map((x) => (
              <line key={`v${x}`} x1={x} y1={0} x2={x} y2={H} />
            ))}
            {[0, 50, 100, 150, 200, 250, 300, 350, 400].map((y) => (
              <line key={`h${y}`} x1={0} y1={y} x2={W} y2={y} />
            ))}
          </g>

          {/* Location dots */}
          {locationData.map((loc, idx) => {
            const { x, y } = projectPoint(loc.lat, loc.lng, W, H)
            const size = Math.min(Math.max(loc.totalCount / 8, 4), 14)
            const color = PROTOCOL_COLORS[getDominantProtocol(loc.protocols)] || "#94a3b8"
            const isHovered = hoveredIdx === idx

            return (
              <g key={idx}>
                <circle cx={x} cy={y} r={size + 4} fill={color} opacity="0.3" style={{ animation: "v0-pulse 2s infinite" }} />
                <circle
                  cx={x} cy={y} r={size} fill={color}
                  opacity={isHovered ? 1 : 0.85}
                  style={{ cursor: "pointer", transition: "opacity 0.2s" }}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
                <circle cx={x} cy={y} r={size / 2} fill="white" opacity="0.7" style={{ pointerEvents: "none" }} />
              </g>
            )
          })}
        </svg>

        {/* Tooltip */}
        {hoveredIdx !== null && (() => {
          const loc = locationData[hoveredIdx]
          const { x, y } = projectPoint(loc.lat, loc.lng, W, H)
          return (
            <div className="v0-map-tooltip" style={{
              left: `${(x / W) * 100}%`,
              top: `${(y / H) * 100}%`,
              transform: `translate(-50%, ${y < H / 2 ? "20px" : "-110%"})`,
            }}>
              <div style={{ fontWeight: 600, marginBottom: "4px" }}>{loc.city}, {loc.country}</div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", marginBottom: "6px" }}>{loc.totalCount} paquetes totales</div>
              {Object.entries(loc.protocols).sort(([, a], [, b]) => b - a).map(([protocol, count]) => (
                <div key={protocol} style={{ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "11px", marginBottom: "2px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: PROTOCOL_COLORS[protocol] || "#94a3b8" }} />
                    <span>{protocol}</span>
                  </div>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>{count}</span>
                </div>
              ))}
            </div>
          )
        })()}
      </div>

      {/* Legend */}
      <div className="v0-map-legend">
        {Object.entries(PROTOCOL_COLORS).map(([protocol, color]) => (
          <div key={protocol} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: color }} />
            <span>{protocol}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
