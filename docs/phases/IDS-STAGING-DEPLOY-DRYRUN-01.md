# Fase: IDS-STAGING-DEPLOY-DRYRUN-01 — Informe

**Fecha:** 2026-05-30
**Rama:** `scaffold/ids-v2-dev-env-01`
**Ruta local:** `E:\opencode\ids-app\`
**Repo:** `https://github.com/albertgracia/ids-app`

---

## RESULTADO: PASS

---

## Dry-run: Staging deploy readiness validated

### Inspección local — todos PASS

| Componente | Resultado |
|-----------|-----------|
| `go build ./cmd/ids-core` | ✅ |
| `go test ./...` | ✅ 86 tests |
| `uv run pytest` (analytics) | ✅ 16 tests |
| `uv run pytest` (mcp) | ✅ 10 tests |
| `tsc --noEmit` | ✅ |
| `next build` | ✅ |
| `task check` | ✅ |
| `validate:suricata-contract` | ✅ |

### Inspección remota (192.168.1.40) — read-only

| Aspecto | Resultado |
|---------|-----------|
| OS | Ubuntu 26.04 LTS ✅ |
| Docker | 29.1.3 ✅ |
| Disco | 39 GB libres ✅ |
| RAM | 5.1 GB disponible ✅ |
| Puertos ids-app | Todos libres ✅ |
| Staging dir | Existe con 5 archivos ✅ |
| Compose valida con .env.example | ✅ |
| Contenedores ids-app activos | ✅ 0 |

### Archivos creados

| Archivo | Propósito |
|---------|-----------|
| `docs/17-staging-deploy-dryrun.md` | Documentación del dry-run |
| `infra/staging/README.md` | README de staging |
| `infra/staging/compose.staging.example.yaml` | Compose template (validado) |
| `infra/staging/env.staging.example` | Variables de entorno ejemplo |
| `infra/staging/deployment-checklist.md` | Checklist pre/post deploy |

### Riesgos bloqueantes

| Riesgo | Tipo |
|--------|------|
| No existen imágenes Docker publicadas | 🔴 Bloqueante |
| No existe `.env` real con secretos | 🔴 Bloqueante |
| No hay health endpoint HTTP en ids-web | 🟡 Importante |
| No hay health endpoint HTTP en ids-mcp | 🟢 Menor |
| No hay backup confirmado pre-deploy | 🟡 Importante |

### Go / No-Go

**Go for staging deploy:** cuando las imágenes estén publicadas y el `.env` esté listo.
**No listo todavía:** las imágenes `ghcr.io/...:staging` no existen.

---

## Git sync

| Paso | Estado |
|------|--------|
| Commit local creado | ✅ `docs(deploy): add staging dry-run plan` |
| Push realizado | ✅ `origin/scaffold/ids-v2-dev-env-01` |
| HEAD local/remoto sincronizado | ✅ |

---

## Confirmaciones

- ✅ No se tocó `192.168.1.40` más allá de lectura.
- ✅ No se ejecutó `docker compose up`.
- ✅ No se desplegó ids-app.
- ✅ No se crearon secretos reales.
- ✅ No se usaron PCAPs reales.
- ✅ No se copiaron EVE JSON reales.
- ✅ No quedaron contenedores ids-app activos.

---

## Próxima fase recomendada

`IDS-STAGING-IMAGE-BUILD-PLAN-01` o `IDS-STAGING-DEPLOY-01`
