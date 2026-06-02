# IDS-V0-DASHBOARD-ROOT-REPLACEMENT-01

## Resultado

**PASS**

## Agente principal

@frontend-specialist

## Apoyo

@code-archaeologist (obligatorio)
@devops-engineer (obligatorio)

---

## T1 — Baseline

```powershell
git status --short        # limpio
git status -sb            # ## scaffold/ids-v2-dev-env-01...origin/...
git branch --show-current # scaffold/ids-v2-dev-env-01
git rev-parse --short HEAD # ac7ddbc
```

**HEAD inicial: ac7ddbc**
**HEAD final: 83c762d** (tras commit)

---

## T2 — Dashboard antiguo (`/` antes)

- **Archivo:** `apps/web/src/app/page.tsx` (248 líneas)
- **Componentes SOC:** SocHeader, ExecutiveKpiStrip, AttackWorldMap, TopologyGraph, EventTimelinePanel, ThreatRadarGrid, AssetIntelligencePanel, IocThreatPanel, RecentEventsPanel, EventInspectorPanel
- **Estilos:** inline `<style jsx global>` dentro del mismo archivo
- **Fuente de datos:** polling directo a `getStatus`, `getRecentEvents`, `scoreEvent` cada 15s

## T3 — Dashboard nuevo (`/design-lab/v0-network`)

- **Componente extraído:** `apps/web/src/components/v0-network/v0-network-dashboard.tsx`
- Contiene toda la lógica del `V0NetworkPage` original (stream, estadísticas, conexiones, mapa, assets, scoring, GeoIP sintético, Suricata/EVE)
- **Importa `v0.css`** via `@/app/design-lab/v0-network/v0.css`

## T4 — Ruta legacy

- **Creada:** `apps/web/src/app/legacy-dashboard/page.tsx`
- Contiene el dashboard SOC antiguo completo (copiado exacto de `page.tsx` original)
- **Aviso visible:** "Dashboard legacy — reemplazado por el nuevo Analizador de Tráfico de Red en /"
- Sin pérdida de funcionalidad: todos los imports y componentes SOC se conservan

## T5-6 — Reemplazo de `/`

- `/page.tsx` ahora renderiza `<V0NetworkDashboard />`
- `/design-lab/v0-network/page.tsx` ahora también renderiza `<V0NetworkDashboard />`
- Ambos comparten el mismo componente

---

## T7 — Validación local

```bash
npm run build
```

```
Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /api/health
├ ○ /design-lab
├ ○ /design-lab/v0-network
└ ○ /legacy-dashboard
```

**Build: PASS** ✅
**Typecheck: PASS** ✅

| Ruta | Estado |
|------|--------|
| `/` | Static ✅ (nuevo dashboard) |
| `/design-lab/v0-network` | Static ✅ (sigue funcionando) |
| `/legacy-dashboard` | Static ✅ (dashboard legacy) |
| `/api/health` | Static ✅ |

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `apps/web/src/app/page.tsx` | Reemplazado — ahora importa `<V0NetworkDashboard />` (3 líneas) |
| `apps/web/src/app/design-lab/v0-network/page.tsx` | Simplificado — ahora importa `<V0NetworkDashboard />` |
| `apps/web/src/app/legacy-dashboard/page.tsx` | **Creado** — dashboard SOC antiguo completo |
| `apps/web/src/components/v0-network/v0-network-dashboard.tsx` | **Creado** — componente compartido extraído |

---

## Git

```bash
git add apps/web/src/app/page.tsx
git add apps/web/src/app/design-lab/v0-network/page.tsx
git add apps/web/src/app/legacy-dashboard/page.tsx
git add apps/web/src/components/v0-network/v0-network-dashboard.tsx
git add docs/phases/IDS-V0-DASHBOARD-ROOT-REPLACEMENT-01.md

git commit -m "feat(web): replace root dashboard with v0 network console"
git push origin scaffold/ids-v2-dev-env-01
```

---

## Rollback

Para restaurar el dashboard anterior en `/`:

```bash
git checkout ac7ddbc -- apps/web/src/app/page.tsx
```

O revertir el commit:

```bash
git revert 83c762d --no-edit
```

El dashboard legacy permanece en `/legacy-dashboard` incluso tras rollback.

---

## Confirmaciones

- [x] No se tocó backend.
- [x] No se tocó services/.
- [x] No se tocó DB.
- [x] No se tocó Redis/PostgreSQL.
- [x] No se tocó analytics.
- [x] No se tocó MCP.
- [x] No se tocó Docker.
- [x] No se tocó staging 192.168.1.40.
- [x] No se hizo deploy.
- [x] No se tocó Nginx/Cloudflare.
- [x] No se añadieron dependencias nuevas.

---

## Próxima fase recomendada

**IDS-V0-ROOT-STAGING-DEPLOY-01**

Desplegar la nueva imagen `ids-web:staging` (con el reemplazo de `/`) en staging y validar que todo funciona.
