# IDS-CORE-STAGING-40-UNIFI-ENDPOINT-DEPLOY-PLAN-01

**Resultado:** PASS

**Objetivo:** Planificar despliegue en `.40` de versión de `ids-core` que exponga el endpoint interno UniFi.

---

## 1. Baseline Local

| Item | Valor |
|------|-------|
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `4223336 docs(phases): record UniFi tail send smoke partial` |
| HEAD final | `4223336` (sin cambios de código) |
| Git status | Limpio |
| Sincronización | `origin/scaffold/ids-v2-dev-env-01` actual |

## 2. Baseline .40 (Read-Only)

| Item | Resultado |
|------|-----------|
| Hostname | `ubuntu-server` |
| Repo remoto | `/home/albert/docker/ids-app` — **NO es git repo**, es directorio de despliegue |
| Contenedor ids-core | `ghcr.io/albertgracia/ids-app/ids-core:staging` — Up, healthy |
| Imagen creada | `2026-06-03T18:21:13Z` |
| `/healthz` | `{"service":"ids-core","status":"ok"}` |
| `/readyz` | `{"service":"ids-core","ready":true}` |
| `/api/v1/status` | `{"service":"ids-core","status":"ok","mode":"development","version":"0.1.0","storage_mode":"memory","capabilities":["event_model","asset_inventory_model","simulated_ingest","suricata_eve_parser","suricata_eve_ingest","live_events_stream","asset_behavior_classifier"],"live_stream":"sse"}` |
| Puerto 8088 | LISTEN (confirmado por docker ps) |
| rsyslog | active |
| Puertos 1514/15514 | No verificables sin sudo interactivo; asumido OK de fase anterior |

## 3. Endpoint UniFi

| Aspecto | Resultado |
|---------|-----------|
| Path esperado | `POST /api/internal/v1/ingest/events/unifi` |
| GET en .40 | `404 page not found` |
| POST (JSON vacío) en .40 | `404 page not found` |
| Endpoint existe en código HEAD | **SÍ** — `main.go:92`, handler `unifi_ingest_handler.go` |
| Endpoint desplegado en .40 | **NO** |
| Causa probable | Imagen desactualizada |

### Clasificación del gap: **A**

> **A)** Código existe en repo pero `.40` ejecuta imagen antigua.

**Evidencia:**
- Código local HEAD `4223336` incluye:
  - `main.go:78` — `uniFiHandler := api.NewUniFiIngestHandler(repo, broadcaster)`
  - `main.go:92` — `mux.HandleFunc("/api/internal/v1/ingest/events/unifi", uniFiHandler.HandleBatch)`
  - `main.go:150` — capability `"unifi_internal_ingest_dry_run"` en `/api/v1/status`
- Imagen `.40` (`ghcr.io/albertgracia/ids-app/ids-core:staging`) creada `2026-06-03`:
  - Status NO incluye `unifi_internal_ingest_dry_run`
  - GET/POST devuelven `404 page not found` (Go default handler, no nuestro JSON)
- Commits con endpoint UniFi son posteriores a `2026-06-03`:
  - `d4111ac` (2026-06-06 00:29): `feat(core): add UniFi ingest contract dry run`
  - `35d3752` (2026-06-06 00:42): `feat(core): add UniFi collector batch dry run`
  - `682bcaa` (2026-06-06 01:14): `feat(core): add UniFi file tail dry run`

**404 es Go `http.NotFound` — no es nuestra app.** El routeo no existe en el binario.

## 4. Cómo se despliega ids-core en .40

### Mecanismo

- **Compose file:** `/home/albert/docker/ids-app/compose.yaml`
- **Imagen:** `ghcr.io/albertgracia/ids-app/ids-core:staging`
- **Tag actual:** `staging` (apunta a imagen `2026-06-03`)
- **Publicación:** GitHub Actions manual `publish-staging-images.yml` — `workflow_dispatch`
- **Registry:** GHCR `ghcr.io/albertgracia/ids-app/ids-core`
- **Contexto build:** raíz del repo (`context: .`)
- **Dockerfile:** `services/ids-core/Dockerfile`

### Composición actual en .40

