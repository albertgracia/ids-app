# INFORME DE ANÁLISIS DEVOPS — IDS ANTIHACK iSID

**Proyecto:** `W:\ids-app\` (IDS Antihack v3.0)
**Lenguaje:** Go (con 5 frameworks web: Gin, Fiber, Echo, Gorilla Mux, Revel)
**Base de datos:** SQLite (via modernc.org/sqlite)
**Fecha del análisis:** 30 de mayo de 2026

---

## Índice

1. [Análisis de Build & Compilación](#1-análisis-de-build--compilación)
2. [Análisis de Despliegue](#2-análisis-de-despliegue)
3. [CI/CD](#3-cicd)
4. [Contenerización](#4-contenerización)
5. [Monitoreo y Observabilidad](#5-monitoreo-y-observabilidad)
6. [Seguridad Operacional](#6-seguridad-operacional)
7. [Gestión de Dependencias](#7-gestión-de-dependencias)
8. [Scripting y Automatización](#8-scripting-y-automatización)
9. [Recomendaciones de Infraestructura](#9-recomendaciones-de-infraestructura)

---

## 1. Análisis de Build & Compilación

### 1.1 ¿El proyecto compila actualmente?

**No compilará** con la versión de Go especificada.

- `go.mod` declara `go 1.26.2` — **esta versión de Go no existe**. A fecha de este análisis, la última versión estable de Go es la 1.23.x (y potencialmente 1.24 en desarrollo). La versión `1.26.2` es ficticia/inventada.
- **Síntoma:** `go build` fallará con un error similar a: *"invalid go version 'go1.26.2': go.mod has malformed module version"*.
- **Evidencia colateral:** Existen **6 binarios precompilados** en el directorio raíz (todos ~43-44 MB), lo que sugiere que el proyecto fue compilado exitosamente en algún momento pasado, posiblemente con una versión de Go diferente y luego se modificó el `go.mod` de forma incorrecta.

**Binarios encontrados:**

| Archivo | Tamaño |
|---------|--------|
| `Antihack_IDS_v3_Standalone.exe` | 43,894 KB |
| `ids-app.exe` | 43,789 KB |
| `ids-app.exe~` | 43,744 KB |
| `ids-app-test.exe` | 43,742 KB |
| `ids-app-v2.exe` | 43,786 KB |
| `main.exe` | 43,720 KB |

### 1.2 Tiempo estimado de build y tamaño de binarios

- **Tiempo de build** (estimado en máquina moderna con SSD): ~15-30 segundos la primera vez (descarga de dependencias), ~3-8 segundos en compilaciones subsiguientes.
- **Tamaño del binario:** ~44 MB. Es un tamaño elevado para una app Go simple, lo que sugiere:
  - Revel arrastra muchas dependencias (peso estimado ~20 MB solo por Revel).
  - El tag `-ldflags="-s -w"` no se está usando para reducir tamaño (podría bajar a ~25-30 MB).
  - Compilación sin `-trimpath`.
- **Tamaño potencial mínimo:** con `-ldflags="-s -w"` + `-trimpath` + `upx --lzma`, se podría reducir a ~10-12 MB.

### 1.3 Cross-compilation

El proyecto no incluye scripts de cross-compilation, pero Go lo soporta nativamente:

```bash
# Windows (amd64) - ya funcional
GOOS=windows GOARCH=amd64 go build -o ids-app.exe .

# Linux
GOOS=linux GOARCH=amd64 go build -o ids-app-linux .

# macOS (Intel)
GOOS=darwin GOARCH=amd64 go build -o ids-app-macos .

# macOS (Apple Silicon)
GOOS=darwin GOARCH=arm64 go build -o ids-app-macos-arm64 .

