"use client"

import { useState, useEffect, useCallback, useReducer, useMemo, useRef } from "react"

// ============================================================
// Types
// ============================================================

export type Protocol = "TCP" | "UDP" | "HTTP" | "HTTPS" | "DNS" | "ICMP" | "SSH" | "FTP"

export type ConnectionState =
  | "ESTABLISHED" | "SYN_SENT" | "SYN_RECV" | "FIN_WAIT"
  | "TIME_WAIT" | "CLOSE" | "CLOSE_WAIT" | "LAST_ACK" | "LISTEN" | "CLOSING"

export interface Geolocation {
  lat: number
  lng: number
  country: string
}

export interface PacketHeader {
  id: string
  timestamp: number
  sourceIp: string
  destIp: string
  sourcePort: number
  destPort: number
  protocol: Protocol
  size: number
  flags: string[]
  ttl: number
  isSuspicious: boolean
  geolocation: Geolocation
  country: string
  city: string
}

export interface Connection {
  id: string
  sourceIp: string
  destIp: string
  sourcePort: number
  destPort: number
  protocol: Protocol
  state: ConnectionState
  bytesReceived: number
  bytesSent: number
  startTime: number
  lastActivity: number
}

export interface TrafficStats {
  totalPackets: number
  totalBytes: number
  packetsPerSecond: number
  bytesPerSecond: number
  protocolDistribution: Record<Protocol, number>
  suspiciousCount: number
  activeConnections: number
}

// ============================================================
// Threat Detection Types
// ============================================================

export interface ThreatAlert {
  id: string
  ruleId: string
  severity: "low" | "medium" | "high" | "critical"
  title: string
  description: string
  timestamp: number
  relatedPackets: string[]
}

export interface ThreatRule {
  id: string
  name: string
  description: string
  enabled: boolean
  check: (packets: PacketHeader[], timeWindow: number) => ThreatAlert | null
}

// ============================================================
// Formatters
// ============================================================

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

export function formatPacketsPerSecond(pps: number): string {
  return `${pps.toFixed(1)} pkt/s`
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  })
}

export function getProtocolColor(protocol: string): string {
  const colors: Record<string, string> = {
    TCP: "color: #3b82f6",
    UDP: "color: #a855f7",
    HTTP: "color: #22c55e",
    HTTPS: "color: #10b981",
    DNS: "color: #f97316",
    ICMP: "color: #06b6d4",
    SSH: "color: #ec4899",
    FTP: "color: #eab308",
  }
  return colors[protocol] || "color: #9ca3af"
}

export function getProtocolBgColor(protocol: string): string {
  const colors: Record<string, string> = {
    TCP: "background: rgba(59,130,246,0.2); border-color: rgba(59,130,246,0.3)",
    UDP: "background: rgba(168,85,247,0.2); border-color: rgba(168,85,247,0.3)",
    HTTP: "background: rgba(34,197,94,0.2); border-color: rgba(34,197,94,0.3)",
    HTTPS: "background: rgba(16,185,129,0.2); border-color: rgba(16,185,129,0.3)",
    DNS: "background: rgba(249,115,22,0.2); border-color: rgba(249,115,22,0.3)",
    ICMP: "background: rgba(6,182,212,0.2); border-color: rgba(6,182,212,0.3)",
    SSH: "background: rgba(236,72,153,0.2); border-color: rgba(236,72,153,0.3)",
    FTP: "background: rgba(234,179,8,0.2); border-color: rgba(234,179,8,0.3)",
  }
  return colors[protocol] || "background: rgba(156,163,175,0.2); border-color: rgba(156,163,175,0.3)"
}

// ============================================================
// Packet Generator
// ============================================================

const PROTOCOLS: Protocol[] = ["TCP", "UDP", "HTTP", "HTTPS", "DNS", "ICMP", "SSH", "FTP"]

const COMMON_PORTS: Record<Protocol, number[]> = {
  HTTP: [80, 8080, 3000, 5000],
  HTTPS: [443, 8443],
  DNS: [53],
  SSH: [22],
  FTP: [20, 21],
  TCP: [80, 443, 22, 3389, 5432, 3306],
  UDP: [53, 67, 68, 123, 161],
  ICMP: [0],
}

