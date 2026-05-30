# Staging Checkpoint — ids-app

**Fecha:** 2026-05-30 21:41 CEST
**Commit:** `ad5d2dc`
**Rama:** `scaffold/ids-v2-dev-env-01`

---

## 1. Estado del checkpoint

IDS-DASHBOARD-REVIEW-GATE-03 = **PASS CONDICIONADO PARA STAGING**

El dashboard actual se acepta como base funcional de staging. No es diseño final premium. Pendiente de pulido visual enterprise futuro.

## 2. Resumen Git

- Rama: `scaffold/ids-v2-dev-env-01`
- HEAD: `ad5d2dc`
- Origin sync: ✅ sincronizado
- Working tree: limpio
- task check: ✅ PASS

### Últimos commits clave

| Commit | Descripción |
|--------|-------------|
| `1c177e6` | Deploy staging stack |
| `9a4f906` | Rollback diseño roto |
| `6fa32ff` | Archaeology cleanup |
| `75972aa` | SOC UI design direction |
| `039d199` | High fidelity mock |
| `826ef87` | Mock integrado en dashboard |
| `1d3e0e4` | Review gate 03 fix |
| `ad5d2dc` | Centrar mapa y topología |

## 3. Estado de staging

| Servicio | Contenedor | Estado | Puerto |
|----------|-----------|--------|--------|
| ids-postgres | ids-postgres | healthy | 5432 (interno) |
| ids-redis | ids-redis | healthy | 6379 (interno) |
| ids-core | ids-core | healthy | 8088 |
| ids-analytics | ids-analytics | healthy | 8090 |
| ids-mcp | ids-mcp | healthy | 8091 |
| ids-web | ids-web | healthy | 3002 |

**Server:** Ubuntu 26.04 LTS, Hyper-V VM, Docker 29.1.3
**Disco:** 22 GB libres (64% usado)
**RAM:** 5.5 GB disponible

## 4. Healthchecks

| Endpoint | Resultado |
|----------|-----------|
| `/api/health` (web) | ✅ 200 |
| `/healthz` (core) | ✅ 200 |
| `/healthz` (analytics) | ✅ 200 |
| `/healthz` (mcp) | ✅ 200 |
| `http://192.168.1.40:3002` | ✅ 200 |

## 5. Dashboard

- **Estado:** Aceptado como base staging
- **URL:** `http://192.168.1.40:3002`
- **Referencia visual:** `/design-lab`
- **Idioma:** Español
- **Datos:** Reales (core, analytics, eventos, scoring)
- **GeoIP:** Sintético (sin proveedor externo)
- **Temporales:** 0 contenedores

## 6. Pendientes

### Visuales
- Mejorar composición mapa táctico
- Mejorar composición topología OT/IT
- GeoIP más realista
- Topología interactiva (zoom/drag)
- Más pulido enterprise

### Funcionales
- WebSocket live events
- Activos persistentes (DB)
- Modos engine (learning/detection)
- Workflow iSID real (no destructivo)
- Suricata sensor real (SPAN/mirror)
