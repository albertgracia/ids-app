# IDS-V0-REAL-DATA-INTEGRATION-PLAN-01

## Plan de Integración de Datos Reales IDS

| Campo | Valor |
|---|---|
| **Resultado** | PASS |
| **Rama** | scaffold/ids-v2-dev-env-01 |
| **HEAD** | `57d6ac4` |
| **Working tree** | Sucio (cambios de la fase de refinamiento visual previa) |
| **Último commit v0-network** | `57d6ac4` feat(web): import v0 network analyzer design lab |
| **Modo** | READ ONLY — No se modificó código |

## 1. Estado Visual Aceptado

- `/design-lab/v0-network` → **ACEPTADO** como base visual (IDS-V0-DESIGN-LAB-VISUAL-REVIEW-02 = PASS)
- Dashboard principal `/` → **Intacto** (sin cambios)
- Todos los cambios existentes en working tree son de la fase de refinamiento visual previa

## 2. Inventario de Datos Mock

### 2.1 Tipos e Interfaces

| Tipo | Definición | Uso en paneles |
|---|---|---|
| `Protocol` | `"TCP" \| "UDP" \| "HTTP" \| "HTTPS" \| "DNS" \| "ICMP" \| "SSH" \| "FTP"` | Todos los paneles |
| `PacketHeader` | `{ id, timestamp, sourceIp, destIp, sourcePort, destPort, protocol, size, flags, ttl, isSuspicious, geolocation, country, city }` | Stream, Mapa, Estadísticas |
| `TrafficStats` | `{ totalPackets, totalBytes, packetsPerSecond, bytesPerSecond, protocolDistribution, suspiciousCount, activeConnections }` | KPIs, Estadísticas |
| `Connection` | `{ id, sourceIp, destIp, sourcePort, destPort, protocol, state, bytesReceived, bytesSent, startTime, lastActivity }` | Conexiones |
| `ThreatAlert` | `{ id, ruleId, severity, title, description, timestamp, relatedPackets }` | Alertas |
| `Geolocation` | `{ lat, lng, country }` | Mapa |
| `ConnectionState` | `"ESTABLISHED" \| "SYN_SENT" \| ...` | Conexiones |

### 2.2 Hooks Mock

| Hook | Genera | Consumido por |
|---|---|---|
| `usePacketStream(300ms)` | `PacketHeader[]` cada 300ms, filtros, búsqueda | Stream, KPIs, Estadísticas, Mapa |
| `useTrafficStats(window=5s)` | `TrafficStats` derivado de paquetes | KPIs, AdvancedStats |
| `usePacketReplay(allPackets)` | Estado de reproducción | Stream (repetición) |
| `useThreatDetection(packets)` | `ThreatAlert[]` vía 4 reglas heurísticas | ThreatAlerts |

### 2.3 Panel → Datos Mock

| Panel | Componente | Datos mock que consume |
|---|---|---|
| **KPIs superiores** | StatsOverview | `TrafficStats.totalPackets`, `.totalBytes`, `.packetsPerSecond`, `.suspiciousCount` |
| **Gauges** | BandwidthMeter | `stats.bytesPerSecond` (descarga), `stats.bytesPerSecond * 0.4` (subida) |
| **Filtros** | ProtocolFilters | `activeFilters: Set<Protocol>` |
| **Stream en Vivo** | PacketStream | `PacketHeader[]` — timestamp, IPs, puertos, protocolo, flags, tamaño, sospechoso, ciudad, país |
| **Puntuación Salud** | AdvancedStatsDashboard | Health score derivado de `suspiciousCount` y `uniqueSourceIps` |
| **Principales Orígenes** | AdvancedStatsDashboard | Top 5 IPs por conteo de paquetes |
| **Puertos Destino** | AdvancedStatsDashboard | Top 5 puertos por conteo |
| **Métricas Tráfico** | AdvancedStatsDashboard | sources únicos, destinos únicos, puertos únicos, avg packet size |
| **Distribución Protocolos** | AdvancedStatsDashboard | Conteo por protocolo (TCP/UDP/HTTP/DNS/ICMP/SSH/FTP) con % |
| **Heatmap 24h** | TrafficHeatmap | Matriz 24h × 4 bloques, conteo de paquetes por bloque |
| **Bandwidth Chart** | StatisticsChart | 30 ventanas de 1s sumando bytes |
| **Protocol Chart** | StatisticsChart | Barras por protocolo |
| **Conexiones** | ConnectionTracker | `Connection[]` generadas con `generateConnection()` cada 2s |
| **Mapa Mundial** | TrafficMap | Paquetes con `geolocation.lat/lng`, agrupados por coordenadas |
| **Tarjetas Mapa** | LocationCards | Top 4 países por conteo, bandera emoji |
| **Alertas Amenaza** | ThreatAlerts | `ThreatAlert[]` de 4 reglas de detección heurística |

