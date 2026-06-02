# IDS-V0-STAGING-PREVIEW-MANUAL-DEPLOY-01

## Resultado

**PARTIAL** — despliegue técnico preparado pero no ejecutado. El agente no tiene SSH ni `gh` CLI / PAT para triggerear el workflow ni acceder al servidor. Los comandos exactos se documentan para que el operador humano los ejecute.

## Agente principal

@devops-engineer

## Apoyo

@frontend-specialist (obligatorio)
@debugger (obligatorio)

---

## T1 — Baseline local git (ejecutado)

```powershell
git status --short
# (limpio)

git status -sb
# ## scaffold/ids-v2-dev-env-01...origin/scaffold/ids-v2-dev-env-01

git branch --show-current
# scaffold/ids-v2-dev-env-01

git rev-parse --short HEAD
# e0dd3da

git rev-parse --short origin/scaffold/ids-v2-dev-env-01
# e0dd3da

git log --oneline --decorate -5
# e0dd3da (HEAD -> scaffold/ids-v2-dev-env-01, origin/scaffold/ids-v2-dev-env-01) docs(phases): add v0 staging preview plan
# 3072947 feat(web): surface Suricata EVE context in v0 design lab
# 20fda29 feat(web): add synthetic GeoIP to v0 design lab
# 510daca feat(web): integrate scoring severity into v0 design lab
# 958ca95 feat(web): integrate asset classifier into v0 design lab
```

**Confirmado:** HEAD local = `e0dd3da`, origin = `e0dd3da`, working tree limpio.

---

## T2 — Workflow GHCR

Archivo: `.github/workflows/publish-staging-images.yml`

- **Trigger:** `workflow_dispatch` (manual)
- **Imagen ids-web:** `ghcr.io/albertgracia/ids-app/ids-web:staging`
- **Tag adicional:** `<commit-sha>`
- **Dockerfile:** `apps/web/Dockerfile`
- **Perfil:** `linux/amd64`

No se pudo verificar existencia de la imagen `staging` en GHCR (401 sin autenticación). Hay que lanzar el workflow manualmente desde GitHub UI.

---

## T3 — Pasos para el operador humano

### Paso 1 — Lanzar workflow

1. Ir a: https://github.com/albertgracia/ids-app/actions/workflows/publish-staging-images.yml
2. Click "Run workflow"
3. Branch: `scaffold/ids-v2-dev-env-01`
4. Esperar a que todos los jobs pasen (~5-10 min)
5. Todos los servicios se publican (ids-core, ids-analytics, ids-mcp, ids-web), pero solo desplegaremos ids-web.

### Paso 2 — Verificar que la imagen se publicó

```bash
docker pull ghcr.io/albertgracia/ids-app/ids-web:staging
docker image inspect ghcr.io/albertgracia/ids-app/ids-web:staging --format '{{.Created}}'
```

---

## T4 — Baseline staging antes del deploy (SSH a 192.168.1.40)

```bash
ssh albert@192.168.1.40
# (usar tu clave SSH configurada)

# --- Verificar directorio ---
pwd
# /home/albert

cd /home/albert/docker/ids-app
hostname
date

# --- Snapshot de contenedores ---
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" | grep ids-

# --- Estado compose ---
docker compose --env-file .env -f compose.yaml ps

# --- Imagen actual de ids-web ---
docker inspect ids-web --format '{{.Config.Image}} {{.Image}}' | tee /tmp/ids-web-before-v0-preview.txt

# --- Healthchecks pre-deploy ---
curl -fsS http://127.0.0.1:3002/api/health || true
curl -I http://127.0.0.1:3002/ || true
curl -I http://127.0.0.1:3002/design-lab/v0-network || true
curl -fsS http://127.0.0.1:8088/healthz || true
curl -fsS http://127.0.0.1:8090/healthz || true
curl -fsS http://127.0.0.1:8091/healthz || true
```

Guardar la salida de estos comandos. Especialmente la imagen actual de ids-web.

---

## T5 — Pull solo ids-web

```bash
cd /home/albert/docker/ids-app
docker compose --env-file .env -f compose.yaml pull ids-web
```

**Importante:** NO ejecutar `docker compose pull` sin argumentos (bajaría todos los servicios). Solo `pull ids-web`.

---

## T6 — Redeploy solo ids-web

```bash
docker compose --env-file .env -f compose.yaml up -d ids-web
```

**Importante:** NO ejecutar `docker compose down`. NO recrear postgres/redis/core/analytics/mcp.

---

## T7 — Validación técnica post-deploy

Esperar 15-20 segundos después del `up -d`.

