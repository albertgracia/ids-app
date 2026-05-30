# Fase: IDS-STAGING-IMAGE-BUILD-PLAN-01 — Informe

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
| `.dockerignore` | Excluye .env, node_modules, .venv, DBs, PCAPs, etc. |
| `services/ids-core/Dockerfile` | Multi-stage Go (alpine) |
| `services/analytics-api/Dockerfile` | Python/FastAPI (slim) |
| `services/mcp-server/Dockerfile` | Python MCP (slim) |
| `apps/web/Dockerfile` | Multi-stage Next.js (node:22-alpine) |
| `docs/19-staging-image-build-plan.md` | Documentación del plan de imágenes |

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `Taskfile.yml` | Añadidas tareas docker:build (core, analytics, mcp, web, all) |
| `services/mcp-server/src/ids_mcp/main.py` | main() bloqueante para Docker (sleep loop + http thread) |

---

## Dockerfiles

| Imagen | Build | Smoke test | Healthcheck |
|--------|-------|-----------|-------------|
| ids-core | ✅ | ✅ /healthz | ✅ |
| ids-analytics | ✅ | ✅ /healthz | ✅ |
| ids-mcp | ✅ | ✅ /healthz | ✅ |
| ids-web | ✅ | ✅ /api/health | ✅ |

---

## Validaciones

| Validación | Resultado |
|-----------|-----------|
| `task check` | ✅ |
| `docker build ids-core` | ✅ |
| `docker build ids-analytics` | ✅ |
| `docker build ids-mcp` | ✅ |
| `docker build ids-web` | ✅ |
| Smoke test: core | ✅ |
| Smoke test: analytics | ✅ |
| Smoke test: mcp | ✅ |
| Smoke test: web | ✅ |
| Contenedores activos al final | ✅ 0 |

---

## Git sync

| Paso | Estado |
|------|--------|
| Commit local creado | ✅ `build(staging): add container image build plan` |
| Push realizado | ✅ `origin/scaffold/ids-v2-dev-env-01` |
| HEAD local/remoto sincronizado | ✅ |

---

## Confirmaciones

- ✅ No se tocó `192.168.1.40`.
- ✅ No se desplegó nada.
- ✅ No se publicaron imágenes.
- ✅ No se crearon secretos reales.
- ✅ No se usaron PCAPs reales.
- ✅ No se copiaron EVE JSON reales.
- ✅ No quedaron contenedores activos.

---

## Próxima fase recomendada

`IDS-STAGING-GHCR-PUBLISH-01` (publicar imágenes en GHCR)
o `IDS-DASHBOARD-LOCAL-REVIEW-GATE-01` (revisión visual del dashboard antes de staging)
