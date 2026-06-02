# IDS-V0-GEOIP-SYNTHETIC-INTEGRATION-01 — Integrar GeoIP sintético

## Resultado

PASS

## Rama

`scaffold/ids-v2-dev-env-01`

## HEAD

- Inicial: `510daca`
- Final: (post-commit)

## GeoIP

- archivo: `lib/v0-network/geoip-synthetic.ts`
- API externa: **NO** — nunca consulta red
- IPs privadas: filtradas por `isExternalIp()` (RFC1918, loopback, link-local → null)
- países sintéticos: 10 (`US`, `CN`, `NL`, `DE`, `BR`, `IN`, `RU`, `FR`, `GB`, `JP`) con 10 ciudades cada uno
- deterministic hash: `hashIpToIndex()` basado en octetos IP → misma IP siempre misma ubicación
- confianza: 30-60% (marcado `synthetic: true`)

## Mapa

- fuente: `activePackets` — misma fuente que el resto de paneles (live/polling/mock)
- fallback: mock data tiene coordenadas reales de `CITY_COORDS`, ya funciona sin cambios
- puntos: `TrafficMap` y `LocationCards` reciben `PacketHeader[]` con `geolocation` poblado por `toV0PacketItem`
- tarjetas: `LocationCards` muestra top 4 países con bandera, conteo y protocolo dominante
- nota seguridad: texto claro en el pie del tab Map

## Archivos

| Archivo | Cambio |
|---|---|
| `lib/v0-network/geoip-synthetic.ts` | Nuevo — `SyntheticGeoRecord`, `lookupSyntheticGeoIp`, `isExternalIp`, `hashIpToIndex` |
| `lib/v0-network/real-data-adapter.ts` | Importa `lookupSyntheticGeoIp`; `toV0PacketItem` poblado geolocalización sintética; `buildV0ExternalCount`, `buildV0MapSourceLabel` nuevos |
| `app/design-lab/v0-network/page.tsx` | Indicador fuente mapa + nota seguridad |
| `docs/phases/IDS-V0-GEOIP-SYNTHETIC-INTEGRATION-01.md` | Nuevo |

## Guardrails

- max eventos procesados: 500 (por `toV0PacketItems`)
- max map points: ilimitado (renderiza todos, SVG points)
- max visible location cards: 4 (por LocationCards)
- no IPs privadas en mapa: `isExternalIp()` retorna false para RFC1918
- no API externa: 0 llamadas de red
- null safety: `safeString`, `safeNumber`
- NaN protection: `isFinite` en hash + `clampLat`/`clampLng`
- coordinates clamp: lat -85..85, lng -180..180
- severity fallback: `"unknown"` si no disponible

## Validación

- build: OK
- typecheck: OK
- lint: error pre-existente ESLint 10
- local dev: mapa visible con datos mock (coordenadas reales) y sintéticos (eventos reales)
- / intacto: verificado

## Git

- commit: `feat(web): add synthetic GeoIP to v0 design lab`
- push: OK

## Limitaciones

- No hay GeoIP real/MaxMind — solo coordenadas sintéticas deterministas
- Confianza máxima 60% (marcado sintético)
- No hay ASN real — placeholders sintéticos
- No hay banderas emoji para países fuera de los 10 soportados por `FLAGS`

## Qué NO se tocó

- `/` (página principal)
- Dashboard principal
- Backend (ids-core)
- Services (analytics-api, mcp-server)
- Staging 192.168.1.40
- Docker / docker-compose
- GeoIP real / MaxMind
- Suricata UI
- DB / Redis / Analytics / MCP
- Dependencias nuevas
- Acciones ofensivas
- Bloqueo automático

## Próxima fase recomendada

`IDS-SURICATA-EVE-UI-INTEGRATION-01`