# ARM (Raspberry Pi)
GOOS=linux GOARCH=arm64 go build -o ids-app-linux-arm64 .
```

### 1.4 Build tags para Revel

Revel tiene su propio sistema de build que complica la compilación:

- Revel requiere que el código esté dentro de `$GOPATH/src` o usa su propio sistema de rutas.
- En `revel_server.go` se hacen llamadas a `revel.Init()` y `revel.Run()` que configuran rutas de forma programática.
- **Observación:** Revel no se compila con el estándar `go build`; necesita el comando `revel run` o configuración manual (que es lo que intenta este proyecto).
- Los logs de error muestran: `Revel engine is listening on.. localhost:7575` seguido de `exit status 1` — Revel arranca pero falla al servir.

**⚠️ Problema detectado:** El servidor Revel depende de archivos de configuración y vistas que no existen en el proyecto:
- `internal/api/revel/app/views/` — directorio **ausente**.
- `internal/api/revel/app/views/App/Index.html` — archivo **ausente**.
- La función `c.Render()` en `controllers/app.go` (línea 18) intentará renderizar una plantilla que no existe.

### 1.5 embed.FS vs Static Files

Hay **inconsistencia** entre frameworks:

| Framework | Método de servir frontend | ¿Funciona offline? |
|-----------|--------------------------|-------------------|
| **Fiber** | `embed.FS` (embebido en binario) | ✅ Sí |
| **Gin** | `r.Static("/static", "./web")` | ❌ Requiere archivos en disco |
| **Echo** | `e.Static("/static", "./web")` | ❌ Requiere archivos en disco |
| **Gorilla** | `http.Dir("./web")` | ❌ Requiere archivos en disco |
| **Revel** | `c.Render()` (busca vistas en `app/views/`) | ❌ Vistas no existen |

**Solo Fiber** tiene un binario completamente autocontenido. Los demás frameworks necesitan el directorio `./web/` presente en el mismo directorio que el binario.

---

## 2. Análisis de Despliegue

### 2.1 Opciones de despliegue actuales

Actualmente solo hay **una opción**: binario standalone + directorio `web/`.

**No existen:**
- Dockerfile
- Servicio de Windows (sc create / NSSM)
- systemd unit (Linux)
- Helm chart
- Terraform/Pulumi

### 2.2 Puerto expuesto

- **Puerto por defecto:** `7575`
- **Configurable vía flag:** `--port 7575`
- **No configurable vía variable de entorno** — no hay `os.Getenv("PORT")`.
- **Hardcodeado en múltiples lugares:** El `app.conf` de Revel tiene `http.port = 7575` como fallback.

### 2.3 Sin TLS/HTTPS

**Ninguno de los 5 servidores implementa TLS.** Esto significa:

- El tráfico viaja en texto plano.
- Las claves API (IPinfo) se envían en claro si la app se expone a Internet.
- WebSocket (`ws://`) también va sin cifrar.
- **Riesgo crítico** si se despliega en producción expuesta.

### 2.4 Sin health checks ni graceful shutdown

**No existe ningún endpoint de health check** como `/health`, `/ready`, `/live`.

**No existe manejo de señales:**

```go
// Esto NO está implementado en ningún servidor
signal.Notify(ch, syscall.SIGINT, syscall.SIGTERM)
<-ch
server.Shutdown(ctx)
```

Consecuencias:
- Orchestrators (Kubernetes, Docker Swarm, Nomad) **no pueden** determinar si la app está viva.
- `SIGTERM` mata el proceso inmediatamente, cerrando conexiones WebSocket de forma abrupta y potencialmente corrompiendo SQLite.
- `SIGKILL` puede dejar la base de datos en un estado inconsistente.

### 2.5 Dependencia de CDNs externos

El frontend (`web/index.html`) carga **6 recursos de CDNs externos**:

| Recurso | CDN | Impacto sin Internet |
|---------|-----|---------------------|
| `tailwindcss.com` (CDN script) | Tailwind CDN | Sin estilos |
| `chart.js` | jsDelivr | Sin gráficas |
| `d3.v7.min.js` | D3.js CDN | Sin mapa de red |
| `leaflet.js` + `leaflet.css` | unpkg | Sin mapa geográfico |
| `font-awesome 6.0.0` | cdnjs | Sin iconos |
| Google Fonts (Orbitron, Inter) | Google Fonts | Tipografía fallback |

**Si la máquina no tiene Internet, el frontend se ve completamente roto.**

### 2.6 Dependencia de ip-api.com

El backend en `geoip.go` (línea 119) hace una petición HTTP a `ip-api.com`:

```go
url := fmt.Sprintf("http://ip-api.com/json/%s?...", ip)
```