const TCP_FLAGS = ["SYN", "ACK", "FIN", "RST", "PSH", "URG"]

const SAMPLE_IPS = [
  "192.168.1.1", "192.168.1.100", "10.0.0.1", "10.0.0.50",
  "172.16.0.1", "8.8.8.8", "1.1.1.1", "142.250.185.46",
  "151.101.1.140", "104.16.132.229", "13.107.42.14",
]

const CITIES = ["New York", "London", "Berlin", "Tokyo", "Toronto", "Paris", "Singapore", "Sydney"]

const CITY_COORDS: Record<string, { lat: number; lng: number; country: string }> = {
  "New York": { lat: 40.7128, lng: -74.006, country: "United States" },
  London: { lat: 51.5074, lng: -0.1278, country: "United Kingdom" },
  Berlin: { lat: 52.52, lng: 13.405, country: "Germany" },
  Tokyo: { lat: 35.6762, lng: 139.6503, country: "Japan" },
  Toronto: { lat: 43.6532, lng: -79.3832, country: "Canada" },
  Paris: { lat: 48.8566, lng: 2.3522, country: "France" },
  Singapore: { lat: 1.3521, lng: 103.8198, country: "Singapore" },
  Sydney: { lat: -33.8688, lng: 151.2093, country: "Australia" },
}

function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function randomPort(protocol: Protocol): number {
  const ports = COMMON_PORTS[protocol] || []
  if (ports.length > 0 && Math.random() > 0.3) return randomItem(ports)
  return Math.floor(Math.random() * 65535) + 1
}

