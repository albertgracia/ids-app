# FASE: IDS-UNIFI-STAGING-40-TAIL-SEND-SMOKE-01

**Resultado:** PARTIAL

**Fecha:** 2026-06-06

---

## 1. Motivo

Esta fase debía ejecutar el primer smoke controlado con `--send=true` desde `.40` hacia `ids-core` local por loopback. Sin embargo, la validación previa del endpoint interno en `.40` detectó que la ruta UniFi no está desplegada en el runtime actual del servidor.

Por seguridad, no se intentó ningún `POST` real.

## 2. Estado del repositorio

| Item | Valor |
|---|---|
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `3c6f19a` |
| HEAD final | pendiente del commit documental |
| Working tree inicial | limpio |

## 3. Baseline `.40`

### Host

- `ubuntu-server`

### ids-core health inicial

- `/healthz` OK
- `/readyz` OK
- `/api/v1/status` OK

### rsyslog inicial

- `active`

### Puertos

- `1514` TCP+UDP LISTEN
- `15514` TCP+UDP LISTEN
- `8088` TCP LISTEN

### Log metadata

- `/var/log/unifi/ids.log` existe, ~956 KB
- `/var/log/unifi/traffic.log` existe, ~3.6 MB

### Repo remoto staging

- `/home/albert/docker/ids-app` existe

## 4. Endpoint ingest

Endpoint previsto:

- `http://127.0.0.1:8088/api/internal/v1/ingest/events/unifi`

Metodo usado en esta fase:

- `GET` read-only

Resultado observado:

- HTTP `404`
- respuesta: `404 page not found`

Interpretación:

- el runtime actual de `.40` no expone el endpoint UniFi interno esperado
  o
- la versión desplegada de `ids-core` no coincide con la validada localmente

Consecuencia operativa:

- **sin endpoint disponible, no es seguro ejecutar `--send=true`**
- la fase se cierra como `PARTIAL` antes de cualquier intento de envío real

### Sin POST real

- sí, no se hizo ningún `POST`

## 5. Qué no se ejecutó por seguridad

No se ejecutó:

- copia de binario temporal
- creación de env/token temporal en `.40`
- ejecución del collector con `--send=true`
- creación de state-file temporal de send smoke
- consulta posterior de `events/recent` asociada a eventos UniFi enviados

Motivo: el endpoint no está disponible en `.40`.

## 6. Plan SEND-SMOKE-01 confirmado

El plan sigue siendo válido en términos de diseño:

- endpoint loopback `127.0.0.1`
- token temporal fuera del repo
- `start-position=end`
- `batch-size` pequeño (`10` o `25`)
- sin replay histórico
- rollback inmediato

Pero no puede ejecutarse hasta resolver el prerrequisito:

- desplegar o verificar la versión de `ids-core` en `.40` con el endpoint interno UniFi

## 7. Tests

### `go test ./... -count=1`

PASS

### `task check`

PASS con solo incidencias conocidas y preexistentes:

- `apps/web` ESLint 10 circular JSON
- `services/mcp-server` ruff `F401 uvicorn`

## 8. Qué NO se tocó

- No se tocó UniFi
- No se modificó SIEM
- No se activó NetFlow/IPFIX
- No se cambió IDS/IPS
- No se ejecutó BlackSun
- No se hicieron escaneos
- No se usó API key UniFi
- No se modificó rsyslog
- No se reinició rsyslog
- No se tocó Promtail/Loki/Grafana
- No se tocó Docker/firewall de `.40`
- No se instalaron binarios permanentes
- No se crearon usuarios permanentes
- No se creó env permanente
- No se creó systemd
- No se hizo POST/live ingest
- No se usó `--send=true`
- No se imprimieron logs reales
- No se commitearon logs/secretos/tokens/binarios/state-files

## 9. Próxima fase recomendada

**IDS-CORE-STAGING-40-UNIFI-ENDPOINT-DEPLOY-PLAN-01**

Antes de reintentar el send smoke, hace falta planificar/verificar el despliegue de la versión de `ids-core` que incorpora el endpoint UniFi interno en `.40`.