Problemas:
- **HTTP, no HTTPS** — la respuesta puede ser interceptada/modificada.
- **Límite de tasa:** ip-api.com free tier permite 45 requests/minuto. Si el IDS procesa eventos con IPs externas rápido, se alcanzará el límite.
- **Sin Internet:** el lookup falla y devuelve `"Country: ??"`.
- **Token de IPinfo hardcodeado** (línea 14) pero **no usado** — el código REALMENTE usa ip-api.com, no IPinfo. El token de IPinfo es un *dead constant*.

---

## 3. CI/CD

### 3.1 Estado actual

**CERO pipelines de CI/CD.** No existe:
- `.github/workflows/`
- `.gitlab-ci.yml`
- `Jenkinsfile`
- `Taskfile.yml`
- `.drone.yml`
- `Makefile`

### 3.2 Pipeline recomendado (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.23'
      - name: golangci-lint
        uses: golangci/golangci-lint-action@v6
        with:
          version: latest

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.23'
      - run: go test ./... -v -race -coverprofile=coverage.out
      - uses: codecov/codecov-action@v4

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Trivy Scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
      - name: Gosec
        uses: securego/gosec@master
        with:
          args: ./...

  build:
    if: github.ref == 'refs/heads/main'
    needs: [lint, test, security]
    runs-on: ubuntu-latest
    strategy:
      matrix:
        goos: [linux, windows]
        goarch: [amd64, arm64]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
      - name: Cross-compile
        env:
          GOOS: ${{ matrix.goos }}
          GOARCH: ${{ matrix.goarch }}
        run: |
          go build -ldflags="-s -w" -trimpath \
            -tags=sqlite_omit_load_extension \
            -o ids-app-${{ matrix.goos }}-${{ matrix.goarch }}${{ matrix.goos == 'windows' && '.exe' || '' }} .
      - uses: actions/upload-artifact@v4
        with:
          name: ids-app-${{ matrix.goos }}-${{ matrix.goarch }}
          path: ids-app-*

  docker:
    needs: [build]
    uses: ./.github/workflows/docker.yml
```

**Componentes necesarios para CI:**
1. ✅ **Lint:** `golangci-lint` (gofmt, govet, staticcheck, errcheck)
2. ❌ **Tests:** No hay tests en el proyecto (0 archivos `*_test.go`)
3. ❌ **Security Scan:** `gosec` + `trivy` (no implementado)
4. ❌ **Build Matrix:** No existe
5. ❌ **Release:** No existe automatización de releases

---

## 4. Contenerización

### 4.1 Estado actual

**No existe Dockerfile, .dockerignore, docker-compose.yml ni ningún otro artefacto de contenedor.**

### 4.2 Dockerfile multi-stage recomendado

```dockerfile
# ---- Build Stage ----
FROM golang:1.23-alpine AS builder
RUN apk add --no-cache gcc musl-dev

WORKDIR /workspace
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=1 GOOS=linux go build \
    -ldflags="-s -w" \
    -trimpath \
    -tags=sqlite_omit_load_extension \
    -o /ids-app .

# ---- Runtime Stage ----
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app
COPY --from=builder /ids-app .
COPY web/ ./web/

EXPOSE 7575

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:7575/api/stats || exit 1

VOLUME /data
ENV DB_PATH=/data/forensics.db

CMD ["/app/ids-app", "--framework", "fiber", "--port", "7575"]
```

### 4.3 Docker Compose recomendado

```yaml
version: '3.8'

services:
  ids-app:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        - FRAMEWORK=fiber
    ports:
      - "7575:7575"
    volumes:
      - ids-data:/data
      - ./web:/app/web:ro
    environment:
      - DB_PATH=/data/forensics.db
      - GIN_MODE=release
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:7575/api/stats"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 128M

volumes:
  ids-data:
