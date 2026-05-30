import type { EventItem } from "./types";

// ─── Types ───────────────────────────────────────────────────────────

export interface SyntheticGeoRecord {
  ip: string;
  is_external: boolean;
  is_private: boolean;
  is_documentation_ip: boolean;
  country_code: string;
  country_name: string;
  latitude: number;
  longitude: number;
  provider: "synthetic";
  confidence: "SYNTHETIC";
  source: string;
  org?: string;
}

export interface ThreatGeoPoint {
  ip: string;
  country_code: string;
  country_name: string;
  latitude: number;
  longitude: number;
  severity_max: string;
  event_count: number;
  protocols: string[];
  first_seen: string;
  last_seen: string;
  targets: string[];
  recommended_action: string;
  confidence: "SYNTHETIC";
}

// ─── CIDR / IP helpers ───────────────────────────────────────────────

/** Check if an IPv4 string belongs to RFC 1918 or loopback ranges */
export function isPrivateIP(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  const o1 = parseInt(parts[0], 10);
  const o2 = parseInt(parts[1], 10);
  if (isNaN(o1) || isNaN(o2)) return false;
  if (o1 === 10) return true; // 10.0.0.0/8
  if (o1 === 172 && o2 >= 16 && o2 <= 31) return true; // 172.16.0.0/12
  if (o1 === 192 && o2 === 168) return true; // 192.168.0.0/16
  if (o1 === 127) return true; // 127.0.0.0/8
  return false;
}

/** Check if an IPv4 string belongs to TEST-NET / documentation ranges */
export function isDocumentationIP(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  const o1 = parseInt(parts[0], 10);
  const o2 = parseInt(parts[1], 10);
  const o3 = parseInt(parts[2], 10);
  if (isNaN(o1) || isNaN(o2) || isNaN(o3)) return false;
  if (o1 === 198 && o2 === 51 && o3 === 100) return true; // 198.51.100.0/24
  if (o1 === 203 && o2 === 0 && o3 === 113) return true; // 203.0.113.0/24
  if (o1 === 192 && o2 === 0 && o3 === 2) return true; // 192.0.2.0/24
  return false;
}

/** IP is external if it's neither private nor documentation */
export function isExternalIP(ip: string): boolean {
  return !isPrivateIP(ip) && !isDocumentationIP(ip);
}

// ─── Documentation IP → Synthetic country table ──────────────────────

interface DocIPEntry {
  prefix: string; // "A.B.C" (first 3 octets)
  country_code: string;
  country_name: string;
  latitude: number;
  longitude: number;
  org?: string;
}

const DOC_IP_TABLE: DocIPEntry[] = [
  { prefix: "198.51.100", country_code: "US", country_name: "United States", latitude: 38, longitude: -97, org: "TEST-NET-1" },
  { prefix: "203.0.113", country_code: "CN", country_name: "China", latitude: 35, longitude: 105, org: "TEST-NET-2" },
  { prefix: "192.0.2", country_code: "NL", country_name: "Netherlands", latitude: 52, longitude: 5, org: "TEST-NET-3" },
  { prefix: "103.235.46", country_code: "IN", country_name: "India", latitude: 20, longitude: 78, org: "Synthetic IN" },
  { prefix: "185.156.173", country_code: "BR", country_name: "Brazil", latitude: -10, longitude: -55, org: "Synthetic BR" },
  { prefix: "91.121.87", country_code: "FR", country_name: "France", latitude: 46, longitude: 2, org: "Synthetic FR" },
  { prefix: "45.33.32", country_code: "US", country_name: "United States", latitude: 38, longitude: -97, org: "Synthetic US" },
];

// ─── Fallback: deterministic hash for non-documentation public IPs ───

interface CountryEntry {
  code: string;
  name: string;
  lat: number;
  lon: number;
}

const FALLBACK_COUNTRIES: CountryEntry[] = [
  { code: "US", name: "United States", lat: 38, lon: -97 },
  { code: "CN", name: "China", lat: 35, lon: 105 },
  { code: "RU", name: "Russia", lat: 60, lon: 100 },
  { code: "DE", name: "Germany", lat: 51, lon: 9 },
  { code: "GB", name: "United Kingdom", lat: 54, lon: -2 },
  { code: "JP", name: "Japan", lat: 36, lon: 138 },
  { code: "KR", name: "South Korea", lat: 37, lon: 127 },
  { code: "SG", name: "Singapore", lat: 1, lon: 104 },
  { code: "IR", name: "Iran", lat: 32, lon: 53 },
  { code: "NG", name: "Nigeria", lat: 9, lon: 8 },
  { code: "BR", name: "Brazil", lat: -10, lon: -55 },
  { code: "AU", name: "Australia", lat: -25, lon: 133 },
  { code: "NL", name: "Netherlands", lat: 52, lon: 5 },
  { code: "FR", name: "France", lat: 46, lon: 2 },
  { code: "IN", name: "India", lat: 20, lon: 78 },
  { code: "CA", name: "Canada", lat: 60, lon: -95 },
];

