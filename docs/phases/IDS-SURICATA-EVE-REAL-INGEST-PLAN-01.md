# IDS-SURICATA-EVE-REAL-INGEST-PLAN-01

## Resultado

**PASS**

Fase solo planificacion. No se instalo Suricata, no se configuro captura, no se toco staging, no se hicieron POSTs y no se genero trafico.

## Rama y HEAD

| Campo | Valor |
|-------|-------|
| Repo | `E:\opencode\ids-app` |
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `c66a47f` |
| HEAD final | commit documental de esta fase |
| Working tree inicial | limpio |

## Alcance

Objetivo: disenar un plan seguro para integrar Suricata EVE real en ids-app, partiendo de las capacidades ya existentes del backend y del frontend.

Fuera de alcance en esta fase:

- Instalar o arrancar Suricata.
- Configurar interfaces.
- Capturar trafico real.
- Enviar EVE real.
- Hacer replay contra staging.
- Hacer POSTs.
- Modificar Docker, compose, `.env`, DB, Redis/Postgres, Nginx/Cloudflare o firewall.

## Que se inspecciono

Codigo local y documentacion:

- `services/ids-core/cmd/ids-core/main.go`
- `services/ids-core/internal/api/suricata_handler.go`
- `services/ids-core/internal/suricata/eve.go`
- `services/ids-core/internal/suricata/parser.go`
- `services/ids-core/internal/suricata/ingest.go`
- `services/ids-core/internal/suricata/parser_test.go`
- `services/ids-core/internal/suricata/ingest_test.go`
- `services/ids-core/internal/domain/event.go`
- `packages/contracts/suricata/README.md`
- `packages/contracts/suricata/eve-json-minimal.schema.json`
- `packages/contracts/suricata/samples/*.json`
- `packages/contracts/suricata/tests/validate_suricata_samples.py`
- `docs/14-suricata-eve-sample-contract.md`
- `docs/15-suricata-eve-parser.md`
- `docs/16-suricata-eve-ingest.md`
- `apps/web/src/lib/v0-network/real-data-adapter.ts`
- `apps/web/src/components/v0-network/*suricata*`
- `apps/web/src/components/v0-network/packet-stream.tsx`
- `apps/web/src/components/v0-network/packet-detail-modal.tsx`

## Endpoints EVE existentes

Definidos en `services/ids-core/cmd/ids-core/main.go`:

| Metodo | Path | Handler | Funcion |
|--------|------|---------|---------|
| POST | `/api/v1/suricata/eve` | `SuricataHandler.HandleEVE` | Ingesta de un evento EVE JSON |
| POST | `/api/v1/suricata/eve/batch` | `SuricataHandler.HandleEVEBatch` | Ingesta batch JSON Lines |

### POST `/api/v1/suricata/eve`

Payload esperado: un objeto EVE JSON individual con `Content-Type: application/json`.

Flujo:

1. Rechaza metodos distintos de POST con 405.
2. Rechaza `Content-Type` distinto de `application/json` si viene informado.
3. Rechaza body vacio.
4. Llama `EVEIngestor.IngestJSON`.
5. Parseo EVE a `domain.Event`.
6. Guarda en `EventRepository`.
7. Publica en `eventstream.Broadcaster`.
8. Devuelve `{ item, source: "suricata_eve", count: 1 }`.

Errores esperados:

- 400 si no puede leer body.
- 400 si body vacio.
- 400 si JSON invalido o evento no valida.
- 405 si metodo no permitido.

### POST `/api/v1/suricata/eve/batch`

Payload esperado: JSON Lines, un evento EVE por linea.

Flujo:

1. Rechaza metodos distintos de POST con 405.
2. Rechaza body vacio.
3. Llama `EVEIngestor.IngestJSONLines`.
4. Parsea cada linea no vacia.
5. Guarda cada evento en `EventRepository`.
6. Si el resultado supera 100 eventos, responde 400.
7. Publica cada evento en `eventstream.Broadcaster`.
8. Devuelve `{ items, source: "suricata_eve", count }`.

Observacion importante: el limite de 100 se evalua despues de parsear y guardar eventos. En una fase futura conviene mover el limite antes del guardado o cortar durante el scan para evitar efectos parciales ante batches grandes.

## Parser EVE

Implementacion: `services/ids-core/internal/suricata/parser.go`.

Tipos definidos en `services/ids-core/internal/suricata/eve.go`:

