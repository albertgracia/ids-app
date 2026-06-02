"use client"

import type { Protocol } from "@/lib/v0-network/mock-data"

interface ProtocolBadgeProps {
  protocol: Protocol
  className?: string
}

export function ProtocolBadge({ protocol, className = "" }: ProtocolBadgeProps) {
  const colors: Record<string, { bg: string; border: string; text: string }> = {
    TCP: { bg: "rgba(59,130,246,0.2)", border: "rgba(59,130,246,0.3)", text: "#3b82f6" },
    UDP: { bg: "rgba(168,85,247,0.2)", border: "rgba(168,85,247,0.3)", text: "#a855f7" },
    HTTP: { bg: "rgba(34,197,94,0.2)", border: "rgba(34,197,94,0.3)", text: "#22c55e" },
    HTTPS: { bg: "rgba(16,185,129,0.2)", border: "rgba(16,185,129,0.3)", text: "#10b981" },
    DNS: { bg: "rgba(249,115,22,0.2)", border: "rgba(249,115,22,0.3)", text: "#f97316" },
    ICMP: { bg: "rgba(6,182,212,0.2)", border: "rgba(6,182,212,0.3)", text: "#06b6d4" },
    SSH: { bg: "rgba(236,72,153,0.2)", border: "rgba(236,72,153,0.3)", text: "#ec4899" },
    FTP: { bg: "rgba(234,179,8,0.2)", border: "rgba(234,179,8,0.3)", text: "#eab308" },
  }
  const c = colors[protocol] || { bg: "rgba(156,163,175,0.2)", border: "rgba(156,163,175,0.3)", text: "#9ca3af" }

  return (
    <span
      className={`v0-protocol-badge ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "1px 6px",
        borderRadius: "3px",
        fontSize: "11px",
        fontFamily: "monospace",
        fontWeight: 500,
        border: `1px solid ${c.border}`,
        background: c.bg,
        color: c.text,
      }}
    >
      {protocol}
    </span>
  )
}
