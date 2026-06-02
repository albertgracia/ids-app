"use client"

import "./v0.css"

import { useState, useMemo } from "react"
import { Activity, Play, Pause, Trash2, Download, Film, X, Database, Wifi, RefreshCw, Radio, Shield } from "lucide-react"
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
import { AdvancedStatsDashboard } from "@/components/v0-network/advanced-stats-dashboard"
import { LocationCards } from "@/components/v0-network/location-cards"
import { ConnectionTracker } from "@/components/v0-network/connection-tracker"
import { AssetSummaryBlock } from "@/components/v0-network/asset-summary"
import { SuricataSummary } from "@/components/v0-network/suricata-summary"
import {
  usePacketStream,
  useTrafficStats,
  usePacketReplay,
  useThreatDetection,
} from "@/lib/v0-network/mock-data"
import { useRealEvents } from "@/lib/v0-network/use-real-events"
import { useAssetClassifications } from "@/lib/v0-network/use-asset-classifications"
import { useEventScoring } from "@/lib/v0-network/use-event-scoring"
import { toV0PacketItems, buildV0Kpis, buildV0Connections, buildV0SeverityMap, buildV0SuricataMap, buildV0SuricataFromPackets, buildV0ExternalCount, buildV0MapSourceLabel } from "@/lib/v0-network/real-data-adapter"
import type { DataSource } from "@/lib/v0-network/use-real-events"

const TABS = [
  { key: "live", label: "Stream en Vivo" },
  { key: "stats", label: "Estadísticas" },
  { key: "connections", label: "Conexiones" },
  { key: "map", label: "Mapa" },
] as const

type Tab = (typeof TABS)[number]["key"]

interface SourceConfig {
  label: string
  icon: typeof Wifi
  color: string
}

const SOURCE_CONFIG: Record<DataSource, SourceConfig> = {
  live: { label: "En Vivo", icon: Radio, color: "#22c55e" },
  reconnecting: { label: "Reconectando", icon: Wifi, color: "#eab308" },
  polling: { label: "Polling", icon: RefreshCw, color: "#3b82f6" },
  mock: { label: "Mock", icon: Database, color: "#f97316" },
}

