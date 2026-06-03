# IDS-SURICATA-EVE-SAMPLE-REPLAY-STAGING-01-RETRY

## Resultado

**PASS**

Retry completado usando exclusivamente el alias SSH autorizado `ids-observabilidad`. Se valido replay EVE sintetico single y batch pequeno contra ids-core en staging, sin instalar Suricata, sin capturar trafico real y sin tocar Docker/deploy/firewall.

## Relacion con fase PARTIAL anterior

La fase `IDS-SURICATA-EVE-SAMPLE-REPLAY-STAGING-01` quedo `PARTIAL` porque el prompt anterior se ejecuto antes de configurar SSH no interactivo. En este retry el alias `ssh ids-observabilidad` ya estaba validado y permitio completar la validacion.

## Rama y HEAD

| Campo | Valor |
|-------|-------|
| Repo | `E:\opencode\ids-app` |
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `6c4dfcb` |
| HEAD origin inicial | `6c4dfcb` |
| Working tree inicial | limpio |

## SSH

Alias usado: `ids-observabilidad`.

Comando:

```bash
ssh ids-observabilidad "hostname && whoami && pwd"
```

Resultado:

```text
ubuntu-server
albert
/home/albert
```

## Baseline staging

Fecha remota aproximada:

```text
mié 03 jun 2026 19:48:27 CEST
uptime: 9:54
```

Servicios compose:

| Servicio | Estado |
|----------|--------|
| ids-web | Up 10 hours (healthy), puerto 3002 -> 3000 |
| ids-core | Up 10 hours (healthy), puerto 8088 |
| ids-analytics | Up 10 hours (healthy), puerto 8090 |
| ids-mcp | Up 10 hours (healthy), puerto 8091 |
| ids-postgres | Up 10 hours (healthy) |
| ids-redis | Up 10 hours (healthy) |

Restart policies / counts before:

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
- `/design-lab/v0-network` HTTP 200 tras replay.

## Events/classifications before

`GET /api/v1/events/recent?limit=10`:

- `count=3`
- Eventos previos: 3 `scan_detected` sinteticos de la validacion real-data anterior.

`GET /api/v1/assets/classifications?limit=20`:

- `count=4`
- Activos previos: 2 external_host y 2 it_server.

## SSE before

Comando:

```bash
timeout 8s curl -sS -N -H 'Accept: text/event-stream' http://127.0.0.1:8088/api/v1/events/stream || true
```

Resultado:

```text
event: connected
data: {"status":"connected"}
```

## Parser/handler

Endpoints confirmados:

| Metodo | Endpoint | Handler | Formato |
|--------|----------|---------|---------|
| POST | `/api/v1/suricata/eve` | `SuricataHandler.HandleEVE` | JSON object individual |
| POST | `/api/v1/suricata/eve/batch` | `SuricataHandler.HandleEVEBatch` | JSON Lines, un evento por linea |

Campos mapeados:

- `event_type`
- `flow_id`
- `in_iface`
- `src_ip`
- `src_port`
- `dest_ip`
- `dest_port`
- `proto`
- `app_proto`
- `alert`
- `dns`
- `http`
- `tls`
- `ssh`
- `rdp`
- `smb`
- `modbus`

Limitaciones conocidas:

- `alert.signature` se usa como `title`, pero no se preserva como `metadata["alert.signature"]`.
- `alert.category` si se preserva.
- `suricata.app_proto`, `suricata.event_type`, `suricata.flow_id` y `suricata.interface` se preservan.
- Batch limit `>100` se evalua despues de parsear/guardar; debe revisarse antes de cargas reales grandes.
- `storage_mode=memory` implica perdida de eventos al reiniciar ids-core.
- `Total Bytes` puede seguir en `0 B` si no se mapean bytes/flow al frontend.

## Sample single usado

Archivo local:

```text
packages/contracts/suricata/samples/alert-scan-detected.json
```

Resumen:

- `event_type=alert`
- `src_ip=10.10.1.10`
- `dest_ip=172.16.100.20`
- `dest_port=502`
- `proto=TCP`
- `app_proto=modbus`
- `alert.signature=IDS-APP Synthetic TCP scan against OT host`
- `alert.category=Attempted Information Leak`
- `alert.severity=2`

## Single replay result

Comando ejecutado desde Windows, enviando el sample por stdin al endpoint local de staging:

```powershell
$content = Get-Content -LiteralPath "packages\contracts\suricata\samples\alert-scan-detected.json" -Raw
$content | ssh ids-observabilidad "curl -fsS -X POST http://127.0.0.1:8088/api/v1/suricata/eve -H 'Content-Type: application/json' --data-binary @-"
```

Resultado:

- HTTP 200.
- `source=suricata_eve`.
- `count=1`.
- Evento generado: `scan_detected`.
- Severidad: `high`.
- Protocolo: `modbus`.
- Direccion: `lateral`.
- Zona: `ot`.
- Titulo: `IDS-APP Synthetic TCP scan against OT host`.
- Tags: `suricata`, `alert`.

