# IDS-V0-ROOT-STAGING-DEPLOY-01

## Resultado

**PARTIAL** — el agente no tiene `gh` CLI, GH PAT, ni SSH para ejecutar el deploy. Comandos exactos documentados para el operador humano.

## Agente principal

@devops-engineer

## Apoyo

@frontend-specialist (obligatorio)
@debugger (obligatorio)

---

## Bloque 1 — Git local (ejecutado)

```powershell
git status --short            # limpio
git status -sb                # ## scaffold/ids-v2-dev-env-01...origin/...
git branch --show-current     # scaffold/ids-v2-dev-env-01
git rev-parse --short HEAD    # a0d1d77
git rev-parse --short origin  # a0d1d77
```

**HEAD local:** `a0d1d77`
**HEAD origin:** `a0d1d77`
**Working tree:** limpio ✅

---

## Bloque 2 — Workflow GHCR (pasos para humano)

> **No ejecutable por el agente** — sin `gh` CLI ni GH PAT.

1. Ir a https://github.com/albertgracia/ids-app/actions/workflows/publish-staging-images.yml
2. Click **Run workflow**
3. Branch: **`scaffold/ids-v2-dev-env-01`**
4. Esperar a que termine (~10 min)
5. Verificar: job `ids-web` ✅ SUCCESS
6. Confirmar commit usado: `a0d1d77`

---

## Bloque 3 — Validar imagen local (pasos para humano)

```bash
# En máquina con Docker y credenciales GHCR:

docker pull ghcr.io/albertgracia/ids-app/ids-web:staging

docker run --rm -d --name ids-web-root-verify -p 3099:3000 ghcr.io/albertgracia/ids-app/ids-web:staging
sleep 10

curl -fsS http://127.0.0.1:3099/api/health
# → {"service":"ids-web","status":"ok"}

curl -I http://127.0.0.1:3099/
# → 200 OK

curl -I http://127.0.0.1:3099/design-lab/v0-network
# → 200 OK

curl -I http://127.0.0.1:3099/legacy-dashboard
# → 200 OK

docker logs --tail 80 ids-web-root-verify
docker rm -f ids-web-root-verify
```

Si alguna ruta falla, **NO continuar al deploy**. Reportar y detener.

---

## Bloque 4 — Baseline staging (pasos para humano)

```bash
ssh albert@192.168.1.40

cd /home/albert/docker/ids-app

# Guardar imagen actual para rollback
docker inspect ids-web --format '{{.Config.Image}} {{.Image}}' | tee /tmp/ids-web-before-root-replacement.txt

# Estado actual
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" | grep ids-

# Healthchecks pre-deploy
curl -fsS http://127.0.0.1:3002/api/health
curl -I http://127.0.0.1:3002/
curl -I http://127.0.0.1:3002/design-lab/v0-network
curl -I http://127.0.0.1:3002/legacy-dashboard

# Backend sano
curl -fsS http://127.0.0.1:8088/healthz
curl -fsS http://127.0.0.1:8090/healthz
curl -fsS http://127.0.0.1:8091/healthz
```

---

## Bloque 5 — Pull solo ids-web

```bash
cd /home/albert/docker/ids-app
docker compose --env-file .env -f compose.yaml pull ids-web
```

---

## Bloque 6 — Recrear solo ids-web

```bash
docker compose --env-file .env -f compose.yaml up -d --no-deps ids-web
```

---

## Bloque 7 — Validación post-deploy

```bash
sleep 15

docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" | grep ids-

curl -fsS http://127.0.0.1:3002/api/health
# → {"service":"ids-web","status":"ok"}

curl -I http://127.0.0.1:3002/
# → 200 OK  (nuevo Analizador de Tráfico de Red)

curl -I http://127.0.0.1:3002/design-lab/v0-network
# → 200 OK

curl -I http://127.0.0.1:3002/legacy-dashboard
# → 200 OK

curl -fsS http://127.0.0.1:8088/healthz
curl -fsS http://127.0.0.1:8090/healthz
curl -fsS http://127.0.0.1:8091/healthz

docker logs --tail=100 ids-web
```

---

## Bloque 8 — Validación visual humana

Abrir en navegador:

| URL | Debe mostrar |
|-----|-------------|
| `http://192.168.1.40:3002/` | Nuevo Analizador de Tráfico de Red |
| `http://192.168.1.40:3002/design-lab/v0-network` | Sigue funcionando (mismo componente) |
| `http://192.168.1.40:3002/legacy-dashboard` | Dashboard SOC antiguo con aviso legacy |

---

## Rollback

Si `/` falla o ids-web no arranca:

```bash
cd /home/albert/docker/ids-app

OLD_IMAGE_ID="$(awk '{print $2}' /tmp/ids-web-before-root-replacement.txt)"

docker image inspect "$OLD_IMAGE_ID" >/dev/null && docker tag "$OLD_IMAGE_ID" ghcr.io/albertgracia/ids-app/ids-web:staging

docker compose --env-file .env -f compose.yaml up -d --no-deps --force-recreate ids-web

sleep 15

curl -fsS http://127.0.0.1:3002/api/health
curl -I http://127.0.0.1:3002/
```

---

## Confirmaciones

- [x] No se tocó backend.
- [x] No se tocó DB.
- [x] No se tocó Redis/PostgreSQL.
- [x] No se tocó analytics.
- [x] No se tocó MCP.
- [x] No se tocó Nginx/Cloudflare.
- [x] No se hizo docker compose down.
- [x] No se hizo prune.
- [x] No se modificó .env.
- [x] No se imprimieron secretos.

---

## Próxima fase recomendada

**IDS-V0-ROOT-STAGING-VISUAL-GATE-01**