- `EVEEvent`
- `EVEAlert`
- `EVEDNS`
- `EVEHTTP`
- `EVETLS`
- `EVESSH`
- `EVERDP`
- `EVESMB`
- `EVEModbus`

Campos comunes soportados:

- `timestamp`
- `flow_id`
- `in_iface`
- `event_type`
- `src_ip`
- `src_port`
- `dest_ip`
- `dest_port`
- `proto`
- `app_proto`

Tipos EVE cubiertos:

| EVE `event_type` | Mapeo a `domain.Event.Type` |
|------------------|-----------------------------|
| `alert` con categoria scan/recon/attempt | `scan_detected` |
| `alert` con categoria auth/login | `auth_failure` |
| `alert` con categoria malware/trojan/botnet | `malware_indicator` |
| `alert` otros | `policy_violation` |
| `modbus` | `ot_command` |
| `flow`, `dns`, `http`, `tls`, `ssh`, `rdp`, `smb`, desconocidos | `network_connection` |

Severidad:

- `alert.severity=1` -> `critical`
- `alert.severity=2` -> `high`
- `alert.severity=3` -> `medium`
- `alert.severity=4` -> `low`
- `alert` sin severidad reconocida -> `medium`
- eventos no alert -> `info`

Protocolo:

- Prioridad: `app_proto` > `event_type` > `proto` > `unknown`.
- `tls` se mapea a `https`.
- `modbus`, `dns`, `http`, `ssh`, `rdp`, `smb`, `TCP`, `UDP`, `ICMP` soportados.

Zona y direccion:

- `172.16.100.0/24` -> `ot`.
- `10.10.0.0/16` -> `it`.
- IT <-> OT -> `lateral`.
- IT <-> IT u OT <-> OT -> `internal`.
- TEST-NET externo hacia interno -> `inbound`.
- Interno hacia TEST-NET externo -> `outbound`.
- Otros casos -> `unknown`.

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

Comportamiento ante campos faltantes:

- Falta `event_type` -> error.
- Timestamp invalido -> usa `time.Now().UTC()`.
- IP invalida en source/destination -> falla `domain.Event.Validate()` si el campo no esta vacio.
- Puerto fuera de 0..65535 -> falla validacion.
- Titulo vacio se evita con `buildTitle` generico.

Eventos ignorados:

- No hay lista explicita de ignorados. Eventos desconocidos se aceptan como `network_connection` si validan.

## Samples y tests existentes

Contrato: `packages/contracts/suricata/`.

Samples sinteticos disponibles:

- `alert-scan-detected.json`
- `flow-normal-it.json`
- `dns-query.json`
- `http-request.json`
- `tls-handshake.json`
- `ssh-session.json`
- `rdp-session.json`
- `smb-session.json`
- `modbus-read.json`

Reglas de datos de samples:

- IPs RFC 5737 / rangos de laboratorio.
- Dominios `example.*`.
- Sin IPs reales, dominios reales, hostnames reales, credenciales ni secretos.

Tests:

- `parser_test.go` valida parseo por tipo, severidad, protocolo, zona y errores JSON.
- `ingest_test.go` valida guardado en repositorio, JSON Lines, errores por linea, body vacio y recent events.
- `validate_suricata_samples.py` valida contrato de samples.

## Frontend consumidor

El dashboard v0 no consume EVE bruto. Consume `EventItem` normalizado desde ids-core y detecta contexto Suricata por metadata:

- `suricata.event_type`
- `alert.signature`
- `alert.category`
- `suricata.app_proto`

Componentes involucrados:

- `SuricataBadge`
- `SuricataSummary`
- `PacketStream`
- `PacketDetailModal`
- `V0NetworkDashboard`

Riesgo detectado: el parser preserva `alert.signature_id` y `alert.category`, pero actualmente no guarda `alert.signature` en metadata. El dashboard mostrara badge/tipo/categoria, pero puede no mostrar firma textual real hasta ajustar el parser en una fase futura.

## Arquitectura recomendada

### Opcion A: Suricata en VM observabilidad `192.168.1.40`

Ventajas:

- Cercania a ids-core.
- Menos piezas de red.
- Mas simple para laboratorio si solo se valida EVE local.

Riesgos:

- Visibilidad de trafico limitada a lo que vea la VM.
- Captura real requiere interfaz correcta, promiscua y permisos.
- Sin SPAN/TAP probablemente no vera trafico lateral real.
- CPU/RAM de observabilidad ya comparten carga con otros servicios.
- Mezcla sensor con servicios de observabilidad/staging.

