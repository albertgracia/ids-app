# INFORME TÉCNICO DE ANÁLISIS FRONTEND — IDS Antihack iSID

**Proyecto:** Antihack IDS v3.0 (Radiflow Edition)
**Archivo analizado:** `W:\ids-app\web\index.html` (970 líneas)
**Backend:** Go (multi-framework: Fiber, Gin, Echo, Gorilla, Revel)
**Frontend:** SPA monofichero HTML + Tailwind CSS CDN + Vanilla JS
**Fecha del análisis:** 30 de mayo de 2026

---

## 1. ESTRUCTURA GENERAL DEL FRONTEND

### 1.1 Arquitectura del HTML

Frontend es una **Single Page Application (SPA)** autocontenida en un único archivo HTML de 970 líneas:

```
index.html
  ├── <head> (CDNs, estilos inline, Google Fonts)
  ├── <header> (top bar: logo, stats, botón simular)
  ├── <div> flex container
  │   ├── <nav> sidebar (8 botones de navegación + modos motor)
  │   └── <main> panel principal
  │       ├── <section> view-dashboard
  │       ├── <section> view-assets
  │       ├── <section> view-map
  │       ├── <section> view-alerts
  │       ├── <section> view-insights
  │       ├── <section> view-geo
  │       ├── <section> view-blacklist
  │       └── <section> view-config
  └── <script> (todo el JS inline ~210 líneas)
```

### 1.2 Organización del CSS

1. **Tailwind CDN** (`cdn.tailwindcss.com`) — sin configuración personalizada
2. **Estilos inline en `<style>`** (~60 líneas): variables CSS, glass-panel, animaciones, estilos D3/Leaflet
3. **Estilos inline en atributos HTML** — clases Tailwind en etiquetas

### 1.3 Organización del JavaScript

Todo el JS (~250 líneas efectivas) en un único bloque `<script>` al final del `<body>`:

| Bloque | Líneas | Propósito |
|--------|--------|-----------|
| Globales | 393-415 | Referencias DOM, variables de estado |
| initGeoMap | 419-427 | Inicialización Leaflet.js |
| geolocateHacker | 429-445 | Geolocalización de IPs |
| renderHackerFromData | 447-461 | Marcadores en mapa |
| renderGeoHistory | 463-474 | Carga histórica geo |
| clearGeoMarkers | 476-479 | Limpieza marcadores |
| toggleAutoBlock / blockIP | 483-508 | IPS (Intrusion Prevention) |
| renderBlacklist / unblockIP | 510-535 | Lista negra CRUD |
| initCharts | 537-556 | Inicialización Chart.js |
| initMap | 559-652 | D3.js force-directed graph |
| updateMapData | 655-673 | Actualización del grafo |
| renderMapHistory | 675-679 | Carga histórica mapa |
| renderAlertsList | 688-698 | Tabla de alertas |
| updateAssets / renderAssets | 700-731 | Gestión de activos |
| addEventToUI | 733-763 | Handler principal WebSocket |
| updateCharts | 766-779 | Actualización gráficas |
| showView | 782-813 | Navegación SPA (ruteo) |
| connect | 816-826 | WebSocket connection |
| updateStats | 828-862 | Polling REST `/api/stats` |
| setMode | 864-866 | Cambio modo motor |
| simulateBurst | 868-876 | Simulación de ataque |
| showToast | 878-890 | Notificaciones UI |
| saveConfig | 892-913 | Guardar configuración |
| loadInitialAssets | 915-934 | Carga inicial activos |
| loadInitialEvents | 936-954 | Carga inicial eventos |
| Auto-boot | 959-963 | Inicialización al cargar |

### 1.4 Mantenibilidad y Escalabilidad: **MUY BAJA**

- Sin separación de responsabilidades (HTML, CSS, JS entrelazados)
- Variables globales (todo el estado en `window` scope)
- Sin sistema de módulos (no hay imports/exports)
- Código duplicado (lógica de alertas en `addEventToUI` y `renderAlertsList`)
- Sin tipos, sin tests, sin sistema de build

---

## 2. ANÁLISIS DEL HTML

### 2.1 Semántica HTML5: **REGULAR**

