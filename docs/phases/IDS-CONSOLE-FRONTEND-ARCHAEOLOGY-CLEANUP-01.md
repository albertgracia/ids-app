# Fase: IDS-CONSOLE-FRONTEND-ARCHAEOLOGY-CLEANUP-01 — Informe

**Fecha:** 2026-05-30
**Rama:** `scaffold/ids-v2-dev-env-01`
**Commit:** `4ce5de2` — `refactor(console): clean up SOC dashboard frontend architecture`

---

## RESULTADO: PASS

### Componentes eliminados (9, verificado 0 referencias)
| Archivo | Motivo |
|---------|--------|
| `soc/NetworkTopologyPanel.tsx` | SVG estático, reemplazado por TopologyGraph |
| `soc/AttackMapPanel.tsx` | Cajas con contadores, reemplazado por AttackWorldMap |
| `AnalyticsStatusCard.tsx` | Reemplazado por SocHeader badges |
| `CoreStatusCard.tsx` | Reemplazado por SocHeader badges |
| `EventDetailsPanel.tsx` | Reemplazado por EventInspectorPanel |
| `EventScorePanel.tsx` | Scoring integrado en EventInspectorPanel |
| `EventTable.tsx` | Reemplazado por RecentEventsPanel |
| `SeveritySummary.tsx` | Reemplazado por barras inline en page.tsx |
| `SimulationPanel.tsx` | No usado en dashboard SOC |

### Utilidades centralizadas (2 archivos)
| Archivo | Contenido |
|---------|-----------|
| `src/lib/soc-utils.ts` | ZONES, SEV_COLORS, ZONE_COLORS, SEV_LABELS, ZONE_LABELS, inferZone(), classifyEventZone() |
| `src/lib/soc-labels.ts` | Objeto `L` con 100+ labels en español (headers, KPIs, paneles, eventos, scoring, assets, IoCs) |

### Componentes actualizados para usar shared utils
- `AttackWorldMap.tsx` → importa ZONES, SEV_COLORS, classifyEventZone
- `TopologyGraph.tsx` → importa ZONES, ZONE_COLORS, SEV_COLORS, inferZone, L
- `AssetIntelligencePanel.tsx` → importa inferZone

### App Router
- ✅ `apps/web/src/app/page.tsx` existe
- ✅ `apps/web/src/app/api/health/route.ts` existe  
- ✅ `apps/web/app/` NO existe

### Staging: dashboard HTTP 200, 6 contenedores healthy

### Deuda restante
- CSS-in-JS en page.tsx (pending extraer)
- Polling cada 15s sin race condition guard
- Recomendaciones de scoring en inglés (analytics-api)

### Próxima fase
`IDS-CONSOLE-SOC-LIVE-RESPONSIVE-REWORK-03`
