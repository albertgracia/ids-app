# SOC UI Design Direction — ids-app

**Fecha:** 2026-05-30
**Rama:** `scaffold/ids-v2-dev-env-01`

---

## 1. Crítica del diseño actual

Basado en auditoría arqueológica del commit `c428489` (rework v3):

| Panel | Problema principal |
|-------|-------------------|
| **AttackWorldMap** | No es un mapa. Es una matriz de rectángulos 70×28px. Las flechas de tráfico flotan desconectadas. El nombre engaña. |
| **EventTimelinePanel** | Barras de 8px microscópicas. Labels rotados −30° borrosos. Sin interactividad ni zoom. |
| **ThreatRadarGrid** | Miniatura de 260px fija en panel de 940px. Color estático (siempre azul). Sin baseline de referencia. |
| **RecentEventsPanel** | Sin color de fondo en filas (crítico = info visualmente). Badges de severidad de 1 letra crípticos (C/H/M/L/I). |
| **ExecutiveKpiStrip** | Funcional pero sin jerarquía: crítico y normal mismo tamaño. Sin flash al actualizar. |
| **TopologyGraph** | Layout columnar estático. Sin force-directed ni animación de settle. |
| **SocHeader** | Sin health LED global. Sin badge de alarmas sin revisar. Sin "hace X minutos". |

**Veredicto:** Esqueleto técnico sólido (polling con AbortController, CSS variables, componentes) pero visualmente proof-of-concept. No supera el umbral de consola SOC real.

---

## 2. Dirección visual propuesta

### Personalidad
- Ultra premium enterprise cybersecurity SOC/NOC
- Oscuro, alta densidad, serio
- Industrial OT/IT (no gamer, no infantil, no genérico)
- Inspiración: Splunk ES, Sentinel, Darktrace, Nozomi, Claroty

### Layout recomendado (pantalla grande)

```
┌─────────────────────────────────────────────────────┐
│ SOC HEADER: logo + health LED + alarm badge + svcs │
├───────────┬───────────┬───────────┬────────────────┤
│ KPI 1     │ KPI 2     │ KPI 3     │ KPI 4    KPI 5 │
├───────────┴───────────┼───────────┴────────────────┤
│ ATTACK WORLD MAP      │ TOPOLOGY GRAPH             │
│ (mayor, 60% ancho)    │ (40% ancho)                │
├───────────────────────┴────────────────────────────┤
│ EVENT TIMELINE (full width, zoom/brush ready)      │
├───────────┬───────────┬───────────┬────────────────┤
│ RADAR     │ ASSETS    │ IoCs      │ SEV DIST       │
├───────────┴───────────┴───────────┴────────────────┤
│ RECENT EVENTS (full width, filas coloreadas)       │
├─────────────────────────────────────────────────────┤
│ EVENT INSPECTOR (full width, solo si seleccionado) │
└─────────────────────────────────────────────────────┘
```

### Responsive
- `<1100px` → 1 columna, KPIs 2 columnas, radar/assets/IoCs stacked
- `<700px` → KPIs 1 columna

---

## 3. Sistema visual

### Paleta de color

| Nombre | Hex | Uso |
|--------|-----|-----|
| bg | `#0a0e14` | Fondo principal |
| bg-card | `#111820` | Paneles |
| border | `#1e2a3a` | Bordes sutiles |
| text | `#c9d1d9` | Texto principal |
| text-dim | `#6e7b8c` | Texto secundario |
| accent | `#58a6ff` | Acento cian/blue |
| critical | `#f85149` | Crítico (rojo) |
| high | `#eab308` | Alto (amarillo-dorado) |
| medium | `#d97706` | Medio (ámbar cálido) |
| low | `#58a6ff` | Bajo (cyan) |
| info | `#6e7b8c` | Info (gris) |
| ot | `#db6d28` | OT (naranja industrial) |
| it | `#58a6ff` | IT (azul) |
| dmz | `#d29922` | DMZ (ámbar) |
| external | `#f85149` | Externo (rojo) |
| healthy | `#3fb950` | Verde salud |
| warning | `#d29922` | Warning global |

**Cambios vs actual:**
- `--high` pasa de `#d29922` a `#eab308` (más distinguible del medium)
- `--medium` pasa de `#db6d28` a `#d97706` (ámbar más cálido)

### Tipografía

| Nivel | Tamaño | Peso | Uso |
|-------|--------|------|-----|
| H1 (título) | 1.2rem | 700 | Título del dashboard |
| H2 (panel) | 0.9rem | 600 | Títulos de panel |
| H3 (KPI) | 1.5rem | 800 | Valores KPI |
| Body (datos) | 0.8rem | 400 | Tablas, métricas |
| Caption | 0.65rem | 400 | Labels, metadata |
| Mono | 0.75rem | 400 | IPs, timestamps, código |

**Fuente mono para datos técnicos:** `"JetBrains Mono", "Cascadia Code", "Fira Code", monospace`

### Motion / Vida visual

| Elemento | Animación | Duración |
|----------|-----------|----------|
| Nodos activos (critical/high) | pulso CSS (ring expand + fade) | 2s loop |
| Nuevo evento en timeline | fadeInUp | 0.3s |
| KPI crítico aumenta | flash background rojo → transparente | 1.5s once |
| Radar | rotación lenta (metáfora escaneo activo) | 60s/rev |
| Topology | settle animation al cargar | 1s |
| Health LED | pulso suave cuando healthy | 3s loop |
| Filas de eventos | transition background al seleccionar | 0.2s |

---

## 4. Paneles definitivos

