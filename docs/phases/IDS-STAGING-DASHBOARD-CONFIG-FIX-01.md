# Fase: IDS-STAGING-DASHBOARD-CONFIG-FIX-01 — Informe

**Fecha:** 2026-05-30
**Rama:** `scaffold/ids-v2-dev-env-01`
**Commit:** `171f6d6` — `fix(web): use server-side rewrites for backend proxy`

---

## Resultado: PASS

### Causa raíz
El frontend usaba `http://127.0.0.1:8088` como URL del backend. Desde el navegador del usuario, `127.0.0.1` apunta al PC local, no al servidor `192.168.1.40`.

### Cambios
- **`next.config.ts`** — Añadidas reglas `rewrites()` que proxy:
  - `/api/core/*` → `http://ids-core:8088/*`
  - `/api/analytics/*` → `http://ids-analytics:8090/*`
- **`ids-core.ts`** — `BASE_URL` cambiado de `http://127.0.0.1:8088` a `/api/core`
- **`analytics-api.ts`** — `BASE_URL` cambiado de `http://127.0.0.1:8090` a `/api/analytics`
- **`compose.staging.example.yaml`** — Añadidas variables `IDS_CORE_BASE_URL` e `IDS_ANALYTICS_BASE_URL`

### Resultados

| Endpoint | Desde servidor | Desde LAN |
|----------|---------------|-----------|
| `/api/core/healthz` | ✅ `{"status":"ok"}` | ✅ |
| `/api/analytics/healthz` | ✅ `{"status":"ok"}` | ✅ |
| `/api/core/api/v1/status` | ✅ con capabilities | — |
| Dashboard / | ✅ HTTP 200 | ✅ HTTP 200 |

6 contenedores ids-app: **todos healthy** ✅

### Confirmaciones
- ✅ No se tocó NPM, Cloudflare, Prometheus, Grafana, Loki, Alloy
- ✅ Sin secretos expuestos
- ✅ Sin `.env` en repo

### Próxima fase
`IDS-CONSOLE-PREMIUM-SOC-DASHBOARD-01` (diseño de dashboard, si procede)