function hashCountryFromIP(ip: string): CountryEntry {
  const parts = ip.split(".");
  const o1 = parseInt(parts[0], 10);
  if (isNaN(o1) || o1 < 1 || o1 > 255) {
    return FALLBACK_COUNTRIES[0];
  }
  const idx = (o1 - 1) % FALLBACK_COUNTRIES.length;
  return FALLBACK_COUNTRIES[idx];
}

// ─── Public API ──────────────────────────────────────────────────────

/** Look up a synthetic GeoIP record for the given IP.
 *  Documentation IPs get fixed country/coordinates from the DOC_IP_TABLE.
 *  Public non-documentation IPs get a deterministic hash based on the
 *  first octet, mapped to a country from FALLBACK_COUNTRIES.
 *  Private IPs return null (no GeoIP for internal addresses).
 */
export function lookupSyntheticGeo(ip: string): SyntheticGeoRecord | null {
  if (isPrivateIP(ip)) return null;

  // Check documentation IPs first
  const prefix = ip.split(".").slice(0, 3).join(".");
  const docEntry = DOC_IP_TABLE.find((e) => e.prefix === prefix);
  if (docEntry) {
    return {
      ip,
      is_external: false,
      is_private: false,
      is_documentation_ip: true,
      country_code: docEntry.country_code,
      country_name: docEntry.country_name,
      latitude: docEntry.latitude,
      longitude: docEntry.longitude,
      provider: "synthetic",
      confidence: "SYNTHETIC",
      source: "documentation_ip_table",
      org: docEntry.org,
    };
  }

  // Public non-documentation IPs — deterministic hash
  const fallback = hashCountryFromIP(ip);
  return {
    ip,
    is_external: true,
    is_private: false,
    is_documentation_ip: false,
    country_code: fallback.code,
    country_name: fallback.name,
    latitude: fallback.lat,
    longitude: fallback.lon,
    provider: "synthetic",
    confidence: "SYNTHETIC",
    source: "deterministic_hash",
  };
}

const SEV_ORDER: Record<string, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

function sevHigher(a: string, b: string): boolean {
  return (SEV_ORDER[a] ?? 0) > (SEV_ORDER[b] ?? 0);
}

/**
 * Convert a single event into a ThreatGeoPoint (no aggregation).
 * Returns null for private/source-unknown IPs or if no GeoIP match.
 */
export function eventToThreatPoint(event: EventItem): ThreatGeoPoint | null {
  const ip = event.source.ip;
  const geo = lookupSyntheticGeo(ip);
  if (!geo) return null;

  return {
    ip,
    country_code: geo.country_code,
    country_name: geo.country_name,
    latitude: geo.latitude,
    longitude: geo.longitude,
    severity_max: event.severity,
    event_count: 1,
    protocols: event.protocol ? [event.protocol] : [],
    first_seen: event.timestamp,
    last_seen: event.timestamp,
    targets: [event.destination.ip],
    recommended_action: "review",
    confidence: "SYNTHETIC",
  };
}

/**
 * Aggregate events into deduplicated ThreatGeoPoints by source IP.
 * External non-private IPs only.
 */
export function buildThreatPoints(events: EventItem[]): ThreatGeoPoint[] {
  // Filter: only external/non-private source IPs
  const external = events.filter((e) => isExternalIP(e.source.ip));

  const byIP = new Map<string, {
    country_code: string;
    country_name: string;
    latitude: number;
    longitude: number;
    severity_max: string;
    event_count: number;
    protocols: Set<string>;
    first_seen: string;
    last_seen: string;
    targets: Set<string>;
  }>();

  for (const ev of external) {
    const ip = ev.source.ip;
    const geo = lookupSyntheticGeo(ip);
    const existing = byIP.get(ip);

    if (!existing) {
      byIP.set(ip, {
        country_code: geo?.country_code ?? "??",
        country_name: geo?.country_name ?? "Unknown",
        latitude: geo?.latitude ?? 0,
        longitude: geo?.longitude ?? 0,
        severity_max: ev.severity,
        event_count: 1,
        protocols: new Set(ev.protocol ? [ev.protocol] : []),
        first_seen: ev.timestamp,
        last_seen: ev.timestamp,
        targets: new Set([ev.destination.ip]),
      });
    } else {
      if (sevHigher(ev.severity, existing.severity_max)) {
        existing.severity_max = ev.severity;
      }
      existing.event_count += 1;
      if (ev.protocol) existing.protocols.add(ev.protocol);
      if (ev.timestamp < existing.first_seen) existing.first_seen = ev.timestamp;
      if (ev.timestamp > existing.last_seen) existing.last_seen = ev.timestamp;
      existing.targets.add(ev.destination.ip);
    }
  }

  return Array.from(byIP.entries()).map(([ip, agg]) => ({
    ip,
    country_code: agg.country_code,
    country_name: agg.country_name,
    latitude: agg.latitude,
    longitude: agg.longitude,
    severity_max: agg.severity_max,
    event_count: agg.event_count,
    protocols: [...agg.protocols],
    first_seen: agg.first_seen,
    last_seen: agg.last_seen,
    targets: [...agg.targets],
    recommended_action: "review",
    confidence: "SYNTHETIC",
  }));
}
