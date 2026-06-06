# IDS-DASHBOARD-UNIFI-VISUAL-POLISH-STAGING-DEPLOY-01

**Estado:** PASS  
**Fecha:** 2026-06-06

---

## Objetivo

Desplegar en staging la mejora visual de `IDS-DASHBOARD-UNIFI-VISUAL-POLISH-01` y validar que el dashboard ya no muestra elementos packet-centric falsos en modo UniFi.

## Repo

| Campo | Valor |
|---|---|
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `abf73ed` |
| HEAD final | `abf73ed` |
| git status final | Limpio |
| Push | ✅ |

## Deploy

| Campo | Valor |
|---|---|
| Workflow GHCR | `Publish staging container images` run #9, SUCCESS |
| Commit publicado | `abf73ed` |
| ids-web imagen inicial | `sha256:bcc35c8a3ef455e56a8b95a72ac3c5bee8dda62061c63180f916436192c4d9e5` |
| ids-web imagen final | Imagen staging actualizada tras `docker compose pull ids-web` y `docker compose up -d --no-deps ids-web` |
| Comando usado | `docker compose pull ids-web` / `docker compose up -d --no-deps ids-web` |
| Servicios recreados | solo `ids-web` |
| Servicios no tocados | `ids-core`, `postgres`, `redis`, `ids-analytics`, `ids-mcp`, collector, rsyslog |

## Validación técnica

| Check | Resultado |
|---|---|
| ids-web health | ✅ Started |
| dashboard HTTP | ✅ `HTTP 200` |
| ids-core health | ✅ `{"service":"ids-core","status":"ok"}` |
| collector timer | ✅ active / enabled |
| stack final | ✅ healthy |

## Validación visual

| Elemento | Estado |
|---|---|
| Screenshot | ✅ Capturado |
| Detalles del Evento visible | ✅ |
| IP/puertos/bytes/TTL falsos ocultos | ✅ |
| Conexiones sin `0→0` | ✅ |
| Conexiones con panel explicativo | ✅ |
| Stats OK | ✅ |
| Stream OK | ✅ eventos UniFi reales descriptivos |
| Mapa OK | ✅ mensaje explicativo sin IPs externas |

## Evidencia observada

- Modal: `Detalles del Evento`
- Ejemplo visible: `DHCPv6 Router Solicitation failure`
- Conexiones: panel explicativo indicando que UniFi no incluye conexiones IP completas
- KPIs reales mantenidos en staging

## Confirmaciones

- ✅ No se tocó UniFi
- ✅ No se modificó rsyslog
- ✅ No se paró collector
- ✅ No se modificó token
- ✅ No se modificó systemd
- ✅ No se recreó `ids-core` / `postgres` / `redis` / `ids-analytics` / `ids-mcp`
- ✅ No se imprimieron logs reales ni secretos

## Próxima fase recomendada

`IDS-UNIFI-PERSISTENT-COLLECTOR-OBSERVE-24H-01`