- ✅ Uso correcto de `<header>`, `<nav>`, `<main>`, `<section>`, `<table>`
- ✅ `lang="es"`, `viewport` configurado
- ❌ Botones de navegación deberían ser `<a>` o usar `role="tab"`
- ❌ Secciones ocultas sin `aria-hidden`
- ❌ Canvas sin `aria-label`
- ❌ Mapa Leaflet sin `role="application"`

### 2.2 Accesibilidad: **MUY BAJA**

| Problema | Severidad |
|----------|-----------|
| Sin `aria-current` en navegación activa | Alta |
| Contraste insuficiente (#888 sobre #010409, ratio ~3.5:1) | Alta |
| Sin `aria-live` para contenido dinámico | Alta |
| Sin skip-to-content | Media |
| Sin `tabindex` gestionado | Media |
| Sin `prefers-reduced-motion` | Alta |
| Sin `aria-expanded` en tabs | Baja |

### 2.3 Responsive Design: **MUY BAJO**

- ❌ No hay media queries
- ❌ `overflow-hidden` en body bloquea scroll en móviles
- ❌ Sidebar de 256px fijo no colapsable
- ❌ Grid `grid-cols-4` sin breakpoints
- ❌ Mapas con alto fijo de 700px no escalan

---

## 3. ANÁLISIS DEL CSS / ESTILOS

### 3.1 Tema Visual: Cyberpunk / Dark Mode Táctico

- Fondo: `#010409`, Panel: `#0d1117`
- Acento: Cyan `#00d2ff`
- Secundarios: Azul `#0070f3`, Púrpura `#7928ca`
- **Púrpura viola la regla "Purple Ban" del design system**
- Contraste insuficiente en varios elementos
- Bordes `#30363d` apenas visibles sobre `#0d1117`

### 3.2 Problemas de CSS

- `!important` innecesario en selectores de ID y `.mode-btn.active`
- `.legend-box` definido en CSS pero no existe en HTML
- `backdrop-filter: blur(10px)` puede causar problemas de rendimiento

---

## 4. ANÁLISIS DEL JAVASCRIPT

### 4.1 Manejo de Estado: **INADECUADO**

- `allEvents` (línea 410): **Declarado pero nunca usado**
- `trafficSum`: Actualizado desde dos fuentes — doble fuente de verdad
- `alertCounter`: Nunca sincronizado con el servidor

### 4.2 WebSocket: **BUGS Y FALENCIAS**

- Sin heartbeat (sin ping/pong)
- Sin reconexión exponencial (`setTimeout(connect, 3000)` fijo)
- Sin manejo de `ws.onerror`
- Sin buffer de eventos perdidos durante reconexión
- Sin verificación de conexión activa antes de reconectar

### 4.3 D3.js Force Graph: Bugs

1. `initMap()` se llama cada vez que se navega al mapa sin verificar si ya fue inicializada
2. `window.updateMapUI` se sobrescribe en cada llamada
3. Renderizado ineficiente: recrea todos los elementos SVG en cada update
4. Simulación reiniciada con `alpha(1).restart()` en cada update
5. Fuga de memoria: cada `initMap()` añade nuevos listeners de zoom

### 4.4 Bugs de JS Identificados

| # | Bug | Líneas | Impacto |
|---|-----|--------|---------|
| 1 | `data.total_traffic` es `undefined` — backend no lo envía | 837-839 | Muestra "NaN MB" permanentemente |
| 2 | `data.ot_traffic` es contador de eventos, no KB/s | 832 | Muestra "0 KB/s" erróneo |
| 3 | `initMap()` llamada múltiples veces sin verificación | 795 | Fuga de memoria, renders duplicados |
| 4 | `allEvents` declarado pero nunca usado | 410 | Variable muerta |
| 5 | Sin sanitización en popup de Leaflet | 460 | **Riesgo XSS** |
| 6 | `setInterval(updateStats, 2000)` sin cleanup | 828 | Memory leak potencial |
| 7 | WebSocket sin heartbeat ni reconexión exponencial | 816-826 | Conexiones inestables |
| 8 | `stats.total.innerText` actualizado desde dos fuentes | 740, 839 | Saltos visuales |
| 9 | `identifiedHackers` race condition | 755-756 vs 431 | Doble geo lookup |
| 10 | Duplicación lógica alerta (addEventToUI vs renderAlertsList) | 759-762 vs 692-697 | Inconsistencias |

---

## 5. DEPENDENCIAS EXTERNAS (CDNs)

| Recurso | Tamaño aprox. | Render-blocking |
|---------|---------------|-----------------|
| Tailwind CSS (CDN latest) | ~300 KB | ✅ Sí |
| Chart.js (latest) | ~60 KB | ✅ Sí |
| D3.js v7 | ~130 KB | ✅ Sí |
| Leaflet 1.9.4 | ~140 KB + 15 KB CSS | ✅ Sí |
| Font Awesome 6.0.0 | ~70 KB | ❌ |
| Google Fonts | ~30 KB | ❌ |

**Total: ~745 KB sin comprimir, ~500 KB comprimido**
- **4 scripts síncronos** bloquean renderizado
- Sin `preconnect`/`dns-prefetch` para CDNs
- Sin versionado fijo en Tailwind y Chart.js
- **Sin fallbacks offline** — frontend completamente roto sin Internet

---

## 6. COMUNICACIÓN FRONTEND-BACKEND

### 6.1 Inconsistencia Crítica: `/api/stats`

El frontend espera:
```javascript
stats.ot.innerText = data.ot_traffic + ' KB/s';  // Espera KB/s
trafficSum = data.total_traffic;                   // ¡NO EXISTE EN BACKEND!
```

El backend envía:
```go
"ot_traffic": otCount,   // Contador de eventos, NO tráfico
"it_traffic": itCount,
// Sin "total_traffic"
```

**BUG**: `data.total_traffic` **no existe** → `trafficSum` = `undefined` → muestra `NaN MB`.
**BUG**: `data.ot_traffic` es contador de eventos, no KB/s.

### 6.2 Manejo de Estados

- **Loading**: ❌ Sin skeletons ni spinners
- **Error**: ⚠️ Catch silencioso en mayoría de casos
- **Empty**: ❌ Tablas vacías sin mensaje "No data"

---

## 7. RENDIMIENTO

### 7.1 Render Blocking

4 scripts CDN en `<head>`: ~1-2s de bloqueo en banda ancha, mucho más en redes lentas.

### 7.2 Memory Leaks

1. `setInterval(updateStats, 2000)` — nunca se limpia
2. `initMap()` sin cleanup — listeners de zoom acumulados
3. Acumulación en trendChart (aunque `.shift()` mantiene 20 puntos)

### 7.3 Optimización

- D3.js tick handler sin `requestAnimationFrame` — jank potencial con >200 nodes
- Chart.js `update('none')` ✅ correcto para datos en tiempo real
- Sin `debounce`/`throttle` en handlers de eventos

---

## RESUMEN DE PUNTUACIÓN

| Categoría | Puntuación (0-10) | Comentario |
|-----------|-------------------|------------|
| Arquitectura | 2/10 | Monolito funcional pero no escalable |
| HTML Semántico | 5/10 | Uso básico correcto, faltan roles ARIA |
| Accesibilidad | 2/10 | Múltiples violaciones WCAG |
| CSS / Diseño | 4/10 | Visualmente atractivo pero frágil |
| JavaScript | 3/10 | Código con bugs y sin estructura |
| Rendimiento | 3/10 | CDNs bloqueantes, sin lazy loading |
| Mantenibilidad | 1/10 | Monolito 970 líneas, cero tests |
| Comunicación Backend | 5/10 | APIs funcionales pero inconsistencias |
| **Global** | **3.1/10** | **Requiere refactor significativo** |

---

## RECOMENDACIONES PRINCIPALES

### Inmediatas
1. Fix bug `data.total_traffic` (fallback a `?? trafficSum`)
2. Inicialización única de `initMap()` con guard
3. Sanitizar popups Leaflet contra XSS
4. WebSocket con reconexión exponencial y heartbeat
5. Añadir `preconnect` para CDNs

### Corto plazo
6. Separar HTML/CSS/JS en archivos (`web/js/`, `web/css/`)
7. Migrar a Vite + Svelte/React
8. Implementar loading states y error handling visual
9. Versiones fijas de CDNs o bundle propio

### Medio plazo
10. TypeScript + testing (Vitest + Playwright)
11. Componentización completa
12. Accesibilidad WCAG AA
13. Responsive design con media queries

---

*Fin del informe. Generado el 30 de mayo de 2026.*
