# Fase: IDS-STAGING-WEB-FAILED-DESIGN-ROLLBACK-01 — Informe

**Fecha:** 2026-05-30
**Rama:** `scaffold/ids-v2-dev-env-01`
**Commit:** `9a4f906` — `revert(console): restore stable dashboard after failed visual rework`

---

## RESULTADO: PASS

### Motivo del rollback
El commit `bc1f086` ("responsive Spanish SOC dashboard with live animations") rompió visualmente la UI:
- fondo blanco, SVGs desbordados, tipografías enormes, paneles sin estilo, tablas rotas.

### Commit roto
`bc1f086` — FAIL visual, se marcó IDS-CONSOLE-SOC-LIVE-RESPONSIVE-REWORK-02 como FAIL.

### Commit restaurado
`3b79efb` — Dashboard SOC con diseño oscuro, AttackWorldMap, TopologyGraph, EventTimeline, ThreatRadarGrid, AssetIntelligence, IoCThreat.

### Acciones
1. `git checkout 3b79efb -- apps/web` — restauró la versión estable
2. Eliminado `soc-dashboard.css` residual del commit fallido
3. Build local y Docker OK, smoke test OK
4. Imagen construida en servidor, solo ids-web redeployado

### Staging
| Endpoint | Resultado |
|----------|-----------|
| `http://192.168.1.40:3002` | ✅ HTTP 200 |
| `/api/health` | ✅ ok |
| `/api/core/healthz` | ✅ ok |
| `/api/analytics/healthz` | ✅ ok |
| 6 contenedores | ✅ todos healthy |

### Confirmaciones
- ✅ No se tocó Nginx, Cloudflare, Prometheus, Grafana, Loki, Alloy
- ✅ No se tocaron DB/Redis/Core/Analytics/MCP
- ✅ Sin secretos, sin `.env` en repo
- ✅ Sin contenedores temporales

### Próxima fase
`IDS-CONSOLE-FRONTEND-ARCHAEOLOGY-CLEANUP-01`
