# IDS-SURICATA-EVE-HANDLER-HARDENING-01

## Resultado

**PASS**

Se corrigio el handler batch Suricata EVE para evitar escrituras parciales por errores de validacion de input. El batch se parsea y valida completamente antes de cualquier `Save` o publicacion SSE.

Esta fase no despliega el fix a staging. Staging seguira usando el handler anterior hasta una fase de deploy controlada de `ids-core`.

## Rama y HEAD

| Campo | Valor |
|-------|-------|
| Repo | `E:\opencode\ids-app` |
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `b2d8210` |
| HEAD final | commit documental/funcional de esta fase |
| Working tree inicial | limpio |

## Bug corregido

Endpoint afectado:

```text
POST /api/v1/suricata/eve/batch
```

Descripcion:

- El handler llamaba `EVEIngestor.IngestJSONLines`.
- `IngestJSONLines` parseaba y guardaba cada linea inmediatamente.
- Despues de guardar, el handler validaba `len(events) > 100`.
- Un batch de mas de 100 eventos validos podia guardar eventos antes de devolver 400.
- Un batch con lineas validas antes de una linea invalida podia guardar parcialmente antes de devolver 400.

Causa:

- Parseo, validacion y persistencia estaban acoplados en una sola funcion.

Riesgo:

- Escrituras parciales.
- Estado inconsistente entre respuesta HTTP y repositorio.
- Posible carga accidental de eventos antes de rechazar el batch.
- Publicacion SSE parcial si se movia el publish o si el flujo evolucionaba sin hardening.

## Flujo anterior

1. Leer body.
2. Rechazar body vacio superficial.
3. `IngestJSONLines`:
   - parsea linea;
   - guarda evento;
   - continua con la siguiente linea.
4. Handler valida `len(events) > 100` despues de guardar.
5. Handler publica SSE.
6. Handler responde.

## Flujo nuevo

1. Leer body.
2. Rechazar body vacio.
3. `ParseEVEJSONLines` parsea todas las lineas y acumula eventos en memoria.
4. Rechazar JSON invalido antes de guardar.
5. Rechazar batch vacio antes de guardar.
6. Rechazar batch `>100` antes de guardar.
7. Solo si todo valida:
   - `SaveEvents` guarda cada evento;
   - se publica SSE para cada evento;
   - se devuelve HTTP 200 con `count` correcto.

Nota: si falla `SaveEvents` en mitad de la fase de guardado, no hay transaccion global porque el repositorio actual no expone transacciones batch. Esta fase elimina escrituras parciales por validacion de input, que era el riesgo detectado.

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `services/ids-core/internal/suricata/ingest.go` | Añade `ParseEVEJSONLines` y `SaveEvents`; `IngestJSONLines` reutiliza parseo completo antes de guardar |
| `services/ids-core/internal/api/suricata_handler.go` | Valida batch completo, count y limite antes de `SaveEvents` y SSE |
| `services/ids-core/internal/api/suricata_handler_test.go` | Nuevos tests HTTP del handler batch |
| `docs/phases/IDS-SURICATA-EVE-HANDLER-HARDENING-01.md` | Informe de fase |

## Tests añadidos

Archivo: `services/ids-core/internal/api/suricata_handler_test.go`.

Casos:

1. `TestSuricataHandleEVEBatchValidStoresAndPublishes`
   - HTTP 200.
   - Repo contiene 3 eventos.
   - Broadcaster publica 3 eventos.

2. `TestSuricataHandleEVEBatchEmptyBodyDoesNotWriteOrPublish`
   - HTTP 400.
   - Repo no cambia.
   - SSE no publica.

3. `TestSuricataHandleEVEBatchInvalidJSONDoesNotWriteOrPublish`
   - HTTP 400.
   - Error contiene linea.
   - Repo no cambia.
   - SSE no publica.

4. `TestSuricataHandleEVEBatchRejectsOverLimitBeforeWriteOrPublish`
   - HTTP 400 para 101 eventos.
   - Repo queda en 0.
   - SSE no publica.

5. `TestSuricataHandleEVEBatchValidThenInvalidDoesNotWriteOrPublish`
   - HTTP 400 con linea 2.
   - La linea valida previa no se guarda.
   - SSE no publica.

Decision sobre lineas vacias:

- Se conserva el comportamiento actual: lineas vacias intermedias se ignoran.
- Body solo vacio/whitespace sigue rechazado como `empty body`.

## Validacion local

Comando desde raiz:

```powershell
go test ./services/ids-core/... -count=1
```

Resultado:

- No aplicable desde raiz porque `services/ids-core` es un modulo Go separado y no hay `go.work` en la raiz.

Comando ejecutado desde `services/ids-core`:

```powershell
go test ./... -count=1
```

Resultado:

- PASS.
- Paquetes `internal/api`, `internal/domain`, `internal/ingest`, `internal/storage`, `internal/suricata` OK.

Comando amplio:

```powershell
task check
```

Resultado observado:

- `ids-core` tests PASS.
- `apps/web` typecheck PASS.
- `analytics-api` tests PASS.
- `mcp-server` tests PASS.
- `validate:suricata-contract` PASS con 9 samples.
- Sigue apareciendo compatibilidad conocida ESLint 10.
- Sigue apareciendo lint no relacionado en `services/mcp-server/src/ids_mcp/main.py`: import `uvicorn` no usado.

No se modifico MCP porque esta fuera de alcance.

## Contrato frontend/API

Busqueda:

```powershell
git grep -n "suricata/eve/batch\|suricata/eve" -- apps services packages
```

Resultado:

- No hay consumidor frontend directo del endpoint EVE.
- Las rutas publicas siguen iguales.
- El formato batch sigue siendo JSON Lines.
- La respuesta 200 sigue usando `{ items, source, count }`.
- Dashboard no requiere cambios.

## Que NO se toco

- No se toco staging.
- No se hizo deploy.
- No se ejecuto Docker ni `docker compose`.
- No se hizo prune.
- No se instalo Suricata.
- No se capturo trafico real.
- No se hicieron escaneos.
- No se toco firewall.
- No se toco DB/Redis/Postgres.
- No se toco Nginx/Cloudflare.
- No se modifico `.env`.
- No se imprimieron secretos.
- No se modifico frontend.

## Riesgos residuales

- El fix no estara activo en staging hasta desplegar `ids-core` con una fase controlada.
- `storage_mode=memory` sigue borrando eventos al reiniciar.
- `alert.signature` todavia no se preserva en metadata textual; queda en `title`.
- Si falla `SaveEvents` durante la fase de guardado, no hay transaccion batch completa.
- No se agrego limite de bytes del body ni limite de longitud por linea; recomendado antes de ingesta real.

## Proxima fase recomendada

**IDS-SURICATA-EVE-HANDLER-HARDENING-STAGING-DEPLOY-01**

Objetivo: desplegar controladamente solo `ids-core` con este hardening, validar batch `>100` rechazado sin escritura parcial en staging, logs y restart counts.
