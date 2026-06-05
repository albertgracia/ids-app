# IDS-UNIFI-INGEST-DESIGN-01

## 1. Contexto

La ruta "Threats directos UniFi por syslog/API oficial en modo Notificar" queda cerrada como no viable en este entorno.

La fuente real disponible para ids-app es la telemetria operacional UniFi ya recibida por syslog en `.40`:

- `/var/log/unifi/ids.log`
- `1514/tcp+udp` operativo
- `15514/tcp+udp` preparado pero redundante

El parser operacional UniFi ya convierte logs reales a `UniFiEvent` y a `domain.Event` en modo dry-run.

La validacion real confirmo:

- `parsed=294/300`
- `errors=1`
- `duplicates=5`
- `unsupported_operational_format` reducido de `188` a `104`
- nuevos kinds reales confirmados: `mca_event=60`, `dpi_flow_stats_event=17`, `systemd_event=7`

El siguiente paso no es activar ingest real todavia, sino definir un contrato seguro de ingest antes de cualquier POST live a `ids-core`.

## 2. Decisiones previas

- No tocar UniFi, SIEM, Promtail, Loki, Grafana, Docker, firewall ni `.env`.
- No hacer live ingest en esta fase.
- Mantener el parser CEF intacto.
- Mantener el parser operacional como fallback para syslog no-CEF.
- Mantener el collector como herramienta controlada y dry-run primero.
- Tratar los logs UniFi como telemetria operacional, no como fuente directa de alertas IDS oficiales.

## 3. Inventario backend actual de ids-core

### 3.1 Endpoints existentes

`cmd/ids-core/main.go` expone hoy:

- `GET /healthz`
- `GET /readyz`
- `GET /api/v1/status`
- `GET /api/v1/events/recent`
- `POST /api/v1/simulate/events`
- `POST /api/v1/suricata/eve`
- `POST /api/v1/suricata/eve/batch`
- `GET /api/v1/events/stream`
- `GET /api/v1/assets/classifications`
- `GET /api/v1/assets/classification`

### 3.2 Que reutilizar

Reutilizable:

- el patron `handler -> validar -> repo.Save -> broadcaster.Publish`
- `domain.Event.Validate()`
- `storage.EventRepository`
- `Broadcaster` SSE
- estructura de batch del handler Suricata como referencia

No reutilizable tal cual:

- `POST /api/v1/suricata/eve`
- `POST /api/v1/suricata/eve/batch`

Motivos:

- estan acoplados a Suricata EVE JSON;
- no tienen auth;
- no tienen idempotency_key;
- no distinguen origen UniFi;
- validan lotes maximos de 100 pero no tienen estrategia de duplicates aceptados/rechazados.

No debe reutilizarse tampoco:

- `POST /api/v1/simulate/events` porque su semantica es de generacion sintetica, no de ingest interna.

### 3.3 Auth existente

No existe auth real en los endpoints actuales.

El middleware CORS solo permite origen localhost web:

- `http://127.0.0.1:3000`
- `http://localhost:3000`

Eso no protege ingest interna. Hoy cualquier cliente con acceso de red al puerto del servicio podria llamar a los POST existentes.

### 3.4 Storage existente

`ids-core` soporta dos modos:

- `memory` por defecto, con `MemoryEventRepository(5000)`
- `postgres`, con `PostgresEventRepository` y migracion automatica de tabla `events`

La interfaz actual del repositorio es minima:

- `Save(ctx, event)`
- `Recent(ctx, limit)`
- `Count(ctx)`
- `Close(ctx)`

### 3.5 Validacion y persistencia actuales

- `domain.Event.Validate()` exige `id`, `timestamp`, `type`, `severity`, `protocol`, `title` y valida IPs/puertos.
- En Postgres, `Save` hace `ON CONFLICT (id) DO NOTHING`.
- En memoria no existe dedupe: solo ring buffer de maximo 5000 eventos.
- El SSE broadcaster es best-effort y descarta eventos si el buffer del subscriber se llena.

### 3.6 Gaps actuales del backend