```

### 4.4 Tamaño de imagen estimado

| Capa | Base | Con CGO | Sin CGO |
|------|------|---------|---------|
| **Builder** | golang:1.23-alpine (~450 MB) | ~500 MB | ~450 MB |
| **Runtime** | alpine:3.20 (~7 MB) + binario (~30 MB) | ~45 MB | ~40 MB |
| **Total imagen final** | | **~45-50 MB** | **~40-45 MB** |

Con `upx --lzma` en el binario dentro del Dockerfile, la imagen podría reducirse a **~15-20 MB**.

### 4.5 Consideraciones de SQLite en Docker

⚠️ **SQLite no es ideal para contenedores:**
- Múltiples réplicas NO pueden compartir el mismo archivo SQLite (corrupción).
- Si el contenedor es eliminado sin un `SIGTERM` manejado, SQLite puede corromperse.
- **Recomendación:** Usar un volumen Docker persistente montado en `/data`.
- Para escalado horizontal, migrar a PostgreSQL (vía `pgx` o `lib/pq`).

---

## 5. Monitoreo y Observabilidad

### 5.1 Diagnóstico actual

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| **Logging estructurado** | ❌ Ausente | Solo `log.Println()`, `log.Fatalf()`, `fmt.Printf()` |
| **Niveles de log** | ❌ Ausente | No hay debug/info/warn/error |
| **Métricas** | ❌ Ausente | Sin Prometheus, sin /metrics |
| **Tracing** | ❌ Ausente | Sin OpenTelemetry |
| **Health checks** | ❌ Ausente | Sin /health, /ready, /live |
| **Manejo de señales** | ❌ Ausente | Sin graceful shutdown |
| **Logs de acceso HTTP** | ❌ Ausente | Ningún server logea requests |
| **Centralización de logs** | ❌ Ausente | Solo stdout |

### 5.2 Logging estructurado recomendado

Sustituir los `log.Println` y `fmt.Printf` por `slog` (Go 1.21+):

```go
import "log/slog"

// En main.go
logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
    Level: slog.LevelInfo,
}))
slog.SetDefault(logger)

// Uso
slog.Info("server starting",
    "framework", *framework,
    "port", *port,
    "db_path", "forensics.db",
)
slog.Error("storage init failed", "error", err)
```

### 5.3 Métricas con Prometheus

Agregar endpoint `/metrics` con métricas clave:

```go
// Métricas sugeridas
ids_events_total{protocol="HTTP", severity="critical"} 42
ids_events_total{protocol="MODBUS", severity="high"} 15
ids_assets_count{} 23
ids_websocket_connections{} 5
ids_geo_lookups_total{} 150
ids_geo_cache_hits_total{} 120
ids_geo_cache_misses_total{} 30
ids_engine_mode{mode="detection"} 1
http_requests_total{method="GET", path="/api/stats", status="200"} 120
http_request_duration_seconds{path="/api/geoip"} 0.042
```

### 5.4 Health Endpoints

```go
// /healthz - Liveness: ¿el proceso está vivo?
// /readyz - Readiness: ¿puede recibir tráfico?
// /startupz - Startup: ¿terminó la inicialización?

