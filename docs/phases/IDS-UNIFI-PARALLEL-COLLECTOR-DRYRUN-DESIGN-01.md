# IDS-UNIFI-PARALLEL-COLLECTOR-DRYRUN-DESIGN-01

## 1. Resultado

PASS.

Se definio el diseño detallado del futuro collector paralelo UniFi en modo dry-run, incluyendo ubicacion propuesta, entradas y salidas, `raw_hash`, deduplicacion, sanitizacion, manejo de errores, contrato futuro con `ids-core` y secuencia de fases posteriores.

## 2. Rama / HEAD

- Rama: `scaffold/ids-v2-dev-env-01`
- HEAD inicial: `33f6c31`
- HEAD final: pendiente del commit documental de esta fase

## 3. Archivos creados

- `docs/design/IDS-UNIFI-PARALLEL-COLLECTOR-DRYRUN-DESIGN-01.md`
- `docs/phases/IDS-UNIFI-PARALLEL-COLLECTOR-DRYRUN-DESIGN-01.md`

## 4. Decisiones de diseño

- el collector no se implementa aun;
- el primer paso futuro sera una CLI/local tool, no un servicio;
- la ubicacion de codigo recomendada es `services/ids-core/cmd/unifi-parallel-collector/`;
- se reutilizaran `ParseCEF`, `NormalizeCEF`, `ToDomainEvent` y la experiencia de `unifi-cef-dryrun`;
- el collector futuro vivira logicamente en `.30`, pero primero se validara localmente en repo;
- no se duplicara parser, mapper ni contrato `domain.Event`.

## 5. Inputs / outputs

### Inputs permitidos en dry-run inicial

- `--input file`
- `--stdin`
- directorio de samples sinteticos
- archivo sanitizado manualmente

### Inputs no permitidos todavia

- listener TCP/UDP `1514`
- lectura directa completa de `/var/log/syslog`
- lectura de `Promtail positions`
- query masiva a Loki
- `docker logs`
- trafico de red
- `POST` live a `ids-core`

### Outputs definidos

- NDJSON por defecto;
- JSON pretty opcional;
- eventos con `raw_hash`, `parse_status`, `normalized`, `domain_event`, `warnings`;
- resumen final con conteos y distribuciones;
- errores por `stderr`.

## 6. Seguridad

- dry-run por defecto;
- no listener por defecto;
- no `POST` por defecto;
- token futuro fuera del repo;
- allowlist de origen futura;
- logs del collector sin raw completo;
- sanitizacion de IP/MAC/nombres si procede;
- no GeoIP online;
- no auto-blocking.

## 7. Fases futuras

1. `IDS-UNIFI-PARALLEL-COLLECTOR-LOCAL-CLI-01`
2. `IDS-UNIFI-PARALLEL-COLLECTOR-SANITIZED-LOG-SAMPLE-01`
3. `IDS-UNIFI-PARALLEL-COLLECTOR-IDS-CORE-CONTRACT-01`
4. `IDS-UNIFI-PARALLEL-COLLECTOR-STAGING-DRYRUN-01`
5. `IDS-UNIFI-PARALLEL-COLLECTOR-LIVE-INGEST-GATED-01`
6. `IDS-UNIFI-GATEWAY-IDS-DASHBOARD-INTEGRATION-01`

## 8. Qué NO se tocó

- UniFi
- SIEM actual
- NetFlow/IPFIX
- Promtail
- Loki
- Grafana
- codigo funcional
- puertos
- Docker destructivo
- firewall
- DB / Redis / Postgres
- Nginx / Cloudflare
- `.env`

## 9. Próxima fase recomendada

`IDS-UNIFI-PARALLEL-COLLECTOR-LOCAL-CLI-01`
