import { isPrivateIp, safeNumber } from "./real-data-adapter"

export interface SyntheticGeoRecord {
  ip: string
  countryCode: string
  countryName: string
  city: string
  latitude: number
  longitude: number
  asn: string
  organization: string
  confidence: number
  synthetic: true
}

interface CountryDef {
  code: string
  name: string
  lat: number
  lng: number
}

const SYNTHETIC_COUNTRIES: CountryDef[] = [
  { code: "US", name: "United States", lat: 39.8283, lng: -98.5795 },
  { code: "CN", name: "China", lat: 35.8617, lng: 104.1954 },
  { code: "NL", name: "Netherlands", lat: 52.1326, lng: 5.2913 },
  { code: "DE", name: "Germany", lat: 51.1657, lng: 10.4515 },
  { code: "BR", name: "Brazil", lat: -14.235, lng: -51.9253 },
  { code: "IN", name: "India", lat: 20.5937, lng: 78.9629 },
  { code: "RU", name: "Russia", lat: 61.524, lng: 105.3188 },
  { code: "FR", name: "France", lat: 46.6034, lng: 1.8883 },
  { code: "GB", name: "United Kingdom", lat: 55.3781, lng: -3.436 },
  { code: "JP", name: "Japan", lat: 36.2048, lng: 138.2529 },
]

const SYNTHETIC_CITIES: Record<string, string[]> = {
  US: ["Ashburn", "Dallas", "Los Angeles", "New York", "Chicago", "Miami", "Seattle", "Phoenix", "Denver", "Atlanta"],
  CN: ["Beijing", "Shanghai", "Shenzhen", "Guangzhou", "Hangzhou", "Nanjing", "Chengdu", "Wuhan", "Xi'an", "Tianjin"],
  NL: ["Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven", "Groningen", "Maastricht", "Haarlem", "Leiden", "Arnhem"],
  DE: ["Berlin", "Frankfurt", "Munich", "Hamburg", "Cologne", "Düsseldorf", "Stuttgart", "Leipzig", "Dresden", "Bremen"],
  BR: ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador", "Fortaleza", "Belo Horizonte", "Manaus", "Curitiba", "Recife", "Porto Alegre"],
  IN: ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow"],
  RU: ["Moscow", "Saint Petersburg", "Novosibirsk", "Yekaterinburg", "Kazan", "Nizhny Novgorod", "Chelyabinsk", "Samara", "Omsk", "Rostov"],
  FR: ["Paris", "Lyon", "Marseille", "Toulouse", "Bordeaux", "Lille", "Nice", "Nantes", "Strasbourg", "Montpellier"],
  GB: ["London", "Manchester", "Birmingham", "Edinburgh", "Glasgow", "Liverpool", "Bristol", "Leeds", "Sheffield", "Newcastle"],
  JP: ["Tokyo", "Osaka", "Yokohama", "Nagoya", "Sapporo", "Fukuoka", "Kobe", "Kyoto", "Kawasaki", "Saitama"],
}

const ASNS = ["AS15169", "AS16509", "AS8075", "AS13335", "AS32934", "AS36351", "AS16625", "AS20940", "AS45102", "AS396982"]
const ORGS = ["Google LLC", "Amazon.com, Inc.", "Microsoft Corp", "Cloudflare, Inc.", "Meta Platforms, Inc.", "Akamai Technologies", "Fastly, Inc.", "Alibaba Group", "Tencent Holdings", "Oracle Corporation"]

function hashIpToIndex(ip: string, max: number): number {
  const parts = ip.split(".").map(Number)
  let hash = 0
  for (const p of parts) {
    if (isFinite(p)) hash = ((hash << 5) - hash) + p
  }
  return Math.abs(hash) % max
}

export function isExternalIp(ip: string): boolean {
  if (!ip || ip === "0.0.0.0" || ip === "::" || ip === "::1") return false
  return !isPrivateIp(ip) && !ip.startsWith("0.") && !ip.startsWith("127.")
}

export function lookupSyntheticGeoIp(ip: string): SyntheticGeoRecord | null {
  if (!isExternalIp(ip)) return null

  const ci = hashIpToIndex(ip, SYNTHETIC_COUNTRIES.length)
  const country = SYNTHETIC_COUNTRIES[ci]
  const cities = SYNTHETIC_CITIES[country.code]
  const cityIdx = hashIpToIndex(ip + ":city", cities.length)
  const city = cities[cityIdx]

  const latOffset = (hashIpToIndex(ip + ":lat", 100) - 50) * 0.5
  const lngOffset = (hashIpToIndex(ip + ":lng", 100) - 50) * 0.5
  const latitude = clampLat(country.lat + latOffset)
  const longitude = clampLng(country.lng + lngOffset)

  const asnIdx = hashIpToIndex(ip + ":asn", ASNS.length)
  const orgIdx = hashIpToIndex(ip + ":org", ORGS.length)

  return {
    ip,
    countryCode: country.code,
    countryName: country.name,
    city,
    latitude,
    longitude,
    asn: ASNS[asnIdx],
    organization: ORGS[orgIdx],
    confidence: Math.min(60, 30 + hashIpToIndex(ip + ":conf", 31)),
    synthetic: true,
  }
}

function clampLat(v: number): number {
  return Math.max(-85, Math.min(85, v))
}

function clampLng(v: number): number {
  return Math.max(-180, Math.min(180, v))
}
