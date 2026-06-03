# IDS-V0-REAL-DATA-STAGING-VALIDATION-MANUAL-CLOSE-01

## Resultado

**PASS manual**

Esta fase documenta el cierre manual de `IDS-V0-REAL-DATA-STAGING-VALIDATION-01`, que habia quedado `PARTIAL` para el agente porque el acceso SSH no interactivo a `192.168.1.40` fallo por autenticacion.

El operador humano completo manualmente la validacion en staging y reporto resultado correcto.

## Relacion con la fase anterior

| Campo | Valor |
|-------|-------|
| Fase original | `IDS-V0-REAL-DATA-STAGING-VALIDATION-01` |
| Resultado agente | `PARTIAL` |
| Motivo del PARTIAL | SSH no interactivo fallo con `Permission denied (publickey,password)` |
| Resultado manual | `PASS manual` |
| Motivo del cierre manual | El operador ejecuto la validacion directamente en staging y confirmo los resultados |

## Rama y HEAD

| Campo | Valor |
|-------|-------|
| Repo | `E:\opencode\ids-app` |
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `9e8ec01` |
| HEAD final | commit documental de esta fase |

## Baseline staging validado manualmente

- Host: `ubuntu-server`
- Docker stack IDS running
- `ids-web` healthy
- `ids-core` healthy
- `ids-analytics` healthy
- `ids-mcp` healthy
- `ids-postgres` healthy
- `ids-redis` healthy
- `/api/health` OK
- `/` HTTP 200
- `ids-core /healthz` OK
- `ids-core /api/v1/status` OK
- `analytics /healthz` OK
- `analytics /api/v1/status` OK
- `mcp /healthz` OK

## Estado inicial de datos

Antes de generar eventos sinteticos controlados:

| Endpoint | Resultado |
|----------|-----------|
| `GET /api/v1/events/recent?limit=20` | `count=0` |
| `GET /api/v1/assets/classifications?limit=20` | `count=0` |

## Endpoint seguro identificado

Se inspecciono codigo local y se confirmo endpoint seguro:

```http
POST /api/v1/simulate/events
```

Evidencia indicada por el operador:

- `services/ids-core/cmd/ids-core/main.go`
- `services/ids-core/internal/api/handler.go`
- `apps/web/src/lib/ids-core.ts`
- `apps/web/src/components/SimulationPanel.tsx`

Propiedades del handler:

- Acepta solo POST
- Parsea JSON
- Valida `scenario`
- Limita `count` a maximo 100
- Genera eventos con simulador
- Guarda en repo
- Publica en broadcaster SSE
- Devuelve `items`, `count` y `scenario`

## Payload usado

```json
{
  "scenario": "scan_detected",
  "count": 3
}
```

## Eventos generados

Se ejecuto manualmente en staging:

```http
POST http://127.0.0.1:8088/api/v1/simulate/events
```

Resultado manual registrado:

- `count=3`
- Eventos tipo `scan_detected`
- `severity=high`
- `protocol=tcp`
- `zone=dmz`
- Direcciones origen externas sinteticas
- Destinos internos `192.168.1.100` / `192.168.1.200`
- Tags `scan` / `recon`
- Metadata `ports` / `type=syn`

## Events recent despues

`GET /api/v1/events/recent?limit=10`:

- `count=3`
- Los 3 eventos aparecen correctamente

## Asset classifier

`GET /api/v1/assets/classifications?limit=20`:

- `count=4`
- 2 `external_host`
- 2 `it_server`
- `confidence external_host=95`
- `confidence it_server=60`
- `criticality` high/critical segun activo
- `event_count` coherente

## SSE

`GET /api/v1/events/stream` con timeout 8s:

```text
event: connected
data: {"status":"connected"}
```

Resultado: SSE disponible y responde sin dejar la conexion abierta indefinidamente.

## Dashboard visual confirmado

El usuario abrio:

```text
http://192.168.1.40:3002/
```

Resultado visual confirmado:

- Total Packets = 3
- Sospechosos = 3
- Stream en Vivo muestra 3 eventos
- Severidad Alta visible
- Protocolos TCP/SSH activos
- Activos = 4
- Scoring = Analytics
- Polling activo
- IPs origen/destino visibles
- Sin pantalla blanca
- Sin 404
- Sin layout roto

## Logs finales

Se revisaron logs con grep de errores en:

- `ids-web`
- `ids-core`
- `ids-analytics`
- `ids-mcp`

Patrones buscados:

```text
error, failed, exception, panic, traceback, unhandled, ECONN, EADDR, EventSource, SSE
```

Resultado manual registrado:

- Sin errores criticos
- Sin panic
- Sin traceback
- Sin unhandled
- Sin ECONN/EADDR
- Sin restart loops

## Restart counts finales

Todos los servicios validados:

- `restartCount=0`
- `health=healthy`
- `status=running`

Servicios:

- `ids-web`
- `ids-core`
- `ids-analytics`
- `ids-mcp`
- `ids-postgres`
- `ids-redis`

## Que NO se toco

- No se modifico codigo funcional
- No se toco frontend
- No se toco backend
- No se toco `services/`
- No se toco DB
- No se toco Redis/Postgres
- No se toco analytics
- No se toco MCP
- No se toco Docker
- No se hizo deploy
- No se ejecuto docker compose
- No se hizo prune
- No se toco `.env`
- No se imprimieron secretos
- No se hicieron nuevos POST durante esta fase de cierre
- No se generaron nuevos eventos durante esta fase de cierre
- No se hizo Suricata real
- No se hicieron escaneos
- No se bloqueo trafico
- No se toco firewall
- No se toco Nginx/Cloudflare

## Riesgo residual

Total Bytes aparece como `0 B`.

Causa probable:

- Los eventos simulados `scan_detected` no traen tamano/bytes, o
- El adaptador frontend no extrae tamano desde este tipo de evento.

Impacto: no bloquea la fase. Queda como mejora futura menor.

## Proxima fase recomendada

**IDS-SURICATA-EVE-REAL-INGEST-PLAN-01**

Recomendacion: no pasar a Suricata real sin una fase especifica de planificacion segura. La siguiente fase debe definir alcance, fuentes de datos, payloads de prueba, controles de seguridad, rollback y criterios de no exposicion de trafico real sensible.
