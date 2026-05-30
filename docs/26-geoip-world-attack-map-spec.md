# GeoIP — Mapa Mundial de Amenazas

**ids-app — Sistema IDS para redes OT/IT**

---

## 1. Visión

Módulo para detectar, enriquecer y visualizar amenazas externas desde una perspectiva geográfica defensiva. Permite saber desde qué países/IPs llegan ataques hacia la red OT/IT monitorizada, y tomar medidas defensivas sin acciones ofensivas.

## 2. Alcance (in scope)

- Clasificar IPs externas vs internas vs documentales
- Enriquecer con país/región/ASN/coordenadas (sintético primero, real después)
- Visualizar en mapa mundial táctico
- Cachear resultados GeoIP
- Acciones defensivas no destructivas (watchlist, revisión, recomendación de bloqueo)
- Integrar con Suricata EVE, MCP, analytics

## 3. No alcance (out of scope)

- Contraataque, DDoS, escaneo ofensivo, explotación
- Bloqueo automático sin aprobación humana
- APIs externas sin decisión explícita del usuario
- Atribución definitiva de identidad del atacante
- OSINT activo sobre IPs

## 4. Clasificación de IPs

| Tipo | Rangos | Label UI |
|------|--------|----------|
| IPv4 privada | 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8 | "Interna" |
| IPv4 documental | 198.51.100.0/24, 203.0.113.0/24, 192.0.2.0/24 | "Sintética (documental)" |
| IPv4 externa real | Resto | "Externa" |
| IPv6 ULA | fc00::/7, fe80::/10 | "Interna" |
| IPv6 documental | 2001:db8::/32 | "Sintética" |
| IPv6 global | 2000::/3 | "Externa" |

Los eventos con IPs documentales deben mostrarse con label "Sintética / Staging" para no confundir.

## 5. GeoIP sintético (fase 1 — sin API externa)

Asignación local sintética para staging:

| IP range | País sintético | Coordenadas |
|----------|---------------|-------------|
| 198.51.100.0/24 | US | (38, -97) |
| 203.0.113.0/24 | CN | (35, 105) |
| 192.0.2.0/24 | NL | (52, 5) |
| 103.235.46.0/24 | IN | (20, 78) |
| 185.156.173.0/24 | BR | (-10, -55) |
| 91.121.87.0/24 | FR | (46, 2) |
| 45.33.32.0/24 | US | (38, -97) |

Leyenda en UI: "GeoIP sintético de staging — sin proveedor externo"

Confianza: "SYNTHETIC"

## 6. GeoIP real futuro (fase 2 — con proveedor)

| Opción | Pros | Contras |
|--------|------|---------|
| **MaxMind GeoLite2 (local)** | Sin API calls, gratuito, rápido | Actualización manual cada ~30 días, ~60 MB DB |
| **ip-api.com (API gratuita)** | Sin API key hasta 45 req/min | HTTP, rate limitado, no HTTPS en tier free |
| **IPinfo.io (API)** | HTTPS, ASN incluido | Token requerido, limit free 50k/mes |
| **DB offline propia** | Control total | Mantenimiento manual, desactualización |

**Recomendación inicial:** MaxMind GeoLite2 local (descarga manual periódica).
**API externa:** solo con aprobación explícita del usuario.
**Nunca** enviar IPs internas/privadas a servicios externos.

## 7. Modelo de datos propuesto

### GeoIPRecord (cache en memoria o DB)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| ip | string | IP consultada |
| is_external | bool | IP pública no privada |
| is_private | bool | RFC 1918 / ULA |
| is_documentation_ip | bool | TEST-NET |
| country_code | string | ISO 3166-1 alpha-2 |
| country_name | string | Nombre país |
| region | string | Región/estado |
| city | string | Ciudad (opcional) |
| latitude | float64 | Latitud |
| longitude | float64 | Longitud |
| asn | string | ASN (ej: AS12345) |
| organization | string | Nombre organización |
| provider | string | "synthetic" / "maxmind" / "ipinfo" |
| confidence | string | "SYNTHETIC" / "CACHED" / "LIVE" |
| source | string | Origen de datos |
| first_seen | timestamp | Primer avistamiento |
| last_seen | timestamp | Último avistamiento |
| hit_count | int | Veces consultado |

### ThreatGeoPoint (agregación para UI)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| ip | string | IP origen |
| country_code | string | País |
| latitude | float64 | Lat |
| longitude | float64 | Lon |
| severity_max | string | Severidad máxima observada |
| event_count | int | Total eventos |
| protocols | []string | Protocolos observados |
| first_seen | timestamp | Primer evento |
| last_seen | timestamp | Último evento |
| targets | []string | IPs destino atacadas |
| recommended_action | string | Acción sugerida |

## 8. Endpoints futuros propuestos

### Read-only

