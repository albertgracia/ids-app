# IDS-UNIFI-PARALLEL-COLLECTOR-SANITIZED-LOG-SAMPLE-01-RETRY

## 1. Resultado

PARTIAL.

La fase repitio la extraccion minima read-only desde `.30`, genero una muestra sanitizada temporal fuera del repo, ejecuto el collector endurecido y confirmo que el parser ya clasifica mejor las lineas sin `CEF`. Sin embargo, en esta iteracion concreta la muestra real candidata sigue sin contener `CEF` embebido parseable, por lo que no se puede pasar aun al contrato live con `ids-core`.

## 2. Rama / HEAD

- Rama: `scaffold/ids-v2-dev-env-01`
- HEAD inicial: `8924066`
- HEAD final: pendiente del commit documental de esta fase

## 3. Motivo del retry

La fase anterior `IDS-UNIFI-PARALLEL-COLLECTOR-SANITIZED-LOG-SAMPLE-01` mostro:

- `parsed = 0`
- `errors = 11`
- fallo dominante: `invalid CEF prefix`

Despues del hardening del parser, esta fase buscaba comprobar si una nueva muestra minima real contenia:

- `CEF` embebido parseable;
- lineas UniFi sin `CEF` clasificables como `skipped`;
- o ruido/noise que requiriera mas endurecimiento.

## 4. Hardening aplicado previamente

Ya estaban implementados:

- `ExtractCEF(...)`
- `ParseUniFiLine(...)`
- `SyslogEnvelope`
- `ErrNoCEFEnvelope`
- `ErrUnsupportedUniFiSyslogNoCEF`
- warnings en collector:
  - `syslog_envelope_detected`
  - `embedded_cef_extracted`
  - `unsupported_unifi_syslog_no_cef`

## 5. Fuente de muestra

- Host: `.30 / ubuntu-ialab`
- Archivo: `/var/log/syslog`
- Metodo: `grep` limitado por `unifi|ubiquiti|cef|Ubiquiti|UniFi|CEF:`
- Conteo global limitado en `/var/log/syslog`: `84`
- Lineas candidatas extraidas en esta iteracion: `20`

Metricas agregadas de la muestra cruda temporal, sin imprimir contenido:

- `LineCount = 20`
- `LinesWithCEF = 0`
- `StartsWithCEF = 0`
- `UniFi/Ubiquiti count = 0`

Interpretacion:

- la muestra sigue sin exponer `CEF:` literal;
- el match del `grep` parece venir de otras variantes/fragmentos no convertibles directamente al contrato actual;
- no se imprimio ninguna linea real en chat ni en el repo.

## 6. Sanitización

La muestra se guardo temporalmente fuera del repo, en:

- `C:\Users\leobc\AppData\Local\Temp\ids-unifi-sanitized-sample-retry`

Reglas aplicadas:

- MACs -> `AA:BB:CC:DD:EE:FF`
- `192.168.1.x` -> `192.168.1.10`
- `10.x.x.x` -> `10.0.0.10`
- `172.16.0.0/12` -> `172.16.0.10`
- IPs publicas -> `203.0.113.10`
- dominios -> `example.com`
- pares tipo `client=...`, `device=...`, `hostname=...`, `name=...` -> `CLIENT-REDACTED`

Politica aplicada:

- raw real no impreso;
- raw real no commiteado;
- sanitizado no impreso completo;
- sanitizado no commiteado.

Metricas agregadas del sanitizado:

- `LineCount = 20`
- `LinesWithCEF = 0`
- `StartsWithCEF = 0`
- `UniFi/Ubiquiti count = 0`

## 7. Resultado collector

El collector se ejecuto sobre el archivo sanitizado temporal con `--output json`.

Resumen agregado:

- `total_lines = 20`
- `parsed = 0`
- `skipped = 0`
- `errors = 20`
- `duplicates = 0`
- `event_types = none`
- `severities = none`

Warnings agregados:

- ninguno aplicable en esta muestra, porque no se detecto ni `CEF` embebido ni linea UniFi reconocible con la heuristica actual.

Error dominante por linea:

- `no CEF payload found`

### Comparación con fase anterior

Antes del hardening:

- `parsed = 0`
- `errors = 11`
- error dominante: `invalid CEF prefix`

Ahora:

- `parsed = 0`
- `errors = 20`
- error dominante: `no CEF payload found`

Mejora conseguida:

- el parser ya no asume que toda linea candidata debe empezar por `CEF:`;
- clasifica mejor el caso no-CEF, aunque esta muestra concreta no active la ruta `unsupported_unifi_syslog_no_cef`.

## 8. Validación samples sintéticos

Control con samples sintéticos:

- `syslog-embedded-cef-ids-alert.log`: OK, `parsed=1`, warnings `syslog_envelope_detected` + `embedded_cef_extracted`
- `syslog-embedded-cef-firewall-block.log`: OK, `parsed=1`, warnings `syslog_envelope_detected` + `embedded_cef_extracted`
- `syslog-unifi-no-cef.log`: OK, `skipped=1`, warning `unsupported_unifi_syslog_no_cef`
- `ids-alert.cef`: OK, `parsed=1`

Esto confirma que el hardening funciona con las formas abstractas esperadas, pero la muestra real retry sigue sin parecerse a esos formatos sinteticos.

## 9. Tests

### go test

Ejecutado:

```powershell
cd services/ids-core
go test ./... -count=1
```

Resultado: PASS.

### task check

Ejecutado, con fallos preexistentes fuera de scope:

- `apps/web`: ESLint 10 / `Converting circular structure to JSON`
- `services/mcp-server`: `ruff` `F401` por `uvicorn` importado y no usado

## 10. Limpieza

Se eliminaron todos los temporales fuera del repo:

- `unifi-real-raw.tmp`
- `unifi-real-sanitized.log`
- `collector-output.json`

Comprobacion final:

- `RawExists = false`
- `SanitizedExists = false`
- `OutputExists = false`

## 11. Interpretación

### CEF embebido real

No evidenciado en esta muestra retry.

### UniFi no CEF

No se pudo confirmar con la heuristica actual a partir de estas 20 lineas; aunque el `grep` las considera candidatas, no contienen `CEF:` ni etiquetas UniFi/Ubiquiti detectables tras la extraccion/sanitizacion.

### Necesidad de hardening adicional

Sí.

La evidencia apunta a que la fuente real observable en `/var/log/syslog` puede contener:

- prefijos o formatos distintos a los modelados hasta ahora;
- lineas relacionadas por contexto, no por payload CEF;
- posibles variantes journald/promtail o mensajes intermedios.

## 12. Qué NO se tocó

- UniFi
- SIEM actual
- NetFlow/IPFIX
- Promtail
- `promtail.yml`
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

## 13. Riesgos residuales

- parser aun no validado con muestra real amplia;
- algunos formatos reales pueden no ser `CEF` ni `syslog+CEF`;
- no hay live ingest;
- no hay contrato auth `ids-core`;
- `ids-core` sigue con `storage_mode=memory`;
- falta decidir si la siguiente muestra debe venir de otra fuente controlada distinta de `/var/log/syslog`.

## 14. Próxima fase recomendada

`IDS-UNIFI-CEF-PARSER-REAL-SAMPLE-HARDENING-02`

Motivo:

- sigue haciendo falta entender el formato real observable en `.30` antes de pasar al contrato de ingest con `ids-core`.
