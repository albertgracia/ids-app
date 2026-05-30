# Fase: IDS-STAGING-DEPLOY-01 — Informe

**Fecha:** 2026-05-30
**Rama:** `scaffold/ids-v2-dev-env-01`
**Ruta local:** `E:\opencode\ids-app\`
**Repo:** `https://github.com/albertgracia/ids-app`
**Servidor:** 192.168.1.40

---

## RESULTADO: PASS

---

## Deploy

- `.env` creado con passwords generados via `openssl rand` (permisos 600)
- `docker compose config --quiet` ✅
- `docker compose up -d` ejecutado correctamente ✅

## Contenedores

| Contenedor | Estado |
|-----------|--------|
| ids-postgres | ✅ running (healthy) |
| ids-redis | ✅ running (healthy) |
| ids-core | ✅ healthy |
| ids-analytics | ✅ healthy |
| ids-mcp | ✅ healthy |
| ids-web | ✅ running |

## Healthchecks (desde LAN)

| Endpoint | Resultado |
|----------|-----------|
| http://192.168.1.40:8088/healthz | ✅ |
| http://192.168.1.40:8090/healthz | ✅ |
| http://192.168.1.40:8091/healthz | ✅ |
| http://192.168.1.40:3002/api/health | ✅ |

## Pruebas

| Funcionalidad | Resultado |
|--------------|-----------|
| Simulated ingest (POST /simulate/events) | ✅ 3 eventos generados |
| Recent events (GET /events/recent) | ✅ 3 eventos visibles |
| Dashboard LAN | ✅ |

## Rollback

No ejecutado. Stack estable.

---

## Riesgos pendientes

- Almacenamiento en modo memory (no PostgreSQL) — los datos se pierden al reiniciar
- Dashboard necesita revisión visual (siguiente fase)

## Git sync

| Paso | Estado |
|------|--------|
| Commit local creado | ✅ `docs(staging): deploy ids-app staging stack` |
| Push realizado | ✅ |
| HEAD local/remoto sincronizado | ✅ |

## Confirmaciones

- ✅ No se tocó Nginx Proxy Manager
- ✅ No se tocó Cloudflare Tunnel
- ✅ No se tocaron Prometheus/Grafana/Loki/Alloy
- ✅ No se imprimieron secretos
- ✅ No se commiteó `.env`
- ✅ No se usaron PCAPs reales
- ✅ No se usaron EVE JSON reales
- ✅ No se tocó producción
- ✅ Stacks existentes intactos

---

## Próxima fase recomendada

`IDS-DASHBOARD-REVIEW-GATE-01` — Revisión visual del dashboard desde el navegador antes de continuar.
