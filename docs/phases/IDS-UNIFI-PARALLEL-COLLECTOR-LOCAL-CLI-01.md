# IDS-UNIFI-PARALLEL-COLLECTOR-LOCAL-CLI-01

## 1. Resultado

PASS.

Se implemento la primera CLI local del collector paralelo UniFi en modo dry-run, one-shot, sin listener y sin `POST`, reutilizando el parser y mapper existentes.

## 2. Rama / HEAD

- Rama: `scaffold/ids-v2-dev-env-01`
- HEAD inicial: `4d8b3c0`
- HEAD final: pendiente del commit de esta fase

## 3. Archivos creados / modificados

### Creados

- `services/ids-core/cmd/unifi-parallel-collector/main.go`
- `services/ids-core/cmd/unifi-parallel-collector/main_test.go`
- `docs/phases/IDS-UNIFI-PARALLEL-COLLECTOR-LOCAL-CLI-01.md`

### Modificados

- `packages/contracts/unifi/README.md`

## 4. CLI creada

Ruta:

- `services/ids-core/cmd/unifi-parallel-collector/`

Caracteristicas:

- CLI local, one-shot, solo `dry-run`.
- Reutiliza `ParseCEF`, `NormalizeCEF` y `ToDomainEvent`.
- Calcula `raw_hash` real con prefijo `sha256:`.
- Deduplicacion in-memory por `raw_hash`.
- Emite `NDJSON` por defecto.
- Emite JSON pretty opcional.
- Genera resumen final de conteos.
- No escribe en disco por defecto.
- No hace `POST`.
- No abre puertos.

## 5. Flags

- `--input <file>` repetible
- `--stdin`
- `--output ndjson|json`
- `--mode dry-run`
- `--dedupe true|false`
- `--include-raw false|true`

Valores por defecto:

- `mode=dry-run`
- `output=ndjson`
- `dedupe=true`
- `include-raw=false`

## 6. raw_hash y dedupe

- `raw_hash` = `sha256:` + SHA-256 del mensaje CEF trimmeado y con fin de linea normalizado.
- Dedupe actual = in-memory por `raw_hash`.
- Duplicados se marcan con `parse_status=duplicate`.
- El resumen final incrementa `duplicates`.

## 7. Salida NDJSON / JSON

### NDJSON por defecto

- una linea JSON por evento;
- una linea final con `summary`.

### JSON pretty opcional

- objeto con:
  - `events`
  - `summary`

## 8. warnings / errores / exit codes

Warnings por linea contemplados:

- `empty line`
- `unknown signature`
- `missing src`
- `missing dst`
- `invalid src port`
- `invalid dst port`
- `unsupported escape pattern`
- `duplicate raw_hash`

Errores controlados:

- archivo no existe
- CEF invalido
- configuracion invalida
- linea demasiado larga / limite de seguridad

Exit codes:

- `0` = parsed > 0 y sin errores
- `1` = errores de parseo
- `2` = input invalido/no existe
- `3` = configuracion invalida
- `4` = limite de seguridad excedido

## 9. Validacion con samples

Se validaron estos escenarios desde `services/ids-core`:

1. archivo unico (`ids-alert.cef`) -> OK
2. multiples samples (`ids-alert`, `firewall-blocked`, `dns-query`, `device-management`) -> `parsed=4`
3. STDIN -> OK
4. duplicado por STDIN -> `duplicates=1`
5. input invalido (`not-cef`) -> exit code `1`
6. salida `--output json` -> JSON valido

Observaciones:

- `include-raw=false` no imprime el raw completo por defecto.
- `device-management.cef` genera warning `missing dst`, pero se procesa correctamente.

## 10. Tests

Se anadieron tests para:

- `raw_hash` con prefijo `sha256:`
- sample simple produce evento y resumen
- multiples samples -> `parsed=4`
- STDIN
- duplicado -> `duplicates=1`
- invalid CEF -> exit `1`
- missing file -> exit `2`
- `include-raw=false` no imprime raw
- `--output json` produce JSON valido
- lineas vacias -> `skipped`

## 11. task check

`go test ./... -count=1` en `services/ids-core` paso en verde.

`task check` no es requisito estricto para la CLI, pero si se ejecuta siguen siendo esperables los issues preexistentes ya conocidos fuera de scope:

- `apps/web`: incompatibilidad ESLint 10 / circular JSON
- `services/mcp-server`: `ruff` `F401` por `uvicorn`

## 12. Qué NO se tocó

- UniFi
- SIEM actual
- NetFlow/IPFIX
- Promtail
- Loki
- Grafana
- `.30` / `.40`
- staging
- runtime operativo `ids-core`
- puertos
- Docker destructivo
- firewall
- DB / Redis / Postgres
- Nginx / Cloudflare
- `.env`

## 13. Riesgos residuales

- parser aun sin muestra real amplia;
- no hay live ingest;
- no hay contrato auth con `ids-core` todavia;
- `ids-core` sigue con `storage_mode=memory`;
- falta fase de muestra real sanitizada.

## 14. Próxima fase recomendada

`IDS-UNIFI-PARALLEL-COLLECTOR-SANITIZED-LOG-SAMPLE-01`
