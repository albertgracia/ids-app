# 🏺 Informe de Análisis: Antihack IDS (ids-app)

**Fecha**: 2026-05-30
**Analista**: Code Archaeologist Agent

---

## 1. 📁 Estructura General del Proyecto

```
W:\ids-app\
├── Antihack_IDS_v3_Standalone.exe   # Binario compilado (Win)
├── Antihack_IDS_v3_Standalone.rar    # Backup/Copia distribuible
├── ids-app.exe                       # Binario compilado
├── ids-app-v2.exe                    # Binario compilado (versión previa)
├── ids-app-test.exe                  # Binario de prueba
├── main.exe                          # Binario compilado
├── go.mod                            # Módulo Go (dependencias)
├── go.sum                            # Checksums de dependencias
├── forensics.db                      # Base de datos SQLite (DATOS REALES)
├── error.log                         # Log de errores (binario)
├── startup_error.log                 # Log de errores de arranque (binario)
├── revel_crash.log                   # Log de crash de Revel (binario)
├── run_ids.bat                       # Script de arranque (Windows)
├── main.go                           # Punto de entrada principal
├── implementation_plan.md            # Plan de implementación original
├── MASTER_PROJECT.md                 # Documento maestro del proyecto
├── MASTER_PROJECT_PRO.html           # Documentación HTML
├── MASTER_PROJECT_PRO.odt            # Documentación ODT
├── MANUAL_OPERACION_IDS.html         # Manual de operación (PDF-like)
│
├── internal/
│   ├── core/
│   │   ├── engine.go                 # Motor IDS central (422 líneas)
│   │   ├── storage.go                # Persistencia SQLite
│   │   ├── geoip.go                  # Geolocalización IP
│   │   └── threat_db.go              # Base de amenazas simulada
│   │
│   └── api/
│       ├── gin/
│       │   └── server.go             # Implementación con Gin
│       ├── fiber/
│       │   └── server.go             # Implementación con Fiber
│       ├── echo/
│       │   └── server.go             # Implementación con Echo
│       ├── gorilla/
│       │   └── server.go             # Implementación con Gorilla Mux
│       └── revel/
│           ├── revel_server.go       # Server wrapper Revel
│           ├── conf/
│           │   ├── app.conf          # Configuración Revel
│           │   └── routes            # Rutas Revel
│           └── app/
│               ├── init.go           # Inicialización Revel
│               ├── controllers/
│               │   ├── init.go       # Registro de controladores
│               │   └── app.go        # Controlador App Revel
│               └── views/
│                   ├── App/
│                   │   └── Index.html    # Dashboard (Revel)
│                   └── errors/
│                       └── 500.html      # Página de error Revel
│
└── web/
    └── index.html                   # Frontend principal (SPA, 970 líneas)
```

### Tecnologías Identificadas

| Capa | Tecnología | Versión |
|------|-----------|---------|
| **Lenguaje** | Go | 1.26.2 |
| **API Frameworks** | Gin, Fiber, Echo, Gorilla Mux, Revel | Múltiples |
| **Base de datos** | SQLite (via modernc.org/sqlite) | 1.49.1 |
| **WebSockets** | Gorilla WebSocket (+ Fiber WebSocket) | 1.5.3 |
| **Frontend** | HTML5 + Vanilla JS (SPA) | - |
| **CSS** | Tailwind CSS (CDN) | 3.x |
| **Gráficos** | Chart.js, D3.js v7, Leaflet.js | Latest via CDN |
| **GeoIP** | ip-api.com (fallback: IPinfo) | REST API |

---

## 2. 🏛️ Arquitectura

### Patrón General: **Strategy + Shared Core**

```
┌─────────────────────────────────────────────────┐
│                   main.go                       │
│  (CLI flag --framework: gin|fiber|echo|gorilla  │
│                    |revel)                      │
└──────────┬──────────────────────┬──────────────┘
           │                      │
           ▼                      ▼
   ┌──────────────┐     ┌──────────────────┐
   │  core.Engine  │     │   core.Store     │
   │  (Motor IDS)  │◄───►│  (SQLite Pers.)  │
   │  core.Geo     │     └──────────────────┘
   │  core.ThreatDB│
   └──────┬───────┘
          │    5 implementaciones independientes
     ┌────┴──────────────┐
     ▼                   ▼
┌──────────┐      ┌──────────┐
│ Gin/     │      │ Fiber/   │
│ Echo/    │ ...  │ Gorilla/ │
│ Revel    │      │          │
└────┬─────┘      └────┬─────┘
     │                  │
     └────────┬─────────┘
              ▼
       ┌────────────┐
       │  web/      │
       │ index.html │
       │ (SPA + WS) │
       └────────────┘
```

