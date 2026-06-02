"use client"

import { formatBytes } from "@/lib/v0-network/mock-data"

interface BandwidthMeterProps {
  label: string
  value: number
  max: number
  color: string
}

export function BandwidthMeter({ label, value, max, color }: BandwidthMeterProps) {
  const percentage = Math.min((value / max) * 100, 100)
  const radius = 45
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="v0-bw-meter">
      <div className="v0-bw-ring-wrap">
        <svg className="v0-bw-svg" viewBox="0 0 112 112">
          <circle cx="56" cy="56" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
          <circle
            cx="56" cy="56" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.5s ease" }}
          />
        </svg>
        <div className="v0-bw-center">
          <span className="v0-bw-pct">{percentage.toFixed(0)}%</span>
          <span className="v0-bw-bps">{formatBytes(value)}/s</span>
        </div>
      </div>
      <span className="v0-bw-label">{label}</span>
    </div>
  )
}
