# Fase: IDS-SOC-UI-MOCK-REFINEMENT-01 — Informe

**Fecha:** 2026-05-30
**Rama:** `scaffold/ids-v2-dev-env-01`
**Commit:** `d7b3f5a` — `design(console): refine SOC command center mock`

---

## RESULTADO: PASS

### Mock refinado
Ruta aislada `/design-lab` mejorada sin tocar `/`.

### Mejoras aplicadas
| Área | Cambio |
|------|--------|
| **Español** | Todo traducido: "Centro de Mando IDS OT/IT", "Investigación", "Línea Temporal", "Críticos/Altos/Medios/Bajos", "Eventos Recientes" |
| **Mapa** | Leyenda "GeoIP sintético — sin proveedor externo", etiquetas país (CN, NL, BR, IN, US, AU), líneas más gruesas con glow |
| **Topología** | Nodo "Sensor IDS" como observador, sub-etiquetas de zona, pulse rings a opacity 0.3, stats: "13 nodos · 4 zonas · 1 sensor" |
| **iSID** | Barra con 6 botones deshabilitados: Copiar IOC, Marcar revisado, Recomendar bloqueo, Vigilancia, Investigar, Informe |
| **Suricata/MCP** | Badges en header: "Suricata: parser EVE JSON preparado | MCP: read-only activo | Analytics: scoring disponible" |
| **Inspector** | Activo afectado (nombre+IP+zona+tipo), ruta de ataque SVG animada |
| **Responsive** | overflow-x: hidden, max-width: 100vw, media queries 1100px/700px |

### Validación
- `npm run build` ✅ — `/`, `/design-lab`, `/api/health`, `/_not-found`
- Dashboard real intacto ✅
- Sin staging, sin Docker, sin deploy ✅

### Próxima fase
`IDS-SOC-UI-MOCK-REVIEW-GATE-02`
