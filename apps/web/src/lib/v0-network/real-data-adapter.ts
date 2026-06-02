import type { EventItem } from "@/lib/types"
import type { Protocol, PacketHeader, TrafficStats, Connection } from "./mock-data"
import { lookupSyntheticGeoIp, isExternalIp } from "./geoip-synthetic"

export type AssetType = "plc" | "hmi" | "scada" | "engineering_workstation" | "it_server" | "external_host" | "ids_sensor" | "unknown"

export const ASSET_TYPES: AssetType[] = ["plc", "hmi", "scada", "engineering_workstation", "it_server", "external_host", "ids_sensor", "unknown"]

export interface AssetInfo {
  ip: string
  assetType: AssetType
  confidence: number
  zone: string
  criticality: string
  protocols: string[]
  eventCount: number
  reasons: string[]
}

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  plc: "PLC",
  hmi: "HMI",
  scada: "SCADA",
  engineering_workstation: "EWS",
  it_server: "IT",
  external_host: "EXT",
  ids_sensor: "IDS",
  unknown: "?",
}

export const ASSET_TYPE_COLORS: Record<AssetType, string> = {
  plc: "#f97316",
  hmi: "#a855f7",
  scada: "#ec4899",
  engineering_workstation: "#06b6d4",
  it_server: "#3b82f6",
  external_host: "#22c55e",
  ids_sensor: "#eab308",
  unknown: "#9ca3af",
}

export const ASSET_TYPE_ZONES: Record<AssetType, string> = {
  plc: "ot",
  hmi: "ot",
  scada: "ot",
  engineering_workstation: "ot",
  it_server: "it",
  external_host: "external",
  ids_sensor: "it",
  unknown: "unknown",
}

const MAX_EVENTS = 500
const MAX_STREAM = 100
const MAX_SOURCES = 5
const MAX_PORTS = 5
const MAX_CONNECTIONS = 50
const MAX_LABEL_LENGTH = 40

const PRIVATE_PREFIXES = ["10.", "172.16.", "172.17.", "172.18.", "172.19.", "172.20.", "172.21.", "172.22.", "172.23.", "172.24.", "172.25.", "172.26.", "172.27.", "172.28.", "172.29.", "172.30.", "172.31.", "192.168.", "127.", "169.254."]

export function normalizeId(v: unknown): string {
  if (typeof v === "string" && v.length > 0) return v
  if (typeof v === "number") return String(v)
  return crypto.randomUUID()
}

export function safeString(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v
  if (typeof v === "number") return String(v)
  return fallback
}

export function safeNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && isFinite(v)) return v
  const n = Number(v)
  return isFinite(n) ? n : fallback
}

export function safeTimestamp(v: unknown): number {
  if (typeof v === "number" && isFinite(v)) return v
  if (typeof v === "string") {
    const d = Date.parse(v)
    return isFinite(d) ? d : Date.now()
  }
  return Date.now()
}

export function truncateLabel(label: string, max = MAX_LABEL_LENGTH): string {
  if (typeof label !== "string") return ""
  return label.length > max ? label.slice(0, max) + "…" : label
}

export function toAssetInfo(raw: Record<string, unknown>): AssetInfo | null {
  try {
    const at = (raw.asset_type as string) || "unknown"
    if (!ASSET_TYPES.includes(at as AssetType)) return null
    return {
      ip: safeString(raw.ip),
      assetType: at as AssetType,
      confidence: Math.max(0, Math.min(100, safeNumber(raw.confidence))),
      zone: safeString(raw.zone, "unknown"),
      criticality: safeString(raw.criticality, "low"),
      protocols: Array.isArray(raw.protocols) ? (raw.protocols as string[]).map((p) => safeString(p)).filter(Boolean) : [],
      eventCount: Math.max(0, safeNumber(raw.event_count)),
      reasons: Array.isArray(raw.reasons) ? (raw.reasons as string[]).map((r) => truncateLabel(safeString(r))) : [],
    }
  } catch {
    return null
  }
}