```
GET  /api/v1/geoip/status        → estado del módulo
GET  /api/v1/geoip/ip/:ip        → GeoIPRecord de una IP
GET  /api/v1/geoip/threats/recent → ThreatGeoPoints recientes
GET  /api/v1/geoip/map            → datos agregados para el mapa
```

### Acciones defensivas (futuro)

```
POST /api/v1/isid/actions/watchlist       → añadir IP a vigilancia
POST /api/v1/isid/actions/mark-reviewed   → marcar evento revisado
POST /api/v1/isid/actions/recommend-block → recomendar bloqueo (no ejecutar)
```

### Acciones PROHIBIDAS (nunca implementar)

- POST /api/v1/isid/actions/block — bloqueo automático sin aprobación
- POST /api/v1/isid/actions/counterattack — contraataque
- POST /api/v1/isid/actions/scan — escaneo ofensivo
- Cualquier endpoint que modifique firewall sin revisión humana

## 9. Integración Suricata

### EVE JSON fields útiles para GeoIP

| EVE field | Uso en GeoIP |
|-----------|-------------|
| src_ip | IP origen → clasificar + enriquecer |
| dest_ip | IP destino → afectado |
| alert.signature | Título / tipo de amenaza |
| alert.severity | Severidad (1-3 → critical/high/medium) |
| proto/app_proto | Protocolo de ataque |
| flow.bytes_toserver | Volumen de datos |
| timestamp | Timeline |

### Reglas de priorización:
- `src_ip` externa + `direction=inbound` → **origen de ataque**
- `dest_ip` externa + `direction=outbound` + `type=malware` → **posible C2/exfil**
- Protocolo OT (`modbus`, `s7comm`, etc.) → **elevar prioridad**
- Destino PLC/HMI/SCADA → **OT impacted**

## 10. Integración MCP

Futuras tools read-only:

```
ids_get_geoip_status        → estado del módulo
ids_get_recent_external_threats → amenazas externas recientes
ids_summarize_geo_threats    → resumen por país/región
ids_get_ip_context_readonly  → contexto de una IP
ids_generate_defensive_recommendation → recomendación no destructiva
```

## 11. UI del mapa mundial

### Panel: "Mapa Mundial de Amenazas"

**Contenido:**
- Mapa mundial sintético SVG
- Puntos por IP externa (color = severidad, tamaño = conteo)
- Líneas curvas hacia activos internos
- Tooltip: IP, país, ASN, eventos, protocolo, severidad
- Badge de confianza: "SYNTHETIC" / "CACHED" / "LIVE"
- Leyenda clara

### Acciones permitidas desde UI:
- Copiar IOC
- Añadir a vigilancia
- Recomendar bloqueo
- Abrir investigación
- Exportar IOC
- Marcar como revisado

### Acciones prohibidas en UI:
- "Bloquear automáticamente"
- "Contraatacar"
- "Escanear origen"
- Cualquier acción ofensiva

## 12. Seguridad y ética

### Permitido
- Investigar, enriquecer, correlacionar
- Bloquear defensivamente **con aprobación humana**
- Generar recomendaciones
- Exportar IoCs para sharing

### NO permitido
- Contraataque, explotación, DDoS, escaneo ofensivo
- Acceso no autorizado a sistemas externos
- Atribución definitiva sin evidencia
- Compartir datos internos con terceros sin consentimiento

### Nota ética
> "Una IP no identifica necesariamente al atacante real; puede ser VPN, proxy, botnet, cloud, CGNAT o sistema comprometido. Toda acción defensiva debe considerar el contexto y la evidencia disponible."

## 13. Roadmap

1. **IDS-GEOIP-SYNTHETIC-WORLD-MAP-01** — Visualización sintética, reglas locales, sin API
2. **IDS-GEOIP-BACKEND-CACHE-SPEC-01** — Especificación modelo/cache/endpoints
3. **IDS-GEOIP-BACKEND-CACHE-01** — Implementar cache y endpoints read-only
4. **IDS-GEOIP-PROVIDER-DECISION-01** — Evaluar y elegir proveedor (MaxMind recomendado)
5. **IDS-GEOIP-PROVIDER-INTEGRATION-01** — Integrar proveedor elegido
6. **IDS-ISID-DEFENSIVE-ACTIONS-SPEC-01** — Especificar workflow defensivo
7. **IDS-ISID-DEFENSIVE-ACTIONS-01** — Implementar acciones no destructivas

## 14. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Datos GeoIP desactualizados | Actualización periódica (MaxMind: cada 30 días) |
| Rate limiting en API externa | Cache local generoso, TTL 24h |
| Confusión IP real vs sintética | Etiquetado claro en UI |
| Acción defensiva accidental | Sin automatización, solo recomendaciones |
| Exposición de IPs internas a servicios externos | Solo consultar IPs públicas, sanitizar antes de enviar |
