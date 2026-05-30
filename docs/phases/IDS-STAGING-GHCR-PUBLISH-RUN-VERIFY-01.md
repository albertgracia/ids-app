# Fase: IDS-STAGING-GHCR-PUBLISH-RUN-VERIFY-01 — Informe

**Fecha:** 2026-05-30
**Rama:** `scaffold/ids-v2-dev-env-01`
**Ruta local:** `E:\opencode\ids-app\`
**Repo:** `https://github.com/albertgracia/ids-app`

---

## RESULTADO: PASS

---

## Workflow

| Aspecto | Estado |
|---------|--------|
| Workflow ejecutado | ✅ Run #3 — Success |
| Rama | scaffold/ids-v2-dev-env-01 |
| Commit | eb72499 |
| Jobs | 4/4 verdes |

## Imágenes verificadas

| Imagen | Local pull | Remote pull (server) |
|--------|-----------|----------------------|
| ids-core:staging | ✅ | ✅ |
| ids-analytics:staging | ✅ | ✅ |
| ids-mcp:staging | ✅ | ✅ |
| ids-web:staging | ✅ | ✅ |

## Servidor 192.168.1.40

| Aspecto | Resultado |
|---------|-----------|
| Docker | 29.1.3 ✅ |
| Puertos 3002/8088/8090/8091 | ✅ Libres |
| Contenedores ids-app | ✅ 0 |
| Disco | 39 GB libres ✅ |
| Imágenes descargadas | ✅ |
| Staging dir intacto | ✅ |

## Pull readiness

- ✅ Las 4 imágenes se descargaron correctamente tanto en local como en el servidor
- GHCR accesible sin autenticación (paquetes públicos)

## Go / No-Go

**Go para staging deploy.** El servidor está listo — imágenes descargadas, puertos libres, compose válido.
**Falta:** crear `.env` real y ejecutar `docker compose up`.

---

## Git sync

| Paso | Estado |
|------|--------|
| Commit local creado | ✅ `docs(staging): verify GHCR image publish run` |
| Push realizado | ✅ |
| HEAD local/remoto sincronizado | ✅ |

---

## Confirmaciones

- ✅ No se ejecutó `docker compose up`
- ✅ No se desplegó ids-app
- ✅ No se crearon secretos reales
- ✅ No se usó PAT
- ✅ No se imprimieron tokens
- ✅ No se tocaron stacks existentes
- ✅ No quedaron contenedores ids-app activos

---

## Próxima fase recomendada

`IDS-STAGING-DEPLOY-01`