- sin auth para ingest;
- sin endpoint interno separado;
- sin batch contract generico;
- sin idempotencia por `raw_hash` o `idempotency_key`;
- sin respuesta de accepted/rejected/duplicates;
- sin rate limit;
- sin control de payload size;
- sin persistencia de fingerprints de duplicate;
- sin distincion de origen `unifi` vs `suricata` a nivel de endpoint.

## 4. Opciones evaluadas

### Opcion A - Collector CLI batch -> ids-core internal endpoint

Descripcion:

- el collector lee archivo/stdin/futuro tail controlado;
- parsea UniFi;
- agrupa lotes;
- envia `POST` autenticado a un endpoint interno especifico UniFi.

Ventajas:

- desacopla parser de `ids-core` principal;
- facilita dry-run, retry y testing;
- permite auth especifica;
- admite idempotencia por `raw_hash`/`idempotency_key`;
- prepara evolucion natural a sender live o watcher.

Riesgos:

- requiere endpoint nuevo;
- requiere token interno;
- requiere estrategia de batch/backpressure.

### Opcion B - ids-core tailer local directo

Descripcion:

- `ids-core` leeria `/var/log/unifi/ids.log` directamente.

Ventajas:

- menos piezas.

Riesgos:

- acopla `ids-core` al filesystem y a permisos del host;
- complica deploy y testing;
- mezcla responsabilidades de API/engine con tailing operativo;
- dificulta offsets, retry y rollback.

### Opcion C - Collector sidecar/file-watcher en .40

Descripcion:

- proceso separado observa `ids.log`, parsea y envia a `ids-core`.

Ventajas:

- separacion clara de responsabilidades;
- mejor base para offsets, backpressure y pausa/retry;
- camino natural a servicio futuro.

Riesgos:

- mas operacion;
- necesita estado de offsets y supervision;
- meter un servicio live antes del contrato aumenta riesgo.

## 5. Arquitectura recomendada

### Decision

**Opcion A ahora, Opcion C despues.**

Ruta recomendada:

1. definir contrato y endpoint interno;
2. extender el collector para construir batches y validarlos en dry-run;
3. hacer smoke local sintetico sin leer logs reales;
4. disenar luego el tailer/watcher como sidecar o servicio separado.

### Motivo

- minimiza riesgo operativo;
- aprovecha el collector actual y el parser existente;
- evita acoplar `ids-core` al filesystem;
- deja el live ingest bloqueado hasta que haya auth, idempotencia y persistencia claras.

## 6. Endpoint propuesto

### Ruta

`POST /api/internal/v1/ingest/events/unifi`

### Requisitos

- solo JSON;
- `Authorization: Bearer <IDS_UNIFI_INGEST_TOKEN>` obligatorio;
- no expuesto por Nginx/Cloudflare;
- accesible solo local o por red controlada;
- request sin auth -> `401`;
- token no configurado en runtime -> `503`;
- content-type incorrecto -> `400`;
- lote vacio -> `400`;
- lote > maximo -> `400`;
- payload > maximo -> `413`;
- token valido pero origen no permitido -> `403`;
- respuesta siempre agregada, no por-evento raw.

### No reutilizar rutas actuales

No usar:

- `POST /api/v1/suricata/eve`
- `POST /api/v1/suricata/eve/batch`

porque su semantica, validacion y contrato son de Suricata, no de telemetria UniFi operacional.

## 7. Payload propuesto

```json
{
  "source": "unifi",
  "source_host": "Cloud-Gateway-Fiber-Labraza",
  "collector_id": "unifi-collector-40",
  "batch_id": "uuid",
  "observed_at": "2026-06-06T00:00:00Z",
  "events": [
    {
      "idempotency_key": "unifi:sha256:abcd...",
      "raw_hash": "sha256:abcd...",
      "kind": "dns_gateway_event",
      "event_type": "dns_query",
      "severity": "info",
      "timestamp": "2026-06-05T22:16:36Z",
      "process": "coredns",
      "message": "DNS dnsAdBlock for redacted-domain",
      "metadata": {
        "parser": "unifi_operational",
        "source_type": "operational_syslog",
        "has_json": "true"
      }
    }
  ]
}
```