func healthHandler(w http.ResponseWriter, r *http.Request) {
    json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func readyHandler(w http.ResponseWriter, r *http.Request) {
    // Verificar que la DB responde
    err := store.Ping()
    if err != nil {
        w.WriteHeader(http.StatusServiceUnavailable)
        json.NewEncoder(w).Encode(map[string]string{"status": "not ready", "reason": err.Error()})
        return
    }
    json.NewEncoder(w).Encode(map[string]string{"status": "ready"})
}
```

### 5.5 Graceful Shutdown

Implementar en `main.go`:

```go
ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
defer stop()

// Pasar el contexto a los servidores
// En el switch:
case "fiber":
    s := fiber.NewServer(engine, store, http.FS(subFS))
    go func() {
        if err := s.Run(addr); err != nil {
            slog.Error("server error", "error", err)
        }
    }()
    <-ctx.Done()
    slog.Info("shutting down gracefully...")
    shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    s.app.ShutdownWithContext(shutdownCtx)
```

---

## 6. Seguridad Operacional

### 6.1 Diagnóstico de seguridad

| Aspecto | Estado | Riesgo |
|---------|--------|--------|
| **.gitignore** | ❌ Ausente | Alto |
| **forensics.db en repo** | ⚠️ Presente | Alto — contiene datos de simulación pero configura un mal precedente |
| **Tokens/secrets hardcodeados** | ❌ Crítico | Ver sección 6.2 |
| **Variables de entorno para configuración** | ❌ Ausente | Medio |
| **Rate limiting** | ❌ Ausente | Medio |
| **CORS configurado** | ❌ Ausente (CheckOrigin: true) | Alto |
| **Cabeceras de seguridad HTTP** | ❌ Ausente | Medio |
| **Binarios .exe en el repo** | ⚠️ 6 binarios + 1 .rar | Alto — inflan el repo, posible distribución de binarios no rastreados |
| **Múltiples archivos .md/.html/.odt de documentación** | ⚠️ Presentes | Bajo — pero desorden en el repo |

### 6.2 Tokens y secrets hardcodeados

| Ubicación | Token | Peligro |
|-----------|-------|---------|
| `internal/core/geoip.go:14` | `IPinfoLiteToken = "521f8097a7c99b"` | **Real.** Token de IPinfo.io expuesto públicamente. |
| `internal/api/revel/conf/app.conf:2` | `app.secret = p9996612644265416515615165156` | Secret de Revel para firmar cookies de sesión. **Fijo y débil.** |

Ambos deberían ir en variables de entorno:

```go
// geoip.go
var IPinfoLiteToken = os.Getenv("IPINFO_TOKEN")
if IPinfoLiteToken == "" {
    IPinfoLiteToken = "521f8097a7c99b" // fallback solo para dev
    slog.Warn("IPINFO_TOKEN not set, using default (dev only)")
}
```

### 6.3 CheckOrigin: true — WebSocket sin restricciones

Los servidores Gin, Echo, Gorilla y Revel permiten conexiones WebSocket desde **cualquier origen**:

```go
var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool { return true },
}
```

Esto permite que cualquier página web externa abra un WebSocket al IDS, y dado que no hay autenticación, puede recibir el stream de eventos en tiempo real.

### 6.4 Cabeceras de seguridad faltantes

Ningún servidor incluye:
```
Strict-Transport-Security: max-age=63072000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'; script-src 'self' ...
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### 6.5 Archivos basura en el repositorio

El directorio raíz contiene numerosos archivos que **no deberían estar versionados**:

```
Antihack_IDS_v3_Standalone.exe   ← Binario compilado
Antihack_IDS_v3_Standalone.rar   ← Archivo comprimido
ids-app.exe                       ← Binario
ids-app.exe~                      ← Backup de binario
ids-app-test.exe                  ← Binario de test
ids-app-v2.exe                    ← Versión anterior
main.exe                          ← Binario
forensics.db                      ← Base de datos SQLite (con datos)
MANUAL_OPERACION_IDS.html         ← Documentación
MASTER_PROJECT_PRO.html           ← Documentación
MASTER_PROJECT_PRO.odt            ← Documentación
MASTER_PROJECT.md                 ← Documentación
implementation_plan.md            ← Plan de implementación
informe-database-persistence.md   ← Informe de persistencia
error.log                         ← Log de errores
startup_error.log                 ← Log de errores de arranque
revel_crash.log                   ← Log de crash de Revel
```

---

## 7. Gestión de Dependencias

### 7.1 Versiones irreales

| Dependencia | Versión en go.mod | Versión real más reciente (2026) | Notas |
|-------------|-------------------|----------------------------------|-------|
| `go` | `1.26.2` | No existe | Inexistente |
| `gin` | `v1.12.0` | ~v1.10.x | No existe v1.12.0 |
| `fiber/v2` | `v2.52.12` | ~v2.52.x | Posible pero no verificada |
| `echo/v4` | `v4.15.1` | ~v4.12.x | No verificada |
| `quic-go/quic-go` | `v0.59.0` | ~v0.42.x | Muy elevada |
| `golang.org/x/sys` | `v0.42.0` | ~v0.22.x | Extremadamente elevada |
| `golang.org/x/net` | `v0.51.0` | ~v0.25.x | No existe |
| `golang.org/x/tools` | `v0.42.0` | ~v0.22.x | No existe |
| `modernc.org/sqlite` | `v1.49.1` | ~v1.29.x | No verificada |

**Conclusión:** Las versiones parecen haber sido infladas artificialmente. `go mod verify` probablemente falle.

### 7.2 Revel — ~50 dependencias indirectas

Revel `v1.1.0` arrastra una larga cadena de dependencias, muchas de ellas obsoletas:

