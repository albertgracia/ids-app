# Fase: IDS-GEOIP-WORLD-ATTACK-MAP-SPEC-01 — Informe

**Fecha:** 2026-05-30
**Rama:** `scaffold/ids-v2-dev-env-01`

---

## RESULTADO: PASS

### Documentos creados
- `docs/26-geoip-world-attack-map-spec.md` — Especificación completa (14 secciones)

### Decisiones clave
- **GeoIP sintético primero** (fase 1) — reglas locales, sin API externa, coordenadas fijas por rango
- **MaxMind GeoLite2** como proveedor recomendado futuro — local, gratuito, sin rate limits
- **Sin acciones ofensivas** — solo recomendaciones defensivas no destructivas
- **Confianza etiquetada**: SYNTHETIC / CACHED / LIVE
- **MCP sigue read-only** — solo consultas, sin acciones

### GeoIP sintético (7 rangos documentales)
US, CN, NL, IN, BR, FR con coordenadas fijas — claramente etiquetado

### Modelo propuesto
`GeoIPRecord` (15 campos) + `ThreatGeoPoint` (11 campos) — cache local, sin DB todavía

### Endpoints futuros
4 read-only (`/geoip/status`, `/geoip/ip/:ip`, `/threats/recent`, `/map`) + 3 acciones defensivas (watchlist, mark-reviewed, recommend-block)

### Roadmap: 7 fases propuestas (sintético → backend → proveedor → acciones)

### Validaciones
- `task check` ✅
- Sin modificar código ✅
- Sin tocar staging ✅