### Campos obligatorios de cabecera de lote

- `source` = `unifi`
- `collector_id`
- `batch_id`
- `observed_at`
- `events[]`

### Campos obligatorios por evento

- `idempotency_key`
- `raw_hash`
- `kind`
- `event_type`
- `severity`
- `timestamp`
- `process`
- `message`
- `metadata`

### Campo raw

- no incluir `raw` por defecto;
- si alguna vez se soporta, debe ser opt-in, redacted y deshabilitado por defecto;
- no guardarlo en docs ni repositorio.

### Respuesta propuesta

```json
{
  "source": "unifi",
  "batch_id": "uuid",
  "accepted": 47,
  "duplicates": 3,
  "rejected": 0,
  "errors": []
}
```

## 8. Auth y seguridad

### Auth propuesta

- header: `Authorization: Bearer <IDS_UNIFI_INGEST_TOKEN>`
- token generado fuera del repo;
- token en env var del runtime/collector, nunca commiteado;
- no loggear token ni request body completo.

### Alcance de red

- si collector corre local en `.40`: allowlist `127.0.0.1` / loopback;
- si collector corre remoto en red controlada: allowlist del host especifico del collector;
- el endpoint debe ser **interno**, no publico.

### Auditoria segura

registrar solo:

- `source`
- `collector_id`
- `batch_id`
- `accepted`
- `duplicates`
- `rejected`
- tiempos de proceso

No registrar:

- token
- body completo
- raw de eventos
- metadata sensible sin redaccion

## 9. Idempotencia y dedupe

### Clave minima inicial

- `raw_hash = sha256(canonical_line)`
- `idempotency_key = source + ":" + raw_hash`

### Dedupe inicial

- dedupe por `idempotency_key` dentro del lote;
- dedupe in-memory cross-request dentro del proceso en ventana temporal de 5 minutos;
- suficiente para duplicates exactos y replay simple mientras el proceso sigue vivo.

### Duplicados naturales UniFi

Caso conocido:

- `odhcp6c` y `ubios-udapi-server` pueden duplicar semanticamente el mismo fallo.

Diseño inicial:

- dedupe exacto por `raw_hash` primero;
- no colapsar semanticamente en la primera fase si los raw son distintos;
- documentar fingerprint semantico futuro.

### Fingerprint semantico futuro

`source_host + process_family + normalized_message + time_bucket(5m)`

Uso futuro:

- identificar duplicates semanticos entre `odhcp6c` y wrapper `ubios-udapi-server`;
- solo cuando haya evidencia de no perder señal util.

### Persistencia necesaria

Estado actual:

- `PostgresEventRepository` solo deduplica por `id`;
- como `domain.Event.ID` hoy es random, eso no sirve para idempotencia real.

Decision de diseño:

- no confiar en el `id` actual para idempotencia;
- fase futura debe introducir persistencia de `idempotency_key` (tabla dedicada o indice unico adicional);
- en modo `memory`, usar cache temporal en proceso con riesgo explicitamente aceptado.

## 10. Batch, limites y backpressure

### Valores iniciales recomendados

- `batch_size`: 50 eventos
- `max_batch_events`: 100 eventos
- `max_payload_size`: 256 KB inicial, ampliable a 1 MB si se demuestra necesario
- `flush_interval`: 5 segundos en live futuro
- `max_events_per_second`: configurable, empezar conservador

### Retry

- exponential backoff con jitter
- maximo 5 intentos por lote
- si el endpoint devuelve 4xx no reintentar salvo `429`
- si devuelve `5xx` o timeout, reintentar

### Backpressure

- en dry-run: solo metricas y salida resumida
- en live futuro: retener lote en memoria durante reintentos
- spool a disco: no en fase 1, documentado como mejora futura

### Disponibilidad del backend

Si `ids-core` no esta disponible:

- el collector no debe perder offsets si ya existe watcher con estado;
- en fase de contrato dry-run aun no se activa esa ruta live.

## 11. Storage y riesgos

### Estado actual

