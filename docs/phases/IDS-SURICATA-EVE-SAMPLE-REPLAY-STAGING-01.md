# IDS-SURICATA-EVE-SAMPLE-REPLAY-STAGING-01

## Resultado

**PARTIAL**

La fase completo la inspeccion local de samples, parser y handler Suricata EVE, pero no pudo ejecutar replay en staging porque el acceso SSH no interactivo a `albert@192.168.1.40` fallo con `Permission denied (publickey,password)`. Se aplico el criterio de parada: no se buscaron workarounds, no se usaron credenciales en comandos, no se hicieron POSTs y no se genero ningun evento adicional.

## Rama y HEAD

| Campo | Valor |
|-------|-------|
| Repo | `E:\opencode\ids-app` |
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `8b73fba` |
| HEAD origin inicial | `8b73fba` |
| Working tree inicial | limpio |

## Baseline staging

No validado por el agente en esta fase por fallo SSH.

Contexto estable aportado antes de iniciar:

- `/` muestra nuevo Analizador de Trafico de Red.
- `/design-lab/v0-network` disponible.
- `/legacy-dashboard` preserva dashboard antiguo.
- `ids-web` healthy.
- `ids-core` healthy.
- `ids-analytics` healthy.
- `ids-mcp` healthy.
- `ids-postgres` healthy.
- `ids-redis` healthy.
- Docker enabled/active.
- `restart=unless-stopped` en todos.
- `restartCount=0`.
- SSE validado previamente con `event: connected`.
- `events/recent` validado previamente con eventos sinteticos `scan_detected`.
- Asset classifier validado previamente.
- Dashboard visual validado previamente.
- Checkpoint VM realizado.

Intento SSH:

```powershell
ssh -o BatchMode=yes -o ConnectTimeout=10 albert@192.168.1.40 "cd /home/albert/docker/ids-app && hostname && pwd"
# Permission denied (publickey,password).
```

## Samples revisados

Ruta: `packages/contracts/suricata/samples/`.

Samples disponibles:

- `alert-scan-detected.json`
- `flow-normal-it.json`
- `dns-query.json`
- `http-request.json`
- `tls-handshake.json`
- `ssh-session.json`
- `rdp-session.json`
- `smb-session.json`
- `modbus-read.json`

Todos son samples sinteticos/documentales, sin datos sensibles reales segun contrato del repo.

Sample preferido para replay single:

```json
{
  "timestamp": "2026-05-30T12:00:00.000000+0000",
  "flow_id": 1000001,
  "in_iface": "eth1",
  "event_type": "alert",
  "src_ip": "10.10.1.10",
  "src_port": 49152,
  "dest_ip": "172.16.100.20",
  "dest_port": 502,
  "proto": "TCP",
  "app_proto": "modbus",
  "alert": {
    "signature_id": 1000001,
    "signature": "IDS-APP Synthetic TCP scan against OT host",
    "category": "Attempted Information Leak",
    "severity": 2
  }
}
```

Motivo:

- Es `event_type=alert`.
- Es sintetico.
- Usa redes de laboratorio/documentacion.
- Debe mapear a `scan_detected`, severidad `high`, protocolo `modbus`, zona `ot`.

Samples candidatos para batch pequeno:

- `alert-scan-detected.json`
- `dns-query.json`
- `tls-handshake.json`

## Parser/handler revisado

Archivos:

- `services/ids-core/cmd/ids-core/main.go`
- `services/ids-core/internal/api/suricata_handler.go`
- `services/ids-core/internal/suricata/parser.go`
- `services/ids-core/internal/suricata/ingest.go`

Endpoints confirmados:

| Metodo | Endpoint | Handler | Formato |
|--------|----------|---------|---------|
| POST | `/api/v1/suricata/eve` | `HandleEVE` | JSON object individual |
| POST | `/api/v1/suricata/eve/batch` | `HandleEVEBatch` | JSON Lines, un evento por linea |

Campos requeridos principales:

- `event_type` es obligatorio.
- `timestamp`, `src_ip`, `dest_ip`, `proto`, puertos y `flow_id` son recomendados para mapeo util.
- IPs/puertos deben validar si estan presentes.

Mapeos confirmados:

- `alert.severity=1` -> `critical`.
- `alert.severity=2` -> `high`.
- `alert.severity=3` -> `medium`.
- `alert.severity=4` -> `low`.
- `alert` sin severidad reconocida -> `medium`.
- eventos no alert -> `info`.
- `app_proto` tiene prioridad sobre `event_type` y `proto`.
- `alert` con categoria que contiene `attempt`/`scan`/`recon` -> `scan_detected`.

Guardado/SSE:

- `HandleEVE` llama `EVEIngestor.IngestJSON`.
- `EVEIngestor` parsea y guarda en `EventRepository`.
- Despues del guardado se publica en `eventstream.Broadcaster`.
- `HandleEVEBatch` publica todos los eventos parseados/guardados.

Limite batch:

