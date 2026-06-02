# IDS-V0-ASSET-CLASSIFIER-INTEGRATION-01 — Integrar clasificador de activos

## Resultado

PASS

## Rama

`scaffold/ids-v2-dev-env-01`

## HEAD

- Inicial: `7991429` docs(phases): add v0 real data integration plan
- Final: (post-commit)

## Endpoint

- Usado: `GET /api/core/api/v1/assets/classifications?limit=200`
- Validado: Solo con código (backend local no disponible)
- Fallback: Mapa vacío `byIp = {}` sin romper UI

## Archivos

| Archivo | Propósito |
|---|---|
| `apps/web/src/lib/v0-network/use-asset-classifications.ts` | Hook polling cada 15s, AbortController, estado fuente |
| `apps/web/src/lib/v0-network/real-data-adapter.ts` | Tipos `AssetType`, `AssetInfo`, helpers `formatAssetTypeLabel`, `assetTypeColor`, `toAssetInfo`, `buildV0AssetSummary`, `buildV0AssetsByZone` |
| `apps/web/src/components/v0-network/asset-badge.tsx` | Badge pequeño de activo (PLC, HMI, EXT, etc.) |
| `apps/web/src/components/v0-network/asset-summary.tsx` | Bloque compacto de resumen de activos clasificados |
| `apps/web/src/components/v0-network/packet-stream.tsx` | Badge de activo en vista compacta y expandida |
| `apps/web/src/components/v0-network/connection-tracker.tsx` | Badge de activo junto a IPs origen/destino |
| `apps/web/src/app/design-lab/v0-network/page.tsx` | Hook, `AssetSummaryBlock`, pase de `byIp`, indicador de fuente |
| `apps/web/src/app/design-lab/v0-network/v0.css` | Estilos `.v0-asset-badge`, `.v0-asset-summary-block` |

## Integración

- **Stream (live tab)**: Badge de activo del `destIp` en cada fila (compacta y expandida)
- **Conexiones**: Badge de activo junto a IP origen y destino
- **Estadísticas (stats tab)**: Bloque `AssetSummaryBlock` con conteo por tipo y confianza media
- **Indicador fuente**: Muestra "N activos" o "activos: N/A" en el header

## Tipos de activo

| Tipo | Label | Badge |
|---|---|---|
| PLC | PLC | `#f97316` |
| HMI | HMI | `#a855f7` |
| SCADA | SCADA | `#ec4899` |
| Engineering Workstation | EWS | `#06b6d4` |
| IT Server | IT | `#3b82f6` |
| External Host | EXT | `#22c55e` |
| IDS Sensor | IDS | `#eab308` |
| Unknown | ? | `#9ca3af` |

## Guardrails

- Máximo activos: 200 (limit query param)
- Confidence clamp: `Math.max(0, Math.min(100, value))`
- Null safety: `safeString`, `safeNumber` en toda transformación
- NaN protection: todos los números pasan por `isFinite`
- Fallback unknown: si el tipo no está en `ASSET_TYPES`, retorna null
- IPs truncadas a 40 caracteres en reasons
- Si endpoint falla: `apiAvailable = false`, UI no se rompe

## Validación

- build: OK
- typecheck: OK
- lint: error pre-existente ESLint 10 (circular JSON)
- local dev: funciona con fallback mock (clasificador muestra "activos: N/A")
- API real: no disponible localmente, fallback correcto

## Git

- Commit: `feat(web): integrate asset classifier into v0 design lab`
- Push: OK

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

`IDS-V0-SCORING-SEVERITY-INTEGRATION-01`
