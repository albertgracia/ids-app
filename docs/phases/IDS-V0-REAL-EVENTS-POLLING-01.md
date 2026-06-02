# IDS-V0-REAL-EVENTS-POLLING-01

## Conectar Eventos Reales IDS por Polling

| Campo | Valor |
|---|---|
| **Resultado** | PASS |
| **Rama** | scaffold/ids-v2-dev-env-01 |
| **HEAD** | `57d6ac4` |
| **Working tree** | Sucio (cambios de fases previas + nuevos) |

## Archivos Creados

| Archivo | Propósito |
|---|---|
| `src/lib/v0-network/real-data-adapter.ts` | Adaptador de eventos reales IDS a formato visual v0 |
| `src/lib/v0-network/use-real-events.ts` | Hook polling a `/api/core/api/v1/events/recent?limit=50` |

## Archivos Modificados

| Archivo | Cambio |
|---|---|
| `src/app/design-lab/v0-network/page.tsx` | Integración de eventos reales + indicador de fuente de datos |
| `src/app/design-lab/v0-network/v0.css` | Estilos para badge de fuente de datos |

## Endpoint Usado

`GET /api/core/api/v1/events/recent?limit=50`

- Proxy Next.js: `/api/core/:path*` → `ids-core:8088/:path*`
- Polling cada 5s
- Fallback: datos mock si API no responde

## Adaptador Creado: `real-data-adapter.ts`

| Función | Propósito |
|---|---|
| `normalizeId` | Normaliza ID a string seguro |
| `safeString` | Protege contra null/undefined en strings |
| `safeNumber` | Protege contra NaN/Infinity |
| `safeTimestamp` | Parsea timestamps ISO string o number |
| `truncateLabel` | Trunca labels > 40 caracteres |
| `isPrivateIp` | Detecta IPs privadas (RFC1918) |
| `mapProtocol` | Mapea string de protocolo a enum Protocol |
| `mapSeverity` | Severidad high/critical → isSuspicious |
| `toV0PacketItem` | Convierte `EventItem` → `PacketHeader` |
| `toV0PacketItems` | Convierte array con límite de 500 |
| `buildV0Kpis` | Deriva `TrafficStats` desde `PacketHeader[]` |
| `buildV0ProtocolDistribution` | Agrupa por protocolo |
| `buildV0TopSources` | Top 5 IPs fuente |
| `buildV0TopPorts` | Top 5 puertos destino |
| `buildV0Connections` | Agrupa conexiones por flujo |
| `buildV0Heatmap` | Matriz 24h para heatmap |
| `buildV0BandwidthSeries` | Serie temporal 30s para bandwidth chart |

## Hook Polling: `use-real-events.ts`

| Propiedad | Valor |
|---|---|
| Intervalo polling | 5s |
| AbortController | Sí (cleanup al desmontar) |
| Deduplicación | Por `event.id` |
| Límite eventos | 500 |
| Estados expuestos | `events`, `isLoading`, `error`, `source: "real"\|"mock"`, `lastUpdated`, `apiAvailable` |
| Retry manual | `retry()` callback |

## Integración en página

| Panel | Comportamiento |
|---|---|
| **Stream en Vivo** | Muestra eventos reales si API disponible; mock fallback |
| **KPIs** | Derivados de eventos reales via `buildV0Kpis` |
| **Bandwidth Meters** | Usan `bytesPerSecond` de KPIs reales |
| **Estadísticas** | AdvancedStatsDashboard, heatmap, charts con datos reales |
| **Mapa** | Misma fuente de datos (real o mock); GeoIP aún no conectado |
| **Conexiones** | Aún mock (no hay flujos reales desde events/recent) |

## Indicador Visual de Fuente

| Estado | Badge | Color |
|---|---|---|
| API IDS disponible | "Datos reales IDS" + dot verde + contador "Xs" | Verde `#22c55e` |
| API IDS no disponible | "Mock" + dot naranja | Naranja `#f97316` |

## Guardrails

| Límite | Valor |
|---|---|
| Máximo eventos procesados | 500 |
| Máximo stream renderizado | 100 |
| Top sources | 5 |
| Top ports | 5 |
| Conexiones agrupadas | 50 |
| Labels truncadas | 40 caracteres |
| NaN/Infinity protection | `safeNumber` con fallback 0 |
| Null/undefined protection | `safeString` con fallback "" |

## Validación

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ Compila sin errores |
| `npm run typecheck` | ✅ Sin errores de tipos |
| `npm run lint` | ⚠️ Error preexistente de ESLint 10 (no relacionado) |
| API local disponible | ⛔ No se pudo validar (backend no levantado). Fallback mock verificado. |
| / intacto | ✅ Sin cambios en página principal |

## Limitaciones

- El campo `size/bytes` no existe en `EventItem` real → KPIs de bytes son 0 hasta que se añada
- GeoIP no conectado → mapa sin ubicaciones reales
- Las conexiones reales requieren agrupación por flujo (no hay estado TCP real)
- El hook usa polling, no SSE → actualización cada 5s (no streaming)
- No se pudo validar con API local (servicios ids-core no levantados)

## Lo que NO se Tocó

- `/` ni `page.tsx` del dashboard ✅
- Dashboard principal ✅
- Backend services/ ✅
- Staging 192.168.1.40 ✅
- Docker ✅
- Deploy ✅
- SSE ✅
- GeoIP real ✅
- Suricata UI ✅
- DB/Redis/Analytics/MCP ✅

## Próxima Fase Recomendada

`IDS-V0-SSE-LIVE-STREAM-01` — Conectar EventSource/SSE a `/api/core/api/v1/events/stream` para stream en tiempo real, con deduplicación y fallback polling.
