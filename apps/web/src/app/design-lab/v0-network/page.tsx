"use client"

import "./v0.css"

import { useState, useEffect } from "react"
import { Activity, Play, Pause, Trash2, Download, Film, X } from "lucide-react"
import { StatsOverview } from "@/components/v0-network/stats-overview"
import { PacketStream } from "@/components/v0-network/packet-stream"
import { PacketSearch } from "@/components/v0-network/packet-search"
import { ProtocolFilters } from "@/components/v0-network/protocol-filters"
import { BandwidthMeter } from "@/components/v0-network/bandwidth-meter"
import { ReplayControls } from "@/components/v0-network/replay-controls"
import { ThreatAlerts } from "@/components/v0-network/threat-alerts"
import { StatisticsChart } from "@/components/v0-network/statistics-chart"
import { TrafficHeatmap } from "@/components/v0-network/traffic-heatmap"
import { TrafficMap } from "@/components/v0-network/traffic-map"
import { ConnectionTracker } from "@/components/v0-network/connection-tracker"
import {
  usePacketStream,
  useTrafficStats,
  usePacketReplay,
  useThreatDetection,
  generateConnection,
  type Connection,
} from "@/lib/v0-network/mock-data"

const TABS = [
  { key: "live", label: "Stream en Vivo" },
  { key: "stats", label: "Estadísticas" },
  { key: "connections", label: "Conexiones" },
  { key: "map", label: "Mapa" },
] as const

type Tab = (typeof TABS)[number]["key"]

export default function V0NetworkPage() {
  const {
    packets, allPackets, activeFilters,
    searchQuery, isPaused,
    toggleFilter, clearFilters, setSearchQuery,
    togglePause, clearPackets,
  } = usePacketStream(300)

  const stats = useTrafficStats(allPackets)
  const [connections, setConnections] = useState<Connection[]>([])
  const [activeTab, setActiveTab] = useState<Tab>("live")

  const replay = usePacketReplay(allPackets)
  const displayPackets = replay.isReplayMode ? replay.replayPackets : packets
  const { alerts, dismissAlert, clearAllAlerts } = useThreatDetection(allPackets)

  // Generate mock connections
  useEffect(() => {
    const interval = setInterval(() => {
      setConnections((prev) => {
        const updated = [...prev]
        if (Math.random() > 0.7 && updated.length < 15) {
          updated.push(generateConnection())
        }
        return updated.filter((c) => Date.now() - c.lastActivity < 60000)
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  // Toast on new suspicious packets (console-based since no toast lib)
  const toastsRef = useState<Array<{ id: string; text: string }>>([])[1]
  useEffect(() => {
    const suspicious = packets.filter((p) => p.isSuspicious)
    if (suspicious.length > 0) {
      const latest = suspicious[0]
      console.log("[v0] Actividad sospechosa:", latest.protocol, latest.sourceIp)
    }
  }, [packets.length])

  const handleExport = () => {
    const dataStr = JSON.stringify(allPackets, null, 2)
    const blob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `captura-red-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
    console.log("[v0] Exportados", allPackets.length, "paquetes")
  }

  const maxBandwidth = 100000

  return (
    <div className="v0-network-shell">
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        {/* Header */}
        <div className="v0-header">
          <div>
            <h1>
              <Activity size={28} strokeWidth={1} color="#3b82f6" />
              Analizador de Tráfico de Red
            </h1>
            <p>Monitoreo y análisis de paquetes en tiempo real</p>
          </div>
          <div className="v0-header-actions">
            {!replay.isReplayMode ? (
              <>
                <button className="v0-btn-outline-sm" onClick={togglePause}>
                  {isPaused ? <Play size={14} /> : <Pause size={14} />}
                  {isPaused ? " Reanudar" : " Pausar"}
                </button>
                <button className="v0-btn-outline-sm" onClick={clearPackets}>
                  <Trash2 size={14} /> Limpiar
                </button>
                <button
                  className="v0-btn-outline-sm"
                  onClick={replay.enterReplayMode}
                  disabled={allPackets.length === 0}
                >
                  <Film size={14} /> Reproducir
                </button>
              </>
            ) : (
              <button className="v0-btn-outline-sm" onClick={replay.exitReplayMode}>
                <X size={14} /> Salir de Reproducción
              </button>
            )}
            <button className="v0-btn-outline-sm" onClick={handleExport}>
              <Download size={14} /> Exportar
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <StatsOverview stats={stats} />

        {/* Bandwidth + Filters Row */}
        <div className="v0-grid-4">
          <div style={{ display: "flex", justifyContent: "center" }}>
            <BandwidthMeter label="Descarga" value={stats.bytesPerSecond} max={maxBandwidth} color="#3b82f6" />
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <BandwidthMeter label="Subida" value={stats.bytesPerSecond * 0.4} max={maxBandwidth} color="#22c55e" />
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <ProtocolFilters
              activeFilters={activeFilters}
              onToggleFilter={toggleFilter}
              onClearFilters={clearFilters}
            />
          </div>
        </div>

        {/* Replay Controls */}
        {replay.isReplayMode && (
          <ReplayControls
            isPlaying={replay.isPlaying}
            currentIndex={replay.currentIndex}
            totalPackets={allPackets.length}
            playbackSpeed={replay.playbackSpeed}
            onPlay={replay.play}
            onPause={replay.pause}
            onReset={replay.reset}
            onStepBackward={replay.stepBackward}
            onStepForward={replay.stepForward}
            onSpeedChange={replay.setPlaybackSpeed}
            onSeek={replay.seek}
          />
        )}

        {/* Threat Alerts */}
        <ThreatAlerts alerts={alerts} onDismiss={dismissAlert} onClearAll={clearAllAlerts} />

        {/* Tabs */}
        <div className="v0-mb-16 v0-card" style={{ overflow: "hidden" }}>
          <div className="v0-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                className={`v0-tab ${activeTab === tab.key ? "v0-tab-active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ padding: "12px" }}>
            {activeTab === "live" && (
              <div className="v0-space-16">
                <PacketSearch value={searchQuery} onChange={setSearchQuery} />
                <PacketStream packets={displayPackets} />
              </div>
            )}

            {activeTab === "stats" && (
              <div className="v0-space-16">
                <TrafficHeatmap packets={allPackets} />
                <StatisticsChart packets={allPackets} />
              </div>
            )}

            {activeTab === "connections" && (
              <ConnectionTracker connections={connections} />
            )}

            {activeTab === "map" && (
              <TrafficMap packets={allPackets} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
