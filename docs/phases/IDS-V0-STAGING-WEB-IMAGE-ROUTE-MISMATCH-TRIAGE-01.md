# IDS-V0-STAGING-WEB-IMAGE-ROUTE-MISMATCH-TRIAGE-01

## Resultado

**PASS**

Causa identificada: **Categoría G** (staging tag remoto no corresponde al commit esperado) con alta probabilidad de **Categoría A** (workflow ejecutado en rama incorrecta).

## Agente principal

@devops-engineer

## Apoyo

@frontend-specialist (obligatorio)
@code-archaeologist (obligatorio)

---

## T1 — Baseline local

```powershell
git status --short        # limpio
git status -sb            # ## scaffold/ids-v2-dev-env-01...origin/scaffold/ids-v2-dev-env-01
git branch --show-current  # scaffold/ids-v2-dev-env-01
git rev-parse --short HEAD # acbaf99
git log --oneline -10
acbaf99 (HEAD -> scaffold/ids-v2-dev-env-01, origin/scaffold/ids-v2-dev-env-01) docs(phases): record v0 staging preview deploy plan (partial)
e0dd3da docs(phases): add v0 staging preview plan
3072947 feat(web): surface Suricata EVE context in v0 design lab
20fda29 feat(web): add synthetic GeoIP to v0 design lab
...
```

**Rama correcta, HEAD sync, working tree limpio.**

---

## T2 — npm build local

```bash
cd apps/web && npm run build
```

```
Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /api/health
├ ○ /design-lab
└ ○ /design-lab/v0-network
```

**Build local tiene todas las rutas.** ✅

---

## T3 — App Router structure

```
apps/web/src/app/
├── api/health/route.ts       ✅
├── design-lab/
│   └── v0-network/page.tsx   ✅
├── layout.tsx                ✅
├── page.tsx                  ✅
├── globals.css               ✅
└── favicon.ico               ✅

apps/web/app/ → NO EXISTE   ✅ (sin doble raíz)
```

**App Router correcto, sin conflicto de raíz doble.**

---

## T4 — Dockerfile audit

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /build
COPY apps/web/package.json apps/web/package-lock.json* ./
RUN npm ci
COPY apps/web/ .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /build/.next/ ./.next/
COPY --from=builder /build/public/ ./public/
COPY --from=builder /build/package.json ./
COPY --from=builder /build/node_modules/ ./node_modules/
COPY --from=builder /build/next.config.ts ./
CMD ["npm", "run", "start"]  # → next start
```

**Análisis:**
- `context: .` (raíz repo) → correcto
- `COPY apps/web/ .` → copia todo el contenido de `apps/web/` a `/build/` ✅
- `npm run build` ejecuta en el contexto correcto ✅
- `next start` necesita `.next/`, `next.config.ts`, `node_modules/` → todo copiado ✅
- No usa `output: 'standalone'` → no es necesario porque `node_modules/` se copia y `next start` funciona directamente

**Conclusión: Dockerfile correcto.** ✅

---

## T5 — GitHub Actions workflow audit

```yaml
name: Publish staging container images
on:
  workflow_dispatch:          # manual trigger
jobs:
  publish:
    strategy:
      matrix:
        service:
          - name: ids-web
            dockerfile: apps/web/Dockerfile
    steps:
      - uses: actions/checkout@v4
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: apps/web/Dockerfile
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/${{ matrix.service.name }}:staging
            ghcr.io/${{ github.repository }}/${{ matrix.service.name }}:${{ github.sha }}
```

**Puntos clave:**
- `context: .` → usa raíz del repo como contexto ✅
- `file: apps/web/Dockerfile` → correcto ✅
- `push: true` → publica a GHCR ✅
- Tags: `staging` + `<commit-sha>` ✅
- **No especifica `ref` ni branch** → `workflow_dispatch` pregunta al usuario qué rama usar

**⚠️ El problema:** Cuando se lanza manualmente, GitHub UI pregunta "Branch to run the workflow on". Si el operador seleccionó `main` (o la rama por defecto) en lugar de `scaffold/ids-v2-dev-env-01`, la imagen se construye desde el código de esa rama, que **no contiene las rutas App Router esperadas**.

---

## T6-7 — Docker local build + route test (ejecutado)

```bash
docker build --no-cache -f apps/web/Dockerfile -t ids-web-route-triage:local .
docker run --rm -d --name ids-web-route-triage -p 3099:3000 ids-web-route-triage:local
sleep 15

