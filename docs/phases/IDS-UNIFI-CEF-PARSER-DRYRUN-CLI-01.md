# IDS-UNIFI-CEF-PARSER-DRYRUN-CLI-01

## 1. Resultado

PASS.

Se implemento una CLI local de dry-run para el parser UniFi CEF que:

- lee uno o varios archivos;
- lee desde STDIN;
- parsea con `internal/unifi`;
- normaliza a `UniFiEvent`;
- mapea opcionalmente a `domain.Event`;
- imprime JSON en stdout;
- devuelve exit code 1 en errores de entrada/parseo.

No se abrieron puertos, no se hizo POST, no se instalo collector y no se toco staging.

## 2. Rama / HEAD

- Rama: `scaffold/ids-v2-dev-env-01`
- HEAD inicial: `2e52e22`
- HEAD final: pendiente del commit de esta fase

## 3. Alcance

Archivos creados o modificados dentro de alcance permitido:

- `services/ids-core/cmd/unifi-cef-dryrun/`
- `services/ids-core/internal/unifi/`
- `packages/contracts/unifi/`
- `docs/phases/IDS-UNIFI-CEF-PARSER-DRYRUN-CLI-01.md`

## 4. CLI creada

Ruta:

- `services/ids-core/cmd/unifi-cef-dryrun/main.go`

Comportamiento:

- admite `--input` repetible;
- admite `--stdin`;
- divide por lineas no vacias;
- genera `raw_hash` SHA-256 por mensaje;
- emite un array JSON con `source`, `line`, `raw_hash`, `normalized` y/o `domain_event`.

## 5. Flags soportados

- `--input <path>`: archivo de entrada. Repetible.
- `--stdin`: lee mensajes desde STDIN.
- `--output normalized|domain|both`: controla la salida JSON. Default `both`.

## 6. Ejemplos ejecutados

Desde `services/ids-core`:

```powershell
go run ./cmd/unifi-cef-dryrun --input ..\..\packages\contracts\unifi\samples\ids-alert.cef --output both
go run ./cmd/unifi-cef-dryrun --input ..\..\packages\contracts\unifi\samples\firewall-blocked.cef --output both
go run ./cmd/unifi-cef-dryrun --input ..\..\packages\contracts\unifi\samples\dns-query.cef --output both
go run ./cmd/unifi-cef-dryrun --input ..\..\packages\contracts\unifi\samples\device-management.cef --output both
Get-Content ..\..\packages\contracts\unifi\samples\ids-alert.cef | go run ./cmd/unifi-cef-dryrun --stdin --output both
@('not-cef') | go run ./cmd/unifi-cef-dryrun --stdin --output both
```

## 7. Resultados

- `ids-alert.cef`: parseo correcto, `threat_detected`, severidad `critical`, protocolo `udp`.
- `firewall-blocked.cef`: parseo correcto, `blocked_connection`, severidad `high`, protocolo `tcp`.
- `dns-query.cef`: parseo correcto, `dns_query`, severidad `medium`, titulo `example.com`.
- `device-management.cef`: parseo correcto, `management_event`, severidad `medium`.
- STDIN: parseo correcto del sample `ids-alert.cef`.
- invalid: error controlado `invalid CEF prefix` y exit code distinto de 0.

## 8. Tests

### Go tests

Ejecutado:

```powershell
cd services/ids-core
go test ./... -count=1
```

Resultado: PASS.

### Tests de CLI

Se agregaron tests de comportamiento en `cmd/unifi-cef-dryrun/main_test.go` para:

- lectura con lineas vacias;
- multiples `--input`;
- entrada por STDIN;
- input invalido con exit code 1.

### task check

`task check` ejecuto completo, pero mostro issues preexistentes fuera de scope:

- `apps/web`: incompatibilidad conocida con ESLint 10 (`Converting circular structure to JSON`).
- `services/mcp-server`: `ruff` reporta `F401` por `uvicorn` importado y no usado en `src/ids_mcp/main.py`.

La fase no corrige esos puntos porque no pertenecen al alcance UniFi dry-run CLI.

## 9. Que NO se toco

- UniFi real
- staging
- collectors reales
- listeners UDP/TCP
- puertos
- SIEM
- NetFlow/IPFIX
- Docker / Docker Compose
- firewall
- Nginx / Cloudflare
- DB / Redis / Postgres
- `.env`
- frontend
- dashboard
- POST hacia `ids-core`

## 10. Limitaciones

- Usa samples sinteticos.
- El parser actual cubre un subconjunto de CEF y no implementa escapes completos.
- La salida `domain_event` es una proyeccion JSON estable para no depender de la serializacion cruda de `domain.Event`.
- No hay collector/relay real en esta fase.

## 11. Riesgos residuales

- Falta validar con logs reales UniFi.
- Falta definir collector/relay real para `syslog` vivo.
- Falta integracion con dashboard.
- `192.168.1.30:1514` sigue pendiente de planificacion real.

## 12. Proxima fase recomendada

- `IDS-UNIFI-GATEWAY-IDS-DASHBOARD-INTEGRATION-01`

o, si se quiere cerrar el camino operativo antes de UI:

- `IDS-UNIFI-LIVE-SYSLOG-RELAY-PLAN-01`
