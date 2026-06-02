# IDS-V0-SCORING-SEVERITY-INTEGRATION-01 — Integrar scoring/severidad

## Resultado

PASS

## Rama

`scaffold/ids-v2-dev-env-01`

## HEAD

- Inicial: `958ca95`
- Final: (post-commit)

## Analytics

- endpoint usado: `POST /api/analytics/api/v1/score/events` (vía `lib/analytics-api.ts`)
- validado: solo código (backend no disponible)
- fallback derivado: scoring desde `EventItem.severity` → `deriveEventRiskScore`

## Archivos

| Archivo | Propósito |
|---|---|
| `lib/v0-network/real-data-adapter.ts` | Tipos `SeverityLevel`, helpers `normalizeSeverity`, `severityToLabelEs`, `severityToColor`, `severityToWeight`, `isSuspiciousSeverity`, `deriveEventRiskScore`, `buildV0SeveritySummary`, `buildV0SeverityMap`, `EnrichedConnection` |
| `lib/v0-network/use-event-scoring.ts` | Hook intenta analytics scoring, fallback derivado, cache por event id, batch 50, poll 15s |
| `components/v0-network/severity-badge.tsx` | Badge con punto de color + label en español |
| `components/v0-network/packet-stream.tsx` | Badge de severidad en vista compacta y expandida |
| `components/v0-network/connection-tracker.tsx` | Badge de severidad en cada conexión |
| `components/v0-network/advanced-stats-dashboard.tsx` | Distribución por severidad (crítica/alta/media/baja/info) |
| `app/design-lab/v0-network/page.tsx` | Hook scoring, `severityById`, indicador de fuente |
| `app/design-lab/v0-network/v0.css` | Estilo `.v0-severity-badge` |

## Integración

- **Stream**: Badge de severidad + asset badge + protocol badge en cada fila
- **KPIs**: `stats.suspiciousCount` ya deriva de severidad (high/critical)
- **Estadísticas**: Nueva tarjeta "Distribución por Severidad" con barras por nivel
- **Conexiones**: Badge de severidad (máxima del grupo) en cada conexión
- **Indicador fuente**: "Scoring: Analytics / Derivado / N/A" en header

## Severidades

| Nivel | Label | Color | Peso |
|---|---|---|---|
| critical | Crítica | `#ef4444` | 5 |
| high | Alta | `#f97316` | 4 |
| medium | Media | `#eab308` | 3 |
| low | Baja | `#3b82f6` | 2 |
| info | Info | `#9ca3af` | 1 |
| unknown | Desconocida | `#6b7280` | 0 |

## Guardrails

- max scoring batch: 50 eventos
- timeout: 5s (analytics-api.ts)
- AbortController: en hook y fetch
- null safety: `safeString`, `safeNumber` en todas las transformaciones
- NaN protection: `isFinite` en cálculos numéricos
- fallback derived: si analytics falla o no disponible

## Validación

- build: OK
- typecheck: OK
- lint: error pre-existente ESLint 10
- local dev: funciona con fallback mock (scoring: Derivado)
- analytics real: no disponible, fallback correcto

## Git

- commit: `feat(web): integrate scoring severity into v0 design lab`
- push: OK

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
- Acciones ofensivas
- Bloqueo automático

## Próxima fase recomendada

`IDS-V0-GEOIP-SYNTHETIC-INTEGRATION-01`
