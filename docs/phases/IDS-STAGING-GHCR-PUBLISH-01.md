# Fase: IDS-STAGING-GHCR-PUBLISH-01 — Informe

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
| `.github/workflows/publish-staging-images.yml` | Workflow GitHub Actions para publicar 4 imágenes a GHCR |
| `docs/20-ghcr-staging-publish.md` | Documentación del workflow GHCR |

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `infra/staging/deployment-checklist.md` | Añadido paso de verificación GHCR |

---

## Workflow

- **Trigger:** `workflow_dispatch` (manual desde GitHub UI)
- **Permisos:** `contents: read`, `packages: write`
- **Login:** `GITHUB_TOKEN` — sin PAT local, sin secretos expuestos
- **Build matrix:** 4 servicios en paralelo
- **Tags por imagen:** `:staging` + `:${{ github.sha }}`
- **Plataforma:** `linux/amd64`

## Imágenes

| Imagen | Dockerfile | Tags generados |
|--------|-----------|----------------|
| ids-core | `services/ids-core/Dockerfile` | `:staging`, `:<sha>` |
| ids-analytics | `services/analytics-api/Dockerfile` | `:staging`, `:<sha>` |
| ids-mcp | `services/mcp-server/Dockerfile` | `:staging`, `:<sha>` |
| ids-web | `apps/web/Dockerfile` | `:staging`, `:<sha>` |

---

## Validaciones

| Validación | Resultado |
|-----------|-----------|
| `task check` | ✅ |
| Workflow YAML existe | ✅ |
| Sin secretos locales expuestos | ✅ |
| Sin PAT | ✅ |

---

## GHCR

| Aspecto | Estado |
|---------|--------|
| Workflow creado | ✅ |
| Workflow ejecutado | ❌ Pendiente (manual desde GitHub UI) |
| Imágenes publicadas | ⏳ Pendiente de ejecución |
| Método | `GITHUB_TOKEN` (seguro, sin PAT) |

---

## Git sync

| Paso | Estado |
|------|--------|
| Commit local creado | ✅ `ci(staging): publish container images to GHCR` |
| Push realizado | ✅ `origin/scaffold/ids-v2-dev-env-01` |
| HEAD local/remoto sincronizado | ✅ |

---

## Confirmaciones

- ✅ No se tocó `192.168.1.40`.
- ✅ No se desplegó nada.
- ✅ No se usó PAT local.
- ✅ No se imprimieron secretos.
- ✅ No se crearon secretos reales.
- ✅ No se hizo docker push local.
- ✅ No quedaron contenedores activos.

---

## Próxima fase recomendada

Ejecutar el workflow manualmente desde GitHub Actions → luego `IDS-STAGING-DEPLOY-01`
