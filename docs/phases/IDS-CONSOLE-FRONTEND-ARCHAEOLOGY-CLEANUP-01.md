# Fase: IDS-CONSOLE-FRONTEND-ARCHAEOLOGY-CLEANUP-01 — Informe

**Fecha:** 2026-05-30
**Rama:** `scaffold/ids-v2-dev-env-01`
**Commit:** `4ce5de2` — `refactor(console): clean up SOC dashboard frontend architecture`

---

## RESULTADO: PASS

### Diagnóstico arqueológico
El frontend arrastraba deuda de iteraciones rápidas: componentes cadáver, lógica duplicada en 3 archivos, y archivos de fases pre-SOC sin usar.

### Eliminado (9 archivos muertos, 0 referencias)
- `soc/NetworkTopologyPanel.tsx` — SVG estático reemplazado por `TopologyGraph`
- `soc/AttackMapPanel.tsx` — cajas con contadores, reemplazado por `AttackWorldMap`
- `AnalyticsStatusCard.tsx` — reemplazado por `SocHeader` badges
- `CoreStatusCard.tsx` — reemplazado por `SocHeader` badges
- `EventDetailsPanel.tsx` — reemplazado por `EventInspectorPanel`
- `EventScorePanel.tsx` — scoring integrado en `EventInspectorPanel`
- `EventTable.tsx` — reemplazado por `RecentEventsPanel`
- `SeveritySummary.tsx` — reemplazado por barras inline en page.tsx
- `SimulationPanel.tsx` — no usado en dashboard SOC

### Centralizado (1 nuevo archivo)
`src/lib/soc-utils.ts`:
- `ZONES`, `SEV_COLORS`, `ZONE_COLORS` — constantes compartidas
- `SEV_LABELS`, `ZONE_LABELS`, `L` — labels en español
- `inferZone()` — clasificación de zona unificada
- `classifyEventZone()` — clasificación a nivel evento

### Staging
```
http://192.168.1.40:3002 → HTTP 200 ✅
6 contenedores healthy ✅
```

### Deuda restante
- CSS-in-JS en page.tsx (pending extraer a módulo)
- Polling cada 15s sin race condition guard
- Las recomendaciones de scoring siguen en inglés (vienen de analytics-api)

### Confirmaciones
- ✅ Sin nuevas dependencias
- ✅ Sin tocar backend/DB/observabilidad
- ✅ Sin contenedores temporales
