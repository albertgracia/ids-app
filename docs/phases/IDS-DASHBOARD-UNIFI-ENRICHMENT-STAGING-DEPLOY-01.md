# IDS-DASHBOARD-UNIFI-ENRICHMENT-STAGING-DEPLOY-01

**Estado:** PASS  
**Fecha:** 2026-06-06

---

## Objetivo

Desplegar en staging la nueva imagen `ids-web` con las mejoras visuales de `IDS-DASHBOARD-UNIFI-ENRICHMENT-01`, validando que el dashboard representa correctamente eventos UniFi reales.

## Baseline Local

| Campo | Valor |
|---|---|
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `a232c4f` |
| HEAD final | `a232c4f` |
| git status | Limpio |
| Push | Síncrono con origin |

## Images

| Campo | Valor |
|---|---|
| GHCR workflow | Ejecutado manualmente |
| Commit publicado | `a232c4f` |
| ids-web imagen/digest inicial | `sha256:115c4a0b31fb...` (pre-enrichment) |
| ids-web imagen/digest final | Nueva imagen post-enrichment |

## Baseline .40

| Check | Estado |
|---|---|
| Host | 192.168.1.40 |
| Deploy dir | `/home/albert/docker/ids-app` |
| ids-core health | ✅ `/healthz` OK |
| Stats endpoint | ✅ 721 eventos, 78 recientes, 15.6 ev/min |
| Collector timer | ✅ active + enabled |
| Puerto 8088 | ✅ |
| Puerto 3002 | ✅ |

## Deploy

| Acción | Detalle |
|---|---|
| Comandos | `docker compose pull ids-web` → `docker compose up -d --no-deps ids-web` |
| Servicios recreados | solo `ids-web` |
| Servicios no tocados | ids-core, postgres, redis, ids-analytics, ids-mcp, collector, rsyslog |
| Downtime | < 30s |

## Technical Validation (post-deploy)

| Check | Resultado |
|---|---|
| ids-web health | ✅ Container started |
| Dashboard HTTP | ✅ 200 |
| ids-core health | ✅ |
| `/api/v1/stats` | ✅ 856 total events |
| `/api/v1/events/recent` | ✅ con datos |
| Collector timer | ✅ active + enabled |
| Stack final | ✅ Healthy |

## Visual Validation

| Elemento | Estado |
|---|---|
| Dashboard carga | ✅ |
| Badge Stats visible | ✅ |
| KPIs eventos reales: Eventos Totales 856, Recientes 83/101, 0.3 ev/min, Sospechosos 0 | ✅ |
| Stream muestra títulos descriptivos UniFi | ✅ DHCPv6, coredns, DPI socket timeout, DPI ML, Gateway memory status |
| `0→0` eliminado en eventos UniFi | ✅ |
| `0 bytes` eliminado en eventos UniFi | ✅ |
| Panel Tipos de Evento visible | ✅ network_connection, dns_query, system, unclassified_event |
| Panel Último Evento visible | ✅ con timestamp |
| Panel Severidad visible | ✅ info, low, medium |
| Bandwidth oculto (modo evento) | ✅ |
| Heatmap oculto (modo evento) | ✅ |
| Mapa/GeoIP con mensaje explicativo | ✅ |
| Errores visuales | ❌ Minor: Connections tab y detail modal aún usan wording de paquetes (IP 0, Tamaño 0 B, TTL) — documentado como fase siguiente |

## Issus Conocidos (no bloqueantes)

- Connections tab y PacketDetailModal aún heredan campos de paquetes (IP: 0, Tamaño: 0 B, TTL: 64). Se abordará en `IDS-DASHBOARD-UNIFI-VISUAL-POLISH-01`.

## Rollback

| Check | Estado |
|---|---|
| Rollback ejecutado | No (no fue necesario) |
| Rollback viable documentado | Sí — imagen previa digest `sha256:115c4a0b31fb...` |

## Tests

| Check | Resultado |
|---|---|
| Frontend typecheck/build | PASS en fase anterior |
| `task check` | PASS en fase anterior |
| Incidencias conocidas | ESLint 10 known issue (pre-existente) |

## Documentación

| Check | Estado |
|---|---|
| Informe creado | ✅ `docs/phases/IDS-DASHBOARD-UNIFI-ENRICHMENT-STAGING-DEPLOY-01.md` |
| Commit | `a232c4f` (mismo HEAD, solo docs añadidos) |
| Push | ✅ |

## Confirmaciones

- ✅ No se tocó UniFi
- ✅ No se modificó rsyslog / No se reinició rsyslog
- ✅ No se tocó firewall / SIEM / NetFlow/IPFIX / IDS/IPS / BlackSun
- ✅ No se hicieron escaneos ni tráfico artificial
- ✅ No se modificó token / collector systemd / timer / state
- ✅ No se tocó Promtail/Loki/Grafana
- ✅ No se recreó ids-core / postgres / redis / ids-analytics / ids-mcp
- ✅ No se hizo docker compose up/down global
- ✅ No se imprimieron logs reales / secretos
- ✅ No se commitearon logs/secretos/tokens/binarios/state-files

## Próxima Fase Recomendada

`IDS-DASHBOARD-UNIFI-VISUAL-POLISH-01` — abordar Connections tab y PacketDetailModal para eliminar wording de paquetes heredado.