### Comunicación entre módulos

- **Engine → API Servers**: Inyección de dependencias (Constructor Injection) — el `core.Engine` se pasa como parámetro a cada `NewServer()`
- **Engine → WebSocket clients**: Patrón **Pub/Sub** via canales de Go (`Subscribe()/Unsubscribe()`)
- **Engine → Store**: Llamada directa a métodos de persistencia desde el broadcaster del server
- **Frontend ↔ Backend**: REST API + WebSocket para eventos en tiempo real

### Estilo arquitectónico predominante

- **Capa única** (no hay separación clara entre handlers, servicios y repositorios)
- **Dependency Injection manual** (sin contenedor DI)
- **Estado mutable centralizado** en `Engine` (variables globales con `sync.RWMutex`)
- **Simulación inline** en el mismo proceso que el servidor web

---

## 3. 🎯 Propósito del Proyecto

**Sistema de Detección de Intrusiones (IDS) para entornos OT/IT**, orientado a redes industriales.

El proyecto:
- Simula tráfico de red con protocolos industriales (Modbus, S7COMM, CIP, PROFINET)
- Detecta anomalías comparando tráfico actual contra una "línea base" aprendida
- Geolocaliza IPs externas maliciosas en un mapa mundial
- Bloquea IPs atacantes (modo IPS)
- Mantiene un registro forense en SQLite
- Visualiza topología de red con D3.js
- **Es un PROYECTO DEMO/PROTOTIPO**, no un IDS desplegado en producción real

---

## 4. ⚠️ Análisis de Calidad de Código

### 🔴 CRÍTICO: Secretos Expuestos

| Archivo | Línea | Hallazgo |
|---------|-------|----------|
| `internal/core/geoip.go` | **14** | **API Token hardcodeado**: `const IPinfoLiteToken = "521f8097a7c99b"` |
| `internal/api/revel/conf/app.conf` | **3** | **Secret hardcodeado**: `app.secret = p9996612644265416515615165156` |

### 🔴 ALTA: Duplicación Masiva (DRY Violation)

Hay **5 implementaciones casi idénticas** del servidor API (Gin, Fiber, Echo, Gorilla, Revel). Los handlers tienen el mismo propósito pero están implementados separadamente:

- `handleStats`, `handleEvents`, `handleMode`, `handleGetConfig`, `handleUpdateConfig`, `handleBlock`, `handleGetBlacklist`, `handleUnblock`, `handleSimulateBurst`, `handleGetAssets`, `handleGeoIP`, `handleWS`, `broadcaster` → **13 handlers × 4 frameworks = 52 implementaciones casi idénticas**

| Framework | Líneas | Diferencia principal |
|-----------|--------|---------------------|
| `gin/server.go` | 233 | `gin.Context`, usa `MuRLock()` en varios handlers |
| `fiber/server.go` | 186 | `fiber.Ctx`, usa embed.FS para estáticos |
| `echo/server.go` | 192 | `echo.Context`, similar a Gin |
| `gorilla/server.go` | 210 | `http.ResponseWriter`, más verboso |
| `revel/...` | ~200 | Revel Controller, rutas separadas |

### 🟡 MEDIA: Violaciones de Principios SOLID

1. **S — Single Responsibility**:
   - `main.go` (líneas 70-108): `startSimulator()` mezcla lógica de simulación con creación de eventos
   - `engine.go` (líneas 174-281): `ProcessEvent()` hace **TODO**: validación, enriquecimiento geográfico, actualización de assets, detección de amenazas, broadcasting
   - `engine.go` filas 362-386: `isInternal` y `IsInternal` (método duplicado público/privado)

2. **O — Open/Closed**:
   - Para añadir un framework nuevo, hay que tocar `main.go` (switch), crear un package entero, y replicar todos los handlers

3. **D — Dependency Inversion**:
   - `Engine` expone campos públicos (no interfaces): `e.Events`, `e.Blacklist`, `e.Config`, `e.Geo` — los servidores acceden directamente a la implementación concreta

### 🟡 MEDIA: Código Muerto