## 3. Inventario de Endpoints Reales IDS

### 3.1 ids-core (Go, puerto 8088)

| Método | Ruta | Propósito | Datos que devuelve |
|---|---|---|---|
| `GET` | `/healthz` | Health check | `{ service, status }` |
| `GET` | `/readyz` | Readiness | `{ service, ready }` |
| `GET` | `/api/v1/status` | Estado servicio | `capabilities`, `storage_mode`, `version`, `live_stream` |
| `GET` | `/api/v1/events/recent?limit=N` | Eventos recientes | `{ items: EventItem[], count, limit }` (max 500) |
| `POST` | `/api/v1/simulate/events` | Simular eventos | `{ items: EventItem[], count }` |
| `POST` | `/api/v1/suricata/eve` | Ingesta EVE individual | `{ item, source: "suricata_eve" }` |
| `POST` | `/api/v1/suricata/eve/batch` | Ingesta EVE batch | `{ items[], source: "suricata_eve" }` (max 100) |
| `GET` | `/api/v1/events/stream` | SSE live stream | Server-Sent Events |
| `GET` | `/api/v1/assets/classifications` | Clasificaciones activos | `{ items: AssetClassification[], count }` (filtros: type, zone, limit) |
| `GET` | `/api/v1/assets/classification?ip=X` | Clasificación IP | `AssetClassification` individual |

### 3.2 analytics-api (Python/FastAPI, puerto 8090)

| Método | Ruta | Propósito | Datos que devuelve |
|---|---|---|---|
| `GET` | `/healthz` | Health check | `{ service, status }` |
| `GET` | `/api/v1/status` | Estado + capabilities | `capabilities: ["event_scoring", "risk_explanation", "recommendations"]` |
| `POST` | `/api/v1/score/event` | Score 1 evento | `{ event_id, score, risk_level, factors[], recommendations[] }` |
| `POST` | `/api/v1/score/events` | Score batch (max 100) | `{ items: ScoreResponse[], count }` |

### 3.3 mcp-server (Python, ~8091)

| Método | Ruta | Propósito |
|---|---|---|
| `GET` | `/healthz` | Health check |
| `GET` | `/api/v1/status` | Estado + capabilities |

**MCP Tools (solo stdio, referencia):** `ids_get_mcp_status`, `ids_list_capabilities`, `ids_get_core_status`, `ids_get_recent_events`, `ids_summarize_recent_events`, `ids_score_event_readonly`, `ids_read_suricata_plan`

### 3.4 Frontend Proxies (Next.js)

| Proxy | Destino |
|---|---|
| `/api/core/*` | `ids-core:8088/*` |
| `/api/analytics/*` | `ids-analytics:8090/*` |

### 3.5 Clientes API Frontend Existentes

| Archivo | Funciones | Endpoint real |
|---|---|---|
| `lib/ids-core.ts` | `getHealth()`, `getStatus()`, `getRecentEvents(limit)`, `simulateEvents()` | `/api/core/api/v1/...` |
| `lib/analytics-api.ts` | `getAnalyticsStatus()`, `scoreEvent()`, `scoreEvents()` | `/api/analytics/api/v1/...` |

## 4. Mapping Panel → Endpoint Real

### KPIs Superiores

| KPI | Fuente mock | Endpoint real propuesto | Notas |
|---|---|---|---|
| Total Paquetes | `stats.totalPackets` | `GET /api/v1/status` → contador acumulado, o derivado de eventos | ids-core expone contadores en status |
| Total Bytes | `stats.totalBytes` | `GET /api/v1/events/recent` → sum(event.size) | Si el campo `size` existe en EventItem; fallback mock |
| Paquetes/s | `stats.packetsPerSecond` | `GET /api/v1/events/recent` → tasa por ventana temporal | Calcular en frontend |
| Sospechosos | `stats.suspiciousCount` | `GET /api/v1/events/recent` → filter(severity=high\|critical) | O usar analytics scoring |

### Stream en Vivo

| Campo mock | Campo real propuesto | Endpoint |
|---|---|---|
| `timestamp` | `event.timestamp` | polling: `GET /api/v1/events/recent?limit=50` cada 1-2s |
| `protocol` | `event.protocol` o `event.app_protocol` | luego SSE: `GET /api/v1/events/stream` |
| `sourceIp` | `event.src_ip` | |
| `destIp` | `event.dest_ip` | |
| `sourcePort` | `event.src_port` | |
| `destPort` | `event.dest_port` | |
| `size` | `event.size` (si existe) | |
| `isSuspicious` | `event.severity` == "high" \| "critical" | |
| `geolocation` | GeoIP sintético/offline | Fase separada |

