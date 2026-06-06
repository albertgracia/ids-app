# IDS-CORE-STAGING-40-UNIFI-TOKEN-INJECTION-PLAN-01

**Resultado:** PASS

**Objetivo:** Planificar de forma segura la inyección temporal de `IDS_UNIFI_INGEST_TOKEN` en el contenedor ids-core de .40 para desbloquear el endpoint `POST /api/internal/v1/ingest/events/unifi`.

---

## Repo

| Item | Valor |
|------|-------|
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `1c3df88` |
| HEAD final | (por commit) |
| Git status final | Limpio |
| Push | (por realizar) |

## Baseline .40

| Item | Resultado |
|------|-----------|
| Host | `ubuntu-server` |
| Deploy dir | `/home/albert/docker/ids-app` |
| Compose/env strategy | `compose.yaml` con environment block usando `${VAR:-default}`. `.env` cargado vía `--env-file .env`. Sin `env_file:` en compose. |
| ids-core imagen | `ghcr.io/albertgracia/ids-app/ids-core:staging` (digest `sha256:23d64c263349...`) |
| ids-core health | Up healthy |
| Capability | ✅ `unifi_internal_ingest_dry_run` |
| Endpoint GET | `405 method not allowed` |
| Endpoint POST sin token | `503 IDS_UNIFI_INGEST_TOKEN not configured` |
| rsyslog | active |
| Puerto 8088 | LISTEN |

## Token/Env Actual

| Item | Resultado |
|------|-----------|
| `.env` existe | Sí (`/home/albert/docker/ids-app/.env`) |
| `IDS_UNIFI_INGEST_TOKEN` en `.env` | **No** |
| `IDS_UNIFI_INGEST_TOKEN` en container env | **No** |
| `IDS_UNIFI_INGEST_TOKEN` en compose.yaml | **No** |
| Secretos impresos | No |

### Cómo se pasan las variables actualmente

El `compose.yaml` define un bloque `environment:` para ids-core:

```yaml
environment:
  IDS_ENV: ${IDS_ENV:-staging}
  IDS_CORE_PORT: 8088
  DATABASE_URL: ${IDS_CORE_DATABASE_URL}
  REDIS_URL: ${IDS_REDIS_URL}
```

Docker Compose resuelve `${VAR}` desde el `.env` del proyecto (cargado con `--env-file .env`). Solo las variables **referenciadas en compose.yaml** llegan al contenedor.

Para añadir `IDS_UNIFI_INGEST_TOKEN` se requiere:
1. Añadir la variable al `.env`
2. **Y** referenciarla en el `environment` block del compose.yaml

## Plan Recomendado

### Opción elegida: **A — token temporal en .env + compose.yaml**

Estrategia más limpia: backup, inyectar, validar, retirar, restaurar.

### Paso 1: Backup seguro

```bash
# Backup del .env actual (contiene secretos - mantener fuera del repo)
cp /home/albert/docker/ids-app/.env /home/albert/docker/ids-app/backups/.env.pre-token-injection

# Backup del compose.yaml
cp /home/albert/docker/ids-app/compose.yaml /home/albert/docker/ids-app/backups/compose.yaml.pre-token-injection
```

### Paso 2: Generar token temporal

```bash
# Generar token seguro de 32 bytes hex
TOKEN=$(openssl rand -hex 32)
```

No imprimir, no guardar en repo, no persistir.

### Paso 3: Añadir token a .env

```bash
echo "IDS_UNIFI_INGEST_TOKEN=$TOKEN" >> /home/albert/docker/ids-app/.env
```

### Paso 4: Añadir variable a compose.yaml

Editar `compose.yaml` sección `ids-core.environment`, añadir línea:
```yaml
      IDS_UNIFI_INGEST_TOKEN: ${IDS_UNIFI_INGEST_TOKEN}
```

### Paso 5: Recrear solo ids-core

```bash
cd /home/albert/docker/ids-app
docker compose --env-file .env -f compose.yaml up -d --no-deps ids-core
```

### Paso 6: Validación sin ingest real