| Archivo | Evidencia |
|---------|-----------|
| `go.mod` línea 69 | `go.mongodb.org/mongo-driver/v2` — MongoDB driver declarado **pero no usado** en el código |
| `go.mod` líneas 32, 34 | `github.com/go-stack/stack`, `github.com/inconshreveable/log15` — dependencias indirectas no usadas |
| `internal/api/revel/app/init.go` | Todo el archivo son inicializadores Revel que no se ejecutan en modo standalone |
| `ids-app-v2.exe`, `ids-app-test.exe` | Binarios compilados olvidados en el repo |

### 🟡 MEDIA: Magic Numbers y Strings

| Archivo | Línea | Problema |
|---------|-------|----------|
| `main.go` | 71-73 | IPs de simulación hardcodeadas |
| `main.go` | 75 | `2 * time.Second` ticker (hardcodeado) |
| `engine.go` | 92-95 | Config inicial hardcodeada |
| `engine.go` | 138 | IP externa mock hardcodeada `"85.54.120.44"` |
| `engine.go` | 343 | `"B+"` — risk status hardcodeado como string |
| `fiber/server.go` | 123 | IPs de ataque hardcodeadas en simulateBurst |
| Varios `server.go` | ~140-150 | IPs hardcodeadas, severidad, mensajes |

### 🟡 MEDIA: Race Conditions Potenciales

| Archivo | Línea | Problema |
|---------|-------|----------|
| `engine.go` | 207-221 | Geo lookup lanzado como goroutine que adquiere `e.mu.Lock()` mientras `ProcessEvent()` ya tiene `e.mu.Lock()` — **deadlock potencial** si la cache falla |
| `engine.go` | 269-280 | `ProcessEvent()` llama a `subMu.Lock()` después de `mu.Lock()` — orden consistente pero frágil |
| `fiber/server.go` | 121-137 | `handleSimulateBurst()` lanza goroutine que modifica `engine` sin control |

### 🟢 BAJA: Olores de Código

- **Variables con nombres genéricos**: `s` para Server, `r` para router, `e`/`app` para framework engine
- **Catching de errores silencioso**: Múltiples `catch(e) {}` vacíos en el frontend (ej. líneas 463, 589, 865)
- **Anidamiento en engine.go**: `ProcessEvent()` tiene 3 niveles de if (líneas 183, 206, 227)
- **Función enorme en frontend**: `web/index.html` es un monolito de 970 líneas con HTML + CSS + JS
- **Logs binarios**: `error.log`, `startup_error.log`, `revel_crash.log` son archivos binarios no parseables

---

## 5. 📦 Dependencias

### Directas (go.mod)

| Dependencia | Versión | Uso | Estado |
|-------------|---------|-----|--------|
| `github.com/gin-gonic/gin` | v1.12.0 | Framework API Gin | ✅ Actual |
| `github.com/gofiber/fiber/v2` | v2.52.12 | Framework API Fiber | ✅ Actual |
| `github.com/gofiber/websocket/v2` | v2.2.1 | WebSocket para Fiber | ✅ Actual |
| `github.com/gorilla/mux` | v1.8.1 | Framework API Gorilla | ✅ Actual |
| `github.com/gorilla/websocket` | v1.5.3 | WebSocket (Gin, Echo, Gorilla) | ✅ Actual |
| `github.com/jmoiron/sqlx` | v1.4.0 | SQL extensions para SQLite | ✅ Estable |
| `github.com/labstack/echo/v4` | v4.15.1 | Framework API Echo | ✅ Actual |
| `modernc.org/sqlite` | v1.49.1 | SQLite puro Go (sin CGO) | ✅ Actual |

### Indirectas No Usadas (Dead Weight)

| Dependencia | Problema |
|-------------|----------|
| `go.mongodb.org/mongo-driver/v2` | Se declara pero nunca se usa en el código |
| `github.com/go-stack/stack` | Reliquia del stack tracing de Revel |
| `github.com/inconshreveable/log15` | Logging antiguo, no usado |
| `github.com/revel/*` (5 módulos) | Solo necesario si se corre Revel, que no es el caso default |

### Frontend (CDN)

| Dependencia | Versión |
|-------------|---------|
| Tailwind CSS | CDN latest |
| Chart.js | CDN latest |
| D3.js | v7 |
| Leaflet.js | 1.9.4 |
| FontAwesome 6 | CDN |
| Google Fonts (Orbitron, Inter) | CDN |

---

## 6. ⚙️ Configuración y Tooling

### Build System
- **No hay Makefile, ni Taskfile, ni script de CI/CD**