function generateRandomIP(): string {
  return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`
}

export function generatePacket(): PacketHeader {
  const protocol = randomItem(PROTOCOLS)
  const isSuspicious = Math.random() < 0.05
  const sourceIp = Math.random() > 0.3 ? randomItem(SAMPLE_IPS) : generateRandomIP()
  const destIp = Math.random() > 0.3 ? randomItem(SAMPLE_IPS) : generateRandomIP()

  const flags: string[] = []
  if (["TCP", "HTTP", "HTTPS", "SSH", "FTP"].includes(protocol)) {
    const numFlags = Math.floor(Math.random() * 3) + 1
    for (let i = 0; i < numFlags; i++) {
      const flag = randomItem(TCP_FLAGS)
      if (!flags.includes(flag)) flags.push(flag)
    }
  }

  const city = randomItem(CITIES)
  const geolocation = CITY_COORDS[city]

  return {
    id: Math.random().toString(36).substring(2, 11),
    timestamp: Date.now(),
    sourceIp, destIp,
    sourcePort: randomPort(protocol),
    destPort: randomPort(protocol),
    protocol,
    size: Math.floor(Math.random() * 1500) + 64,
    flags: flags.sort(),
    ttl: Math.floor(Math.random() * 64) + 64,
    isSuspicious,
    geolocation,
    country: geolocation.country,
    city,
  }
}

const CONNECTION_STATES: ConnectionState[] = ["ESTABLISHED", "SYN_SENT", "SYN_RECV", "FIN_WAIT", "TIME_WAIT", "LISTEN"]

export function generateConnection(): Connection {
  const protocol = randomItem(["TCP", "UDP", "HTTP", "HTTPS"] as Protocol[])
  const startTime = Date.now() - Math.floor(Math.random() * 60000)
  return {
    id: Math.random().toString(36).substring(2, 11),
    sourceIp: randomItem(SAMPLE_IPS),
    destIp: randomItem(SAMPLE_IPS),
    sourcePort: randomPort(protocol),
    destPort: randomPort(protocol),
    protocol,
    state: randomItem(CONNECTION_STATES),
    bytesReceived: Math.floor(Math.random() * 100000),
    bytesSent: Math.floor(Math.random() * 50000),
    startTime,
    lastActivity: Date.now(),
  }
}

// ============================================================
// Threat Detection Rules
// ============================================================

export const DEFAULT_THREAT_RULES: ThreatRule[] = [
  {
    id: "port-scan",
    name: "Detección de Escaneo de Puertos",
    description: "Detecta intentos de escanear múltiples puertos desde una sola fuente",
    enabled: true,
    check: (packets, timeWindow) => {
      const now = Date.now()
      const recent = packets.filter((p) => now - p.timestamp < timeWindow)
      const sourcePortMap = new Map<string, Set<number>>()
      recent.forEach((p) => {
        if (!sourcePortMap.has(p.sourceIp)) sourcePortMap.set(p.sourceIp, new Set())
        sourcePortMap.get(p.sourceIp)!.add(p.destPort)
      })
      for (const [sourceIp, ports] of sourcePortMap.entries()) {
        if (ports.size > 10) {
          return {
            id: crypto.randomUUID(),
            ruleId: "port-scan",
            severity: "high",
            title: "Escaneo de Puertos Detectado",
            description: `${sourceIp} intentó conectarse a ${ports.size} puertos diferentes`,
            timestamp: now,
            relatedPackets: recent.filter((p) => p.sourceIp === sourceIp).map((p) => p.id),
          }
        }
      }
      return null
    },
  },
  {
    id: "ddos",
    name: "Detección de DDoS",
    description: "Detecta tasas de paquetes anormalmente altas desde una sola fuente",
    enabled: true,
    check: (packets, timeWindow) => {
      const now = Date.now()
      const recent = packets.filter((p) => now - p.timestamp < timeWindow)
      const sourceCount = new Map<string, number>()
      recent.forEach((p) => sourceCount.set(p.sourceIp, (sourceCount.get(p.sourceIp) || 0) + 1))
      for (const [sourceIp, count] of sourceCount.entries()) {
        if (count > 100) {
          return {
            id: crypto.randomUUID(),
            ruleId: "ddos",
            severity: "critical",
            title: "Posible Ataque DDoS",
            description: `${sourceIp} envió ${count} paquetes en ${timeWindow / 1000}s`,
            timestamp: now,
            relatedPackets: recent.filter((p) => p.sourceIp === sourceIp).map((p) => p.id),
          }
        }
      }
      return null
    },
  },
  {
    id: "suspicious-protocol",
    name: "Actividad de Protocolo Sospechosa",
    description: "Detecta combinaciones inusuales de protocolos",
    enabled: true,
    check: (packets, timeWindow) => {
      const now = Date.now()
      const recent = packets.filter((p) => now - p.timestamp < timeWindow && p.isSuspicious)
      if (recent.length > 5) {
        return {
          id: crypto.randomUUID(),
          ruleId: "suspicious-protocol",
          severity: "medium",
          title: "Actividad Sospechosa de Protocolo",
          description: `${recent.length} paquetes sospechosos detectados en ${timeWindow / 1000}s`,
          timestamp: now,
          relatedPackets: recent.map((p) => p.id),
        }
      }
      return null
    },
  },
  {
    id: "repeated-connections",
    name: "Intentos de Conexión Repetidos",
    description: "Detecta intentos repetidos de conexión al mismo destino",
    enabled: true,
    check: (packets, timeWindow) => {
      const now = Date.now()
      const recent = packets.filter((p) => now - p.timestamp < timeWindow)
      const attempts = new Map<string, number>()
      recent.forEach((p) => {
        const key = `${p.sourceIp}->${p.destIp}:${p.destPort}`
        attempts.set(key, (attempts.get(key) || 0) + 1)
      })
      for (const [conn, count] of attempts.entries()) {
        if (count > 50) {
          return {
            id: crypto.randomUUID(),
            ruleId: "repeated-connections",
            severity: "medium",
            title: "Intentos de Conexión Repetidos",
            description: `${count} intentos de conexión: ${conn}`,
            timestamp: now,
            relatedPackets: [],
          }
        }
      }
      return null
    },
  },
]

// ============================================================
// Hooks / State Management
// ============================================================

const MAX_PACKETS = 500
const STORAGE_KEY = "v0-network-filters"

// --- usePacketStream ---

interface PacketState {
  packets: PacketHeader[]
  filteredPackets: PacketHeader[]
  activeFilters: Set<Protocol>
  searchQuery: string
  isPaused: boolean
}

type PacketAction =
  | { type: "ADD_PACKET"; packet: PacketHeader }
  | { type: "TOGGLE_FILTER"; protocol: Protocol }
  | { type: "CLEAR_FILTERS" }
  | { type: "SET_SEARCH"; query: string }
  | { type: "TOGGLE_PAUSE" }
  | { type: "CLEAR_PACKETS" }
  | { type: "LOAD_FILTERS"; filters: Set<Protocol> }

function filterPackets(packets: PacketHeader[], filters: Set<Protocol>, query: string): PacketHeader[] {
  let filtered = packets
  if (filters.size > 0) filtered = filtered.filter((p) => filters.has(p.protocol))
  if (query) {
    const q = query.toLowerCase()
    filtered = filtered.filter(
      (p) =>
        p.sourceIp.toLowerCase().includes(q) ||
        p.destIp.toLowerCase().includes(q) ||
        p.sourcePort.toString().includes(q) ||
        p.destPort.toString().includes(q) ||
        p.protocol.toLowerCase().includes(q),
    )
  }
  return filtered
}

function packetReducer(state: PacketState, action: PacketAction): PacketState {
  switch (action.type) {
    case "ADD_PACKET": {
      const newPackets = [action.packet, ...state.packets].slice(0, MAX_PACKETS)
      return { ...state, packets: newPackets, filteredPackets: filterPackets(newPackets, state.activeFilters, state.searchQuery) }
    }
    case "TOGGLE_FILTER": {
      const newFilters = new Set(state.activeFilters)
      newFilters.has(action.protocol) ? newFilters.delete(action.protocol) : newFilters.add(action.protocol)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(newFilters)))
      return { ...state, activeFilters: newFilters, filteredPackets: filterPackets(state.packets, newFilters, state.searchQuery) }
    }
    case "CLEAR_FILTERS":
      localStorage.removeItem(STORAGE_KEY)
      return { ...state, activeFilters: new Set<Protocol>(), filteredPackets: filterPackets(state.packets, new Set<Protocol>(), state.searchQuery) }
    case "SET_SEARCH":
      return { ...state, searchQuery: action.query, filteredPackets: filterPackets(state.packets, state.activeFilters, action.query) }
    case "TOGGLE_PAUSE":
      return { ...state, isPaused: !state.isPaused }
    case "CLEAR_PACKETS":
      return { ...state, packets: [], filteredPackets: [] }
    case "LOAD_FILTERS":
      return { ...state, activeFilters: action.filters, filteredPackets: filterPackets(state.packets, action.filters, state.searchQuery) }
    default:
      return state
  }
}

export function usePacketStream(intervalMs = 300) {
  const [state, dispatch] = useReducer(packetReducer, {
    packets: [], filteredPackets: [], activeFilters: new Set<Protocol>(), searchQuery: "", isPaused: false,
  })

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) dispatch({ type: "LOAD_FILTERS", filters: new Set<Protocol>(JSON.parse(saved)) })
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (state.isPaused) return
    const interval = setInterval(() => dispatch({ type: "ADD_PACKET", packet: generatePacket() }), intervalMs)
    return () => clearInterval(interval)
  }, [intervalMs, state.isPaused])

  return {
    packets: state.filteredPackets,
    allPackets: state.packets,
    activeFilters: state.activeFilters,
    searchQuery: state.searchQuery,
    isPaused: state.isPaused,
    toggleFilter: useCallback((protocol: Protocol) => dispatch({ type: "TOGGLE_FILTER", protocol }), []),
    clearFilters: useCallback(() => dispatch({ type: "CLEAR_FILTERS" }), []),
    setSearchQuery: useCallback((query: string) => dispatch({ type: "SET_SEARCH", query }), []),
    togglePause: useCallback(() => dispatch({ type: "TOGGLE_PAUSE" }), []),
    clearPackets: useCallback(() => dispatch({ type: "CLEAR_PACKETS" }), []),
  }
}

// --- useTrafficStats ---

export function useTrafficStats(packets: PacketHeader[], windowSeconds = 5): TrafficStats {
  return useMemo(() => {
    const now = Date.now()
    const recent = packets.filter((p) => now - p.timestamp < windowSeconds * 1000)
    const totalBytes = packets.reduce((sum, p) => sum + p.size, 0)
    const protocolDistribution = {} as Record<Protocol, number>
    packets.forEach((p) => { protocolDistribution[p.protocol] = (protocolDistribution[p.protocol] || 0) + 1 })
    return {
      totalPackets: packets.length,
      totalBytes,
      packetsPerSecond: recent.length / windowSeconds,
      bytesPerSecond: recent.reduce((sum, p) => sum + p.size, 0) / windowSeconds,
      protocolDistribution,
      suspiciousCount: packets.filter((p) => p.isSuspicious).length,
      activeConnections: new Set(packets.map((p) => `${p.sourceIp}:${p.sourcePort}-${p.destIp}:${p.destPort}`)).size,
    }
  }, [packets, windowSeconds])
}

// --- usePacketReplay ---

export function usePacketReplay(allPackets: PacketHeader[]) {
  const [isReplayMode, setIsReplayMode] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [replayPackets, setReplayPackets] = useState<PacketHeader[]>([])
  const allPacketsRef = useRef(allPackets)
  useEffect(() => { allPacketsRef.current = allPackets }, [allPackets])

  useEffect(() => {
    if (!isReplayMode) return
    if (currentIndex < allPacketsRef.current.length) setReplayPackets(allPacketsRef.current.slice(0, currentIndex + 1))
    if (!isPlaying || currentIndex >= allPacketsRef.current.length) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1
        if (next >= allPacketsRef.current.length) { setIsPlaying(false); return prev }
        return next
      })
    }, 500 / playbackSpeed)
    return () => clearInterval(interval)
  }, [isReplayMode, isPlaying, currentIndex, playbackSpeed])

  return {
    isReplayMode, isPlaying, currentIndex, playbackSpeed, replayPackets,
    enterReplayMode: useCallback(() => { setIsReplayMode(true); setCurrentIndex(0); setIsPlaying(false); setReplayPackets([]) }, []),
    exitReplayMode: useCallback(() => { setIsReplayMode(false); setCurrentIndex(0); setIsPlaying(false); setReplayPackets([]) }, []),
    play: useCallback(() => setIsPlaying(true), []),
    pause: useCallback(() => setIsPlaying(false), []),
    reset: useCallback(() => { setCurrentIndex(0); setIsPlaying(false); setReplayPackets([]) }, []),
    stepBackward: useCallback(() => { setCurrentIndex((p) => Math.max(0, p - 1)); setIsPlaying(false) }, []),
    stepForward: useCallback(() => { setCurrentIndex((p) => Math.min(allPacketsRef.current.length - 1, p + 1)); setIsPlaying(false) }, []),
    seek: useCallback((i: number) => { setCurrentIndex(Math.max(0, Math.min(allPacketsRef.current.length - 1, i))); setIsPlaying(false) }, []),
    setPlaybackSpeed,
  }
}

// --- useThreatDetection ---

const DETECTION_INTERVAL = 5000
const TIME_WINDOW = 10000

export function useThreatDetection(packets: PacketHeader[]) {
  const [alerts, setAlerts] = useState<ThreatAlert[]>([])
  const [rules] = useState<ThreatRule[]>(DEFAULT_THREAT_RULES)
  const lastCheckRef = useRef(0)

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      if (now - lastCheckRef.current < DETECTION_INTERVAL) return
      const newAlerts: ThreatAlert[] = []
      rules.forEach((rule) => {
        if (!rule.enabled) return
        const alert = rule.check(packets, TIME_WINDOW)
        if (alert) {
          setAlerts((current) => {
            const isDup = current.some((e) => e.ruleId === alert.ruleId && now - e.timestamp < 30000)
            if (!isDup) newAlerts.push(alert)
            return current
          })
        }
      })
      if (newAlerts.length > 0) setAlerts((prev) => [...newAlerts, ...prev].slice(0, 20))
      lastCheckRef.current = now
    }, 1000)
    return () => clearInterval(interval)
  }, [packets, rules])

  return {
    alerts,
    dismissAlert: useCallback((id: string) => setAlerts((prev) => prev.filter((a) => a.id !== id)), []),
    clearAllAlerts: useCallback(() => setAlerts([]), []),
  }
}