Metadata devuelta:

```json
{
  "alert.category": "Attempted Information Leak",
  "alert.signature_id": "1000001",
  "suricata.app_proto": "modbus",
  "suricata.event_type": "alert",
  "suricata.flow_id": "1000001",
  "suricata.interface": "eth1"
}
```

## Events after single

`GET /api/v1/events/recent?limit=20`:

- `count=4`.
- Incluye el nuevo evento Suricata/EVE single.
- El evento conserva metadata Suricata.
- `alert.signature` no aparece en metadata; la firma queda en `title`.

## Asset classifier after single

`GET /api/v1/assets/classifications?limit=20`:

- `count=6`.
- Nuevos activos derivados del sample Suricata:
  - `10.10.1.10` clasificado como `scada`, confidence 65, zona `ot`.
  - `172.16.100.20` clasificado como `plc`, confidence 85, zona `ot`.

## Batch replay result

Batch ejecutado: **si**.

Formato: JSON Lines compactado en memoria desde 3 samples seguros:

- `alert-scan-detected.json`
- `dns-query.json`
- `tls-handshake.json`

Comando conceptual ejecutado:

```powershell
$files = @(
  "packages\contracts\suricata\samples\alert-scan-detected.json",
  "packages\contracts\suricata\samples\dns-query.json",
  "packages\contracts\suricata\samples\tls-handshake.json"
)
$jsonl = ($files | ForEach-Object { (Get-Content -LiteralPath $_ -Raw | ConvertFrom-Json | ConvertTo-Json -Compress -Depth 20) }) -join "`n"
$jsonl | ssh ids-observabilidad "curl -fsS -X POST http://127.0.0.1:8088/api/v1/suricata/eve/batch -H 'Content-Type: application/x-ndjson' --data-binary @-"
```

Resultado:

- HTTP 200.
- `source=suricata_eve`.
- `count=3`.
- Eventos devueltos:
  - `alert` -> `scan_detected`, `high`, `modbus`.
  - `dns` -> `network_connection`, `info`, `dns`.
  - `tls` -> `network_connection`, `info`, `https`.

## Events after batch

`GET /api/v1/events/recent?limit=30`:

- `count=7`.
- Incluye 3 eventos previos scan, 1 replay single Suricata y 3 replay batch Suricata.
- Eventos batch visibles con metadata:
  - `suricata.event_type=alert`
  - `suricata.event_type=dns`
  - `suricata.event_type=tls`

## Asset classifier final

`GET /api/v1/assets/classifications?limit=30`:

- `count=9`.
- Nuevos activos relevantes:
  - `198.51.100.90` -> `external_host`, protocol `https`.
  - `203.0.113.53` -> `external_host`, protocol `dns`.
  - `10.10.1.5` -> `it_server`, protocol `dns`.
  - `10.10.1.10` actualizado a `hmi`, protocols `modbus`, `https`, event_count 3.
  - `172.16.100.20` -> `plc`, protocol `modbus`, event_count 2.

## Dashboard visual

Validacion tecnica:

- `/` HTTP 200.
- `/design-lab/v0-network` HTTP 200.

Validacion visual humana confirmada por el usuario:

```text
Eventos Suricata EVE (4)
ALERTA 2 (50.0%)
DNS 1 (25.0%)
TLS 1 (25.0%)
```

Resultado:

- Stream: datos disponibles.
- Suricata summary: visible.
- EVE badge/contexto: metadata Suricata presente.
- Mapa: sin rotura tecnica, ruta OK.
- Details: metadata disponible para seccion Suricata; `alert.signature` textual no esta en metadata.
- Sin pantalla blanca reportada.
- Sin 404.

## Logs

Patrones revisados en los ultimos 30 minutos.

`ids-web`:

- Sin coincidencias para `error|failed|exception|panic|traceback|unhandled|ECONN|EADDR|EventSource|SSE`.

`ids-core`:

- Sin coincidencias para `error|failed|exception|panic|traceback|unhandled|suricata|eve`.

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

## Limitaciones

- Los eventos EVE son sinteticos/replay, no Suricata real.
- `alert.signature` no queda preservada en metadata; solo en `title`.
- `Total Bytes` puede seguir en `0 B` porque el adaptador real asigna `size: 0`.
- `storage_mode=memory` pierde eventos al reiniciar ids-core.
- No se probo batch > 3 ni limites altos.

## Riesgos residuales

- Revisar `alert.signature` en metadata para mejorar detalle UI.
- Revisar limite batch antes de parsear/guardar.
- Definir limite de body/tamano por linea antes de ingesta real.
- Decidir persistencia PostgreSQL si se quiere retencion real.
- Mantener prohibicion de Suricata real hasta fase especifica.

## Proxima fase recomendada

**IDS-SURICATA-EVE-BATCH-LIMITS-01**

Objetivo recomendado: validar comportamiento de batch pequeno/limite, documentar limites efectivos y corregir si el limite sigue aplicandose despues de guardar eventos.