### Tests
- **CERO tests escritos en Go** — no se encontró ningún `_test.go`
- `implementation_plan.md` menciona `go test ./internal/core/...` como "Verification Plan" pero no se implementó
- Solo hay un binario `ids-app-test.exe` compilado (origen desconocido)

### Linters / Formatters
- No hay `.golangci.yml`, `.editorconfig`, `eslintrc`, ni configuración de prettier
- No hay `go vet` ni `staticcheck` en ningún script
- El código Go no sigue un formato consistente (espaciado irregular, import paths revueltos)

### CI/CD
- **No existe**

### Scripts
- `run_ids.bat`: Solo ejecuta `go run main.go --framework %FRAMEWORK%`
- Sin manejo de versiones, sin hooks de git, sin docker

---

## 7. 🔍 Hallazgos Importantes

### 🚨 Punto #1: Datos Reales en DB
**Archivo**: `forensics.db` (en la raíz del proyecto)
- Es una base de datos SQLite con ejecuciones previas
- Contiene potencialmente IPs reales, timestamps, y otra información sensible
- **Riesgo**: Si este proyecto se sube a GitHub, los datos quedan expuestos

### 🚨 Punto #2: API Token Expuesto
**Archivo**: `internal/core/geoip.go`, línea 14
```go
const IPinfoLiteToken = "521f8097a7c99b"
```
Este token está hardcodeado y visible. Ya no se usa realmente (el código usa ip-api.com), pero el token queda en el código fuente para siempre.

### 🚨 Punto #3: Revel Secret Hardcodeado
**Archivo**: `internal/api/revel/conf/app.conf`, línea 3
```
app.secret = p9996612644265416515615165156
```
Este secret es usado por Revel para firmar cookies de sesión. Es un secret débil y hardcodeado.

### 🚨 Punto #4: El Proyecto No Compila (probablemente)
- **`go 1.26.2`** no es una versión de Go que exista (al momento actual, la última es 1.22-1.23)
- Esto sugiere que el `go.mod` fue editado manualmente o generado con una versión futura hipotética
- `revel` depende de `github.com/agtorre/gocolorize`, `github.com/revel/config`, etc. — dependencias legacy con versiones antiguas

### 🚨 Punto #5: Revel Config AppPath Erróneo
**Archivo**: `internal/api/revel/revel_server.go`, línea 32
```go
revel.Init("prod", "ids-app/internal/api/revel", filepath.Join(wd, ".."))
```
`filepath.Join(wd, "..")` intenta subir un nivel desde el directorio de trabajo, lo cual es incorrecto para el GOPATH. Revel probablemente crashea en este modo.

### 🚨 Punto #6: Logs binarios
`error.log`, `startup_error.log`, `revel_crash.log` son archivos binarios con 0 bytes legibles, lo que sugiere que la aplicación está escribiendo logs en formato binario o que están corruptos.

### 🏆 Punto #7: Arquitectura Multi-Framework (La joya del proyecto)
A pesar de la duplicación, el diseño que permite intercambiar **5 frameworks** con el mismo backend es un experimento técnico interesante. Muestra un dominio sólido de Go y de los distintos ecosistemas web.

### 🏆 Punto #8: Frontend Sólido (para ser demo)
El dashboard (`web/index.html`) es visualmente impresionante:
- Estilo "táctico/cyberpunk" con Orbitron
- Mapa de red con D3 force-graph
- Mapa mundial con Leaflet + geolocalización
- WebSocket en tiempo real
- Chart.js para analíticas
- Modo IDLE/LEARN/DETECT

### Archivos Clave (Points of Entry)

| Archivo | Rol | Prioridad |
|---------|-----|-----------|
| `main.go` | Entry point, switch de frameworks | 🔴 Alta |
| `internal/core/engine.go` | Motor IDS (corazón del sistema) | 🔴 Alta |
| `internal/core/geoip.go` | Geolocalización + Token expuesto | 🔴 Alta |
| `web/index.html` | Frontend completo (SPA) | 🟡 Media |
| `internal/api/fiber/server.go` | Implementación default del API | 🟡 Media |
| `internal/api/revel/conf/app.conf` | Secret hardcodeado | 🟡 Media |
| `forensics.db` | Datos reales en producción | 🟡 Media |

---

## 8. 📋 Recomendaciones

### 🔴 Prioridad 1: Seguridad (Inmediato)