```bash
# 1. Health
curl -s http://127.0.0.1:8088/healthz

# 2. Endpoint con token y payload inválido → esperado 400
curl -s -w '\nHTTP: %{http_code}' -X POST \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <TOKEN>' \
  -d '{"source":"test","collector_id":"c1","source_host":"h1","batch_id":"b1","observed_at":"2026-06-06T12:00:00Z","events":[{"raw":"test","observed_at":"2026-06-06T12:00:00Z","idempotency_key":"test-1"}]}' \
  http://127.0.0.1:8088/api/internal/v1/ingest/events/unifi

# 3. Post-smoke: retirar token y validar que vuelve 503
```

Validaciones esperadas con token:
- `400` si payload válido pero evento inválido (sin `source`/`event_type`)
- `401`/`403` si token incorrecto
- `200` si payload y evento válidos (aceptaría eventos vacíos/tests)

Lo importante es que ya **no sea 503 ni 404**.

### Paso 7: Rollback

```bash
# Restaurar compose.yaml original
cp /home/albert/docker/ids-app/backups/compose.yaml.pre-token-injection /home/albert/docker/ids-app/compose.yaml

# Restaurar .env original (sin token)
cp /home/albert/docker/ids-app/backups/.env.pre-token-injection /home/albert/docker/ids-app/.env

# Recrear ids-core
docker compose --env-file .env -f compose.yaml up -d --no-deps ids-core

# Confirmar eliminación del token
curl -s -w '\nHTTP: %{http_code}' -X POST \
  -H 'Content-Type: application/json' \
  -d '{}' \
  http://127.0.0.1:8088/api/internal/v1/ingest/events/unifi
# Debe devolver 503 de nuevo

# Limpiar backups que contienen secretos si ya no se necesitan
rm /home/albert/docker/ids-app/backups/.env.pre-token-injection
```

### Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Token visible en backup .env | Backup se elimina tras rollback; no se commitea |
| Downtime en ids-core (~10s) | Stateless, reconnect automático |
| Error al editar compose.yaml | Backup previo garantiza restauración |
| Token en history de shell | Usar `HISTFILE=/dev/null` o script temporal |
| Token en environment de contenedor | Se elimina al recrear sin la línea |

## Separación de Fases

**Recomendación: 2 fases separadas**

1. **IDS-CORE-STAGING-40-UNIFI-TOKEN-INJECTION-01** (siguiente)
   - Backup → añadir token a .env + compose → recreate ids-core
   - Validar endpoint (503 eliminado, auth funcional)
   - SIN collector, SIN send, SIN ingest real
   - Dejar token para fase siguiente o retirar según plan

2. **IDS-UNIFI-STAGING-40-TAIL-SEND-SMOKE-RETRY-02** (pendiente de autorización)
   - Usar token ya inyectado
   - Compilar collector, copiar a /tmp
   - Ejecutar con `--send=true --once start-position=end`
   - Retirar token al finalizar

**Motivo:** Separar responsabilidades. La inyección de token es una operación de infraestructura (modificar compose + .env + recrear). El send smoke es una operación de aplicación (ejecutar collector). Si algo falla en el smoke, el token no queda huérfano si la fase de retirada está planificada.

## Tests

| Suite | Resultado |
|-------|-----------|
| `go test ./...` | OK |

## Documentación

| Item | Resultado |
|------|-----------|
| Informe creado | `docs/phases/IDS-CORE-STAGING-40-UNIFI-TOKEN-INJECTION-PLAN-01.md` |
| Commit | (por realizar) |
| Push | (por realizar) |

## Confirmaciones

- [x] No se modificó .env
- [x] No se recreó ids-core
- [x] No se ejecutó collector
- [x] No se usó `--send=true`
- [x] No se hizo ingest real
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
- [x] No se tocó firewall
- [x] No se recreó postgres/redis/ids-web/ids-analytics/ids-mcp
- [x] No se imprimieron logs reales
- [x] No se imprimieron secretos
- [x] No se commitearon logs/secretos/tokens/binarios/state-files

## Próxima Fase Recomendada

**IDS-CORE-STAGING-40-UNIFI-TOKEN-INJECTION-01**

Ejecutar el plan definido en este documento:
1. Backup de .env y compose.yaml
2. Generar token temporal
3. Añadir a .env
4. Añadir variable a compose.yaml
5. Recrear solo ids-core
6. Validar endpoint sin ingest real (503 eliminado)
7. Decidir si dejar token para send smoke posterior o retirar inmediatamente
