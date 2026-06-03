# IDS-SURICATA-EVE-BATCH-LIMITS-01

## Resultado

**PASS**

Se validaron de forma controlada los comportamientos principales del endpoint batch Suricata EVE en staging. El batch valido pequeno funciona, cuerpo vacio y JSON invalido devuelven errores controlados, SSE sigue disponible, logs quedan limpios y no hubo incremento de `restartCount`.

Se confirma un riesgo de hardening: el limite `>100` se valida despues de parsear y guardar eventos, por lo que no se ejecuto la prueba de 101 eventos para evitar escrituras parciales/masivas en staging.

## Rama y HEAD

| Campo | Valor |
|-------|-------|
| Repo | `E:\opencode\ids-app` |
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `8e3df20` |
| HEAD origin inicial | `8e3df20` |
| Working tree inicial | limpio |

## SSH

Alias usado: `ids-observabilidad`.

Resultado:

```text
ubuntu-server
albert
/home/albert
```

## Handler inspeccionado

Archivos:

- `services/ids-core/cmd/ids-core/main.go`
- `services/ids-core/internal/api/suricata_handler.go`
- `services/ids-core/internal/suricata/ingest.go`

Endpoint:

```text
POST /api/v1/suricata/eve/batch
```

Formato confirmado:

- JSON Lines / NDJSON.
- Un evento EVE JSON por linea.
- No acepta array JSON como contrato documentado.

Flujo del handler:

1. Rechaza metodos distintos de POST con 405.
2. Lee body completo.
3. Rechaza body vacio.
4. Llama `EVEIngestor.IngestJSONLines`.
5. `IngestJSONLines` escanea linea por linea.
6. Cada linea no vacia se parsea con `ParseEVEJSON`.
7. Cada evento parseado se guarda inmediatamente en `EventRepository`.
8. Tras volver al handler, si `len(events) > 100`, responde 400.
9. Si no supera limite, publica cada evento en SSE.
10. Devuelve `{ items, source: "suricata_eve", count }`.

Limite declarado:

```go
if len(events) > 100 {
    writeJSON(w, 400, map[string]string{"error": "batch exceeds maximum of 100 events"})
    return
}
```

Validacion antes/despues:

- El limite se valida **despues** de parsear y guardar.

Riesgo de escritura parcial:

- Confirmado.
- Si se envia un batch de mas de 100 eventos validos, el ingestor puede guardar eventos antes de que el handler rechace por limite.
- Si hay un error en una linea intermedia, las lineas validas anteriores ya pueden haber sido guardadas.

## Baseline staging

Fecha remota aproximada:

```text
mie 03 jun 2026 19:57:16 CEST
uptime: 10:03
```

Servicios:

| Servicio | Estado |
|----------|--------|
| ids-web | Up 10 hours (healthy) |
| ids-core | Up 10 hours (healthy) |
| ids-analytics | Up 10 hours (healthy) |
| ids-mcp | Up 10 hours (healthy) |
| ids-postgres | Up 10 hours (healthy) |
| ids-redis | Up 10 hours (healthy) |

Restart counts before:

```text
/ids-web restart=unless-stopped status=running health=healthy restartCount=0
/ids-core restart=unless-stopped status=running health=healthy restartCount=0
/ids-analytics restart=unless-stopped status=running health=healthy restartCount=0
/ids-mcp restart=unless-stopped status=running health=healthy restartCount=0
/ids-postgres restart=unless-stopped status=running health=healthy restartCount=0
/ids-redis restart=unless-stopped status=running health=healthy restartCount=0
```

ids-core status:

```json
{"service":"ids-core","status":"ok","mode":"development","version":"0.1.0","storage_mode":"memory","capabilities":["event_model","asset_inventory_model","simulated_ingest","suricata_eve_parser","suricata_eve_ingest","live_events_stream","asset_behavior_classifier"],"live_stream":"sse"}
```

Web:

- `/api/health` OK.
- `/` HTTP 200.

## Events/classifications before

`GET /api/v1/events/recent?limit=20`:

- `count=7`.
- Incluia eventos previos de replay Suricata EVE (`alert`, `dns`, `tls`) y eventos sinteticos `scan_detected`.

`GET /api/v1/assets/classifications?limit=30`:

- `count=9`.

## Samples usados

Samples existentes y sinteticos:

- `packages/contracts/suricata/samples/alert-scan-detected.json`
- `packages/contracts/suricata/samples/dns-query.json`
- `packages/contracts/suricata/samples/tls-handshake.json`

No se modificaron samples ni se usaron datos reales.

## Batch valido pequeno

Payload construido en memoria desde Windows como JSON Lines compactado, con 3 eventos.

Endpoint:

```text
POST http://127.0.0.1:8088/api/v1/suricata/eve/batch
Content-Type: application/x-ndjson
```

Resultado:

- HTTP 200.
- `source=suricata_eve`.
- `count=3`.
- Eventos devueltos:
  - `alert` -> `scan_detected`, `high`, `modbus`.
  - `dns` -> `network_connection`, `info`, `dns`.
  - `tls` -> `network_connection`, `info`, `https`.

## Events/classifications after valid batch

`GET /api/v1/events/recent?limit=30`:

- `count=10`.
- Incremento esperado: `+3`.
- Los 3 eventos batch aparecen con metadata Suricata.

