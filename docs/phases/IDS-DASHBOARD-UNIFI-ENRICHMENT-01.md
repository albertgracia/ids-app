# IDS-DASHBOARD-UNIFI-ENRICHMENT-01

**Estado:** PASS  
**Fecha:** 2026-06-06

---

## Objetivo

Adaptar el dashboard de IDS para representar correctamente eventos UniFi reales, reemplazando métricas de paquetes/bytes que no existen en el modelo UniFi y priorizando métricas de eventos, severidad, tipos, timeline e inspector.

## Cambios Realizados

### 1. `apps/web/src/lib/v0-network/mock-data.ts`
- Añadido `eventTitle?: string` y `isUniFiEvent?: boolean` a `PacketHeader`

### 2. `apps/web/src/lib/v0-network/real-data-adapter.ts`
- `toV0PacketItem` ahora mapea `event.title`/`event.description` a `eventTitle`
- Marca `isUniFiEvent: true` cuando sourceIp y destIp están vacíos

### 3. `apps/web/src/components/v0-network/packet-stream.tsx`
- **Vista expandida**: cuando `isUniFiEvent`, muestra el título del evento (con icono `Info`) en lugar de IPs/puertos
- **Vista compacta**: cuando `isUniFiEvent`, muestra el título del evento truncado en lugar de `IP:Puerto → IP:Puerto`
- Oculta la visualización de `0 bytes` para eventos UniFi
- Oculta el separador `→` vacío

### 4. `apps/web/src/components/v0-network/advanced-stats-dashboard.tsx`
- Acepta nueva prop `eventStats?: EventStats | null`
- **Modo evento** (cuando eventStats disponible sin source_counts):
  - Muestra **Tipos de Evento** (desde `event_type_counts`)
  - Muestra **Último Evento** (desde `last_event_at`)
  - Muestra **Severidad** (desde `severity_counts`)
  - Oculta: Health Score, Top Sources, Top Ports, Traffic Metrics, Protocol Distribution
- **Modo tráfico** (cuando hay IPs/datos de tráfico): comportamiento original preservado
- Etiquetas cambian de "paq." a "ev." consistentemente

### 5. `apps/web/src/components/v0-network/v0-network-dashboard.tsx`
- Pasa `eventStats.stats` a `AdvancedStatsDashboard`
- **BandwidthMeter**: oculto cuando eventStats disponible y bytesPerSecond = 0
- **TrafficHeatmap**: oculto en modo evento (sin source_counts)
- **Mapa/GeoIP**: cuando no hay IPs externas, muestra mensaje explicativo en lugar de mapa vacío
- **LocationCards**: igual, condicional a IPs externas

### 6. Compatibilidad tráfico clásico: **SÍ**
- `isEventMode` se determina por `eventStats` y ausencia de `source_counts`
- Si llegan eventos Suricata/EVE con IPs/bytes, el dashboard muestra modo tráfico completo

## Validación Local

| Check | Resultado |
|---|---|
| TypeScript (`tsc --noEmit`) | ✅ PASS |
| Frontend build | ✅ PASS |
| Go tests (`go test ./...`) | ✅ PASS |
| `task check` | ✅ PASS (ESLint known issue preexistente) |

## Archivos Modificados

- `apps/web/src/lib/v0-network/mock-data.ts` — tipos PacketHeader
- `apps/web/src/lib/v0-network/real-data-adapter.ts` — adaptación eventTitle/isUniFiEvent
- `apps/web/src/components/v0-network/packet-stream.tsx` — stream UniFi-aware
- `apps/web/src/components/v0-network/advanced-stats-dashboard.tsx` — estadísticas con eventStats
- `apps/web/src/components/v0-network/v0-network-dashboard.tsx` — dashboard condicional

## Confirmaciones

- ✅ No se tocó UniFi
- ✅ No se modificó rsyslog
- ✅ No se paró collector
- ✅ No se deshabilitó timer
- ✅ No se modificó token
- ✅ No se modificó systemd
- ✅ No se modificó .env
- ✅ No se modificó compose.yaml
- ✅ No se recrearon contenedores
- ✅ No se hizo deploy staging
- ✅ No se imprimieron logs reales
- ✅ No se imprimieron secretos
- ✅ No se commitearon logs/secretos/tokens/binarios/state-files

## Próxima Fase Recomendada

`IDS-DASHBOARD-UNIFI-ENRICHMENT-STAGING-DEPLOY-01`