export function formatAssetTypeLabel(at: AssetType): string {
  return ASSET_TYPE_LABELS[at] || "?"
}

export function assetTypeColor(at: AssetType): string {
  return ASSET_TYPE_COLORS[at] || "#9ca3af"
}

export function getAssetByIp(byIp: Record<string, AssetInfo>, ip: string): AssetInfo | undefined {
  return byIp[ip]
}

export function buildV0AssetSummary(classifications: AssetInfo[]): Record<AssetType, number> {
  const summary = {} as Record<AssetType, number>
  for (const at of ASSET_TYPES) summary[at] = 0
  for (const c of classifications) {
    if (summary[c.assetType] !== undefined) summary[c.assetType]++
  }
  return summary
}

export function buildV0AssetsByZone(classifications: AssetInfo[]): Record<string, number> {
  const zones: Record<string, number> = {}
  for (const c of classifications) {
    const z = c.zone || "unknown"
    zones[z] = (zones[z] || 0) + 1
  }
  return zones
}

export type SeverityLevel = "critical" | "high" | "medium" | "low" | "info" | "unknown"

export const SEVERITY_ORDER: SeverityLevel[] = ["critical", "high", "medium", "low", "info", "unknown"]

export const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Media",
  low: "Baja",
  info: "Info",
  unknown: "Desconocida",
}

export const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
  info: "#9ca3af",
  unknown: "#6b7280",
}

export const SEVERITY_WEIGHTS: Record<SeverityLevel, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
  unknown: 0,
}

export function normalizeSeverity(s: string): SeverityLevel {
  const v = safeString(s).toLowerCase()
  if (SEVERITY_ORDER.includes(v as SeverityLevel)) return v as SeverityLevel
  return "unknown"
}

export function severityToLabelEs(s: SeverityLevel): string {
  return SEVERITY_LABELS[s] || "Desconocida"
}

export function severityToColor(s: SeverityLevel): string {
  return SEVERITY_COLORS[s] || "#6b7280"
}

export function severityToWeight(s: SeverityLevel): number {
  return SEVERITY_WEIGHTS[s] ?? 0
}

export function isSuspiciousSeverity(s: SeverityLevel): boolean {
  return s === "high" || s === "critical"
}

export function deriveEventRiskScore(severity: SeverityLevel): number {
  return severityToWeight(severity) * 20
}

export function buildV0SeveritySummary(severityById: Record<string, SeverityLevel>): Record<SeverityLevel, number> {
  const summary = {} as Record<SeverityLevel, number>
  for (const s of SEVERITY_ORDER) summary[s] = 0
  for (const sev of Object.values(severityById)) {
    if (summary[sev] !== undefined) summary[sev]++
  }
  return summary
}

export function buildV0SeverityMap(events: EventItem[]): Record<string, SeverityLevel> {
  const m: Record<string, SeverityLevel> = {}
  for (const e of events) {
    m[normalizeId(e.id)] = normalizeSeverity(e.severity)
  }
  return m
}

export function buildV0ExternalCount(packets: PacketHeader[]): number {
  return packets.filter((p) => p.geolocation && p.geolocation.lat !== 0 && p.geolocation.country !== "").length
}

export function buildV0MapSourceLabel(packets: PacketHeader[], hasRealData: boolean): string {
  const extCount = buildV0ExternalCount(packets)
  if (!hasRealData) return "Mock"
  if (extCount === 0) return "Sin IPs externas"
  return "GeoIP sintético"
}

export function buildV0ConnSeverity(connPackets: PacketHeader[], severityById: Record<string, SeverityLevel>): SeverityLevel | undefined {
  let maxW = -1
  let maxS: SeverityLevel | undefined
  for (const p of connPackets) {
    const sev = severityById[p.id] || "unknown"
    const w = severityToWeight(sev)
    if (w > maxW) {
      maxW = w
      maxS = sev
    }
  }
  return maxS
}

