# IDS-V0-REAL-DATA-STAGING-VALIDATION-01

## Resultado

**PARTIAL**

La fase no pudo validar datos reales en staging porque el acceso SSH no interactivo a `albert@192.168.1.40` fallo por autenticacion. Se aplico el criterio de parada indicado: no se buscaron workarounds, no se ejecutaron comandos remotos adicionales, no se hicieron POSTs y no se genero trafico/eventos.

## Fecha/hora

2026-06-03

## Rama y HEAD

| Campo | Valor |
|-------|-------|
| Repo | `E:\opencode\ids-app` |
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD local | `4da5ce3` |
| HEAD origin | `4da5ce3` |
| Working tree inicial | limpio |

## Estado staging inicial

No validado por el agente en esta fase.

Contexto aportado por el usuario antes de iniciar:

- `IDS-V0-ROOT-STAGING-CLOSE-01` = PASS
- `IDS-V0-DASHBOARD-STAGING-SOAK-01` = PASS manual
- `/` muestra el nuevo Analizador de Trafico de Red
- `/design-lab/v0-network` disponible
- `/legacy-dashboard` preserva dashboard antiguo
- Docker enabled + active
- Todos los contenedores healthy
- Todos restart=`unless-stopped`
- `restartCount=0`
- `/api/health` OK
- `/`, `/design-lab/v0-network`, `/legacy-dashboard` HTTP 200
- ids-core OK
- ids-analytics OK
- ids-mcp OK
- Redis/Postgres healthy
- Logs sin errores criticos
- Validacion visual humana OK

## Conexion staging

Host reachability:

```powershell
Test-Connection -ComputerName 192.168.1.40 -Count 2 -Quiet
# True
```

SSH:

```powershell
ssh -o BatchMode=yes -o ConnectTimeout=10 albert@192.168.1.40 "cd /home/albert/docker/ids-app && hostname && pwd"
# Permission denied (publickey,password).
```

Decision: detener la fase segun la instruccion explicita y la politica `docs/agent-remote-operations.md`.

Nota de seguridad: posteriormente se recibio una contrasena por chat. No se uso, no se imprimio, no se guardo y no se incluyo en comandos ni documentacion. El entorno no permite introducirla de forma interactiva en `ssh`, y pasarla por argumentos, variables o archivos temporales expondria un secreto.

## Endpoints read-only

No validados por falta de SSH.

Pendientes para ejecucion manual en staging:

```bash
curl -fsS http://127.0.0.1:3002/api/health
curl -I http://127.0.0.1:3002/
curl -I http://127.0.0.1:3002/design-lab/v0-network
curl -I http://127.0.0.1:3002/legacy-dashboard
curl -fsS http://127.0.0.1:8088/healthz
curl -fsS http://127.0.0.1:8088/api/v1/status || true
curl -fsS "http://127.0.0.1:8088/api/v1/events/recent?limit=20" || true
curl -fsS "http://127.0.0.1:8088/api/v1/assets/classifications?limit=20" || true
curl -fsS http://127.0.0.1:8090/healthz
curl -fsS http://127.0.0.1:8090/api/v1/status || true
curl -fsS http://127.0.0.1:8091/healthz
```

## Events recent antes

No validado por el agente en esta fase.

Ultimo dato conocido del soak manual:

```json
{"items":[],"count":0,"limit":5}
```

## Endpoint seguro para generar eventos

No identificado en esta fase porque el criterio de parada tras fallo SSH indicaba detenerse y no continuar con descubrimiento ni generacion.

No se asumieron rutas.
No se inventaron endpoints.
No se hicieron POSTs.

## Eventos generados

Ninguno.

Motivo: no se completo la validacion read-only remota y no se identifico endpoint seguro bajo el flujo autorizado.

## Events recent despues

No validado.

## SSE

No validado.

Pendiente para ejecucion manual con timeout:

```bash
timeout 8s curl -N http://127.0.0.1:8088/api/v1/events/stream || true
```

## Asset classifier

No validado.

Endpoint pendiente:

```bash
curl -fsS "http://127.0.0.1:8088/api/v1/assets/classifications?limit=20" || true
```

## Analytics scoring

No validado.

No se hizo ningun POST a analytics.

## Visual dashboard

No validado en esta fase por el agente.

Ultimo contexto aportado por el usuario: validacion visual humana OK tras el soak manual.

## Logs

No revisados por falta de SSH.

Pendiente para ejecucion manual:

```bash
docker logs --since=30m ids-web 2>&1 | tail -n 200
docker logs --since=30m ids-core 2>&1 | tail -n 160
docker logs --since=30m ids-analytics 2>&1 | tail -n 120
docker logs --since=30m ids-mcp 2>&1 | tail -n 80
```

## Restart counts

No validados por falta de SSH.

## Que NO se toco

- No se modifico codigo funcional.
- No se hizo deploy.
- No se ejecuto `docker compose up/down/restart/pull`.
- No se hizo prune.
- No se toco `.env`.
- No se imprimieron secretos.
- No se toco DB manualmente.
- No se toco Redis/Postgres manualmente.
- No se toco Nginx/Cloudflare.
- No se hizo Suricata real.
- No se hicieron escaneos reales.
- No se bloquearon IPs.
- No se toco firewall.
- No se hicieron POSTs ni ingestas.
- No se genero trafico ni eventos sinteticos.

## Riesgos residuales

- La validacion de `events/recent` con eventos reales/sinteticos queda pendiente.
- La disponibilidad real de SSE queda pendiente.
- Asset classifier en staging queda pendiente.
- Analytics scoring en staging queda pendiente.
- Visualizacion de datos reales en `/` queda pendiente.
- Logs post-validacion no revisados por el agente.
- Restart counts finales no comprobados por el agente.
- Se requiere acceso SSH no interactivo o ejecucion manual de comandos.

## Proxima fase recomendada

Reintentar **IDS-V0-REAL-DATA-STAGING-VALIDATION-01** cuando exista acceso SSH no interactivo, o cuando el operador humano ejecute los comandos read-only y pegue resultados.

Despues, si la validacion real-data pasa, continuar con:

**IDS-SURICATA-EVE-REAL-INGEST-PLAN-01**