- `memory`: ring buffer de 5000 eventos, volatil, sin durabilidad, sin dedupe persistente
- `postgres`: tabla `events` con indices por timestamp/type/severity/protocol/source_ip/destination_ip

### Riesgo de `storage_mode=memory`

- perdida total al reiniciar;
- dashboard puede mostrar huecos tras restart;
- duplicates reaparecen si se reinicia el proceso;
- no apto para live ingest operacional persistente.

### Recomendacion

- `memory` solo para laboratorio y smoke tests;
- live ingest UniFi solo tras validar `postgres`.

### Gates obligatorios antes de live ingest

1. `storage_mode=postgres` validado en `.40`
2. endpoint interno con auth activa
3. limites de batch/payload implementados
4. estrategia de idempotencia implementada
5. tests de duplicate/retry/backpressure PASS
6. rollback definido
7. dashboard no dependiente de memoria volatil

## 12. Mapping a domain.Event

### Mapping de kinds actuales

- `dns_gateway_event` -> `dns_query`
- `dpi_event` -> `network_connection`
- `dpi_flow_stats_event` -> `network_connection`
- `dhcp_ipv6_event` -> `network_connection`
- `gateway_health_event` -> `system`
- `syslog_operational_event` -> `system`
- `systemd_event` -> `system`
- `mca_event` -> `system`
- `unclassified_unifi_syslog` -> `unclassified_event`

### Campos minimos a transportar

- `timestamp`
- `source=unifi`
- `source_host`
- `process`
- `severity`
- `event_type`
- `kind`
- `message` safe
- `metadata` safe
- `raw_hash`
- `idempotency_key`

### Campos que no deben viajar por defecto

- raw completo
- IP/MAC real no redacted
- dominios reales si no estan redacted
- nombres de cliente
- usernames / secretos / credenciales

## 13. Privacidad

Principios:

- minimizacion de datos
- no enviar raw por defecto
- usar mensajes seguros ya construidos por `NormalizeOperational`
- redaccion previa si una metadata deriva de contenido sensible

### Guardar

- `raw_hash`
- kind, event_type, severity
- source_host, process
- mensaje seguro
- metadata minima de parser

### Descartar o redacted

- lineas raw
- IP/MAC/dominio reales si no aportan valor directo
- campos de inventario que revelen clientes/hostnames innecesarios

## 14. Roadmap recomendado

### Fase 1

`IDS-UNIFI-INGEST-CONTRACT-DRYRUN-01`

- implementar endpoint interno protegido
- tests con payload sintetico
- sin conectar al log real

### Fase 2

`IDS-UNIFI-COLLECTOR-BATCH-SENDER-DRYRUN-01`

- extender collector para construir payload batch
- `--send=false` por defecto
- `--print-payload-summary`

### Fase 3

`IDS-UNIFI-INGEST-LOCAL-SMOKE-01`

- POST sintetico local con token temporal
- validar `accepted / duplicates / rejected`
- sin leer logs reales

### Fase 4

`IDS-UNIFI-FILE-TAIL-DESIGN-01`

- offsets
- backpressure
- systemd/servicio futuro
- rollback

### Fase 5

`IDS-UNIFI-OPERATIONAL-DASHBOARD-DESIGN-01`

- definir visualizacion de telemetria UniFi operacional

## 15. Riesgos

- reusar endpoints Suricata mezclaría dominios de ingest y debilitaria validacion;
- sin auth, cualquier POST interno seria trivialmente abusado;
- sin postgres, los eventos se perderian en restart;
- sin idempotencia persistente, replay o retries inflarian conteos;
- sin semantic dedupe futuro, `odhcp6c` y wrappers pueden seguir duplicando señal.

## 16. Decision final

La arquitectura recomendada es:

- **collector batch controlado** como emisor;
- **nuevo endpoint interno** `POST /api/internal/v1/ingest/events/unifi`;
- **Bearer token** obligatorio;
- **payload JSON batched** con `idempotency_key` y `raw_hash`;
- **postgres como gate** antes de live ingest;
- **sin live ingest todavia** hasta completar las fases de contrato, sender dry-run y smoke local.