### Estadísticas

| Panel | Fuente real propuesta | Derivación |
|---|---|---|
| Puntuación de Salud | `POST /api/v1/score/event` (aggregado) o cálculo frontend | Combinar suspicious count, severidad, fuentes únicas |
| Principales Orígenes | `GET /api/v1/events/recent` → group by src_ip | Top 5 por conteo |
| Puertos Destino | `GET /api/v1/events/recent` → group by dest_port | Top 5, mapear labels (22→SSH, 502→Modbus) |
| Métricas Tráfico | `GET /api/v1/events/recent` → cardinalidad de campos | unique src_ips, dest_ips, ports, avg size |
| Distribución Protocolos | `GET /api/v1/events/recent` → group by protocol | TCP/UDP/HTTP/DNS/ICMP/SSH/FTP + Modbus |
| Heatmap 24h | `GET /api/v1/events/recent` → bucket temporal | Matriz 24h × bloques de 15 min |
| Bandwidth Chart | `GET /api/v1/events/recent` → sum(size) por ventana | 30 ventanas de 1s |

### Conexiones

| Campo | Fuente real propuesta |
|---|---|
| Id, IPs, puertos, protocolo | `GET /api/v1/events/recent` → group by (src_ip, dest_ip, src_port, dest_port, protocol) |
| Estado | Derivado de última actividad o mock hasta tener estado real |
| Bytes sent/received | Suma de tamaños por dirección |

### Mapa

| Elemento | Fuente real propuesta | Notas |
|---|---|---|
| Puntos geográficos | GeoIP sintético/offline lookup de IPs externas | No IPs privadas |
| Países | GeoIP offline lookup | No API externa |
| Protocolo dominante | Del evento original | Color por protocolo |
| Tarjetas de ubicación | GeoIP offline + agrupación por país | Top 4 países |

## 5. Campos Faltantes Identificados

| Campo mock | ¿Existe en EventItem real? | Observación |
|---|---|---|
| `size` / `packet_size` | No confirmado | Revisar `EventItem` en `types.ts`. Si no existe, usar packet_count como fallback |
| `geolocation.lat/lng` | No | Requiere GeoIP offline. Sintético hasta entonces |
| `connection.state` | No | Las conexiones reales no tienen estado TCP en eventos EVE |
| `ttl` | No | TTL no está en eventos IDS típicos |
| `flags` | No | Flags TCP no están en eventos resumidos |
| `city` | No | Requiere GeoIP |
| `bytesReceived/bytesSent` por conexión | No | Habría que agregar por flujo |

## 6. Capa de Adaptación Propuesta

### Archivo: `apps/web/src/lib/v0-network/real-data-adapter.ts`

Debe convertir eventos reales IDS (`EventItem[]` de `lib/types.ts`) a las estructuras visuales que esperan los componentes v0.

### Funciones propuestas:

```typescript
// Convertir eventos reales a PacketHeader compatible
function toV0PacketItem(event: EventItem): PacketHeader | null

// Derivar KPIs desde eventos
function buildV0Kpis(events: EventItem[]): TrafficStats

// Agrupar por protocolo
function buildV0ProtocolDistribution(events: EventItem[]): Record<Protocol, number>

// Top N IPs fuente
function buildV0TopSources(events: EventItem[], n: number): Array<[string, number]>

// Top N puertos destino
function buildV0TopPorts(events: EventItem[], n: number): Array<[number, number]>

// Construir conexiones desde eventos
function buildV0Connections(events: EventItem[]): Connection[]

// Matriz de calor 24h
function buildV0Heatmap(events: EventItem[]): number[][]

// Puntos de mapa desde eventos con GeoIP
function buildV0MapPoints(events: EventItem[]): LocationData[]
```

### Principios del adaptador:
- No meter lógica pesada en componentes
- Clamps de seguridad:
  - Máximo eventos renderizados: 500
  - Máximo nodos en mapa: 100
  - Máximo labels en gráficos: 20
  - Truncado de IPs/signatures largas (> 40 chars)
  - Fallback para null/undefined en todos los campos
  - Protección NaN/Infinity en cálculos numéricos