```
ids-core      ghcr.io/albertgracia/ids-app/ids-core:staging      Up (healthy)    :8088
ids-analytics ghcr.io/albertgracia/ids-app/ids-analytics:staging Up (healthy)    :8090
ids-mcp       ghcr.io/albertgracia/ids-app/ids-mcp:staging       Up (healthy)    :8091
ids-web       ghcr.io/albertgracia/ids-app/ids-web:staging       Up (healthy)    :3002
ids-postgres  postgres:16-alpine                                  Up (healthy)
ids-redis     redis:7-alpine                                      Up (healthy)
```

### Env relevante de ids-core (sin valores)

| Variable | Propósito |
|----------|-----------|
| `IDS_CORE_PORT` | Puerto (8088) |
| `DATABASE_URL` | Postgres (seteada pero no usada porque `IDS_STORAGE_MODE=memory` por defecto) |
| `REDIS_URL` | Redis |
| `IDS_UNIFI_INGEST_TOKEN` | **NO existe en .env ni .env.example** — necesaria para el endpoint |

### Volúmenes

- `./data/postgres` → datos PostgreSQL (no usado por ids-core actualmente)
- `./data/redis` → datos Redis

### Red

- `ids-net` (bridge)

### Healthcheck

```
wget -qO- http://127.0.0.1:8088/healthz
```

### Comando de arranque

```bash
docker compose --env-file .env -f compose.yaml up -d
```

### Rollback actual documentado

```bash
docker compose --env-file .env -f compose.yaml down
```

### Nota importante

El `.40` **no tiene git repo**. No se puede hacer `git pull`. El código se despliega exclusivamente como imagen Docker desde GHCR.

## 5. Plan de Despliegue

### Opción recomendada

**Publicar nueva imagen `staging` desde HEAD actual, luego actualizar en .40.**

### Prerrequisitos

1. Código en `scaffold/ids-v2-dev-env-01` con HEAD `4223336` (o posterior).
2. Tests Go pasando (confirmado: `go test ./...` OK).
3. Acceso a GitHub para ejecutar `workflow_dispatch`.
4. Acceso SSH a `.40`.

### Paso 1: Publicar imagen (GitHub Actions)

1. Ir a GitHub → `albertgracia/ids-app` → Actions → `Publish staging container images`
2. Click `Run workflow` → branch `scaffold/ids-v2-dev-env-01`
3. Esperar a que los 4 servicios se publiquen (~5 min).
4. Verificar nueva imagen:
   ```bash
   # Desde cualquier host con curl, obtener digest:
   curl -s -H "Accept: application/vnd.docker.distribution.manifest.v2+json" \
     "https://ghcr.io/v2/albertgracia/ids-app/ids-core/manifests/staging" \
     | jq -r '.config.digest'
   ```

### Paso 2: Preflight en .40

```bash
# Registrar estado pre-despliegue
docker inspect ids-core --format '{{.Image}}'
docker images ghcr.io/albertgracia/ids-app/ids-core:staging
curl -s http://127.0.0.1:8088/api/v1/status | jq '.capabilities'
```

### Paso 3: Backup del compose actual

```bash
cp /home/albert/docker/ids-app/compose.yaml /home/albert/docker/ids-app/backups/compose.yaml.pre-unifi-endpoint
```

### Paso 4: Actualizar .env (opcional, solo si se necesita ingest real)

**No requerido para validación del endpoint.** El endpoint responde `503` si `IDS_UNIFI_INGEST_TOKEN` no está configurado.

Solo si se planea `--send=true` en futuro cercano:
```
IDS_UNIFI_INGEST_TOKEN=<generar-token-seguro>
```

### Paso 5: Pull y recrear ids-core

```bash
# Pull nueva imagen
docker compose --env-file .env -f compose.yaml pull ids-core

# Recrear solo ids-core (sin tocar otros servicios)
docker compose --env-file .env -f compose.yaml up -d ids-core
```

### Paso 6: Health gates post-despliegue

```bash
# 1. Health básico
curl -s http://127.0.0.1:8088/healthz
curl -s http://127.0.0.1:8088/readyz

# 2. Status con capacidades
curl -s http://127.0.0.1:8088/api/v1/status | jq '.capabilities'
# Debe incluir: "unifi_internal_ingest_dry_run"

# 3. Endpoint UniFi (sin token — debe responder 503, no 404)
curl -s -w '\nHTTP: %{http_code}' -X POST \
  -H 'Content-Type: application/json' \
  -d '{"source":"test","events":[]}' \
  http://127.0.0.1:8088/api/internal/v1/ingest/events/unifi
# Esperado: HTTP 503 y mensaje "IDS_UNIFI_INGEST_TOKEN not configured"

# 4. Eventos recientes (sano)
curl -s http://127.0.0.1:8088/api/v1/events/recent

# 5. Verificar que otros endpoints siguen funcionando
curl -s http://127.0.0.1:8090/healthz
curl -s http://127.0.0.1:3002/api/health

# 6. Rsyslog y puertos no tocados
systemctl is-active rsyslog
ss -tulpn | grep -E '1514|15514'
```