1. **Eliminar `forensics.db` del repositorio** y añadir `*.db` a `.gitignore`
2. **Rotar/Invalidar** el token `521f8097a7c99b` de IPinfo
3. **Reemplazar** `app.secret` en Revel por una variable de entorno
4. **Añadir `.gitignore`** (actualmente no existe) con entradas para:
   ```
   *.exe
   *.db
   *.log
   *.rar
   forensics.db
   ```

### 🔴 Prioridad 2: Deuda Técnica (A corto plazo)

5. **Consolidar las 5 implementaciones en 1 + interfaz común** (Strangler Fig Pattern):
   - Crear una interfaz `HTTPServer` en `internal/core`
   - Implementar un adaptador por framework (Strategy pattern limpio)
   - Reducir ~1000 líneas duplicadas a ~200

6. **Refactorizar `engine.go` — `ProcessEvent()`**:
   - Extraer a métodos separados: `enrichAsset()`, `checkBaseline()`, `checkThreats()`, `enrichGeoData()`, `broadcastEvent()`
   - Separar la goroutine de geo lookup del lock principal

7. **Corregir `go 1.26.2`** a la versión real de Go instalada

### 🟡 Prioridad 3: Calidad (A mediano plazo)

8. **Escribir tests**:
   - Tests unitarios para `core.Engine.ProcessEvent()`
   - Tests para `ThreatDB.Check()`
   - Tests para `GeoClient.Lookup()` (con mock HTTP)
   - Tests de integración para al menos un framework

9. **Añadir linter/configuración**:
   - `.golangci.yml` con `govet`, `staticcheck`, `errcheck`
   - Formatear todo el código con `gofmt -s`

10. **Separar el frontend monolítico**:
    - Extraer JS a `web/dashboard.js` (como menciona el plan original)
    - Usar un bundler mínimo (esbuild, vite)

### 🟢 Prioridad 4: Mejoras (A largo plazo)

11. **Reemplazar simulación inline por tráfico real**:
    - Actualmente `startSimulator()` genera tráfico ficticio. El paso a producción requeriría captura real de paquetes (pcap/gopacket)

12. **Añadir Docker**:
    ```dockerfile
    FROM golang:1.23-alpine AS build
    WORKDIR /app
    COPY go.* ./
    RUN go mod download
    COPY . .
    RUN go build -o ids-app .
    FROM alpine
    COPY --from=build /app/ids-app .
    EXPOSE 7575
    CMD ["./ids-app", "--framework", "fiber"]
    ```

13. **Migrar a configuración externa**:
    - Usar archivo YAML/JSON o variables de entorno en lugar de constantes hardcodeadas
    - Las IPs de simulación, el puerto, los rangos de red deberían ser configurables

14. **Implementar un modo "producción real"**:
    - Actualmente el sistema no captura tráfico real de red (no usa libpcap/gopacket)
    - Para un IDS real, necesitaría: captura de paquetes, análisis de protocolos, pipeline de procesamiento asíncrono

---

## 📊 Resumen Ejecutivo

### Puntaje de Salud del Proyecto: **5/10 — "Prototipo funcional con deuda crítica"**

| Categoría | Nota | Comentario |
|-----------|------|------------|
| Arquitectura | **7/10** | Estrategia acertada, ejecución duplicada |
| Seguridad | **3/10** | Tokens expuestos, sin .gitignore, DB con datos |
| Calidad Código Go | **4/10** | DRY violado severamente, sin tests |
| Frontend | **8/10** | Visualmente impresionante, pero monolítico |
| Configuración/Tooling | **1/10** | Sin CI/CD, linters, tests, o docker |
| Mantenibilidad | **3/10** | 5 frameworks = 5x mantenimiento |

### Lo que hay que hacer AHORA (esta semana):
1. ✅ Eliminar `forensics.db` y logs del repo + `.gitignore`
2. ✅ Rotar el token de IPinfo
3. ✅ Quitar secret de Revel a env var

### Lo que hay que hacer ESTE MES:
4. ✅ Consolidar servidores API (estrategia de interfaz común)
5. ✅ Refactorizar `ProcessEvent()` en métodos pequeños
6. ✅ Escribir tests unitarios del core

### Lo que hay que hacer ESTE TRIMESTRE:
7. ✅ Separar frontend monolítico en archivos modulares
8. ✅ Dockerizar la aplicación
9. ✅ Migrar configuración a variables de entorno

---

*"Chesterton's Fence" aplicado: Cada línea duplicada de los 5 frameworks fue la decisión deliberada de alguien que quería demostrar competencia técnica en todos ellos. El resultado es un experimento pedagógico valioso pero insostenible en producción.*
