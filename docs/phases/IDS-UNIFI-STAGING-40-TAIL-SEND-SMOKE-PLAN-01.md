# FASE: IDS-UNIFI-STAGING-40-TAIL-SEND-SMOKE-PLAN-01

**Resultado:** PASS

**Fecha:** 2026-06-06

---

## 1. Motivo

Tras validar el dry-run del tailer en `.40` sin envío, el siguiente paso seguro es dejar preparado el plan de un smoke controlado con `send=true`, sin ejecutarlo todavía.

## 2. Estado del repositorio

| Item | Valor |
|---|---|
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `2cc698f` |
| HEAD final | pendiente del commit documental |
| Working tree inicial | limpio |

## 3. Inventario `.40`

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

- `/var/log/unifi/ids.log` existe, ~956 KB
- `/var/log/unifi/traffic.log` existe, ~3.5 MB

## 4. Endpoint ingest

- endpoint revisado: `http://127.0.0.1:8088/api/internal/v1/ingest/events/unifi`
- método usado en esta fase: ninguno con body; verificación documental y por código
- resultado: el plan debe asumir loopback local, no `192.168.1.40`
- sin POST real: sí

Observación clave:

- `/api/v1/status` actual no anuncia explícitamente la capability UniFi interna, por lo que antes de ejecutar el smoke real hay que confirmar versión/capabilities desplegadas.

## 5. Plan SEND-SMOKE-01

### endpoint

- `http://127.0.0.1:8088/api/internal/v1/ingest/events/unifi`

### token/env

- env temporal fuera repo
- ruta futura: `/etc/ids-app/unifi-collector.env`
- variable: `IDS_UNIFI_INGEST_TOKEN`

### batch size

- recomendado `10` o `25`

### start-position

- `end`

### state-file

- controlado, sin replay histórico
- ruta futura: `/var/lib/ids-app/unifi-collector/state.json`

### validaciones

- auth efectiva
- accepted/rejected/duplicates
- no replay histórico
- `/api/v1/events/recent` refleja eventos si hubo nuevas líneas

### rollback

- detener proceso temporal
- no tocar rsyslog ni UniFi
- borrar binario/state/env temporales si aplica
- validar ids-core sano

### criterios PASS/FAIL

- PASS: envío correcto a loopback, sin replay, sin rechazo inesperado
- PARTIAL: no llegan nuevas líneas pero el collector y endpoint están sanos
- FAIL: auth falla, replay, rejected inesperados o cambios permanentes no autorizados

## 6. Gates

### antes de dry-run

- ya cumplidos en la fase anterior

### antes de send-smoke

- confirmar que la versión desplegada de `ids-core` en `.40` incluye el endpoint UniFi
- usar solo loopback `127.0.0.1`
- token temporal fuera repo
- batch size bajo
- `start-position=end`
- rollback listo
- storage mode entendido (`memory` actual)

## 7. Riesgos

- `memory` storage no persistente
- endpoint UniFi puede no estar realmente desplegado en `.40`
- puede no haber nuevas líneas durante la ventana del smoke
- replay accidental si se usa mal `state-file` o `start-position`
- permisos incorrectos del env temporal/token

## 8. Tests

### `go test ./... -count=1`

PASS

### `task check`

PASS con solo issues preexistentes:

- `apps/web` ESLint 10 circular JSON
- `services/mcp-server` ruff `F401 uvicorn`

## 9. Qué NO se tocó

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
- No se leyó contenido de `/var/log/unifi/ids.log`
- No se imprimieron logs reales
- No se modificó código funcional
- No se commitearon logs/secretos/tokens

## 10. Próxima fase recomendada

**IDS-UNIFI-STAGING-40-TAIL-SEND-SMOKE-01**