### Paso 7: Rollback

```bash
# Si algo sale mal, restaurar imagen anterior:
docker pull ghcr.io/albertgracia/ids-app/ids-core:staging@<digest-anterior>
# O forzar tag anterior si se conservó:
docker tag ghcr.io/albertgracia/ids-app/ids-core:<commit-sha-anterior> ghcr.io/albertgracia/ids-app/ids-core:staging
docker compose --env-file .env -f compose.yaml up -d ids-core
```

Si el rollback de imagen no funciona:
```bash
docker compose --env-file .env -f compose.yaml down ids-core
docker compose --env-file .env -f compose.yaml up -d ids-core
```

### Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Downtime de ids-core (~10-30s) | Servicio stateless; reconnect automático de clients |
| Postgres no usado (memory mode) | Sin riesgo; almacenamiento sigue en memoria |
| Otros servicios (analytics, mcp, web) | NO se tocan; solo `ids-core` se recrea |
| Token no configurado → 503 | Esperado; no impide validación del endpoint |
| Imagen no se encuentra en GHCR | Verificar publish antes de pull |
| `sudo` requiere terminal en .40 | Usar comandos que no requieran sudo (docker, curl) |

### Criterio PASS/PARTIAL/FAIL

**PASS si:**
- `/api/v1/status` incluye `unifi_internal_ingest_dry_run` en capabilities
- `POST /api/internal/v1/ingest/events/unifi` devuelve `503` con mensaje de token no configurado (no 404)
- `/healthz`, `/readyz`, `/api/v1/events/recent` sanos
- rsyslog activo, puertos 1514/15514 sin cambios
- No se hace POST con datos reales
- No se usa `--send=true`

**PARTIAL si:**
- Endpoint responde pero capability no aparece en status (inconsistencia menor)
- Token no configurado (esperado, no bloqueante)

**FAIL si:**
- ids-core no healthy después del deploy
- Se hace ingest real sin autorización
- Se tocan otros servicios
- Se modifican rsyslog/firewall/UniFi

## 6. Tests Locales

| Suite | Resultado |
|-------|-----------|
| `go test ./...` | OK (todos pasan o en caché) |
| `task check` | PASS (eslint warning conocido, ruff F401 conocido en mcp) |

## 7. Documentación

- Informe: `docs/phases/IDS-CORE-STAGING-40-UNIFI-ENDPOINT-DEPLOY-PLAN-01.md`
- Commit: `docs(core): plan staging unifi endpoint deploy`
- Push: `origin/scaffold/ids-v2-dev-env-01`

## 8. Confirmaciones

- [x] No se tocó UniFi
- [x] No se modificó SIEM
- [x] No se activó NetFlow/IPFIX
- [x] No se cambió IDS/IPS
- [x] No se ejecutó BlackSun
- [x] No se hicieron escaneos
- [x] No se usó API key UniFi
- [x] No se modificó rsyslog
- [x] No se reinició rsyslog
- [x] No se tocó Promtail/Loki/Grafana
- [x] No se tocó Docker/firewall salvo inspección read-only
- [x] No se hizo POST/live ingest
- [x] No se usó `--send=true`
- [x] No se imprimieron logs reales
- [x] No se imprimieron secretos
- [x] No se cambiaron contenedores en esta fase
- [x] No se commitearon logs/secretos/tokens/binarios/state-files

## 9. Próxima Fase Recomendada

**`IDS-CORE-STAGING-40-UNIFI-ENDPOINT-DEPLOY-01`**

Ejecutar el plan descrito en la sección 5:
1. Disparar `workflow_dispatch` en GitHub Actions para publicar imágenes
2. En .40: pull + recreate ids-core
3. Validar endpoint (503 esperado, no 404)
4. Rollback preparado
5. Sin ingest real, sin `--send=true`, sin token
