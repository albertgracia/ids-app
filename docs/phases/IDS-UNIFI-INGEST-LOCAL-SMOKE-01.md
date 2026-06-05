# FASE: IDS-UNIFI-INGEST-LOCAL-SMOKE-01

**Resultado:** PASS

**Fecha:** 2026-06-06

---

## 1. Resultado

Se ejecuto un smoke local real de ingest UniFi contra `ids-core` levantado en Windows, usando solo payloads y samples sinteticos.

Se verifico:

- health local OK;
- auth negativa `401/403`;
- POST manual sintetico aceptado;
- dedupe cross-request in-memory observable;
- collector con `--send=true` enviando a endpoint local OK;
- guardrail anti-`.40` OK.

No se toco `.40` en ningun momento.

## 2. Estado del repositorio

| Item | Valor |
|---|---|
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `35d3752` |
| HEAD final | pendiente del commit documental |
| Working tree inicial | limpio |

## 3. Entorno local

| Item | Estado |
|---|---|
| Docker Desktop | disponible |
| Docker usado | no |
| Metodo de arranque ids-core | `go run ./cmd/ids-core` |
| Puerto local | `18088` |
| Storage mode | `memory` |

Token temporal local usado solo en runtime del proceso y comandos locales. No persistido en repo ni en `.env`.

## 4. Arranque local de ids-core

Se levanto `ids-core` local con:

- `IDS_UNIFI_INGEST_TOKEN=local-unifi-smoke-token`
- `IDS_CORE_PORT=18088`

Sin Postgres local; se uso `memory` por ser suficiente para la fase de smoke.

## 5. Health local

| Endpoint | Resultado |
|---|---|
| `/healthz` | HTTP 200 |
| `/readyz` | HTTP 200 |
| `/api/v1/status` | HTTP 200 |

`/api/v1/status` reporto `storage_mode=memory` y capability `unifi_internal_ingest_dry_run`.

## 6. Auth negativa local

### Sin token

- Request local sin header `Authorization`
- Resultado: **HTTP 401**

### Token incorrecto

- Request local con `Authorization: Bearer wrong-token`
- Resultado: **HTTP 403**

### Token correcto

- Request local con `Authorization: Bearer local-unifi-smoke-token`
- Resultado: aceptado

## 7. Payload manual sintetico

Se creo temporal fuera del repo:

- `source=unifi`
- `source_host=synthetic-gateway`
- `collector_id=unifi-local-smoke`
- `batch_id=local-smoke-001`
- 2 eventos sinteticos:
  - `dns_gateway_event`
  - `mca_event`

### Primera ejecucion

- HTTP 200
- `accepted=2`
- `rejected=0`
- `duplicates=0`

### Segunda ejecucion (mismo payload)

- HTTP 200
- `accepted=0`
- `rejected=0`
- `duplicates=2`

Conclusion: el dedupe cross-request in-memory de 5 minutos fue observable localmente.

## 8. Collector `--send=true` local

Samples sinteticos usados:

- `coredns.json.log`
- `mca.log`
- `dpi-flow-stats.log`

Endpoint local:

- `http://127.0.0.1:18088/api/internal/v1/ingest/events/unifi`

### Primera ejecucion

- parsed: `6`
- batch events: `6`
- `send=true`
- `accepted=6`
- `rejected=0`
- `duplicates=0`

### Segunda ejecucion

- parsed: `6`
- batch events: `6`
- `accepted=0`
- `rejected=0`
- `duplicates=6`

Conclusion: el collector puede construir el lote, enviarlo al endpoint local y observar el dedupe cross-request del endpoint.

## 9. Guardrail anti-.40

Se intento enviar a:

- `http://192.168.1.40:8088/api/internal/v1/ingest/events/unifi`

Resultado:

- rechazo controlado
- mensaje: `refusing to send to non-local endpoint in local dry-run mode`
- no hubo POST

## 10. Events recent local

Se consulto:

- `GET /api/v1/events/recent`

Resultado:

- HTTP 200
- visible al menos el batch manual almacenado en `memory`
- consulta util para confirmar persistencia local basica del smoke

Nota: la consulta se ejecuto en paralelo al resto del smoke, por lo que el conteo observado en pantalla es orientativo y no se usa como metrica principal de cierre.

## 11. Tests

### `go test ./... -count=1`

PASS

### `task check`

PASS con solo issues preexistentes fuera de scope:

- `apps/web` ESLint 10 circular JSON
- `services/mcp-server` ruff `F401 uvicorn`

## 12. Limpieza

- token temporal eliminado del entorno del shell
- payload temporal eliminado
- logs temporales del proceso eliminados
- `ids-core` local detenido

Comprobacion final:

- no quedaron temporales en `C:\Users\leobc\AppData\Local\Temp\opencode\unifi-local-smoke`
- no quedo proceso `ids-core` corriendo

## 13. Qué NO se tocó

- No se toco UniFi
- No se cambio SIEM
- No se activo NetFlow/IPFIX
- No se cambio modo IDS/IPS
- No se ejecuto BlackSun
- No se hicieron escaneos/ataques
- No se uso API key UniFi
- No se modifico rsyslog
- No se reinicio rsyslog
- No se modifico Promtail
- No se toco Loki/Grafana
- No se toco Docker/firewall de `.40`
- No se hizo POST/live ingest contra `.40`
- No se usaron logs reales
- No se commitearon logs reales/sanitizados
- No se commitearon secretos/tokens
- No se crearon migrations

## 14. Próxima fase recomendada

**IDS-UNIFI-FILE-TAIL-DESIGN-01**
