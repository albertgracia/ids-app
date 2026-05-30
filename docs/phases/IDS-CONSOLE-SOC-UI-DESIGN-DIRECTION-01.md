# Fase: IDS-CONSOLE-SOC-UI-DESIGN-DIRECTION-01 — Informe

**Fecha:** 2026-05-30
**Rama:** `scaffold/ids-v2-dev-env-01`

---

## RESULTADO: PASS

### Agentes
@frontend-specialist + @code-archaeologist

### Crítica del diseño actual
El dashboard tiene esqueleto técnico sólido (polling con AbortController, CSS variables, componentes) pero visualmente es proof-of-concept. No supera el umbral de consola SOC real: mapa que no es mapa (es una matriz de rectángulos), timeline con barras microscópicas de 8px, radar miniatura de 260px en panel de 940px, badges de severidad de 1 letra crípticos, filas de eventos sin color.

### Dirección visual definida
- **Personalidad:** Ultra premium enterprise SOC/NOC, industrial OT/IT, oscuro, serio
- **Layout:** Header full + KPIs + Map(60%)/Topology(40%) + Timeline full + Radar/Assets/IoCs/SevDist + Events full + Inspector
- **Paleta:** high `#eab308` (más distinguible), medium `#d97706` (ámbar más cálido)
- **Tipografía:** 3 niveles (0.65/0.8/1.5rem), fuente mono para datos técnicos
- **Motion:** pulso en nodos, flash KPI, rotación radar, timeline fadeIn, topología settle

### Paneles definidos (11)
World Threat Map, Tactical Topology Graph, Live Threat Radar, SOC Event Timeline, Enterprise Events Table, Event Investigation Panel, Asset Intelligence Matrix, iSID Actions Panel, Suricata/MCP Status, SOC Command Header, Command KPIs

### Próxima fase
`IDS-CONSOLE-SOC-UI-IMPLEMENTATION-01`

### Confirmaciones
- ✅ No se modificó apps/web
- ✅ No se tocó staging
- ✅ No se desplegó nada
- ✅ Sin secretos ni dependencias nuevas
