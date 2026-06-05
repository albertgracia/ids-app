# IDS-UNIFI-CEF-PARSER-REAL-SAMPLE-HARDENING-01

## 1. Resultado

PASS.

Se endurecio el parser UniFi para soportar `CEF` puro y `CEF` embebido dentro de lineas tipo syslog, y se introdujo una clasificacion segura para lineas UniFi candidatas que no contienen `CEF`. La CLI del collector paralelo se ajusto para reflejar warnings y errores mas claros sin romper compatibilidad con los samples sinteticos existentes.

## 2. Rama / HEAD

- Rama: `scaffold/ids-v2-dev-env-01`
- HEAD inicial: `8a63181`
- HEAD final: pendiente del commit de esta fase

## 3. Motivo de la fase

La fase anterior confirmo que una muestra real candidata de `.30` no empezaba por `CEF:` puro:

- `LineCount = 10`
- `LinesWithCEF = 0`
- `StartsWithCEF = 0`
- fallo dominante: `invalid CEF prefix`

Eso demostraba que el parser actual era suficiente para samples sinteticos puros, pero no para lineas reales con envoltorio syslog o variantes sin `CEF`.

## 4. Cambios implementados

### Parser / extractor

En `services/ids-core/internal/unifi/cef.go` se agregaron:

- `SyslogEnvelope`
- `ExtractCEF(...)`
- `ParseUniFiLine(...)`
- errores controlados:
  - `ErrNoCEFEnvelope`
  - `ErrUnsupportedUniFiSyslogNoCEF`

Decision de diseño:

- `ParseCEF(...)` sigue siendo el parser del payload CEF puro, manteniendo compatibilidad.
- `ParseUniFiLine(...)` agrega la semantica de linea real UniFi/syslog y es la API que usa ahora el collector paralelo.

### Collector

En `services/ids-core/cmd/unifi-parallel-collector/main.go` se ajusto:

- uso de `ParseUniFiLine(...)`
- warnings nuevos:
  - `syslog_envelope_detected`
  - `embedded_cef_extracted`
  - `unsupported_unifi_syslog_no_cef`
- clasificacion segura:
  - `CEF` embebido -> parsea OK
  - UniFi sin `CEF` -> `skipped`
  - ruido/noise sin `CEF` -> error controlado `no CEF payload found`

## 5. Nuevos samples sintéticos

Se anadieron:

- `packages/contracts/unifi/samples/syslog-embedded-cef-ids-alert.log`
- `packages/contracts/unifi/samples/syslog-embedded-cef-firewall-block.log`
- `packages/contracts/unifi/samples/syslog-unifi-no-cef.log`

Todos son sinteticos y no derivan de logs reales commiteados.

## 6. Soporte resultante

### CEF puro

Soportado y compatible con la version anterior.

### Syslog con CEF embebido

Soportado.

El extractor localiza `CEF:` dentro de la linea, separa un `SyslogEnvelope` minimo y delega el payload a `ParseCEF`.

### UniFi/syslog sin CEF

No se parsea como evento.

Se clasifica de forma segura como no soportado:

- warning/control: `unsupported_unifi_syslog_no_cef`
- sin falso positivo
- sin `panic`

### Ruido / noise sin CEF

No se parsea.

Se devuelve error controlado:

- `no CEF payload found`

## 7. Tests

Se anadieron tests para:

- `ExtractCEF` con `CEF` puro
- `ParseUniFiLine` con syslog + `CEF` embebido IDS alert
- `ParseUniFiLine` con syslog + `CEF` embebido firewall
- `ParseUniFiLine` con UniFi sin `CEF`
- `ParseUniFiLine` con ruido sin `CEF`
- collector con sample `syslog-embedded-cef-ids-alert.log`
- collector con sample `syslog-unifi-no-cef.log`
- collector con noise sin `CEF`

Ademas, los tests previos de `CEF` puro se mantuvieron en verde.

## 8. Validación CLI

### syslog embedded IDS

- `parsed = 1`
- `errors = 0`
- warnings:
  - `syslog_envelope_detected`
  - `embedded_cef_extracted`
- `event_type = threat_detected`

### syslog embedded firewall

- `parsed = 1`
- `errors = 0`
- warnings:
  - `syslog_envelope_detected`
  - `embedded_cef_extracted`
- `event_type = blocked_connection`

### unifi no CEF

- `parsed = 0`
- `skipped = 1`
- `errors = 0`
- warning:
  - `unsupported_unifi_syslog_no_cef`

### CEF antiguo

- `parsed = 1`
- `errors = 0`
- sin regresion observada

## 9. task check

`go test ./... -count=1` en `services/ids-core` paso en verde.

`task check` sigue fallando por issues preexistentes fuera de scope:

- `apps/web`: ESLint 10 / `Converting circular structure to JSON`
- `services/mcp-server`: `ruff` `F401` por `uvicorn`

## 10. Qué NO se tocó

- UniFi
- SIEM actual
- NetFlow/IPFIX
- Promtail
- Loki
- Grafana
- runtime operativo
- puertos
- Docker destructivo
- firewall
- DB / Redis / Postgres
- Nginx / Cloudflare
- `.env`
- staging
- logs reales

## 11. Limitaciones

- el extractor soporta `CEF` embebido por busqueda de `CEF:` y parseo minimo del prefijo syslog;
- no se implementa parseo completo del sobre syslog ni de escapes CEF complejos;
- algunas lineas reales UniFi pueden no ser `CEF` y seguiran quedando fuera del contrato actual.

## 12. Riesgos residuales

- parser aun no validado con muestra real amplia;
- algunos formatos UniFi reales pueden no ser CEF;
- no hay live ingest;
- no hay contrato auth `ids-core`;
- `ids-core` sigue con `storage_mode=memory`.

## 13. Próxima fase recomendada

`IDS-UNIFI-PARALLEL-COLLECTOR-SANITIZED-LOG-SAMPLE-01-RETRY`

Motivo:

- repetir extraccion minima read-only para comprobar si ahora, con el soporte a `CEF` embebido, aparecen lineas parseables en una nueva muestra sanitizada sin exponer contenido real.
