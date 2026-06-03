# CIERRE DOCUMENTAL — IDS-SURICATA-EVE-HANDLER-HARDENING-STAGING-DEPLOY-01

## RESULTADO: PASS

## CONTEXTO
Proyecto: IDS OT/IT
Repo local: E:\opencode\ids-app
Rama: scaffold/ids-v2-dev-env-01
Fase a cerrar: IDS-SURICATA-EVE-HANDLER-HARDENING-STAGING-DEPLOY-01
Estado real: PASS técnico manual ya validado
Motivo de este cierre: El despliegue y validación técnica se completaron manualmente, pero quedó pendiente crear el informe documental, commit y push porque el operador se quedó sin tokens de agente.

## WORKFLOW/GHCR
GitHub Actions:
- Workflow: Publish staging container images #6
- Resultado: Success
- Branch: scaffold/ids-v2-dev-env-01
- Commit funcional incluido: 2221dfc fix(core): harden Suricata EVE batch validation

## IMAGEN IDS-CORE
- Imagen ids-core anterior: ghcr.io/albertgracia/ids-app/ids-core:staging, sha256:7ceb1c9e1b31eb9f8d0e3f40157aa0c527e59a980ddf9ae8cfd495064d5b1c7d
- Imagen ids-core nueva: ghcr.io/albertgracia/ids-app/ids-core:staging, sha256:9131f58e9838b84a54e427be6af4500e8e21d6be87be7e1e0afdae24a7f23bee

## DEPLOY
- Servicio recreado: solo ids-core (docker compose --env-file .env -f compose.yaml up -d --no-deps ids-core)
- Rollback necesario: No
- Rollback ejecutado: No

## HEALTH POST-DEPLOY
- ids-core: healthy
- ids-web: healthy
- analytics: healthy
- mcp: healthy
- postgres: healthy
- redis: healthy

## BATCH VALIDATION
- Events after deploy: 0 (expected for storage_mode=memory)
- Assets after deploy: 0 (expected for storage_mode=memory)
- Valid batch 3: HTTP 200, source=suricata_eve, count=3
- Empty body: HTTP 400, error="empty body", no partial writes
- Invalid JSON: HTTP 400, error controlado line 1, no partial writes
- Valid+invalid: HTTP 400, error controlado line 2, no partial writes (valid line not saved)
- 101 valid events: HTTP 400, error="batch exceeds maximum of 100 events", no partial writes
- No partial writes: Confirmado en todos los casos de error

## SSE
- Resultado: event: connected, data: {"status":"connected"}

## LOGS FINALES
- ids-web: sin errores críticos
- ids-core: sin errores críticos, solo "storage mode: memory (max 5000 events)" (normal)
- ids-analytics: sin errores críticos
- ids-mcp: sin errores críticos
- Patrones revisados: error, failed, exception, panic, traceback, unhandled, ECONN, EADDR, EventSource, SSE, suricata, eve - todos sin hallazgos críticos

## RESTART COUNTS FINALES
- ids-web: restartCount=0, health=healthy, status=running
- ids-core: restartCount=0, health=healthy, status=running
- ids-analytics: restartCount=0, health=healthy, status=running
- ids-mcp: restartCount=0, health=healthy, status=running
- ids-postgres: restartCount=0, health=healthy, status=running
- ids-redis: restartCount=0, health=healthy, status=running

## DOCUMENTACIÓN
- Informe: creado (este archivo)
- Commit: pendiente (ver abajo)
- Push: pendiente (ver abajo)

## CONFIRMACIONES
- No se modificó código funcional.
- No se tocó staging.
- No se ejecutó SSH.
- No se ejecutó Docker (solo se usó para validación manual previa).
- No se hizo deploy (solo se recreó ids-core manualmente previamente).
- No se hizo POST (solo se validó manualmente previamente).
- No se hizo prune.
- No se tocó .env.
- No se instaló Suricata.
- No se capturó tráfico real.
- No se hicieron escaneos.
- No se tocó firewall.
- No se bloqueó tráfico.
- No se tocó DB/Redis/Postgres manualmente.
- No se tocó Nginx/Cloudflare.
- No se imprimieron secretos.

## RIESGOS RESIDUALES
- storage_mode=memory sigue perdiendo eventos al reiniciar ids-core.
- alert.signature todavía no se preserva como metadata textual completa.
- Si falla storage.Save durante la fase final de commit lógico, no hay transacción global real.
- El endpoint EVE no debe exponerse a Internet.
- Antes de Suricata real hace falta decisión de sensor placement.
- No hay todavía forwarder real eve.json -> ids-core.
- No se ha instalado ni ejecutado Suricata real.

## PRÓXIMA FASE RECOMENDADA
IDS-SURICATA-SENSOR-PLACEMENT-DECISION-01