- El handler responde error si `len(events) > 100`.
- Limitacion conocida: el limite se evalua despues de parsear y guardar eventos, por lo que debe revisarse antes de cargas reales grandes.

Metadata preservada:

- `suricata.event_type`
- `suricata.flow_id`
- `suricata.interface`
- `suricata.app_proto`
- `alert.signature_id`
- `alert.category`
- `dns.rrname`
- `dns.rrtype`
- `http.hostname`
- `http.url`
- `tls.sni`
- `tls.version`
- `ssh.client_proto`
- `ssh.server_proto`
- `rdp.cookie`
- `rdp.client_name`
- `smb.command`
- `smb.share`
- `smb.filename`
- `modbus.function_code`
- `modbus.unit_id`

Limitacion frontend/parser:

- `alert.signature` se usa para el `Title`, pero no se preserva como `metadata["alert.signature"]`.
- El frontend intenta leer `metadata["alert.signature"]`, por lo que podria mostrar tipo/categoria EVE pero no firma textual en secciones que dependan de metadata.

## Eventos before

No validado por el agente en esta fase.

## Classifications before

No validado por el agente en esta fase.

## SSE before

No validado por el agente en esta fase.

## Single replay payload

No ejecutado por fallo SSH.

Payload recomendado para ejecucion manual segura:

```bash
curl -fsS -X POST http://127.0.0.1:8088/api/v1/suricata/eve \
  -H "Content-Type: application/json" \
  --data-binary @packages/contracts/suricata/samples/alert-scan-detected.json
```

## Single replay result

No ejecutado por el agente.

Esperado si se ejecuta manualmente con staging healthy:

- HTTP 200.
- `source="suricata_eve"`.
- `count=1`.
- Evento guardado y visible en `/api/v1/events/recent`.
- Evento publicado por SSE.

## Events after single

No validado por el agente.

## Batch replay

No ejecutado por el agente.

Formato confirmado: JSON Lines, no array y no wrapper.

Ejemplo manual seguro con maximo 3 eventos:

```bash
printf '%s\n%s\n%s\n' \
  "$(tr -d '\n' < packages/contracts/suricata/samples/alert-scan-detected.json)" \
  "$(tr -d '\n' < packages/contracts/suricata/samples/dns-query.json)" \
  "$(tr -d '\n' < packages/contracts/suricata/samples/tls-handshake.json)" \
  | curl -fsS -X POST http://127.0.0.1:8088/api/v1/suricata/eve/batch \
      -H "Content-Type: application/json" \
      --data-binary @-
```

## Events after batch

No validado por el agente.

## Asset classifier result

No validado por el agente.

## Dashboard visual

No validado por el agente en esta fase.

Validacion esperada tras replay:

- Stream muestra evento Suricata/EVE o evento derivado.
- Badge EVE visible si `metadata["suricata.event_type"]` llega al frontend.
- Panel Estadisticas muestra resumen EVE si hay eventos con metadata Suricata.
- Packet detail muestra seccion Suricata EVE si se abre un evento con metadata.
- Activos se actualizan.
- Mapa no se rompe.
- Sin pantalla blanca, 404 ni layout roto.

## Logs

No revisados por fallo SSH.

## Restart counts

No validados por fallo SSH.

## Que NO se toco

- No se modifico codigo funcional.
- No se hizo deploy.
- No se ejecuto `docker compose up/down/restart/pull`.
- No se hizo prune.
- No se toco `.env`.
- No se instalo Suricata.
- No se arranco Suricata.
- No se capturo trafico real.
- No se ejecuto `tcpdump`.
- No se ejecuto `nmap`.
- No se hicieron escaneos.
- No se toco firewall.
- No se bloqueo trafico.
- No se toco DB/Redis/Postgres manualmente.
- No se toco Nginx/Cloudflare.
- No se imprimieron secretos.
- No se hicieron POSTs.
- No se generaron eventos.

## Limitaciones

- La fase queda sin replay real por falta de acceso SSH no interactivo.
- No se pudo validar `events/recent` despues de single o batch.
- No se pudo validar asset classifier post replay.
- No se pudo validar SSE post replay.
- No se pudo validar dashboard visual post replay.
- No se pudieron revisar logs ni restart counts finales.

## Riesgos residuales

- `alert.signature` no se preserva actualmente en metadata aunque el frontend lo intenta mostrar.
- Batch limit se evalua despues de parsear/guardar.
- `Total Bytes` seguira probablemente en `0 B` porque el adaptador frontend asigna `size: 0` para eventos reales.
- `storage_mode=memory` puede perder eventos tras reinicio si staging sigue en memoria.

## Proxima fase recomendada

Reintentar **IDS-SURICATA-EVE-SAMPLE-REPLAY-STAGING-01** con acceso SSH no interactivo o con ejecucion manual del operador y cierre documental posterior.

Si single y batch pequeno pasan manualmente, continuar con:

**IDS-SURICATA-EVE-BATCH-LIMITS-01**
