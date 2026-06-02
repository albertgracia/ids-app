# Fase: IDS-V0-TEMPLATE-INTAKE-AUDIT-01 — Informe

**Fecha:** 2026-05-31
**Agente:** @code-archaeologist

---

## RESULTADO: PASS

### IDS Repo

| Campo | Valor |
|-------|-------|
| Ruta | `E:\opencode\ids-app` |
| Rama local | `scaffold/ids-v2-dev-env-01` |
| HEAD | `6ee8ccd` (fix: add safe visual mode) |
| Remoto | `origin scaffold/ids-v2-dev-env-01` |
| Working tree | Limpio |
| Último visual aceptado | `1d3e0e4` (review gate 03 fix) |

### Plantilla v0

| Campo | Valor |
|-------|-------|
| Ruta | `E:\opencode\network-traffic-analyzer` |
| Framework | Next.js (App Router: `app/page.tsx`) |
| TypeScript | ✅ |
| Tailwind | ✅ (v4 via `@tailwindcss/postcss`) |
| shadcn/ui | ✅ 60+ componentes Radix UI |
| lucide-react | ✅ (iconos) |
| recharts | ✅ (gráficos SVG/área/barras) |
| React 19 | ✅ |
| Socket.io client | ✅ (live stream WebSocket) |
| Gestor | pnpm |
| Build probado | NO (solo auditoría read-only) |

### Componentes v0 aprovechables

| Componente v0 | Reutilizable | Adaptación IDS necesaria |
|--------------|-------------|-------------------------|
| `stats-overview.tsx` (KPIs) | ✅ | Traducir español, usar eventos reales |
| `packet-stream.tsx` (live table) | ✅ | Adaptar a eventos IDS, no paquetes |
| `connection-tracker.tsx` | ✅ | Mapear a topología OT/IT |
| `traffic-map.tsx` (world map) | ✅ | Integrar GeoIP sintético IDS |
| `statistics-chart.tsx` | ✅ | Reemplazar mock por datos reales |
| `protocol-filters.tsx` | ✅ | Protocolos IT/OT en español |
| `threat-alerts.tsx` | ✅ | Reemplazar por IoCs IDS reales |
| `replay-controls.tsx` | ✅ | Adaptar a simular eventos IDS |
| `bandwidth-meter.tsx` | ✅ | KPIs de tráfico de eventos |
| `traffic-heatmap.tsx` | ✅ | Heatmap por severidad/zona |
| `packet-detail-modal.tsx` | ✅ | Inspector de evento IDS |
| `world-map.tsx` (SVG) | ✅ | Sin dependencia API externa |

### Datos IDS disponibles

| Endpoint | Datos |
|----------|-------|
| `GET /api/core/api/v1/status` | capabilities, storage_mode |
| `GET /api/core/api/v1/events/recent` | eventos recientes |
| `GET /api/core/api/v1/events/stream` | SSE live |
| `GET /api/core/api/v1/assets/classifications` | PLC, HMI, IT server, etc. |
| `POST /api/core/api/v1/simulate/events` | generar eventos |
| `POST /api/analytics/api/v1/score/event` | scoring |
| GeoIP sintético | frontend `geoip-synthetic.ts` |

### Compatibilidad

| Aspecto | v0 | IDS actual | ¿Compatible? |
|---------|-----|-----------|-------------|
| Next.js | 16 (app router) | 16.2.6 (app router) | ✅ |
| CSS | Tailwind v4 + globals.css | globals.css | ✅ (añadir Tailwind) |
| Componentes | shadcn/ui Radix | CSS/HTML vanilla | ✅ (migrar progresivo) |
| Gráficos | recharts | SVG manual | ✅ (recharts más mantenible) |
| Datos | `usePacketStream` hook mock | fetch real | ✅ (reemplazar hooks) |
| Idioma | Inglés | Español | ⚠️ (traducir UI) |
| Live | Socket.io | SSE | ⚠️ (adaptar a EventSource) |
| Mapa | SVG world-map.tsx | AttackWorldMap.tsx | ✅ (fusionar) |

### Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Tailwind global CSS puede chocar con globals.css actual | Importar en orden: primero Tailwind, luego globals.css |
| shadcn/ui requiere `components.json` config | Copiar adaptado |
| `pnpm` en IDS vs npm actual | Mantener npm, instalar solo deps necesarias |
| Socket.io → SSE requiere rewrite de hooks | Adaptar `usePacketStream` a `EventSource` |
| 60+ componentes shadcn son pesados | Tree-shaking de Next.js recorta lo no usado |
| React 19 en ambos | ✅ compatible |
| Mapa usa datos mock sintéticos | Reemplazar por datos reales |

### Estrategia recomendada

1. **No tocar `/`** — crear ruta aislada `/design-lab/v0-network`
2. **Copiar solo assets esenciales** de la plantilla: Tailwind config, shadcn/ui, hooks mock → real
3. **Traducir UI a español** progresivamente
4. **Conectar datos reales** reemplazando hooks mock
5. **Validar visualmente con usuario** antes de sustituir dashboard principal

### No hacer
- No modificar el backend
- No tocar staging
- No hacer commit/push (auditoría solo)
- No reemplazar `/` directamente
- No añadir dependencias sin aprobación

### Confirmaciones
- ✅ No se modificó repo IDS
- ✅ No se modificó plantilla v0
- ✅ No se cambió de rama
- ✅ No se hizo commit ni push
- ✅ No se tocó staging 192.168.1.40
- ✅ No se reconstruyó Docker
- ✅ No se redeployó
