"use client"

import { useMemo } from "react"
import type { PacketHeader, TrafficStats } from "@/lib/v0-network/mock-data"
import { formatBytes } from "@/lib/v0-network/mock-data"
import {
  buildV0TopSources,
  buildV0TopPorts,
  buildV0TrafficMetrics,
  buildV0NetworkHealthScore,
  buildV0ProtocolDistribution,
  buildV0SeveritySummary,
  type SeverityLevel,
  severityToColor,
  severityToLabelEs,
  SEVERITY_ORDER,
} from "@/lib/v0-network/real-data-adapter"
import { Shield, Globe, Cpu, HardDrive, AlertTriangle } from "lucide-react"

interface AdvancedStatsDashboardProps {
  packets: PacketHeader[]
  stats: TrafficStats
  severityById?: Record<string, SeverityLevel>
}

export function AdvancedStatsDashboard({ packets, stats, severityById }: AdvancedStatsDashboardProps) {
  const advancedMetrics = useMemo(() => {
    const trafficMetrics = buildV0TrafficMetrics(packets)
    const topSources = buildV0TopSources(packets)
    const topPorts = buildV0TopPorts(packets)
    const protoDist = buildV0ProtocolDistribution(packets)
    const healthScore = buildV0NetworkHealthScore(packets, stats.suspiciousCount)

    const protocolHealth = {
      TCP: protoDist.TCP || 0,
      UDP: protoDist.UDP || 0,
      HTTP: (protoDist.HTTP || 0) + (protoDist.HTTPS || 0),
      DNS: protoDist.DNS || 0,
      ICMP: protoDist.ICMP || 0,
      SSH: protoDist.SSH || 0,
      FTP: protoDist.FTP || 0,
    }

    const severitySummary = severityById ? buildV0SeveritySummary(severityById) : null

    return { ...trafficMetrics, topSources, topPorts, protocolHealth, healthScore, severitySummary }
  }, [packets, stats.suspiciousCount, severityById])

  const getHealthColor = (score: number) => {
    if (score >= 80) return "#22c55e"
    if (score >= 60) return "#eab308"
    if (score >= 40) return "#f97316"
    return "#ef4444"
  }

  const getHealthLabel = (score: number) => {
    if (score >= 80) return "Excelente"
    if (score >= 60) return "Buena"
    if (score >= 40) return "Regular"
    return "Mala"
  }

  const PORT_LABELS: Record<number, string> = {
    22: "SSH", 53: "DNS", 80: "HTTP", 443: "HTTPS",
    502: "Modbus", 8080: "HTTP", 8443: "HTTPS", 3389: "RDP",
  }

  const totalCount = Math.max(packets.length, 1)

  return (
    <div className="v0-advanced-stats">
      <div className="v0-adv-grid">
        {/* Health Score */}
        <div className="v0-adv-card">
          <div className="v0-adv-card-header">
            <Shield size={16} color={getHealthColor(advancedMetrics.healthScore)} />
            <span>Puntuación de Salud de Red</span>
          </div>
          <div className="v0-adv-card-body">
            <div className="v0-health-score-wrap">
              <span className="v0-health-score" style={{ color: getHealthColor(advancedMetrics.healthScore) }}>
                {advancedMetrics.healthScore}
              </span>
              <span className="v0-health-label" style={{ color: getHealthColor(advancedMetrics.healthScore) }}>
                {getHealthLabel(advancedMetrics.healthScore)}
              </span>
            </div>
            <div className="v0-progress-bar-wrap">
              <div className="v0-progress-bar">
                <div className="v0-progress-fill" style={{ width: `${advancedMetrics.healthScore}%`, background: getHealthColor(advancedMetrics.healthScore) }} />
              </div>
            </div>
            <div className="v0-adv-muted">
              Basado en {stats.suspiciousCount} paquetes sospechosos y {advancedMetrics.uniqueSourceIps} fuentes únicas
            </div>
          </div>
        </div>

        {/* Top Sources */}
        <div className="v0-adv-card">
          <div className="v0-adv-card-header">
            <Globe size={16} color="#06b6d4" />
            <span>Principales Orígenes</span>
          </div>
          <div className="v0-adv-card-body">
            <div className="v0-adv-list">
              {advancedMetrics.topSources.map(([ip, count], idx) => {
                const pct = (count / totalCount) * 100
                return (
                  <div key={ip} className="v0-adv-list-row">
                    <span className="v0-adv-rank">{idx + 1}</span>
                    <span className="v0-adv-ip">{ip}</span>
                    <div className="v0-adv-bar-wrap">
                      <div className="v0-adv-bar" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="v0-adv-count">{count} paq.</span>
                    <span className="v0-adv-trend" style={{ color: pct > 15 ? "#22c55e" : "#f97316" }}>{pct > 15 ? "↑" : "↓"}</span>
                  </div>
                )
              })}
              {advancedMetrics.topSources.length === 0 && <div className="v0-adv-empty">Sin datos</div>}
            </div>
          </div>
        </div>

        {/* Top Destination Ports */}
        <div className="v0-adv-card">
          <div className="v0-adv-card-header">
            <Cpu size={16} color="#a855f7" />
            <span>Puertos de Destino</span>
          </div>
          <div className="v0-adv-card-body">
            <div className="v0-adv-list">
              {advancedMetrics.topPorts.map(([port, count], idx) => {
                const pct = (count / totalCount) * 100
                const portNum = Number(port)
                return (
                  <div key={port} className="v0-adv-list-row">
                    <span className="v0-adv-rank">{idx + 1}</span>
                    <span className="v0-adv-port">{port}</span>
                    <span className="v0-adv-port-label">{PORT_LABELS[portNum] || ""}</span>
                    <div className="v0-adv-bar-wrap">
                      <div className="v0-adv-bar v0-adv-bar-purple" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="v0-adv-count">{count} paq.</span>
                  </div>
                )
              })}
              {advancedMetrics.topPorts.length === 0 && <div className="v0-adv-empty">Sin datos</div>}
            </div>
          </div>
        </div>

        {/* Traffic Metrics */}
        <div className="v0-adv-card">
          <div className="v0-adv-card-header">
            <HardDrive size={16} color="#f97316" />
            <span>Métricas de Tráfico</span>
          </div>
          <div className="v0-adv-card-body">
            <div className="v0-metrics-grid">
              <div className="v0-metric-item">
                <span className="v0-metric-value">{advancedMetrics.uniqueSourceIps}</span>
                <span className="v0-metric-label">Fuentes únicas</span>
              </div>
              <div className="v0-metric-item">
                <span className="v0-metric-value">{advancedMetrics.uniqueDestIps}</span>
                <span className="v0-metric-label">Destinos únicos</span>
              </div>
              <div className="v0-metric-item">
                <span className="v0-metric-value">{advancedMetrics.uniquePorts}</span>
                <span className="v0-metric-label">Puertos únicos</span>
              </div>
              <div className="v0-metric-item">
                <span className="v0-metric-value">{formatBytes(advancedMetrics.avgPacketSize)}</span>
                <span className="v0-metric-label">Tamaño medio</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Protocol Distribution horizontal */}
      <div className="v0-adv-card v0-adv-protocol-dist">
        <div className="v0-adv-card-header">
          <span>Distribución de Protocolos</span>
        </div>
        <div className="v0-adv-card-body">
          <div className="v0-adv-protocol-list">
            {Object.entries(advancedMetrics.protocolHealth).map(([protocol, count]) => {
              const pct = (count / totalCount) * 100
              const colorMap: Record<string, string> = {
                TCP: "#3b82f6", UDP: "#a855f7", HTTP: "#22c55e",
                HTTPS: "#10b981", DNS: "#f97316", ICMP: "#06b6d4",
                SSH: "#ec4899", FTP: "#eab308",
              }
              return (
                <div key={protocol} className="v0-adv-protocol-row">
                  <div className="v0-adv-protocol-header">
                    <span className="v0-adv-protocol-name">{protocol}</span>
                    <span className="v0-adv-protocol-count">{count} ({pct.toFixed(1)}%)</span>
                  </div>
                  <div className="v0-progress-bar">
                    <div className="v0-progress-fill" style={{ width: `${pct}%`, background: colorMap[protocol] || "#9ca3af" }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Severity Distribution */}
      {advancedMetrics.severitySummary && (
        <div className="v0-adv-card v0-adv-protocol-dist">
          <div className="v0-adv-card-header">
            <AlertTriangle size={16} color="#eab308" />
            <span>Distribución por Severidad</span>
          </div>
          <div className="v0-adv-card-body">
            <div className="v0-adv-protocol-list">
              {SEVERITY_ORDER.filter((s) => s !== "unknown" && (advancedMetrics.severitySummary?.[s] ?? 0) > 0).map((severity) => {
                const count = advancedMetrics.severitySummary?.[severity] ?? 0
                const pct = (count / totalCount) * 100
                const color = severityToColor(severity)
                return (
                  <div key={severity} className="v0-adv-protocol-row">
                    <div className="v0-adv-protocol-header">
                      <span className="v0-adv-protocol-name" style={{ color }}>{severityToLabelEs(severity)}</span>
                      <span className="v0-adv-protocol-count">{count} ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="v0-progress-bar">
                      <div className="v0-progress-fill" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
