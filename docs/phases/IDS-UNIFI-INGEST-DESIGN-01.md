# FASE: IDS-UNIFI-INGEST-DESIGN-01

**Resultado:** PASS

**Fecha:** 2026-06-06

---

## 1. Motivo

Tras validar que UniFi aporta valor real como telemetria operacional y no como fuente oficial de Threats exportados, se requiere definir el contrato de ingest seguro hacia `ids-core` antes de implementar cualquier live ingest.

La fase es estrictamente documental y read-only.

## 2. Estado del repositorio

| Item | Valor |
|---|---|
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `2ec8c41` |
| HEAD final | pendiente del commit documental |
| Working tree inicial | limpio |

## 3. Resumen ejecutivo

Se recomienda **no** acoplar `ids-core` directamente al archivo `/var/log/unifi/ids.log`.

La opcion recomendada es:

- definir un endpoint interno dedicado para UniFi;
- mantener el collector como productor controlado de batches;
- exigir auth por Bearer token;
- introducir idempotencia explicita por `raw_hash` / `idempotency_key`;
- bloquear live ingest hasta validar `postgres` y dedupe persistente.

## 4. Inventario read-only del backend

### Endpoints actuales

`ids-core` expone hoy:

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

### Reutilizable

- `domain.Event.Validate()`
- `storage.EventRepository`
- patron de `repo.Save + broadcaster.Publish`
- validacion de lotes inspirada en Suricata batch

### No reutilizable tal cual

- `POST /api/v1/suricata/eve`
- `POST /api/v1/suricata/eve/batch`
- `POST /api/v1/simulate/events`

Motivo: semantica incorrecta, sin auth, sin idempotencia y sin distincion de origen UniFi.

### Storage actual

- `memory` por defecto: `MemoryEventRepository(5000)`
- `postgres`: `PostgresEventRepository` + migracion automatica tabla `events`

### Auth existente

- no existe auth de ingest actual
- solo hay CORS para localhost web

### Gaps identificados

- sin endpoint interno para UniFi
- sin auth
- sin idempotencia persistente
- sin rate limit
- sin limite de payload dedicado
- sin respuesta estructurada de duplicates
- sin diferenciacion formal entre ingest Suricata y UniFi

## 5. Diseno elegido

### Opcion recomendada

**Opcion A - Collector CLI batch -> ids-core internal endpoint**

### Motivo

- separa parser/collector de API runtime
- evita acoplar `ids-core` al filesystem
- permite dry-run realista antes de live
- facilita auth, retries, batch y backpressure
- prepara despues un sidecar/file-watcher (opcion C)

## 6. Endpoint recomendado

### Ruta propuesta

`POST /api/internal/v1/ingest/events/unifi`

### Requisitos del endpoint

- interno, no publico
- JSON only
- Bearer token obligatorio
- lotes limitados
- validacion estricta
- respuesta con `accepted`, `duplicates`, `rejected`
- no aceptar `raw` por defecto

## 7. Payload propuesto

Cabecera de lote:

- `source`
- `source_host`
- `collector_id`
- `batch_id`
- `observed_at`
- `events[]`

Campos minimos por evento:

- `idempotency_key`
- `raw_hash`
- `kind`
- `event_type`
- `severity`
- `timestamp`
- `process`
- `message`
- `metadata`

No incluir por defecto:

- raw completo
- IP/MAC real no redacted
- dominios reales
- nombres de cliente

## 8. Seguridad

- `Authorization: Bearer <IDS_UNIFI_INGEST_TOKEN>`
- token generado fuera del repo
- token en env var, nunca commiteado
- no loggear token ni body completo
- allowlist de origen local/controlado
- no exponer por Nginx/Cloudflare
- auditoria solo con contadores y metadatos no sensibles

## 9. Dedupe e idempotencia

### Inicial

- `raw_hash = sha256(linea canonicalizada)`
- `idempotency_key = unifi:<raw_hash>`
- ventana de duplicate: 5 minutos

### Futuro

Fingerprint semantico para duplicates naturales de `odhcp6c` / `ubios-udapi-server`:

- `source_host + process_family + normalized_message + time_bucket`

### Riesgo actual del backend

Postgres solo hace `ON CONFLICT (id) DO NOTHING`, pero `domain.Event.ID` hoy es random. Eso no resuelve idempotencia real para UniFi. Debe añadirse persistencia explicita de `idempotency_key` en una fase futura.

## 10. Storage

### Estado actual

- `memory`: volatil, sin durabilidad, sin dedupe persistente
- `postgres`: persistente, pero sin indice unico de `idempotency_key`

### Decision

- live ingest UniFi solo tras validar `postgres`
- `memory` solo para laboratorio y smoke tests

## 11. Gates antes de live ingest

1. `storage_mode=postgres` validado en `.40`
2. endpoint interno con auth
3. payload y limites de batch cerrados
4. idempotencia implementada
5. tests de retry/backpressure/duplicates PASS
6. rollback definido
7. dashboard no dependiente de memoria volatil

## 12. Mapping propuesto

- `dns_gateway_event` -> `dns_query`
- `dpi_event` -> `network_connection`
- `dpi_flow_stats_event` -> `network_connection`
- `dhcp_ipv6_event` -> `network_connection`
- `gateway_health_event` -> `system`
- `syslog_operational_event` -> `system`
- `systemd_event` -> `system`
- `mca_event` -> `system`
- `unclassified_unifi_syslog` -> `unclassified_event`

Campos minimos:

- `timestamp`
- `source`
- `source_host`
- `process`
- `severity`
- `event_type`
- `kind`
- `message` safe
- `metadata` safe
- `raw_hash`
- `idempotency_key`

## 13. Roadmap recomendado

### Fase 1

`IDS-UNIFI-INGEST-CONTRACT-DRYRUN-01`

- implementar endpoint interno protegido
- tests con payload sintetico
- sin log real

### Fase 2

`IDS-UNIFI-COLLECTOR-BATCH-SENDER-DRYRUN-01`

- construir batches desde el collector
- `--send=false` por defecto
- resumen de payload

### Fase 3

`IDS-UNIFI-INGEST-LOCAL-SMOKE-01`

- POST sintetico local con token temporal
- validar accepted/duplicates/rejected

### Fase 4

`IDS-UNIFI-FILE-TAIL-DESIGN-01`

- offsets
- backpressure
- supervision/systemd
- rollback

### Fase 5

`IDS-UNIFI-OPERATIONAL-DASHBOARD-DESIGN-01`

- diseno de visualizacion UniFi operational telemetry

## 14. Que NO se toco

- No se toco UniFi
- No se cambio SIEM
- No se activo NetFlow/IPFIX
- No se cambio modo IDS/IPS
- No se ejecuto BlackSun
- No se hicieron escaneos/ataques
- No se uso API key
- No se modifico rsyslog
- No se reinicio rsyslog
- No se modifico Promtail
- No se toco Loki/Grafana
- No se toco Docker/firewall
- No se hizo POST/live ingest
- No se modifico codigo funcional
- No se crearon migrations
- No se imprimieron secretos ni logs reales

## 15. Proxima fase recomendada

**IDS-UNIFI-INGEST-CONTRACT-DRYRUN-01**
