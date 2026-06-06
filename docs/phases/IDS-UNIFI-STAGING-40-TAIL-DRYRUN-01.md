# FASE: IDS-UNIFI-STAGING-40-TAIL-DRYRUN-01

**Resultado:** PASS

**Fecha:** 2026-06-06

---

## 1. Resultado

Se ejecutó el primer dry-run controlado del collector UniFi en `.40`:

- binario temporal en `/tmp`
- `--tail-file /var/log/unifi/ids.log`
- `--state-file` temporal
- `--start-position=end`
- `--once`
- `--send=false`

No se hizo POST, no se imprimieron logs reales y no se dejó nada instalado permanentemente.

## 2. Estado del repositorio

| Item | Valor |
|---|---|
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `5429a97` |
| HEAD final | pendiente del commit documental |
| Working tree inicial | limpio |

## 3. Entorno local build

- `go version`: `go1.26.3 windows/amd64`
- `task --version`: `3.51.1`
- Docker Desktop: disponible pero no operativo
- Docker usado: no

Build local realizado con:

- `GOOS=linux`
- `GOARCH=amd64`

Artefacto temporal generado:

- `unifi-parallel-collector-linux-amd64`

## 4. Inventario `.40`

### Host

- `ubuntu-server`
- usuario observado: `albert`

### ids-core health

- `/healthz` OK
- `/readyz` OK
- `/api/v1/status` OK

### rsyslog

- `active`

### Puertos

- `1514` TCP+UDP LISTEN
- `15514` TCP+UDP LISTEN
- `8088` TCP LISTEN

### Log metadata

- `/var/log/unifi/ids.log`: existe, ~956 KB
- `/var/log/unifi/traffic.log`: existe, ~3.5 MB

## 5. Binario temporal en `.40`

Ruta temporal:

- `/tmp/ids-unifi-tail-dryrun-20260606-113046/unifi-parallel-collector`

Ejecución:

- sí, el binario ejecutó correctamente

Checksum SHA-256:

- local: `7f66d4626ca3c63998c691ba0586efc35b4211813d3b5567b57c5f9c0eddfaa4`
- remote: `7f66d4626ca3c63998c691ba0586efc35b4211813d3b5567b57c5f9c0eddfaa4`

Eliminado al final:

- sí

## 6. Dry-run en `.40`

### Configuración usada

- `--tail-file /var/log/unifi/ids.log`
- `--state-file /tmp/.../state.json`
- `--start-position end`
- `--once`
- `--ingest-batch`
- `--send=false`
- `--collector-id unifi-collector-40-dryrun`
- `--source-host Cloud-Gateway-Fiber-Labraza`

### Primera ejecución

- `send=false`
- `start-position=end`
- `summary.total_lines=0`
- `parsed=0`
- `batch_events=0`
- `offset_before=978581`
- `offset_after=978581`
- `state_written=true`

Interpretación:

- no hubo replay histórico
- el offset se posicionó al final del archivo actual
- el collector pudo abrir y leer el log sin error de permisos

### Segunda ejecución

- `summary.total_lines=0`
- `parsed=0`
- `batch_events=0`
- `offset_before=978581`
- `offset_after=978581`

Interpretación:

- no reenvió ni releyó histórico
- el state-file se reutilizó correctamente

### Tercera ejecución opcional

- se ejecutó tras espera corta
- `parsed=0`
- `batch_events=0`

Interpretación:

- no llegaron nuevas líneas durante la ventana
- el comportamiento sigue siendo correcto para dry-run sin replay

### POST realizado

- no

## 7. State-file

Creado:

- sí

Campos observados:

- `version=1`
- `path=/var/log/unifi/ids.log`
- `inode=0`
- `device=0`
- `offset=978581`
- `last_line_hash=None`
- `updated_at=2026-06-06T09:30:46Z`
- `collector_id=unifi-collector-40-dryrun`

Raw/secrets:

- no contiene raw
- no contiene secretos

Eliminado al final:

- sí, junto al directorio temporal remoto

## 8. Permisos

Lectura de `/var/log/unifi/ids.log`:

- sí, el collector pudo abrir el archivo y posicionarse al final sin error

Incidencias:

- ninguna en esta fase

## 9. Tests locales

### `go test ./... -count=1`

PASS

### `task check`

PASS con solo issues preexistentes fuera de scope:

- `apps/web` ESLint 10 circular JSON
- `services/mcp-server` ruff `F401 uvicorn`

## 10. Limpieza

### Remota

- `/tmp/ids-unifi-tail-dryrun-20260606-113046` eliminado
- sin binarios temporales remanentes
- sin `state.json` temporal remanente

### Local

- directorio build temporal eliminado

## 11. Qué NO se tocó

- No se tocó UniFi
- No se cambió SIEM
- No se activó NetFlow/IPFIX
- No se cambió modo IDS/IPS
- No se ejecutó BlackSun
- No se hicieron escaneos/ataques
- No se usó API key UniFi
- No se modificó rsyslog
- No se reinició rsyslog
- No se modificó Promtail
- No se tocó Loki/Grafana
- No se tocó Docker/firewall de `.40`
- No se instalaron binarios permanentes en `.40`
- No se crearon usuarios/directorios/env/systemd permanentes en `.40`
- No se hizo POST/live ingest contra `.40`
- No se usó `--send=true`
- No se leyó/imprimió contenido de `/var/log/unifi/ids.log`
- No se imprimieron logs reales
- No se modificó código funcional
- No se commitearon logs/secretos/tokens/binarios/state-files

## 12. Riesgos observados

- `storage_mode` actual del `ids-core` en `.40` sigue siendo `memory`
- `/api/v1/status` actual no anuncia explícitamente la capability UniFi interna, por lo que antes del siguiente paso conviene verificar versión/capabilities desplegadas
- no hubo nuevas líneas reales durante la ventana del dry-run; el comportamiento de append natural en `.40` quedaría para una fase posterior controlada

## 13. Próxima fase recomendada

**IDS-UNIFI-STAGING-40-TAIL-SEND-SMOKE-PLAN-01**