## 7. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Arrays grandes de eventos reales | Render lento, memoria | Clamp a 500 eventos, virtual scroll |
| Eventos con campos vacíos/nulos | Layout roto, NaN en charts | Adaptador con fallbacks y defaults |
| IPs privadas en mapa (10.x, 192.168.x) | Mapa inútil, ruido visual | Filtrar IPs privadas, solo IPs externas |
| Protocolos desconocidos/no mapeados | Badge sin color, layout roto | Mapa de colores con fallback genérico |
| Firmas Suricata largas (>100 chars) | Desborde de layout | Truncado + tooltip completo |
| SSE duplicado | Eventos repetidos en stream | Deduplicación por event.id |
| Memory leak por EventSource | Caída del frontend tras horas | Cleanup en useEffect, reconexión controlada |
| Re-render excesivo (charts) | Input lag, CPU alta | Debounce, memoización, limitar fps |
| Asset classifier disparando layout | Cards que crecen/shrink | Tamaños fijos, overflow hidden |
| GeoIP externo filtrando IPs internas | Fuga de información | Solo GeoIP offline, no enviar IPs |
| Atribución falsa de atacante | Riesgo reputacional | No mostrar "atacante", solo "origen externo" |
| Charts con 0 datos | Division by zero, gráficos vacíos | Validar totalCount > 0 antes de renderizar |

## 8. Seguridad

### GeoIP
- Solo para IPs externas (filtrar RFC1918: 10.x, 172.16-31.x, 192.168.x)
- Preferir GeoIP offline (MaxMind GeoLite2 o similar)
- No enviar IPs internas a terceros
- No geolocalizar en caliente por API externa
- Interfaz mostrar: "origen externo" no "atacante"

### Suricata
- Eventos EVE son solo para visualización
- No ejecutar acciones automáticas basadas en EVE
- No exponer firmas completas sin truncar

### Acciones Defensivas (permitidas)
- Marcar evento como sospechoso
- Investigar (abrir detalle)
- Recomendar bloqueo
- Añadir a lista de vigilancia
- Copiar IOC
- Exportar informe

### Acciones Prohibidas
- Bloquear IP automáticamente
- Enviar paquetes/responder
- Escanear IPs de origen
- Contactar a ISPs

## 9. Orden Incremental de Fases Propuesto

| Fase | Nombre | Descripción | Dependencias |
|---|---|---|---|
| 1 | **IDS-V0-REAL-EVENTS-POLLING-01** | Conectar eventos recientes por polling. Mock fallback. | Ninguna |
| 2 | **IDS-V0-SSE-LIVE-STREAM-01** | EventSource/SSE stream. Deduplicación + fallback polling. | Fase 1 |
| 3 | **IDS-V0-STATS-DERIVED-FROM-EVENTS-01** | KPIs, top sources, top ports, protocol distribution desde eventos reales. | Fase 1 |
| 4 | **IDS-V0-ASSET-CLASSIFIER-INTEGRATION-01** | Usar assets/classifications sin romper layout. | Fase 1 |
| 5 | **IDS-V0-SCORING-SEVERITY-INTEGRATION-01** | Usar analytics/scoring para health/suspicious/severity. | Fase 1 |
| 6 | **IDS-V0-GEOIP-SYNTHETIC-INTEGRATION-01** | Mapa con IPs externas y GeoIP sintético/offline placeholder. | Fase 3 |
| 7 | **IDS-SURICATA-EVE-UI-INTEGRATION-01** | Exponer eventos Suricata EVE en la UI. | Fase 2 |
| 8 | **IDS-GEOIP-OFFLINE-ENRICHMENT-01** | MaxMind/GeoLite2 offline o equivalente local. | Fase 6 |
| 9 | **IDS-V0-STAGING-PREVIEW-01** | Desplegar /design-lab/v0-network en staging sin reemplazar /. | Fases 1-3 |
| 10 | **IDS-V0-DASHBOARD-REPLACEMENT-GATE-01** | Solo si usuario aprueba, reemplazar /. | Fase 9 |

### Primera Fase Recomendada: IDS-V0-REAL-EVENTS-POLLING-01

Alcance mínimo:
- Crear `real-data-adapter.ts` con las funciones de transformación
- Añadir polling cada 2s a `GET /api/v1/events/recent?limit=50`
- Reemplazar datos mock del stream y KPIs manteniendo fallback
- No tocar Mapa, Conexiones, ni Estadísticas aún
- No tocar `/` ni dashboard principal

## 10. Lo que NO Debe Hacerse

- No modificar `/` ni `page.tsx` del dashboard
- No tocar staging 192.168.1.40
- No ejecutar Docker
- No hacer deploy
- No conectar GeoIP real todavía
- No conectar APIs externas de geolocalización
- No ejecutar acciones ofensivas contra IPs
- No añadir dependencias externas sin justificación
- No contaminar `globals.css`
- No romper aislamiento de `/design-lab/v0-network`
- No enviar IPs internas a servicios externos

## 11. Próxima Fase Recomendada

**IDS-V0-REAL-EVENTS-POLLING-01**

Crear adaptador de datos reales y conectar polling a `GET /api/v1/events/recent` para alimentar el Stream en Vivo y KPIs, manteniendo mock como fallback.