### A. SOC Command Header
- Logo "◈ IDS OT/IT Console"
- Health LED global (verde/ámbar/rojo)
- Badge alarmas: "🔴 3 críticos sin revisar"
- Servicios: core, analytics, MCP, web (badges con dot)
- "Actualizado hace X segundos"
- Storage mode

### B. Command KPIs (6, no 8)
- Total eventos, Críticos, Altos, Activos afectados, IPs externas, Riesgo global
- KPI crítico 20% más grande, peso 800, flash animation

### C. World Threat Map (renombrado desde AttackWorldMap)
- Mapa mundial SVG sintético o grid geo abstracto
- Coordenadas sintéticas por IP/zona
- Fuentes externas → líneas animadas hacia DMZ/IT/OT
- Clustering por región sintética
- Severidad por color de línea
- Leyenda: "GeoIP sintético — staging"

### D. Tactical Topology Graph
- Layout force-directed o jerárquico mejorado
- Zonas: Externo, DMZ, IT, Frontera OT, OT/Industrial, Sensor IDS
- Nodos derivados de IPs reales
- Enlaces source→destination con grosor y color
- Pulso en nodos con eventos critical/high
- Destacar evento seleccionado

### E. Live Threat Radar
- 6 ejes en español (Escaneo, Malware, Lateral, Auth, Protocolos OT, Exposición)
- Polígono dinámico con color según riesgo agregado
- Baseline opcional (media histórica)
- Score total numérico
- Animación de rotación lenta (escaneo)

### F. Event Timeline (full width)
- Barras apiladas SVG con buckets de 1 minuto
- Zoom/brush preparado (fase futura)
- Labels horizontales, no rotados
- Color por severidad, tooltips al hover
- Indicador "ahora" (marcador live)

### G. Recent Events Enterprise Table
- Filas coloreadas según severidad (border-left 3px)
- Badges de severidad expandidos (Crítico, Alto, Medio, Bajo, Info)
- Columnas: Hora, Sev, Tipo, Proto, Origen, Destino, Zona, Activo, Score, Acción
- Indicador "nuevo desde último vistazo"
- Hover y selección con transition

### H. Event Investigation Panel
- Solo visible si hay evento seleccionado
- Resumen táctico + origen/destino + ruta
- Activo afectado + criticidad
- Scoring + factores + recomendaciones
- Acciones iSID seguras (no destructivas)

### I. Asset Intelligence Matrix
- Tabla de IPs únicas como activos
- Tipo inferido, criticidad, protocolos, última actividad
- Agrupable por zona

### J. iSID Actions Panel
- Marcar revisado, Copiar IOC, Filtrar activo, Abrir investigación
- Añadir nota, Generar recomendación
- Acciones no destructivas; bloqueo propuesto pero no ejecutado

### K. Suricata / MCP Intelligence Panel
- Estado parser + ingest (de capabilities)
- MCP read-only status
- Capacidades disponibles

---

## 5. Componentes propuestos

| Nuevo | Reemplaza a | Motivo |
|-------|------------|--------|
| `SocCommandHeader.tsx` | `SocHeader.tsx` | Añadir health LED, alarm badge, "hace X seg" |
| `WorldThreatMap.tsx` | `AttackWorldMap.tsx` | Renombrar + mejoras visuales (flechas conectadas, contraste) |
| `TacticalTopologyGraph.tsx` | `TopologyGraph.tsx` | Layout mejorado, settl animation |
| `LiveThreatRadar.tsx` | `ThreatRadarGrid.tsx` | Más grande, color dinámico, rotación |
| `SocEventTimeline.tsx` | `EventTimelinePanel.tsx` | Full width, zoom-ready, labels horizontales |
| `SocEventsTable.tsx` | `RecentEventsPanel.tsx` | Filas coloreadas, badges expandidos |
| `EventInvestigationPanel.tsx` | `EventInspectorPanel.tsx` | Solo si seleccionado, más completo |
| `AssetIntelligenceMatrix.tsx` | `AssetIntelligencePanel.tsx` | Mejora visual |
| `IsidActionsPanel.tsx` | NUEVO | Panel de acciones seguras |
| `SuricataMcpStatusPanel.tsx` | NUEVO | Estado Suricata + MCP |
| `SocKpiGrid.tsx` | `ExecutiveKpiStrip.tsx` | 6 KPIs en vez de 8, jerarquía |

---

## 6. Datos necesarios

### Disponibles ya
- Events recent, severity, protocol, source/destination, zone, title, tags, metadata
- Core status, capabilities, storage_mode
- Analytics status, score/event endpoint
- Suricata parser/ingest capabilities

### Faltantes (requieren backend/DB)
- Modo aprendizaje/detección (no implementado)
- Assets persistentes (solo inferidos de eventos)
- GeoIP real (sin proveedor externo)
- ASN, país, coordenadas
- WebSocket live (polling actual)
- Alert review status
- Analyst notes
- iSID actions persistentes

---

## 7. Criterios de aceptación visual

**PASS si:**
- Parece una consola SOC real (no maqueta)
- Usa pantalla completa con jerarquía clara
- Mapa y topología tienen presencia visual
- Radar aporta lectura de riesgo
- Datos reales alimentan todos los paneles
- Español en toda la UI
- Es presentable en demo interna

**FAIL si:**
- Parece juguete o wireframe
- Usa cajas simples sin composición
- Mapas/Topología/Radar no parecen herramientas reales
- Textos diminutos sin jerarquía
- Inglés en títulos principales
- Sin conexión con datos reales
