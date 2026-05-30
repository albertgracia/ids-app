import type { EventItem } from "./types";

export const ZONES = ["external", "dmz", "it", "ot"] as const;
export type Zone = (typeof ZONES)[number];

export const SEV_COLORS: Record<string, string> = {
  critical: "#f85149",
  high: "#d29922",
  medium: "#db6d28",
  low: "#58a6ff",
  info: "#6e7b8c",
};

export const ZONE_COLORS: Record<string, string> = {
  external: "#f85149",
  dmz: "#d29922",
  it: "#58a6ff",
  ot: "#db6d28",
  unknown: "#6e7b8c",
};

export const SEV_LABELS: Record<string, string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Medio",
  low: "Bajo",
  info: "Info",
};

export const ZONE_LABELS: Record<string, string> = {
  external: "🌐 Externo",
  dmz: "🛡 DMZ",
  it: "💻 IT",
  ot: "⚙ OT",
  unknown: "❓",
};

/** Label translations for the SOC dashboard */
export const L = {
  title: "Consola IDS OT/IT",
  env: "SOC Staging",
  updated: "Actualizado",
  storage: "Almacenamiento",
  services: "Servicios",
  totalEvents: "Total eventos",
  critical: "Críticos",
  high: "Altos",
  medium: "Medios",
  otEvents: "Eventos OT",
  itEvents: "Eventos IT",
  highCritical: "Altos/Críticos",
  attackMap: "Mapa táctico de ataques",
  topology: "Topología OT/IT",
  timeline: "Línea temporal",
  threatRadar: "Radar de amenazas",
  assets: "Activos",
  ioCs: "Indicadores de amenaza",
  recentEvents: "Eventos recientes",
  investigation: "Investigación del evento",
  selectEvent: "Selecciona un evento para iniciar investigación",
  scoring: "Score seleccionado",
  time: "Hora",
  severity: "Severidad",
  type: "Tipo",
  protocol: "Protocolo",
  source: "Origen",
  destination: "Destino",
  zone: "Zona",
  title_col: "Título",
  id: "ID",
  direction: "Dirección",
  factors: "Factores",
  recommendations: "Recomendaciones",
  noEvents: "Sin eventos",
  noAssets: "Sin activos detectados",
  noIoCs: "Sin IoCs detectados",
  scan: "Escaneo",
  auth: "Autenticación",
  proto: "Protocolo",
  malware: "Malware",
  lateral: "Lateral",
  external: "Externo",
  ip: "IP",
  events: "Eventos",
  critHigh: "Crít/Altos",
  criticality: "Criticidad",
  protocols: "Protocolos",
  lastSeen: "Última vez",
  sourceIp: "IP origen",
  threatType: "Tipo amenaza",
  count: "Cantidad",
  targets: "Destinos",
  nodes: "nodos",
  edges: "enlaces",
  eventsBucket: "bloques",
  minBucket: "1 min",
};

/** Given an IP and all events, infer which zone it belongs to */
export function inferZone(ip: string, events: EventItem[]): string {
  const related = events.filter((e) => e.source.ip === ip || e.destination.ip === ip);
  if (related.length === 0) return "unknown";
  const counts: Record<string, number> = {};
  for (const e of related) {
    if (e.direction === "inbound" && e.source.ip === ip) {
      counts["external"] = (counts["external"] || 0) + 2;
    }
    if (e.zone) counts[e.zone] = (counts[e.zone] || 0) + 1;
  }
  let best = "unknown";
  let bestCount = 0;
  for (const [z, c] of Object.entries(counts)) {
    if (c > bestCount) { bestCount = c; best = z; }
  }
  return best;
}

export function classifyEventZone(e: EventItem): string {
  if (e.direction === "inbound" || e.direction === "external") return "external";
  if (e.direction === "lateral") return e.zone || "ot";
  return e.zone || "unknown";
}