export default function V0NetworkPage() {
  const {
    packets, allPackets, activeFilters,
    searchQuery, isPaused,
    toggleFilter, clearFilters, setSearchQuery,
    togglePause, clearPackets,
  } = usePacketStream(300)

  const realEvents = useRealEvents()
  const assetClassifications = useAssetClassifications()
  const eventScoring = useEventScoring(realEvents.events)
  const [activeTab, setActiveTab] = useState<Tab>("live")

  const realPackets = useMemo(
    () => realEvents.apiAvailable ? toV0PacketItems(realEvents.events) : [],
    [realEvents.events, realEvents.apiAvailable],
  )

  const hasRealData = realEvents.apiAvailable && realPackets.length > 0
  const activePackets = hasRealData ? realPackets : allPackets

  const stats = useTrafficStats(activePackets)
  const realStats = useMemo(
    () => hasRealData ? buildV0Kpis(realPackets) : stats,
    [hasRealData, realPackets, stats],
  )

  const replay = usePacketReplay(activePackets)
  const displayPackets = replay.isReplayMode ? replay.replayPackets : (hasRealData ? realPackets : packets)
  const { alerts, dismissAlert, clearAllAlerts } = useThreatDetection(activePackets)

  const severityById = useMemo(
    () => hasRealData ? buildV0SeverityMap(realEvents.events) : {},
    [hasRealData, realEvents.events],
  )

  const suricataById = useMemo(
    () => hasRealData ? buildV0SuricataMap(realEvents.events) : buildV0SuricataFromPackets(allPackets),
    [hasRealData, realEvents.events, allPackets],
  )

  const connections = useMemo(() => buildV0Connections(activePackets, severityById), [activePackets, severityById])

  const sourceCfg = SOURCE_CONFIG[realEvents.source]
  const SourceIcon = sourceCfg.icon

  const handleExport = () => {
    const dataStr = JSON.stringify(activePackets, null, 2)
    const blob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `captura-red-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
    console.log("[v0] Exportados", activePackets.length, "paquetes")
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
            <span
              className="v0-source-badge"
              style={{ borderColor: sourceCfg.color, color: sourceCfg.color }}
            >
              <SourceIcon size={12} /> {sourceCfg.label}
              <span className="v0-source-dot" style={{ background: sourceCfg.color }} />
            </span>
            <span className="v0-source-count" title={`${activePackets.length} eventos activos`}>
              <Activity size={10} /> {activePackets.length}
            </span>
            <span
              className="v0-source-count"
              title={`${assetClassifications.classifications.length} activos clasificados`}
              style={{ opacity: assetClassifications.apiAvailable ? 0.7 : 0.4 }}
            >
              <Shield size={10} />{" "}
              {assetClassifications.apiAvailable
                ? `${assetClassifications.classifications.length} activos`
                : "activos: N/A"}
            </span>
            <span
              className="v0-source-count"
              title="Severidad y scoring de eventos"
              style={{ opacity: 0.55 }}
            >
              Scoring: {eventScoring.source === "analytics" ? "Analytics" : eventScoring.source === "derived" ? "Derivado" : "N/A"}
            </span>
            <span
              className="v0-source-count"
              title="Eventos Suricata EVE detectados"
              style={{ opacity: Object.keys(suricataById).length > 0 ? 0.7 : 0.4 }}
            >
              EVE: {Object.keys(suricataById).length}
            </span>
            {realEvents.lastUpdated && (realEvents.source === "live" || realEvents.source === "polling") && (
              <span className="v0-source-time" title={`Última actualización: ${new Date(realEvents.lastUpdated).toLocaleTimeString("es-ES")}`}>
                <RefreshCw size={10} />{" "}
                {Math.floor((Date.now() - realEvents.lastUpdated) / 1000)}s
              </span>
            )}
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
                  disabled={activePackets.length === 0}
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
        <StatsOverview stats={realStats} />

        {/* Bandwidth + Filters Row */}
        <div className="v0-grid-4">
          <div style={{ display: "flex", justifyContent: "center" }}>
            <BandwidthMeter label="Descarga" value={realStats.bytesPerSecond} max={maxBandwidth} color="#3b82f6" />
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <BandwidthMeter label="Subida" value={realStats.bytesPerSecond * 0.4} max={maxBandwidth} color="#22c55e" />
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
            totalPackets={activePackets.length}
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
                <PacketStream
                  packets={displayPackets}
                  assetByIp={assetClassifications.byIp}
                  severityById={severityById}
                />
              </div>
            )}

            {activeTab === "stats" && (
              <div className="v0-space-16">
                <SuricataSummary suricataById={suricataById} />
                <AssetSummaryBlock
                  classifications={assetClassifications.classifications}
                  apiAvailable={assetClassifications.apiAvailable}
                />
                <AdvancedStatsDashboard packets={activePackets} stats={realStats} severityById={severityById} />
                <TrafficHeatmap packets={activePackets} />
                <StatisticsChart packets={activePackets} />
              </div>
            )}

            {activeTab === "connections" && (
              <div className="v0-space-16">
                <AssetSummaryBlock
                  classifications={assetClassifications.classifications}
                  apiAvailable={assetClassifications.apiAvailable}
                />
                <ConnectionTracker connections={connections} assetByIp={assetClassifications.byIp} />
              </div>
            )}

            {activeTab === "map" && (
              <div className="v0-space-16">
                <TrafficMap packets={activePackets} />
                <LocationCards packets={activePackets} />
                <div style={{
                  textAlign: "center", fontSize: "10px", color: "rgba(255,255,255,0.3)",
                  padding: "6px 0", fontFamily: "monospace", lineHeight: 1.6,
                }}>
                  <div>GeoIP sintético local — no se consulta ningún proveedor externo</div>
                  <div>No se geolocalizan IPs privadas · Fuente: {buildV0MapSourceLabel(activePackets, hasRealData)} · {buildV0ExternalCount(activePackets)} IPs externas</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
