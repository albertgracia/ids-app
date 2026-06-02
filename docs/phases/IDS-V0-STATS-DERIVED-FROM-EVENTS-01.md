# IDS-V0-STATS-DERIVED-FROM-EVENTS-01 — Consolidar estadísticas desde eventos activos

## Resultado

PASS

## Rama

`scaffold/ids-v2-dev-env-01`

## HEAD

- Inicial: `0061249` feat(web): add SSE live stream to v0 design lab
- Final: `13166c9` feat(web): derive v0 design lab stats from IDS events

## Archivos modificados

- `apps/web/src/lib/v0-network/real-data-adapter.ts` — nuevos builders
- `apps/web/src/components/v0-network/advanced-stats-dashboard.tsx` — refactor a builders
- `apps/web/src/app/design-lab/v0-network/page.tsx` — conexiones derivadas, mock eliminado
- `apps/web/src/app/design-lab/v0-network/v0.css` — estilo `.v0-source-count`

## Builders añadidos/mejorados

| Builder | Descripción |
|---|---|
| `buildV0TrafficMetrics(packets)` | Retorna `uniqueSourceIps`, `uniqueDestIps`, `uniquePorts`, `avgPacketSize` |
| `buildV0NetworkHealthScore(packets, suspiciousCount)` | Score 0–100 basado en paquetes sospechosos y fuentes únicas |
| `buildV0TopSources` | Ya existía, reutilizado |
| `buildV0TopPorts` | Ya existía, reutilizado |
| `buildV0ProtocolDistribution` | Ya existía, reutilizado |
| `buildV0Connections` | Ya existía, ahora usado desde `activePackets` |

## Paneles derivados de eventos

| Panel | Fuente anterior | Fuente actual |
|---|---|---|
| KPIs (StatsOverview) | `buildV0Kpis(realPackets)` | Sin cambios |
| AdvancedStats | Cálculo inline | `buildV0TopSources`, `buildV0TopPorts`, `buildV0TrafficMetrics`, `buildV0NetworkHealthScore`, `buildV0ProtocolDistribution` |
| Conexiones | `generateConnection()` mock cada 2s | `buildV0Connections(activePackets)` vía `useMemo` |
| Indicador fuente | `sourceCfg.label` + tiempo | Ahora también muestra conteo de eventos activos |

## Validaciones

- `npm run build` — OK
- `npm run typecheck` — OK
- `npm run lint` — error pre-existente ESLint 10 (circular JSON), no introducido por esta fase

## Limitaciones

- Eventos reales (`EventItem`) no tienen campo `size`, por lo que `totalBytes`, `bytesPerSecond` y `avgPacketSize` serán 0 cuando la fuente sea la API real. Las métricas basadas en conteo (packetsPerSecond, totalPackets, etc.) sí funcionan correctamente.
- `buildV0Connections` asigna estado `"ESTABLISHED"` a todas las conexiones; no hay inferencia de estado de handshake TCP.

## Qué NO se tocó

- `/` (página principal)
- Dashboard principal
- Backend (ids-core)
- Services (analytics-api, mcp-server)
- Staging 192.168.1.40
- Docker / docker-compose
- GeoIP real
- Suricata UI
- DB / Redis / Analytics / MCP
- Dependencias nuevas

## Próxima fase recomendada

`IDS-V0-ASSET-CLASSIFIER-INTEGRATION-01`
