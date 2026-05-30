# GHCR Publish Run & Verify — ids-app

## Workflow Execution

| Detail | Value |
|--------|-------|
| Workflow | Publish staging container images |
| Run | #3 |
| Branch | scaffold/ids-v2-dev-env-01 |
| Commit | eb72499 |
| Status | ✅ Success |
| Jobs | 4/4 green (ids-core, ids-analytics, ids-mcp, ids-web) |

## Images Published

| Image | Tag | Pullable |
|-------|-----|----------|
| `ghcr.io/albertgracia/ids-app/ids-core` | `:staging`, `:<sha>` | ✅ |
| `ghcr.io/albertgracia/ids-app/ids-analytics` | `:staging`, `:<sha>` | ✅ |
| `ghcr.io/albertgracia/ids-app/ids-mcp` | `:staging`, `:<sha>` | ✅ |
| `ghcr.io/albertgracia/ids-app/ids-web` | `:staging`, `:<sha>` | ✅ |

## Local Verification (Windows)

- `docker pull` de las 4 imágenes desde Windows ✅
- Imágenes accesibles sin autenticación previa (GHCR público)

## Remote Verification (192.168.1.40)

| Aspect | Result |
|--------|--------|
| Docker | 29.1.3 ✅ |
| Puertos 3002/8088/8090/8091 | ✅ Todos libres |
| Contenedores ids-app | ✅ 0 activos |
| `docker pull` de 4 imágenes | ✅ Todas descargadas |
| Staging dir | ✅ Intacto |
| Disk | 39 GB libres ✅ |
| RAM | disponible ✅ |

## Go / No-Go

**Go for staging deploy:** El servidor tiene las imágenes, los puertos están libres, el compose es válido.
**No desplegar todavía:** Falta crear `.env` real y ejecutar `docker compose up`.
