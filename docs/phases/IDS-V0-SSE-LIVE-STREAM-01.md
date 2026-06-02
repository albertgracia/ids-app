# IDS-V0-SSE-LIVE-STREAM-01

## Conectar SSE Live Stream a /design-lab/v0-network

| Campo | Valor |
|---|---|
| **Resultado** | PASS |
| **Rama** | scaffold/ids-v2-dev-env-01 |
| **HEAD inicial** | `0606487` |
| **HEAD final** | (post-commit) |

## Archivos Creados

| Archivo | Propósito |
|---|---|
| `src/lib/v0-network/use-live-events.ts` | Hook EventSource SSE a `/api/core/api/v1/events/stream` |

## Archivos Modificados

| Archivo | Cambio |
|---|---|
| `src/lib/v0-network/use-real-events.ts` | Integración SSE + polling como composición |
| `src/app/design-lab/v0-network/page.tsx` | Indicador live/reconnecting/polling/mock |

## Endpoint SSE Usado

`GET /api/core/api/v1/events/stream`

- Proxy: `/api/core/:path*` → `ids-core:8088/:path*`
- Eventos escuchados: `connected`, `ids_event`, `heartbeat`, `message`
- Heartbeat backend cada 25s

## Hook `use-live-events.ts`

| Propiedad | Descripción |
|---|---|
| `liveEvents: EventItem[]` | Eventos recibidos por SSE (máx 500) |
| `status: LiveStatus` | `"connecting"` \| `"live"` \| `"reconnecting"` \| `"error"` |
| `lastEventAt: number \| null` | Timestamp del último evento recibido |
| `isLive: boolean` | True si SSE está activo y recibiendo datos |
| `error: string \| null` | Mensaje de error si SSE falla |
| `reconnectCount: number` | Contador de reconexiones |

### Manejo de eventos SSE:
- `event: connected` → status = "live"
- `event: ids_event` → parse JSON → dedup por id → añadir a liveEvents
- `event: heartbeat` → mantener status "live"
- `onmessage` (eventos sin tipo) → parse como EventItem
- `onerror` → status = "reconnecting" (primera vez) o "error"

## Hook `use-real-events.ts` (integrado)

| Fuente | Prioridad | Condición |
|---|---|---|
| **SSE** (live) | 1 (preferente) | `live.isLive === true` |
| **Polling** (fallback) | 2 | SSE no conecta pero `getRecentEvents()` funciona |
| **Mock** (último recurso) | 3 | Todo falla |

### Estados de fuente:

| source | Significado | Color indicador |
|---|---|---|
| `"live"` | SSE conectado, datos en tiempo real | Verde `#22c55e` |
| `"reconnecting"` | SSE falló, reconectando, polling activo | Amarillo `#eab308` |
| `"polling"` | SSE no disponible, polling cada 5s | Azul `#3b82f6` |
| `"mock"` | API no disponible, datos simulados | Naranja `#f97316` |

### Deduplicación:
- Set compartido `seenIdsRef` entre SSE y polling
- No se duplican eventos al cambiar de fuente
- Límite: 500 eventos acumulados

## Guardrails

| Límite | Valor |
|---|---|
| Máximo eventos acumulados | 500 |
| Eventos en stream render | 100 |
| Cleanup EventSource | ✅ `es.close()` en unmount |
| AbortController polling | ✅ |
| null safety | ✅ `safeString`/`safeNumber` |
| NaN protection | ✅ `isFinite()` |
| mountedRef | ✅ Previene setState tras unmount |

## Validación

| Comando | Resultado |
|---|---|
| `npm run build` | ✅ |
| `npm run typecheck` | ✅ |
| SSE backend local | ⛔ No disponible (ids-core no levantado). Fallback polling + mock verificados. |

## Limitaciones

- SSE no pudo validarse con backend local (ids-core no levantado). Fallback funcional.
- Si el backend envía eventos sin campo `id` en el JSON, la deduplicación puede fallar y se asignará un UUID aleatorio.

## Lo que NO se Tocó

- `/` ni `page.tsx` del dashboard ✅
- Dashboard principal ✅
- Backend services/ ✅
- Staging 192.168.1.40 ✅
- Docker ✅
- Deploy ✅
- GeoIP real ✅
- Suricata UI ✅
- DB/Redis/Analytics/MCP ✅

## Próxima Fase Recomendada

`IDS-V0-STATS-DERIVED-FROM-EVENTS-01` — Mejorar derivación de estadísticas desde eventos reales (health score con scoring analytics, top sources/ports con metadatos reales).
