# Fase: IDS-CONSOLE-ANALYTICS-INTEGRATION-01 — Informe

**Fecha:** 2026-05-30
**Rama:** `scaffold/ids-v2-dev-env-01`
**Ruta local:** `E:\opencode\ids-app\`
**Repo:** `https://github.com/albertgracia/ids-app`

---

## RESULTADO: PASS

---

## Cambios realizados

### Archivos creados

| Archivo | Propósito |
|---------|-----------|
| `apps/web/src/lib/analytics-api.ts` | API client para analytics-api |
| `apps/web/src/components/AnalyticsStatusCard.tsx` | Estado del analytics-api |
| `apps/web/src/components/EventDetailsPanel.tsx` | Panel de detalle de evento seleccionado |
| `apps/web/src/components/EventScorePanel.tsx` | Scoring de evento con factores y recomendaciones |

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `apps/web/src/lib/types.ts` | Añadidos AnalyticsStatus, ScoreFactor, ScoreResponse, etc. |
| `apps/web/src/components/EventTable.tsx` | Añadidos onSelectEvent y selectedId |
| `apps/web/src/app/page.tsx` | Integración completa: analytics status, selección, detalle, scoring |
| `services/analytics-api/src/ids_analytics/main.py` | CORS middleware para localhost:3000 |

---

## Dashboard analytics

| Funcionalidad | Estado |
|---------------|--------|
| Analytics Status Card | ✅ online/offline/loading |
| Event selection (click row) | ✅ |
| Event Details Panel | ✅ |
| Event Score Panel (score + factors + recommendations) | ✅ |
| Error handling (analytics offline) | ✅ |
| Error handling (core offline) | ✅ |
| Sin acciones destructivas | ✅ |

---

## Endpoints usados

| Servicio | Endpoint | Propósito |
|----------|----------|-----------|
| ids-core | GET /api/v1/status | Estado del core |
| ids-core | GET /api/v1/events/recent | Eventos recientes |
| ids-core | POST /api/v1/simulate/events | Generar eventos simulados |
| analytics-api | GET /api/v1/status | Estado del analytics |
| analytics-api | POST /api/v1/score/event | Scoring de evento |

---

## Validaciones

| Validación | Resultado |
|-----------|-----------|
| `npm run typecheck` | ✅ |
| `npm run build` | ✅ |
| `npm run lint` | ✅ (compatibilidad conocida) |
| `go build ./cmd/ids-core` | ✅ |
| `go test ./... -count=1` | ✅ (55 tests) |
| `uv run ruff check src/ tests/` | ✅ |
| `uv run pytest` | ✅ (16 + 10 = 26 tests) |
| `task check` | ✅ |

---

## Git sync

| Paso | Estado |
|------|--------|
| Commit local creado | ✅ `feat(console): integrate analytics scoring` |
| Push realizado | ✅ `origin/scaffold/ids-v2-dev-env-01` |
| HEAD local/remoto sincronizado | ✅ |

---

## Confirmaciones

- ✅ No se tocó `192.168.1.40`.
- ✅ No se desplegó nada.
- ✅ No se usaron PCAPs reales.
- ✅ No se copiaron secretos.
- ✅ No se copiaron binarios legacy.
- ✅ No hay acciones destructivas.

---

## Próxima fase recomendada

`IDS-STAGING-DEPLOY-DRYRUN-01` o `IDS-SENSOR-SURICATA-EVE-SAMPLE-CONTRACT-01`