`GET /api/v1/assets/classifications?limit=40`:

- `count=9`.
- No aumenta el numero total de activos porque los samples repiten IPs ya conocidas.
- Si actualiza contadores:
  - `10.10.1.10` pasa a `event_count=5`.
  - `172.16.100.20` pasa a `event_count=3`.
  - `203.0.113.53` pasa a `event_count=2`.
  - `198.51.100.90` pasa a `event_count=2`.

## Batch vacio

Comando ejecutado:

```bash
printf '' | curl -sS -w '\nHTTP_STATUS:%{http_code}\n' -X POST http://127.0.0.1:8088/api/v1/suricata/eve/batch -H 'Content-Type: application/x-ndjson' --data-binary @-
```

Resultado:

```json
{"error":"empty body"}
```

Status:

```text
HTTP_STATUS:400
```

Eventos despues:

- `count=10`.
- No hubo incremento.

## JSON invalido

Payload:

```text
not-json
```

Resultado:

```json
{"error":"line 1: eve json parse: invalid character 'o' in literal null (expecting 'u')"}
```

Status:

```text
HTTP_STATUS:400
```

Eventos despues:

- `count=10`.
- No hubo incremento.

## Prueba 101 eventos

Ejecutada: **no**.

Motivo:

- El codigo confirma que `HandleEVEBatch` valida `len(events) > 100` despues de que `IngestJSONLines` haya parseado y guardado eventos.
- Ejecutar 101 eventos validos podria escribir eventos antes de rechazar la peticion.
- La fase prohibe pruebas de carga masiva y pide no ejecutar si hay riesgo de escritura parcial.

Conclusion:

- Riesgo de escritura parcial confirmado por inspeccion de codigo.
- Requiere hardening antes de probar limites altos en staging.

## SSE posterior

Comando:

```bash
timeout 8s curl -sS -N -H 'Accept: text/event-stream' http://127.0.0.1:8088/api/v1/events/stream || true
```

Resultado:

```text
event: connected
data: {"status":"connected"}
```

## Dashboard visual

No se solicito validacion visual humana adicional en esta fase.

Estado tecnico:

- `/` HTTP 200 durante baseline.
- El dashboard ya habia mostrado `Eventos Suricata EVE` en la fase anterior.

## Logs

Patrones revisados en ultimos 30 minutos.

`ids-web`:

- Sin coincidencias para `error|failed|exception|panic|traceback|unhandled|ECONN|EADDR|EventSource|SSE`.

`ids-core`:

- Sin coincidencias para `error|failed|exception|panic|traceback|unhandled|suricata|eve`.
- Los errores 400 de cuerpo vacio/JSON invalido fueron respuestas HTTP controladas y no aparecieron como fallo critico de logs.

`ids-analytics`:

- Sin coincidencias para `error|failed|exception|panic|traceback|unhandled`.

`ids-mcp`:

- Sin coincidencias para `error|failed|exception|panic|traceback|unhandled`.

## Restart counts finales

```text
/ids-web restartCount=0 health=healthy status=running
/ids-core restartCount=0 health=healthy status=running
/ids-analytics restartCount=0 health=healthy status=running
/ids-mcp restartCount=0 health=healthy status=running
/ids-postgres restartCount=0 health=healthy status=running
/ids-redis restartCount=0 health=healthy status=running
```

No hubo incremento de restart counts.

## Que NO se toco

- No se modifico codigo funcional.
- No se hizo deploy.
- No se ejecuto `docker compose up/down/restart/pull`.
- No se hizo prune.
- No se toco `.env`.
- No se instalo Suricata.
- No se arranco Suricata.
- No se capturo trafico real.
- No se hicieron escaneos.
- No se ejecuto `nmap`.
- No se ejecuto `tcpdump`.
- No se toco firewall.
- No se bloqueo trafico.
- No se toco DB/Redis/Postgres manualmente.
- No se toco Nginx/Cloudflare.
- No se imprimieron secretos.
- No se enviaron eventos a servicios externos.
- No se uso GeoIP online.

## Recomendaciones de hardening

Antes de ingesta real o pruebas de limite alto:

1. Validar batch size antes de parsear/guardar.
2. Hacer parse completo a memoria temporal y guardar solo si todo el batch valida.
3. Evitar escrituras parciales ante error de linea intermedia.
4. Definir `MaxBytesReader` o limite equivalente de body.
5. Definir limite de longitud por linea JSON Lines.
6. Aceptar/normalizar `Content-Type` (`application/x-ndjson`, `application/json`, vacio) de forma explicita.
7. Documentar contrato de errores.
8. Agregar tests para batch vacio, invalid line, >100 y no escritura parcial.
9. Considerar auth/rate limit antes de exponer endpoint en LAN.

## Riesgos residuales

- Riesgo de escritura parcial confirmado.
- `storage_mode=memory` pierde eventos al reiniciar.
- `alert.signature` no se preserva como metadata textual.
- `Total Bytes` puede seguir en `0 B`.
- No se probo limite >100 por seguridad.

## Proxima fase recomendada

**IDS-SURICATA-EVE-HANDLER-HARDENING-01**

Motivo: el endpoint batch funciona, pero el limite y las escrituras parciales deben endurecerse antes de avanzar hacia sensor placement o ingesta real.