```bash
# --- Estado contenedores ---
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" | grep ids-
docker compose --env-file .env -f compose.yaml ps

# --- Healthchecks post-deploy ---
curl -fsS http://127.0.0.1:3002/api/health
echo ""
curl -I http://127.0.0.1:3002/
echo ""
curl -I http://127.0.0.1:3002/design-lab/v0-network
echo ""

# --- Backend sano ---
curl -fsS http://127.0.0.1:8088/healthz
echo ""
curl -fsS http://127.0.0.1:8090/healthz
echo ""
curl -fsS http://127.0.0.1:8091/healthz
echo ""

# --- Logs ids-web (últimas 120 líneas) ---
docker logs --tail=120 ids-web 2>&1

# --- Buscar errores ---
docker logs --tail=200 ids-web 2>&1 | grep -iE "error|failed|exception|panic|not found|EADDR|ECONN" || echo "Sin errores críticos"
```

---

## T8 — Validación visual (humana)

Abrir en navegador desde la LAN:

| URL | Qué comprobar |
|-----|---------------|
| `http://192.168.1.40:3002/` | Página principal, no rota, no reemplazada |
| `http://192.168.1.40:3002/design-lab/v0-network` | Carga, layout intacto, tabs funcionan, indicador fuente, badges |

### Checklist visual para `/design-lab/v0-network`:
- [ ] Carga sin pantalla blanca ni 404
- [ ] KPIs visibles (paquetes, ancho de banda, etc.)
- [ ] Packet Stream se renderiza
- [ ] Tabs funcionan: Stream, Estadísticas, Conexiones, Mapa
- [ ] Estadísticas: AssetSummaryBlock, SuricataSummary, AdvancedStatsDashboard, heatmap, chart
- [ ] Conexiones: lista con severity y asset badges
- [ ] Mapa: puntos geográficos sintéticos + LocationCards + security notice
- [ ] Header: source indicator, activos, scoring, EVE count
- [ ] No hay overflow horizontal grave
- [ ] No sustituye el dashboard principal (/ intacto)

---

## T9 — Rollback (solo si falla)

Si `/api/health` falla, `/` da error, `/design-lab/v0-network` da 500/404, o ids-web entra en restart loop:

```bash
# 1. Leer imagen anterior guardada
cat /tmp/ids-web-before-v0-preview.txt

# 2. Si la imagen anterior es distinta, forzar tag:
#    (ejemplo: ghcr.io/albertgracia/ids-app/ids-web:20fda29)
docker pull ghcr.io/albertgracia/ids-app/ids-web:<SHA_ANTERIOR>

# 3. O simplemente redeployar desde el tag staging anterior
#    si compose.yaml referencia :staging, docker pull puede bajar
#    lo que estaba antes si se pushea de nuevo el tag anterior.

# 4. Redeploy:
docker compose --env-file .env -f compose.yaml up -d ids-web

# 5. Verificar:
curl -fsS http://127.0.0.1:3002/api/health
curl -I http://127.0.0.1:3002/
```

**No tocar** otros servicios, volúmenes, .env, Nginx, Cloudflare.

---

## T10 — Limpieza (solo después de confirmar que todo funciona)

```bash
rm -f /tmp/ids-web-before-v0-preview.txt
```

No borrar imágenes Docker. No hacer prune.

---

## Causa de PARTIAL

| Recurso | Estado |
|---------|--------|
| `gh` CLI | No disponible |
| `GITHUB_TOKEN` / `GH_TOKEN` | No configurado en entorno |
| SSH `albert@192.168.1.40` | `Permission denied (publickey,password)` |
| Trigger workflow | No posible sin `gh` o PAT |
| Deploy | No posible sin SSH |

El agente no pudo ejecutar ninguna de las operaciones remotas. Se entrega el plan completo con comandos exactos para que el operador humano los ejecute.

---

## Confirmaciones

- [x] No se tocó DB.
- [x] No se tocó PostgreSQL.
- [x] No se tocó Redis.
- [x] No se tocó ids-core.
- [x] No se tocó analytics.
- [x] No se tocó MCP.
- [x] No se tocó Nginx.
- [x] No se tocó Cloudflare.
- [x] No se hizo docker compose down.
- [x] No se hizo prune.
- [x] No se modificó .env.
- [x] No se imprimieron secretos.
- [x] No se reemplazó `/`.
- [x] No se ejecutó deploy.

---

## Próxima fase recomendada

**IDS-V0-STAGING-PREVIEW-VISUAL-GATE-01**

El operador humano debe:
1. Ir a GitHub Actions → lanzar `Publish staging container images` en branch `scaffold/ids-v2-dev-env-01`.
2. SSH a 192.168.1.40 y ejecutar los comandos de las tareas T4-T10.
3. Reportar resultados de validación técnica y visual.