export function isPrivateIp(ip: string): boolean {
  return PRIVATE_PREFIXES.some((p) => ip.startsWith(p))
}

const PROTOCOL_MAP: Record<string, Protocol> = {
  tcp: "TCP", udp: "UDP", http: "HTTP", https: "HTTPS",
  dns: "DNS", icmp: "ICMP", ssh: "SSH", ftp: "FTP",
  modbus: "TCP", s7: "TCP", mqtt: "TCP",
}

export function mapProtocol(protocol: string): Protocol {
  const key = safeString(protocol).toLowerCase()
  return PROTOCOL_MAP[key] || "TCP"
}

export function mapSeverity(severity: string): boolean {
  const s = safeString(severity).toLowerCase()
  return s === "high" || s === "critical"
}

export function toV0PacketItem(event: EventItem): PacketHeader | null {
  try {
    const protocol = mapProtocol(event.protocol)
    const srcIp = safeString(event.source?.ip)
    const dstIp = safeString(event.destination?.ip)
    const geoIp = isExternalIp(srcIp) ? lookupSyntheticGeoIp(srcIp) : isExternalIp(dstIp) ? lookupSyntheticGeoIp(dstIp) : null
    return {
      id: normalizeId(event.id),
      timestamp: safeTimestamp(event.timestamp),
      sourceIp: srcIp,
      destIp: dstIp,
      sourcePort: safeNumber(event.source?.port),
      destPort: safeNumber(event.destination?.port),
      protocol,
      size: 0,
      flags: [],
      ttl: 64,
      isSuspicious: mapSeverity(event.severity),
      geolocation: geoIp ? { lat: geoIp.latitude, lng: geoIp.longitude, country: geoIp.countryName } : { lat: 0, lng: 0, country: "" },
      country: geoIp?.countryName || "",
      city: geoIp?.city || "",
    }
  } catch {
    return null
  }
}

export function toV0PacketItems(events: EventItem[]): PacketHeader[] {
  const items: PacketHeader[] = []
  const max = Math.min(events.length, MAX_EVENTS)
  for (let i = 0; i < max; i++) {
    const item = toV0PacketItem(events[i])
    if (item) items.push(item)
  }
  return items
}

export function buildV0Kpis(packets: PacketHeader[], windowSeconds = 5): TrafficStats {
  const now = Date.now()
  const recent = packets.filter((p) => now - p.timestamp < windowSeconds * 1000)
  const protocolDistribution = {} as Record<Protocol, number>
  packets.forEach((p) => {
    protocolDistribution[p.protocol] = (protocolDistribution[p.protocol] || 0) + 1
  })
  return {
    totalPackets: packets.length,
    totalBytes: packets.reduce((s, p) => s + p.size, 0),
    packetsPerSecond: safeNumber(recent.length / windowSeconds),
    bytesPerSecond: safeNumber(recent.reduce((s, p) => s + p.size, 0) / windowSeconds),
    protocolDistribution,
    suspiciousCount: packets.filter((p) => p.isSuspicious).length,
    activeConnections: new Set(packets.map((p) => `${p.sourceIp}:${p.sourcePort}-${p.destIp}:${p.destPort}`)).size,
  }
}

export interface TrafficMetrics {
  uniqueSourceIps: number
  uniqueDestIps: number
  uniquePorts: number
  avgPacketSize: number
}

export function buildV0TrafficMetrics(packets: PacketHeader[]): TrafficMetrics {
  const uniqueSourceIps = new Set(packets.map((p) => p.sourceIp)).size
  const uniqueDestIps = new Set(packets.map((p) => p.destIp)).size
  const uniquePorts = new Set(packets.map((p) => p.destPort)).size
  const totalBytes = packets.reduce((s, p) => s + p.size, 0)
  const avgPacketSize = packets.length > 0 ? totalBytes / packets.length : 0
  return { uniqueSourceIps, uniqueDestIps, uniquePorts, avgPacketSize }
}

