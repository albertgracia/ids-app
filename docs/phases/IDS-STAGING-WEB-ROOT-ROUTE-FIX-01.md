# Fase: IDS-STAGING-WEB-ROOT-ROUTE-FIX-01 — Informe

**Fecha:** 2026-05-30
**Rama:** `scaffold/ids-v2-dev-env-01`
**Repo:** `https://github.com/albertgracia/ids-app`

---

## RESULTADO: PASS

### Causa raíz
El proyecto Next.js tenía dos App Router roots:
- `apps/web/src/app/page.tsx` (la página principal)
- `apps/web/app/api/health/route.ts` (el health endpoint)

Docker/Next.js detectaba `apps/web/app` como App Router root, ignorando `src/app/`, por lo que solo aparecían `/_not-found` y `/api/health`, nunca `/`.

### Cambios
- Movido `apps/web/app/api/health/route.ts` → `apps/web/src/app/api/health/route.ts`
- Eliminado `apps/web/app/` (directorio raíz duplicado)

### Validación local
| Item | Resultado |
|------|-----------|
| `npm run typecheck` | ✅ |
| `npm run build` | ✅ Route: `/`, `/_not-found`, `/api/health` |
| `docker build` | ✅ Incluye ruta `/` |
| Smoke: `curl /api/health` | ✅ 200 |
| Smoke: `curl -I /` | ✅ **200 OK** (antes 404) |
| `task check` | ✅ |
| Contenedores activos al final | 0 ✅ |

### GHCR
Imagen ids-web publicada: **pendiente** — debe ejecutar workflow "Publish staging container images" manualmente desde GitHub Actions.

### Staging redeploy (pendiente)
```bash
cd /home/albert/docker/ids-app
docker compose --env-file .env -f compose.yaml pull ids-web
docker compose --env-file .env -f compose.yaml up -d ids-web
```

### Confirmaciones
- ✅ No se tocó Nginx, Cloudflare, Prometheus, Grafana, Loki, Alloy
- ✅ No se tocaron ids-postgres/ids-redis/ids-core/ids-analytics/ids-mcp
- ✅ No se imprimieron secretos
- ✅ No se commiteó `.env`
- ✅ No quedaron contenedores smoke activos
