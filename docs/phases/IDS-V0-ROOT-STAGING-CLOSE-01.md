# IDS-V0-ROOT-STAGING-CLOSE-01

## Resultado

**PASS**

## Agente principal

@code-archaeologist

## Apoyo

@devops-engineer
@frontend-specialist

---

## 1. Rama y HEAD

| Campo | Valor |
|-------|-------|
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `b557f1a` |
| HEAD final | `e210240` (tras commit documental) |
| Working tree | limpio |

## 2. Resumen de fases completadas

| Fase | Resultado | Commit funcional |
|------|-----------|------------------|
| IDS-V0-TEMPLATE-INTAKE-AUDIT-01 | PASS | — |
| IDS-V2-DEV-ENV-SCAFFOLD-01 | PASS | — |
| IDS-V0-SSE-LIVE-STREAM-01 | PASS | 0061249 |
| IDS-V0-REAL-EVENTS-POLLING-01 | PASS | 0606487 |
| IDS-V0-STATS-DERIVED-FROM-EVENTS-01 | PASS | 13166c9 |
| IDS-V0-ASSET-CLASSIFIER-INTEGRATION-01 | PASS | 958ca95 |
| IDS-V0-SCORING-SEVERITY-INTEGRATION-01 | PASS | 510daca |
| IDS-V0-GEOIP-SYNTHETIC-INTEGRATION-01 | PASS | 20fda29 |
| IDS-SURICATA-EVE-UI-INTEGRATION-01 | PASS | 3072947 |
| IDS-V0-DASHBOARD-ROOT-REPLACEMENT-01 | PASS | a0d1d77 |
| IDS-V0-ROOT-STAGING-DEPLOY-01 | PARTIAL (bloqueada) | — |
| IDS-V0-ROOT-STAGING-CLOSE-01 | PASS | — |

## 3. Estado final de rutas

| Ruta | Estado | Contenido |
|------|--------|-----------|
| `/` | ✅ 200 OK | Nuevo Analizador de Tráfico de Red (V0NetworkDashboard) |
| `/design-lab/v0-network` | ✅ 200 OK | Mismo componente compartido, sigue funcionando |
| `/legacy-dashboard` | ✅ 200 OK | Dashboard SOC antiguo preservado con aviso legacy |
| `/api/health` | ✅ 200 OK | `{"service":"ids-web","status":"ok"}` |

## 4. Estado final de servicios

| Servicio | Puerto | Estado |
|----------|--------|--------|
| ids-web | 3002 | ✅ healthy |
| ids-core | 8088 | ✅ /healthz OK |
| ids-analytics | 8090 | ✅ /healthz OK |
| ids-mcp | 8091 | ✅ /healthz OK |
| Redis | — | ✅ healthy (no tocado) |
| Postgres | — | ✅ healthy (no tocado) |

## 5. Validación técnica

- `curl -I http://127.0.0.1:3002/` → 200 OK
- `curl -I http://127.0.0.1:3002/design-lab/v0-network` → 200 OK
- `curl -I http://127.0.0.1:3002/legacy-dashboard` → 200 OK
- `curl -fsS http://127.0.0.1:3002/api/health` → OK
- `curl -fsS http://127.0.0.1:8088/healthz` → OK
- `curl -fsS http://127.0.0.1:8090/healthz` → OK
- `curl -fsS http://127.0.0.1:8091/healthz` → OK
- `docker ps` → ids-web healthy

## 6. Validación visual humana

El usuario confirmó "correcto":

- `/` → muestra el nuevo Analizador de Tráfico de Red
- `/design-lab/v0-network` → funciona correctamente
- `/legacy-dashboard` → dashboard SOC antiguo disponible

## 7. Confirmaciones

- [x] Solo se recreó `ids-web`
- [x] No se tocó backend
- [x] No se tocó DB
- [x] No se tocó Redis / PostgreSQL
- [x] No se tocó analytics
- [x] No se tocó MCP
- [x] No se tocó Nginx / Cloudflare
- [x] No se hizo `docker compose down`
- [x] No se hizo prune
- [x] No se modificó `.env`
- [x] No se imprimieron secretos

## 8. Rollback

Si se quisiera volver al dashboard antiguo en `/`:

```bash
# Revertir el commit funcional
git revert a0d1d77 --no-edit

# O restaurar el page.tsx original
git checkout a0d1d77~1 -- apps/web/src/app/page.tsx
```

El dashboard legacy permanece en `/legacy-dashboard` como referencia visual.

Rollback controlado (solo ids-web):
```bash
cd /home/albert/docker/ids-app
OLD_IMAGE_ID=$(cat /tmp/ids-web-before-root-replacement.txt | awk '{print $2}')
docker tag "$OLD_IMAGE_ID" ghcr.io/albertgracia/ids-app/ids-web:staging
docker compose --env-file .env -f compose.yaml up -d --no-deps --force-recreate ids-web
```

## 9. Riesgos residuales

- Validar durante más tiempo polling/SSE en staging
- Validar datos reales del core en el dashboard
- Validar asset classifier real
- Validar analytics scoring real
- Validar Suricata EVE real
- Implementar GeoIP offline real más adelante
- Decidir retirada futura de `/design-lab/v0-network`
- Decidir retirada futura de `/legacy-dashboard`
- Resolver warning/lint preexistente ESLint 10 si sigue presente
- Crear fase de observabilidad/soak

## 10. Próximas fases recomendadas

1. **IDS-V0-DASHBOARD-STAGING-SOAK-01** — observación del nuevo `/` en staging (logs, consola, polling/SSE, estabilidad visual)
2. **IDS-V0-REAL-DATA-STAGING-VALIDATION-01** — validar eventos reales, assets, scoring y endpoints
3. **IDS-SURICATA-EVE-REAL-INGEST-PLAN-01** — plan seguro para Suricata real
4. **IDS-GEOIP-OFFLINE-ENRICHMENT-PLAN-01** — GeoIP offline sin APIs externas
5. **IDS-LEGACY-DASHBOARD-RETIREMENT-01** — retirar `/legacy-dashboard` cuando el usuario apruebe

## 11. Recomendación de checkpoint

Se recomienda crear un snapshot de la VM de observabilidad/staging si el estado actual se considera estable, para poder revertir rápidamente en caso de problemas en fases posteriores.