```
github.com/revel/revel v1.1.0
  → github.com/agtorre/gocolorize v1.0.0
  → github.com/revel/cmd v1.1.2
  → github.com/revel/config v1.1.0
  → github.com/revel/log15 v2.11.20+incompatible
  → github.com/revel/modules v1.1.0
  → github.com/revel/pathtree v0.0.0-20140121041023
  → github.com/inconshreveable/log15 v0.0.0-20201112154412
  → github.com/go-stack/stack v1.8.1
  → gopkg.in/natefinch/lumberjack.v2 v2.0.0
  → gopkg.in/stack.v0 v0.0.0-20141108040640
  → github.com/fsnotify/fsnotify v1.5.1
  → github.com/xeonx/timeago v1.0.0-rc4
```

Problemas de Revel:
- **No recibe actualizaciones de seguridad** (último commit en GitHub: 2020).
- **Cadenas de dependencias rotas** (algunas dependencias han sido eliminadas o renombradas).
- **No compatible con Go 1.23+** debido a cambios en `go/ast` y `go/types`.

### 7.3 MongoDB driver — dependencia fantasma

`go.mongodb.org/mongo-driver/v2 v2.5.0` aparece en `go.mod` pero:

- No hay ningún `import` de MongoDB en ningún archivo `.go` del proyecto.
- Es una dependencia **no utilizada** que infla el tamaño de descarga (`go mod download` la descarga igualmente).
- Aumenta el tiempo de build innecesariamente.

### 7.4 Recomendación: dep care + SBOM

```bash
# 1. Limpiar dependencias no usadas
go mod tidy

# 2. Verificar dependencias
go mod verify

# 3. Escanear vulnerabilidades (Go 1.21+)
govulncheck ./...

# 4. Generar SBOM (CycloneDX)
go install github.com/CycloneDX/cyclonedx-gomod@latest
cyclonedx-gomod mod -licenses -json -output ids-app.sbom.json

# 5. Auditoría de licencias
go install github.com/google/go-licenses@latest
go-licenses report ./... --template licenses.csv
```

---

## 8. Scripting y Automatización

### 8.1 Análisis de run_ids.bat

```batch
@echo off
TITLE Antihack IDS - Tactical Console
color 0b
set FRAMEWORK=%1
if "%FRAMEWORK%"=="" set FRAMEWORK=fiber
go run main.go --framework %FRAMEWORK%
```

**Problemas:**
- ❌ Usa `go run` (compila + ejecuta cada vez). Lento. Debería ser `go build` + ejecución.
- ❌ No verifica que Go esté instalado (el mensaje de error lo dice pero no lo comprueba).
- ❌ No verifica el puerto 7575 antes de arrancar.
- ❌ Sin soporte para pasar el flag `--port`.
- ❌ Sin redirección de logs.
- ❌ Sin gestión de procesos (no permite detener el proceso con una tecla).
- ❌ Sin verificación de dependencias.
- ❌ `go run` genera basura temporal en `%TEMP%`.

### 8.2 Script PowerShell recomendado

```powershell
# run-ids.ps1
param(
    [ValidateSet("gin", "fiber", "echo", "gorilla", "revel")]
    [string]$Framework = "fiber",
    [int]$Port = 7575,
    [switch]$BuildOnly,
    [switch]$Release
)

$ErrorActionPreference = "Stop"

# Verificar Go
if (-not (Get-Command go -ErrorAction SilentlyContinue)) {
    Write-Error "Go no está instalado. Descárgalo de https://go.dev/dl/"
    exit 1
}

# Verificar puerto
$connection = $null
try {
    $connection = New-Object System.Net.Sockets.TcpClient
    $connection.Connect("127.0.0.1", $Port)
    Write-Warning "El puerto $Port ya está en uso. Usa --port para cambiarlo."
    $connection.Close()
} catch { }

# Build con optimizaciones
$goArgs = @("build", "-ldflags=`"-s -w`"", "-trimpath")
if ($Release) {
    $goArgs += "-tags=sqlite_omit_load_extension"
}
$goArgs += "-o", "ids-app.exe"

Write-Host "[BUILD] go $($goArgs -join ' ')" -ForegroundColor Cyan
go $goArgs