curl -I http://127.0.0.1:3099/
# → HTTP/1.1 200 OK  ✅

curl -I http://127.0.0.1:3099/design-lab/v0-network
# → HTTP/1.1 200 OK  ✅

curl -fsS http://127.0.0.1:3099/api/health
# → {"service":"ids-web","status":"ok","mode":"development"}  ✅
```

**Todas las rutas funcionan en Docker local.** ✅

```bash
# .next/server/app-paths-manifest.json
{
  "/page": "app/page.js",
  "/api/health/route": "app/api/health/route.js",
  "/design-lab/v0-network/page": "app/design-lab/v0-network/page.js"
}
```

---

## T8 — Diagnóstico

### Causas descartadas

| Categoría | Descripción | Estado |
|-----------|-------------|--------|
| B | Dockerfile incorrecto | ❌ Funciona localmente |
| D | Contexto workflow incorrecto | ❌ `context: .` es correcto |
| E | .dockerignore excluye src | ❌ No excluye `src/` ni `apps/` |
| F | Doble raíz App Router | ❌ Solo `src/app/` existe |
| H | Standalone incompleto | ❌ No usa standalone, funciona igual |

### Causa probable: **Categoría G → A**

**G. Imagen staging remota no corresponde al commit esperado**

El workflow se ejecutó pero el tag `staging` apunta a una imagen construida desde una rama que no contiene las páginas. Evidencia:
- `/api/health` funciona → Next.js está vivo
- `/` y `/design-lab/v0-network` dan 404 → los archivos de página no existen en `.next/`
- Build local desde `scaffold/ids-v2-dev-env-01` funciona perfectamente

**A. Workflow construido desde rama incorrecta**

`workflow_dispatch` pide al usuario seleccionar una rama. Si se seleccionó `main` (o default), el checkout usa esa rama, no `scaffold/ids-v2-dev-env-01`.

**Causa más probable (alta confianza):**
El workflow fue lanzado desde la branch `main` en lugar de `scaffold/ids-v2-dev-env-01`. La imagen `ids-web:staging` publicada corresponde a un build de `main` que no tiene las rutas de página esperadas (o está roto).

---

## T9 — Recomendación

**Fase recomendada:** `IDS-GHCR-WEB-STAGING-TAG-VERIFY-01`

### Acción correctiva:

1. Ir a https://github.com/albertgracia/ids-app/actions/workflows/publish-staging-images.yml
2. Click "Run workflow"
3. **Seleccionar branch: `scaffold/ids-v2-dev-env-01`** (¡crítico!)
4. Ejecutar y esperar a que pase
5. Verificar que `ids-web` job pase (check log para confirmar que construye la app correcta)
6. Luego proceder con T4-T7 del plan de deploy (pull + up -d ids-web)

### Alternativa: build local y push directo

Si no se quiere usar GHCR como intermediario, se puede hacer desde la máquina local:

```bash
docker build -f apps/web/Dockerfile -t ghcr.io/albertgracia/ids-app/ids-web:staging .
docker push ghcr.io/albertgracia/ids-app/ids-web:staging
```

(Luego SSH a staging y `docker pull`.)

---

## T10 — Qué NO se tocó

- [x] No se tocó staging.
- [x] No se hizo pull de imágenes.
- [x] No se redeployó.
- [x] No se reiniciaron contenedores.
- [x] No se tocó backend.
- [x] No se tocó DB/Redis.
- [x] No se tocó Nginx/Cloudflare.
- [x] No se modificó .env.
- [x] No se expusieron secretos.

---

## Próxima fase recomendada

**IDS-GHCR-WEB-STAGING-TAG-VERIFY-01**

Refrescar el tag `staging` de GHCR desde la rama correcta y validar el deploy.
