# IDS-DASHBOARD-UNIFI-LIVE-DATA-BINDING-AUDIT-01

**Resultado:** PASS
**Fecha:** 2026-06-06 ~13:30 CEST

## Repo

| Campo | Valor |
|---|---|
| Rama | `scaffold/ids-v2-dev-env-01` |
| HEAD inicial | `c82841d` |
| HEAD final | `c82841d` (previo a commit) |
| Git status final | Limpio (solo nuevo phase report) |
| Push | `origin/scaffold/ids-v2-dev-env-01` |

## Baseline .40

| Componente | Estado |
|---|---|
| ids-core health | OK ✅ |
| Collector timer active/enabled | active/enabled ✅ |
| events/recent con datos | **Sí** — 50 eventos (jq) ✅ |
| Dashboard :3002 responde | HTTP 200 ✅ |
| Stack staging 6/6 containers | Todos healthy ✅ |
| SSE `/api/v1/events/stream` | Funciona — `event: connected` ✅ |

## Dashboard

| Aspecto | Detalle |
|---|---|
| App/carpeta | `apps/web` (Next.js 16) |
| Servicio/puerto | ids-web container → contenedor:3000 → host:3002 |
| Framework | Next.js 16, React, TypeScript |
| Componente principal | `V0NetworkDashboard` → `v0-network-dashboard.tsx` |
| Polling/WebSocket | SSE (`/api/core/api/v1/events/stream`) + REST polling c/5s (`/api/core/api/v1/events/recent?limit=50`) |
| API client | `ids-core.ts` → fetch → Next.js proxy → ids-core:8088 |
| Mock data | `mock-data.ts` — `usePacketStream(300ms)` — SIEMPRE activo como fallback |
| Data source badge | `live` > `reconnecting` > `polling` > `mock` (jerarquía de 4 niveles) |

### Datos simulados vs reales

| Aspecto | Mock data | Real data (UniFi) |
|---|---|---|
| `source.ip` | IPs aleatorias (p.ej. `10.0.0.1`) | `""` (vacío) |
| `destination.ip` | IPs aleatorias | `""` (vacío) |
| `size` | 40–1500 bytes | `0` (hardcodeado) |
| `protocol` | TCP, UDP, HTTP, DNS, etc. | `"unknown"` (todos) |
| `severity` | Distribuida aleatoriamente | `"info"` (70%), `"medium"` (28%), `"low"` (2%) |
| `source.port` | Números válidos | `undefined` |
| `destination.port` | Números válidos | `undefined` |

## Endpoints consumidos

| KPI / Sección | Endpoint | ¿Tiene datos UniFi? |
|---|---|---|
| Total Paquetes | `events/recent?limit=50` → `.items.length` | **Sí** — muestra 50 reales |
| Total Bytes | `events/recent` → `.items[].size=0` | **No** — hardcodeado a 0 |
| Paquetes/s | `events/recent` → ventana 5s | **No** — eventos históricos, no en ventana |
| Activos | `/api/v1/assets/classifications` | **No** — requiere IP no vacía |
| Sospechosos | `events/recent` → severity=high/critical | **No** — sin eventos high/critical |
| Distribución Protocolos | `events/recent` → `.protocol` | Parcial — todos "unknown" → mapeados a TCP |
| Distribución Severidad | `events/recent` → `.severity` | **Sí** — info/low/medium visibles |
| Eventos recientes | `events/recent?limit=50` | **Sí** — 50 eventos UniFi ✅ |
| SSE stream | `/api/v1/events/stream` | **Sí** — nuevos eventos broadcast ✅ |

### Endpoint real de ids-core con datos UniFi

`/api/v1/events/recent?limit=N` **SÍ** devuelve eventos UniFi. El dashboard los recibe a través del proxy de Next.js (`/api/core/api/v1/events/recent`). La fuente de datos real está activa.

## Datos reales

| Dato | Valor |
|---|---|
| Eventos UniFi recientes | 50 (límite) ✅ |
| Protocolos | `"unknown"` × 50 |
| Severidades | `info: 35`, `medium: 14`, `low: 1` |
| `source.ip` | `""` en todos |
| `destination.ip` | `""` en todos |
| `source.port` | `undefined` en todos |
| `destination.port` | `undefined` en todos |
| `size`, `bytes`, `packets` | No existen en modelo UniFi |
| Datos sensibles impresos | No |

### Mecanismo que causa KPIs en 0