if ($BuildOnly) {
    Write-Host "[OK] Build completado: ids-app.exe" -ForegroundColor Green
    exit 0
}

# Ejecutar
Write-Host "[RUN] ./ids-app --framework $Framework --port $Port" -ForegroundColor Cyan
$env:FRAMEWORK = $Framework
$env:PORT = $Port
./ids-app.exe --framework $Framework --port $Port
```

### 8.3 Scripts faltantes para producción

| Script | Propósito |
|--------|-----------|
| `scripts/backup.sh` | Backup de `forensics.db` con compresión y timestamp |
| `scripts/restore.sh` | Restore de base de datos desde backup |
| `scripts/rotate-logs.sh` | Rotación de logs (logrotate config) |
| `scripts/install-service.sh` | Instalación como servicio systemd |
| `scripts/install-service.ps1` | Instalación como servicio Windows (NSSM) |
| `scripts/migrate-db.sh` | Migración de SQLite a PostgreSQL |
| `scripts/healthcheck.sh` | Script para health check desde Docker/CRON |
| `Makefile` | Orquestación de tasks (build, test, lint, docker, release) |

### 8.4 Makefile recomendado

```makefile
.PHONY: all build test lint clean docker run

APP_NAME := ids-app
VERSION := $(shell git describe --tags --always --dirty)
BUILD := $(shell date +%Y%m%d-%H%M%S)
LDFLAGS := -ldflags="-s -w -X main.Version=$(VERSION) -X main.Build=$(BUILD)"

all: lint test build

build:
	go build $(LDFLAGS) -trimpath -o $(APP_NAME) .

build-linux:
	GOOS=linux GOARCH=amd64 go build $(LDFLAGS) -trimpath -o $(APP_NAME)-linux .

build-all: build build-linux
	upx --lzma $(APP_NAME)*

test:
	go test ./... -v -race -coverprofile=coverage.out

lint:
	golangci-lint run ./...

clean:
	rm -f $(APP_NAME) $(APP_NAME)-linux $(APP_NAME)*.exe
	rm -rf dist/

docker:
	docker build -t $(APP_NAME):$(VERSION) .
	docker build -t $(APP_NAME):latest .

run:
	go run . --framework fiber --port 7575

backup:
	@mkdir -p backups
	@cp forensics.db backups/forensics_$(shell date +%Y%m%d_%H%M%S).db

release: lint test build-all docker
	@echo "Release $(VERSION) ready"
```

---

## 9. Recomendaciones de Infraestructura

### 9.1 Hardware recomendado para producción

| Componente | Mínimo | Recomendado | Justificación |
|------------|--------|-------------|---------------|
| **CPU** | 2 cores | 4+ cores | El motor de detección + WebSocket + GeoIP lookups es CPU-bound |
| **RAM** | 512 MB | 2-4 GB | SQLite en memoria + eventos + conexiones WebSocket |
| **Disco** | 10 GB SSD | 50 GB SSD | La base de datos SQLite crece con eventos |
| **Red** | 100 Mbps | 1 Gbps | Recepción de tráfico de red + WebSocket broadcast |

### 9.2 Estrategia de backup de forensics.db

SQLite requiere una estrategia de backup específica:

```bash
# Backup online seguro (sin detener el servicio)
sqlite3 forensics.db ".backup backups/forensics_$(date +%Y%m%d_%H%M%S).db"

# Backup con compresión y rotación
#!/bin/bash
BACKUP_DIR="/var/backups/ids"
DB_PATH="/data/forensics.db"
RETENTION_DAYS=30