Conclusion: no recomendada como primer paso para captura real. Puede servir solo para replay local o laboratorio muy controlado.

### Opcion B: sensor Suricata separado

Ventajas:

- Aislamiento operativo.
- Menor riesgo para staging.
- Se puede controlar interfaz, permisos y forwarder.
- Permite hardening independiente.

Riesgos:

- Requiere decidir transporte seguro al ids-core.
- Necesita autenticar/restringir endpoint de ingest.
- Requiere gestion de logs y recursos en el sensor.

Conclusion: opcion recomendada para sensor real si no hay SPAN/TAP dedicado todavia, siempre que el sensor observe una fuente controlada.

### Opcion C: Suricata en host con trafico real/mirror

Ventajas:

- Mayor valor IDS real.
- Puede observar trafico OT/IT con SPAN/TAP.
- Mejor fidelidad que sensor en una VM sin visibilidad.

Riesgos:

- Requiere plan de red y aprobacion humana.
- Riesgo de capturar trafico equivocado o sensible.
- Puede generar volumen alto de eventos.
- Necesita tuning de reglas, privacidad y retencion.

Conclusion: opcion futura, no inicial. Debe ir precedida de decision de placement y validacion de red.

### Opcion D: EVE replay sintetico/controlado

Ventajas:

- No captura trafico real.
- Reutiliza samples existentes.
- Valida parser, endpoints, repo, SSE, UI y logs.
- Permite probar limites antes de sensor real.

Riesgos:

- No valida rendimiento ni ruido de Suricata real.
- No valida interfaz ni SPAN/TAP.

Conclusion: opcion inicial recomendada. Primero `IDS-SURICATA-EVE-SAMPLE-REPLAY-STAGING-01`; despues decidir entre B/C.

## Flujo tecnico propuesto

```text
Suricata sensor
  -> eve.json
  -> forwarder seguro
  -> ids-core POST /api/v1/suricata/eve o /api/v1/suricata/eve/batch
  -> SuricataHandler
  -> EVEIngestor
  -> ParseEVEJSON / ParseEVEEvent
  -> domain.Event.Validate
  -> EventRepository.Save
  -> eventstream.Broadcaster
  -> GET /api/v1/events/recent + SSE /api/v1/events/stream
  -> frontend V0NetworkDashboard
  -> asset classifier + analytics scoring
```

### Single event vs batch

Single event:

- Mejor para pruebas iniciales.
- Errores aislados.
- Mas overhead HTTP.

Batch JSON Lines:

- Mejor para forwarder real.
- Debe limitarse a batches pequenos.
- Requiere corregir/confirmar limite antes de guardar.
- Conviene aceptar solo lineas compactas y rechazar payloads enormes.

### Forwarder recomendado

Fase inicial: script propio simple o herramienta tipo Vector/Filebeat en modo tail, pero solo despues de validar replay sintetico.

Requisitos del forwarder:

- Leer `eve.json` en append/tail.
- Enviar solo eventos permitidos.
- Batches pequenos: 10-50 eventos inicialmente.
- Timeout HTTP corto: 2-5s.
- Backoff exponencial.
- Cola local limitada.
- Deduplicacion por `flow_id` + timestamp + event_type si es viable.
- No loggear bodies completos con IPs sensibles.
- No enviar a terceros.

## Seguridad

Reglas obligatorias para fases futuras:

- No activar acciones automaticas.
- No bloquear trafico.
- No tocar firewall.
- No ejecutar escaneos.
- No enviar IPs a terceros.
- No GeoIP online.
- No credenciales en logs.
- No exponer endpoint ingest a Internet.
- Si se expone en LAN, proteger con token o restringir por red.
- Limitar batch size antes de guardar.
- Rate limit por origen.
- Timeout de lectura y escritura HTTP.
- Validacion estricta de JSON.
- Tamano maximo de body.
- Rechazar payloads enormes o lineas demasiado largas.
- Registrar solo metadatos necesarios.
- No interpretar GeoIP como atribucion real.
- No clasificar hosts internos sensibles sin contexto.
- Separar replay sintetico de captura real.

## Limites recomendados

Para primera fase de replay:

- 3-5 eventos EVE sinteticos.
- Solo samples existentes.
- Solo localhost/staging.
- Sin Suricata real.
- Sin endpoint publico.