export function buildV0NetworkHealthScore(packets: PacketHeader[], suspiciousCount: number): number {
  const uniqueSourceIps = new Set(packets.map((p) => p.sourceIp)).size
  return Math.max(0, 100 - suspiciousCount * 2 - (uniqueSourceIps > 50 ? 10 : 0))
}

export function buildV0ProtocolDistribution(packets: PacketHeader[]): Record<Protocol, number> {
  const dist = {} as Record<Protocol, number>
  packets.forEach((p) => {
    dist[p.protocol] = (dist[p.protocol] || 0) + 1
  })
  return dist
}

export function buildV0TopSources(packets: PacketHeader[]): Array<[string, number]> {
  const counts = new Map<string, number>()
  packets.forEach((p) => {
    counts.set(p.sourceIp, (counts.get(p.sourceIp) || 0) + 1)
  })
  return Array.from(counts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, MAX_SOURCES)
}

export function buildV0TopPorts(packets: PacketHeader[]): Array<[number, number]> {
  const counts = new Map<number, number>()
  packets.forEach((p) => {
    counts.set(p.destPort, (counts.get(p.destPort) || 0) + 1)
  })
  return Array.from(counts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, MAX_PORTS)
}

export interface EnrichedConnection extends Connection {
  severity: SeverityLevel
}

export function buildV0Connections(packets: PacketHeader[], severityById?: Record<string, SeverityLevel>): EnrichedConnection[] {
  const groups = new Map<string, { packets: PacketHeader[]; lastSeen: number; bytesIn: number }>()
  packets.forEach((p) => {
    const key = `${p.sourceIp}:${p.sourcePort}-${p.destIp}:${p.destPort}-${p.protocol}`
    const existing = groups.get(key)
    if (existing) {
      existing.packets.push(p)
      existing.lastSeen = Math.max(existing.lastSeen, p.timestamp)
    } else {
      groups.set(key, { packets: [p], lastSeen: p.timestamp, bytesIn: 0 })
    }
  })
  return Array.from(groups.entries())
    .slice(0, MAX_CONNECTIONS)
    .map(([key, g]) => {
      const first = g.packets[0]
      const startTime = g.packets.reduce((min, p) => Math.min(min, p.timestamp), g.packets[0].timestamp)
      let maxW = -1
      let maxSev: SeverityLevel = "info"
      if (severityById) {
        for (const p of g.packets) {
          const sev = severityById[p.id] || "unknown"
          const w = severityToWeight(sev)
          if (w > maxW) { maxW = w; maxSev = sev }
        }
      }
      return {
        id: key,
        sourceIp: first.sourceIp,
        destIp: first.destIp,
        sourcePort: first.sourcePort,
        destPort: first.destPort,
        protocol: first.protocol,
        state: "ESTABLISHED" as const,
        bytesReceived: g.packets.reduce((s, p) => s + p.size, 0),
        bytesSent: 0,
        startTime,
        lastActivity: g.lastSeen,
        severity: maxSev,
      }
    })
}

export function buildV0Heatmap(packets: PacketHeader[]): number[][] {
  const HOURS = 24
  const MINUTES_PER_BLOCK = 15
  const BLOCKS_PER_HOUR = 60 / MINUTES_PER_BLOCK
  const data: number[][] = Array.from({ length: HOURS }, () => Array(BLOCKS_PER_HOUR).fill(0))
  const now = Date.now()
  packets.forEach((p) => {
    const age = now - p.timestamp
    const hoursAgo = Math.floor(age / (1000 * 60 * 60))
    const minutesIntoHour = Math.floor((age % (1000 * 60 * 60)) / (1000 * 60))
    const block = Math.floor(minutesIntoHour / MINUTES_PER_BLOCK)
    if (hoursAgo >= 0 && hoursAgo < HOURS && block >= 0 && block < BLOCKS_PER_HOUR) {
      data[HOURS - 1 - hoursAgo][block]++
    }
  })
  return data
}

export function buildV0BandwidthSeries(packets: PacketHeader[]): { time: string; bytes: number }[] {
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
}