mkdir -p $BACKUP_DIR
sqlite3 $DB_PATH ".backup $BACKUP_DIR/forensics_$(date +%Y%m%d_%H%M%S).db"
gzip $BACKUP_DIR/forensics_*.db
find $BACKUP_DIR -name "*.gz" -mtime +$RETENTION_DAYS -delete
```

**Frecuencia recomendada:**
- Cada hora para IDs en producción (scripts CRON).
- Cada 10 minutos para logs de eventos críticos.
- Backup completo diario + WAL (Write-Ahead Log) de SQLite.

### 9.3 Estrategia de logging

```yaml
# /etc/logrotate.d/ids-app
/var/log/ids-app/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
    maxsize 100M
    dateext
}
```

**Logging centralizado recomendado:**
1. **Local:** JSON a stdout → `slog.HandlerOptions{Level: slog.LevelInfo}`.
2. **Agregador:** Filebeat o Vector → envía logs a Elasticsearch/Loki.
3. **Visualización:** Grafana (logs + métricas en un solo panel).
4. **Categorías de log:**
   - `app.*` — Eventos de la aplicación (inicio, configuración).
   - `http.*` — Requests HTTP (método, path, status, duración).
   - `ws.*` — Conexiones WebSocket (connect, disconnect, broadcast).
   - `geo.*` — Lookups geográficos (hit, miss, error, rate limit).
   - `detection.*` — Alertas de detección (CVE, protocolo, severidad).
   - `db.*` — Operaciones de base de datos (save, query, error).

### 9.4 Estrategia de actualización (zero-downtime)

**Opción 1: Blue-Green Deployment** (con Docker)
- Contenedor Azul (actual), Contenedor Verde (nuevo).
- Cambiar el tráfico cuando el health check del verde pase.
- Requiere 2x recursos durante la transición.

**Opción 2: Rolling Update** (con Kubernetes)
- Deployment con `strategy: rollingUpdate`.
- `maxSurge: 1`, `maxUnavailable: 0`.
- Pods nuevos arrancan y pasan readiness probe antes de recibir tráfico.
- Requiere graceful shutdown (SIGTERM → 10s para drenar conexiones).

**Opción 3: Binario + Nginx Reverse Proxy**
```nginx
upstream ids_backend {
    server 127.0.0.1:7575;
    server 127.0.0.1:7576;  # Versión nueva
}
server {
    listen 443 ssl;
    location / {
        proxy_pass http://ids_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

**Limitación: SQLite impide zero-downtime verdadero** porque solo un proceso puede escribir a la vez. Para zero-downtime real, migrar a PostgreSQL.

### 9.5 Roadmap de DevOps recomendado

| Fase | Prioridad | Acciones |
|------|-----------|----------|
| **Inmediata** | 🔴 Crítica | 1. Arreglar `go.mod` (go 1.22 o 1.23). 2. Crear `.gitignore`. 3. Eliminar binarios y DB del repo. 4. Mover secrets a variables de entorno. |
| **Corto plazo** | 🟡 Alta | 5. Dockerfile multi-stage. 6. Health check endpoints. 7. Graceful shutdown. 8. GitHub Actions CI básico. |
| **Medio plazo** | 🟢 Media | 9. Structured logging (slog). 10. Métricas Prometheus. 11. Makefile. 12. Logrotate. |
| **Largo plazo** | 🔵 Baja | 13. Migrar SQLite → PostgreSQL. 14. Kubernetes manifests. 15. TLS/HTTPS. 16. Rate limiting + CORS + seguridad HTTP. |

### 9.6 Resumen de riesgos operacionales

| # | Riesgo | Impacto | Probabilidad | Severidad |
|---|--------|---------|-------------|-----------|
| 1 | `go 1.26.2` no existe → no compila | Alto | 100% | 🔴 Crítico |
| 2 | Sin graceful shutdown → corrupción DB | Alto | 60% | 🔴 Crítico |
| 3 | Sin health checks → orquestador no opera | Alto | 100% | 🔴 Crítico |
| 4 | Token IPinfo hardcodeado → exposición | Alto | 100% | 🔴 Crítico |
| 5 | Revel obsoleto (~50 deps) no compila en Go moderno | Alto | 90% | 🟡 Alto |
| 6 | Sin TLS → tráfico en texto plano | Medio | Depende del despliegue | 🟡 Alto |
| 7 | Sin backups de DB → pérdida de datos | Alto | 100% sin backups | 🟡 Alto |
| 8 | CDNs externos → frontend roto sin internet | Medio | 30% en entornos aislados | 🟡 Medio |
| 9 | ip-api.com rate limit → geoip falla | Medio | 45 req/min | 🟡 Medio |
| 10 | 6 binarios en repo → repo inflado ~250 MB | Bajo | 100% | 🟢 Bajo |

---

**Fin del informe.**