Para batch futuro:

- Max 10 eventos en primer ensayo.
- Max 100 solo despues de validar comportamiento.
- Body maximo explicito a definir antes de real ingest.
- Rate limit inicial sugerido: 1 batch/s por sensor.
- Reintentos con backoff, max 3.
- Logs de error sin payload completo.

## Validaciones previas a Suricata real

Checklist obligatorio:

1. Backup/checkpoint VM.
2. Confirmar estado healthy.
3. Confirmar endpoint EVE con sample local.
4. Confirmar dashboard visual.
5. Confirmar logs limpios.
6. Confirmar `restartCount=0`.
7. Confirmar rollback.
8. Confirmar interfaz de captura.
9. Confirmar modo SPAN/TAP si aplica.
10. Confirmar que no se modifica firewall.
11. Confirmar que no se expone endpoint publicamente.
12. Confirmar limites de eventos.
13. Confirmar retencion/memoria.
14. Confirmar que storage mode memory implica perdida de eventos al reiniciar.
15. Confirmar privacidad de IPs internas.

## Fases futuras propuestas

1. **IDS-SURICATA-EVE-SAMPLE-REPLAY-STAGING-01**
   - Enviar 3-5 eventos EVE JSON sinteticos al endpoint.
   - Sin Suricata real.
   - Validar parser, `events/recent`, UI, SSE, logs y restart counts.

2. **IDS-SURICATA-EVE-BATCH-LIMITS-01**
   - Validar batch pequeno y limites.
   - Confirmar comportamiento ante batch > limite.
   - Recomendar cambio si el limite sigue evaluandose despues de guardar.

3. **IDS-SURICATA-SENSOR-PLACEMENT-DECISION-01**
   - Decidir donde vivira Suricata.
   - Documentar fuente de trafico, interfaz, SPAN/TAP y restricciones.

4. **IDS-SURICATA-SENSOR-INSTALL-DRYRUN-01**
   - Plan de instalacion sin arrancar captura real.
   - Confirmar paquetes, recursos y rollback.

5. **IDS-SURICATA-EVE-FORWARDER-PLAN-01**
   - Decidir tail/forwarder: script propio, Vector, Filebeat u otra opcion.
   - Definir auth, rate limit, backpressure y logs.

6. **IDS-SURICATA-EVE-REAL-INGEST-STAGING-01**
   - Primera ingesta real controlada.
   - Requiere aprobacion humana explicita.

7. **IDS-GEOIP-OFFLINE-ENRICHMENT-PLAN-01**
   - GeoIP offline despues de estabilizar ingest.

## Riesgos

- Capturar trafico equivocado.
- Sobrecarga de eventos.
- Endpoint EVE sin auth si se expone mal.
- Falsos positivos.
- Perdida de eventos por memoria.
- `storage_mode=memory` actualmente puede borrar eventos al reiniciar.
- `Total Bytes = 0 B` en simulados y posiblemente en EVE si no se mapean bytes de flow.
- Asset classifier puede inferir zonas de forma imperfecta.
- GeoIP sintetico no es real.
- Suricata real necesita tuning de reglas.
- Volumen de logs.
- Privacidad de IPs internas.
- El parser no preserva actualmente `alert.signature` en metadata aunque el frontend lo intenta mostrar.
- El batch handler valida el limite de 100 despues de parsear/guardar, lo que debe corregirse antes de cargas reales grandes.

## Que NO se toco

- No se modifico codigo funcional.
- No se toco frontend.
- No se toco backend.
- No se toco `services/`.
- No se toco staging.
- No se ejecuto Docker.
- No se hizo deploy.
- No se hizo POST.
- No se generaron eventos.
- No se hizo Suricata real.
- No se instalaron paquetes.
- No se hicieron escaneos.
- No se toco firewall.
- No se toco Nginx/Cloudflare.
- No se toco DB/Redis/Postgres.
- No se imprimieron secretos.

## Recomendacion final

No empezar con captura real. La ruta segura es:

1. Reproducir EVE con samples sinteticos existentes.
2. Validar endpoint single y batch pequeno.
3. Corregir/confirmar limites antes de batches grandes.
4. Decidir placement del sensor.
5. Planificar forwarder seguro.
6. Solo entonces ejecutar ingesta real controlada.

Proxima fase recomendada: **IDS-SURICATA-EVE-SAMPLE-REPLAY-STAGING-01**.