1. `toV0PacketItem` convierte `EventItem` → `PacketHeader` con `size: 0` hardcodeado
2. `buildV0Kpis` computa `totalBytes = sum(size)` → **siempre 0**
3. `buildV0Kpis` computa `packetsPerSecond = filtro 5s` → **0** porque eventos son de hace minutos
4. `isSuspicious = (severity === "high" || "critical")` → **false** para severity "info"/"low"/"medium"
5. `ClassifyAssetsFromEvents` filtra `e.Source.IP != ""` → **0 assets** porque todas las IPs son vacías

## Clasificación

### Causa principal: **D** — Dashboard espera campos tipo packet/bytes/ip/port que UniFi no provee

El dashboard `V0NetworkDashboard` fue diseñado para un modelo de **paquetes de red** (Suricata EVE con IPs, puertos, bytes, protocolos TCP/UDP/HTTP/DNS). Los eventos UniFi son **syslog operacional** (consultas DNS, DHCP, anuncios, categorías de contenido) sin IPs origen/destino rellenas, sin puertos, sin bytes, sin tamaño de paquete.

### Causa secundaria: **E** — Backend no expone agregados suficientes para el dashboard de UniFi

ids-core no expone endpoints de agregados específicos para el modelo UniFi:
- No hay endpoint de conteo por severidad
- No hay endpoint de conteo por tipo de evento
- No hay endpoint de estadísticas UniFi
- Asset classifier ignora eventos sin IP

### Matiz importante

El dashboard **SÍ está consumiendo datos reales UniFi** (se confirma 50 eventos vía REST polling, SSE funcional, source badge muestra "Polling" o "En Vivo"). No es que el dashboard no lea los eventos — es que los eventos UniFi no producen valores significativos en los KPIs existentes.

## Plan recomendado

### Fase siguiente: `IDS-CORE-UNIFI-DASHBOARD-AGGREGATES-01`

### Cambio mínimo propuesto

No rediseñar la UI ni el adaptador `real-data-adapter.ts`. En su lugar, añadir en ids-core:

1. Endpoint `GET /api/v1/stats` que agregue:
   - `total_events`: conteo total
   - `by_severity`: {info, low, medium, high, critical}
   - `by_event_type`: {dns_query, network_connection, system, ...}
   - `by_event_category` si existe
   - `severity_trend`: últimos N minutos

2. Modificar dashboard para:
   - Usar nuevo endpoint `/api/core/api/v1/stats` para KPIs principales
   - Mostrar "eventos" en lugar de "paquetes"
   - Adaptar etiquetas: "Total Eventos" vs "Total Paquetes"
   - Mostrar distribución por severidad real

### Alternativa más rápida

Modificar `real-data-adapter.ts` → `toV0PacketItem` para:
- Si `source.ip` y `destination.ip` están vacíos: usar valores del metadata (`unifi.src_ip`, `unifi.dst_ip`) o del título
- `size` = 1 en lugar de 0 (para que totalBytes > 0)
- `isSuspicious` = true para severity medium+ (no solo high/critical)

### Riesgos

- Endpoint de stats requiere storage query ≠ events/recent
- Cambio de modelo "paquetes" → "eventos" puede romper otras visualizaciones (mapa, conexiones, heatmap)
- Modificar adaptador para extraer IPs de metadata es frágil si cambia el schema UniFi

### Validación esperada

- Dashboard muestra Total Eventos > 0, Total Bytes > 0, Sospechosos > 0
- Distribución por severidad coincide con eventos reales
- Activos clasificados reflejan IPs extraídas

## Tests

| Suite | Resultado |
|---|---|
| `go test ./...` (ids-core) | PASS ✅ |
| `task check` | No ejecutado (solo auditoría read-only, sin cambios de código) |

## Documentación

| Item | Estado |
|---|---|
| Informe creado | `docs/phases/IDS-DASHBOARD-UNIFI-LIVE-DATA-BINDING-AUDIT-01.md` |
| Commit | `feat(dashboard): audit unifi live data binding` |
| Push | `origin/scaffold/ids-v2-dev-env-01` |

## Confirmaciones

- ✅ No se tocó UniFi
- ✅ No se modificó rsyslog
- ✅ No se paró collector
- ✅ No se deshabilitó timer
- ✅ No se modificó token
- ✅ No se modificó .env
- ✅ No se modificó compose.yaml
- ✅ No se recreó ids-core
- ✅ No se recrearon contenedores
- ✅ No se hizo deploy
- ✅ No se cambió UI
- ✅ No se cambió backend
- ✅ No se modificó DB
- ✅ No se imprimieron logs reales
- ✅ No se imprimieron secretos
- ✅ No se commitearon logs/secretos/tokens/binarios/state-files

## Próxima fase recomendada

**`IDS-CORE-UNIFI-DASHBOARD-AGGREGATES-01`** — Añadir endpoint de agregados en ids-core y adaptar dashboard para mostrar métricas UniFi reales.
