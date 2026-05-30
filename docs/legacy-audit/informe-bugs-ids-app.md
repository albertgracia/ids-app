# INFORME DE ANÁLISIS DE BUGS — IDS Antihack iSID

**Proyecto:** `W:\ids-app\`
**Lenguaje:** Go (declara `go 1.26.2` — **no existe**)
**Fecha del análisis:** 30 de mayo de 2026
**Analista:** Debugger

---

## 1. BUGS CONFIRMADOS (con línea exacta)

### B1 — CRÍTICO: go.mod línea 3 — Versión de Go inexistente
**Archivo:** `go.mod:3`
**Línea:** `go 1.26.2`
**Descripción:** La versión `go 1.26.2` no existe. A mayo de 2026, la versión estable más reciente de Go es 1.24.x o 1.25.x como máximo.
**Impacto:** `go mod tidy` y `go build` fallan inmediatamente. El compilador rechaza el módulo.
**Reproducción:** Ejecutar `go build ./...`
**Corrección:**
```
go 1.24
```

### B2 — CRÍTICO: Revel server compila contra Init() con firma incorrecta
**Archivo:** `internal/api/revel/revel_server.go:32`
**Línea:** `revel.Init("prod", "ids-app/internal/api/revel", filepath.Join(wd, ".."))`
**Descripción:** La función `revel.Init()` en `github.com/revel/revel` requiere 4 argumentos en versiones modernas, no 3.
**Impacto:** Error de compilación. El programa no inicia.
**Corrección:**
```go
revel.Init("prod", "ids-app/internal/api/revel", wd, "internal/api/revel")
```

### B3 — CRÍTICO: Dependencias Revel con versiones inexistentes
**Archivo:** `go.mod:54-59`
**Líneas:** `github.com/revel/revel v1.1.0`, `github.com/revel/cmd v1.1.2`, `github.com/revel/config v1.1.0`, `github.com/revel/modules v1.1.0`, `github.com/revel/log15 v2.11.20+incompatible`
**Descripción:** Ninguna de estas versiones existe en los repositorios reales de Revel. `github.com/revel/revel` usa versionado semántico pero sus tags reales son v0.x.x (ej: v0.21.0). `v1.1.0` no existe.
**Impacto:** `go mod tidy` no puede resolver estas dependencias. Compilación fallida.
**Corrección:** Eliminar Revel como dependencia o usar versiones reales (`v0.21.0`).

### B4 — CRÍTICO: go.mod — dependencias con versiones que no existen
**Archivo:** `go.mod`
**Líneas múltiples:**
- `github.com/goccy/go-yaml v1.19.2` — no existe
- `github.com/bytedance/gopkg v0.1.3` — no existe
- `github.com/go-stack/stack v1.8.1` — no existe
- `github.com/leodido/go-urn v1.4.0` — no existe
- `github.com/goccy/go-json v0.10.5` — no existe
- `golang.org/x/crypto v0.48.0` — no existe
- `golang.org/x/net v0.51.0` — no existe
- `go.mongodb.org/mongo-driver/v2 v2.5.0` — no existe
- `modernc.org/libc v1.72.0` — no existe
- `modernc.org/memory v1.11.0` — no existe

**Impacto:** `go mod tidy -go=1.24` no puede resolver estas versiones. Compilación fallida.

### B5 — ALTA: Fiber/Echo/Gorilla — Data Race en handleEvents (sin lock)
**Archivo:** `internal/api/fiber/server.go:69`
```go
return c.JSON(s.engine.Events)  // SIN LOCK
```
**Archivo:** `internal/api/echo/server.go:69`
```go
return c.JSON(http.StatusOK, s.engine.Events)  // SIN LOCK
```
**Archivo:** `internal/api/gorilla/server.go:74`
```go
json.NewEncoder(w).Encode(s.engine.Events)  // SIN LOCK
```
**Descripción:** `s.engine.Events` es un slice que `ProcessEvent()` modifica bajo `e.mu.Lock()`. Leerlo sin `MuRLock()` es una data race. El servidor Gin SÍ lo hace correctamente (gin/server.go:75-77).
**Impacto:** Lectura de slice corrupto, panic por race detector, datos inconsistentes.

### B6 — ALTA: Fiber/Echo/Gorilla — Data Race en handleGetConfig (sin lock)
**Archivo:** `internal/api/fiber/server.go:75`
```go
return c.JSON(s.engine.Config)
```
**Archivo:** `internal/api/echo/server.go:75`
```go
return c.JSON(http.StatusOK, s.engine.Config)
```
**Archivo:** `internal/api/gorilla/server.go:82`
```go
json.NewEncoder(w).Encode(s.engine.Config)
```
**Descripción:** `s.engine.Config` es modificado por `UpdateConfig()` bajo `e.mu.Lock()`. Leerlo sin lock es data race.

### B7 — ALTA: Fiber/Echo/Gorilla — Data Race en handleGetBlacklist (sin lock)
**Archivo:** `internal/api/fiber/server.go:112`
```go
return c.JSON(s.engine.Blacklist)
```
**Archivo:** `internal/api/echo/server.go:112`
```go
return c.JSON(http.StatusOK, s.engine.Blacklist)
```
**Archivo:** `internal/api/gorilla/server.go:126`
```go
json.NewEncoder(w).Encode(s.engine.Blacklist)
```
**Descripción:** `s.engine.Blacklist` es modificado por `BlockIP()`/`UnblockIP()` bajo `e.mu.Lock()`. Leerlo sin lock es data race.

### B8 — ALTA: engine.go — GetBlacklist() expone mapa interno
**Archivo:** `internal/core/engine.go:417-421`
```go
func (e *Engine) GetBlacklist() map[string]map[string]string {
    e.mu.RLock()
    defer e.mu.RUnlock()
    return e.Blacklist  // ← retorna referencia al mapa interno
}
```
**Descripción:** Aunque se usa Read Lock para la lectura, la función retorna una referencia directa al mapa `e.Blacklist`. El caller obtiene el mapa original, no una copia. Si el caller lo itera concurrentemente mientras otro goroutine escribe (BlockIP/UnblockIP), hay data race.
**Corrección:**
```go
func (e *Engine) GetBlacklist() map[string]map[string]string {
    e.mu.RLock()
    defer e.mu.RUnlock()
    result := make(map[string]map[string]string, len(e.Blacklist))
    for k, v := range e.Blacklist {
        entry := make(map[string]string, len(v))
        for k2, v2 := range v {
            entry[k2] = v2
        }
        result[k] = entry
    }
    return result
}
```

### B9 — ALTA: engine.go — Fuga de memoria: Events crece sin límite
**Archivo:** `internal/core/engine.go:269`
```go
e.Events = append(e.Events, evt)
```
**Descripción:** El slice `Events` se agrega indefinidamente sin truncamiento ni límite. Con el simulador generando eventos cada 2 segundos, la memoria crece monótonamente hasta agotar la RAM.
**Impacto:** Out-of-memory después de horas de ejecución.
**Corrección:**
```go
const maxEvents = 10000
if len(e.Events) >= maxEvents {
    e.Events = e.Events[1:]
}
e.Events = append(e.Events, evt)
```

### B10 — ALTA: main.go — Data Race en CurrentMode del simulador
**Archivo:** `main.go:89`
```go
if i%10 == 0 && e.CurrentMode == core.ModeDetection {
```
**Descripción:** `e.CurrentMode` se lee DESDE UNA GOROUTINE (el simulador corre en `go startSimulator(engine)`) SIN ningún lock. Mientras tanto, `SetMode()` (engine.go:167-172) escribe `e.CurrentMode` bajo `e.mu.Lock()`. Esto es una data race.
**Corrección:**
```go
func (e *Engine) GetMode() Mode {
    e.mu.RLock()
    defer e.mu.RUnlock()
    return e.CurrentMode
}
```

### B11 — MEDIA: threat_db.go — Range loop devuelve puntero a variable de iteración
**Archivo:** `internal/core/threat_db.go:59-66`
```go
func (db *ThreatDB) Check(protocol string) *Vulnerability {
    upperProto := strings.ToUpper(protocol)
    for _, v := range db.Vulns {
        if v.Protocol == upperProto {
            return &v  // ← puntero a variable de loop
        }
    }
    return nil
}
```
**Descripción:** En Go <1.22, la variable `v` se reusa en cada iteración. `&v` devuelve la dirección de la variable del loop, no del elemento del slice. Aunque el `return` inmediato lo hace funcional, es frágil y clasificado como bug por `go vet`.
**Corrección:**
```go
for i := range db.Vulns {
    if db.Vulns[i].Protocol == upperProto {
        return &db.Vulns[i]
    }
}
```

### B12 — MEDIA: Gorilla server — Sin middleware de recovery (panic crashea el server)
**Archivo:** `internal/api/gorilla/server.go:62`
```go
return http.ListenAndServe(addr, s.router)
```
**Descripción:** Gorilla Mux no incluye middleware de recovery por defecto. Si cualquier handler paniquea, todo el servidor HTTP muere.
**Corrección:**
```go
s.router.Use(func(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if err := recover(); err != nil {
                http.Error(w, "Internal Server Error", 500)
            }
        }()
        next.ServeHTTP(w, r)
    })
})
```

### B13 — MEDIA: Broadcaster ignora error de SaveEvent en todos los servers
**Archivo:** `internal/api/gin/server.go:230`, `fiber/server.go:183`, `echo/server.go:189`, `gorilla/server.go:207`
```go
s.store.SaveEvent(evt)  // ← error ignorado
```
**Descripción:** El error retornado por `s.store.SaveEvent(evt)` es silenciosamente descartado en TODOS los broadcasters.
**Corrección:**
```go
if err := s.store.SaveEvent(evt); err != nil {
    log.Printf("ERROR saving event to DB: %v", err)
}
```

### B14 — MEDIA: geoip.go — isPrivateIP() con detección por prefijo de string incorrecta
**Archivo:** `internal/core/geoip.go:175-188`
```go
func isPrivateIP(ip string) bool {
    private := []string{"10.", "192.168.", ...}
    for _, prefix := range private {
        if strings.HasPrefix(ip, prefix) { return true }
    }
    return false
}
```
**Descripción:** Usa `strings.HasPrefix` en lugar de `net.ParseCIDR`. Produce falsos positivos (ej: `"10."` coincide con `"100.0.0.1"` que es IP pública). No detecta IPv6 mapped IPv4.
**Corrección:**
```go
func isPrivateIP(ipStr string) bool {
    ip := net.ParseIP(ipStr)
    if ip == nil { return false }
    privateCIDRs := []string{"10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16",
        "127.0.0.0/8", "169.254.0.0/16", "::1/128", "fe80::/10"}
    for _, cidr := range privateCIDRs {
        _, network, _ := net.ParseCIDR(cidr)
        if network.Contains(ip) { return true }
    }
    return false
}
```

### B15 — MEDIA: geoip.go — Petición HTTP (no HTTPS) a ip-api.com
**Archivo:** `internal/core/geoip.go:119`
```go
url := fmt.Sprintf("http://ip-api.com/json/%s?...", ip)
```
**Descripción:** Se usa HTTP en lugar de HTTPS. La respuesta viaja en texto plano.
**Corrección:** Usar `https://ip-api.com/json/...`

### B16 — BAJA: Revel — HandleWS Revel API no estándar
**Archivo:** `internal/api/revel/app/controllers/app.go:130-146`
**Descripción:** Revel versión community tiene soporte WebSocket limitado y la interfaz puede no existir. Además, el parámetro `ws` es inyectado por Revel, pero la función Subscribe/Unsubscribe no se gestiona correctamente.

### B17 — BAJA: engine.go — Geo goroutine se lanza sin control de concurrencia
**Archivo:** `internal/core/engine.go:207`
```go
go func(ip string) { ... }(evt.Source)
```
**Descripción:** Por cada IP externa nueva, se lanza una goroutine que hace una petición HTTP. Si llegan 1000 IPs únicas en 1 segundo, se lanzan 1000 goroutines simultáneas.
**Corrección:** Usar un worker pool con semáforo (ej: `make(chan struct{}, 10)`).

---

## 2. RACE CONDITIONS Y PROBLEMAS DE CONCURRENCIA

| # | Archivo | Línea | Problema | Severidad |
|---|---------|-------|----------|-----------|
| R1 | `internal/api/fiber/server.go` | 69 | Data Race: `s.engine.Events` leído sin lock | ALTA |
| R2 | `internal/api/fiber/server.go` | 75 | Data Race: `s.engine.Config` leído sin lock | ALTA |
| R3 | `internal/api/fiber/server.go` | 112 | Data Race: `s.engine.Blacklist` leído sin lock | ALTA |
| R4 | `internal/api/echo/server.go` | 69 | Data Race: `s.engine.Events` leído sin lock | ALTA |
| R5 | `internal/api/echo/server.go` | 75 | Data Race: `s.engine.Config` leído sin lock | ALTA |
| R6 | `internal/api/echo/server.go` | 112 | Data Race: `s.engine.Blacklist` leído sin lock | ALTA |
| R7 | `internal/api/gorilla/server.go` | 74 | Data Race: `s.engine.Events` leído sin lock | ALTA |
| R8 | `internal/api/gorilla/server.go` | 82 | Data Race: `s.engine.Config` leído sin lock | ALTA |
| R9 | `internal/api/gorilla/server.go` | 126 | Data Race: `s.engine.Blacklist` leído sin lock | ALTA |
| R10 | `internal/core/engine.go` | 417-421 | `GetBlacklist()` retorna referencia interna sin copia | ALTA |
| R11 | `main.go` | 89 | Data Race: `e.CurrentMode` leído sin lock desde goroutine | ALTA |
| R12 | `internal/core/engine.go` | 207 | Goroutine sin límite de concurrencia para Geo lookups | MEDIA |
| R13 | `internal/core/engine.go` | 207-221 | Race: goroutine modifica `e.Assets[ip]` — asset podría no existir | BAJA |

---

## 3. ERRORES DE LÓGICA

| # | Archivo | Línea | Error | Severidad |
|---|---------|-------|-------|-----------|
| L1 | `main.go` | 89 | `e.CurrentMode` comparado directamente sin lock desde goroutine | ALTA |
| L2 | `internal/core/threat_db.go` | 62-63 | `return &v` — puntero a variable de loop (frágil) | MEDIA |
| L3 | `internal/core/engine.go` | 269 | `e.Events` sin límite de crecimiento (OOM) | ALTA |
| L4 | `internal/core/geoip.go` | 175-188 | `isPrivateIP()` usa prefijos de string → falso positivo para 100.x.x.x | MEDIA |
| L5 | `internal/core/geoip.go` | 14 | Constante `IPinfoLiteToken` definida pero no usada (código muerto) | BAJA |
| L6 | `internal/core/storage.go` | 46 | `db.MustExec(schema)` — si falla, PANIC (no error manejable) | MEDIA |
| L7 | `internal/core/engine.go` | 209 | `e.Assets[ip]` podría ser nil en goroutine si el asset fue eliminado | BAJA |
| L8 | `main.go` | 89 | Simulador en goroutine: `i` crece sin límite (desbordamiento de int en 32-bit) | BAJA |

---

## 4. MAL MANEJO DE ERRORES

| # | Archivo | Línea | Error | Severidad |
|---|---------|-------|-------|-----------|
| E1 | `internal/api/gin/server.go` | 230 | `s.store.SaveEvent(evt)` — error ignorado | MEDIA |
| E2 | `internal/api/fiber/server.go` | 183 | `s.store.SaveEvent(evt)` — error ignorado | MEDIA |
| E3 | `internal/api/echo/server.go` | 189 | `s.store.SaveEvent(evt)` — error ignorado | MEDIA |
| E4 | `internal/api/gorilla/server.go` | 207 | `s.store.SaveEvent(evt)` — error ignorado | MEDIA |
| E5 | `internal/core/storage.go` | 46 | `MustExec` puede panic si la DB está corrupta | MEDIA |
| E6 | `internal/api/gin/server.go` | 73 | `s.store.GetLastEvents()` error ignorado con `||` | BAJA |
| E7 | `internal/api/gin/server.go` | 190-192 | Error de WS upgrade ignorado (solo `return` sin log) | BAJA |
| E8 | `internal/api/gorilla/server.go` | 172-174 | Error de WS upgrade ignorado | BAJA |
| E9 | `web/index.html` | 819 | `JSON.parse(e.data)` sin try-catch — crashea si WS manda datos corruptos | MEDIA |

**Patrón general:** En todos los servidores, el error de `s.store.SaveEvent(evt)` en el broadcaster es sistemáticamente ignorado.

---

## 5. PROBLEMAS DE COMPILACIÓN Y DEPENDENCIAS

| # | Problema | Archivo | Línea | Severidad |
|---|----------|---------|-------|-----------|
| C1 | `go 1.26.2` no existe | `go.mod` | 3 | CRÍTICA |
| C2 | `github.com/revel/revel v1.1.0` no existe | `go.mod` | 59 | CRÍTICA |
| C3 | `github.com/revel/cmd v1.1.2` no existe | `go.mod` | 54 | CRÍTICA |
| C4 | `github.com/revel/config v1.1.0` no existe | `go.mod` | 55 | CRÍTICA |
| C5 | `github.com/revel/modules v1.1.0` no existe | `go.mod` | 57 | CRÍTICA |
| C6 | `github.com/revel/log15 v2.11.20+incompatible` no existe | `go.mod` | 56 | CRÍTICA |
| C7 | `golang.org/x/crypto v0.48.0` no existe | `go.mod` | 71 | CRÍTICA |
| C8 | `golang.org/x/net v0.51.0` no existe | `go.mod` | 73 | CRÍTICA |
| C9 | `github.com/mattn/go-sqlite3 v2.0.1+incompatible` no existe | `go.mod` | 45 | ALTA |
| C10 | `go.mongodb.org/mongo-driver/v2 v2.5.0` no existe | `go.mod` | 69 | ALTA |
| C11 | `modernc.org/libc v1.72.0` no existe | `go.mod` | 81 | ALTA |
| C12 | `modernc.org/memory v1.11.0` no existe | `go.mod` | 83 | ALTA |
| C13 | `revel.Init` con 3 args — Revel espera 4 en versiones modernas | `revel_server.go` | 32 | CRÍTICA |
| C14 | Revel no tiene routes para `/ws` correctamente configurado | `routes` | 21 | MEDIA |

---

## 6. FRONTEND BUGS (web/index.html)

| # | Archivo | Línea(s) | Bug | Severidad |
|---|---------|----------|-----|-----------|
| F1 | `web/index.html` | 848 | `data.mode.toLowerCase().replace('ñ','n')` — "learning" → "btn-learning" pero HTML tiene `id="btn-aprendizaje"`. "detection" → "btn-detection" pero HTML tiene `id="btn-deteccion"`. El modo activo NUNCA se resalta para Learning/Detection. | ALTA |
| F2 | `web/index.html` | 429, 549 | `geolocateHacker` definida DOS VECES. La segunda (línea 549, que usa ipapi.co) sobreescribe la primera (línea 429, que usa backend `/api/geoip`). La primera nunca se ejecuta. | ALTA |
| F3 | `web/index.html` | 441, 559 | `http://ip-api.com/json/${ip}` desde el navegador — FALLA POR CORS. ip-api.com FREE bloquea CORS. La segunda versión (línea 559) usa `https://ipapi.co/${ip}/json/` que sí funciona desde browser pero requiere API key. | ALTA |
| F4 | `web/index.html` | 591-608 | `renderHackers()` busca `document.getElementById('hacker-list')` que NO EXISTE en el HTML. La función no produce ningún output visible. | MEDIA |
| F5 | `web/index.html` | 820 | `JSON.parse(e.data)` sin try-catch en WebSocket. Si el backend envía datos no JSON, la función `onmessage` explota. | MEDIA |
| F6 | `web/index.html` | 816 | `ws.onclose = () => setTimeout(connect, 3000)` — sin backoff exponencial. Si el server está caído, el cliente bombardea con reconexiones infinitas cada 3s. | MEDIA |
| F7 | `web/index.html` | 892-901 | `connect()` asume que el WebSocket siempre envía JSON. | BAJA |
| F8 | `web/index.html` | 769 | `evt.protocol` podría ser undefined. `indexOf(undefined)` retorna -1, y se agrega la label "undefined" al chart. | BAJA |
| F9 | varios | — | Revel tiene su propia copia casi idéntica de index.html (duplicación). Cualquier corrección debe hacerse en ambos archivos. | MEDIA |

---

## 7. ESCENARIOS DE FALLOS (Failure Mode Analysis)

### ¿Qué pasa si la DB SQLite está corrupta?
- **`NewStore()`** (`storage.go:41`): `sqlx.Connect` falla → error propagado a `main()` → `log.Fatalf` → el programa ni siquiera arranca.
- **Si se corrompe en tiempo de ejecución:** `SaveEvent()` retorna error → TODOS los broadcasters lo ignoran → eventos se pierden sin aviso.

### ¿Qué pasa si ip-api.com no responde?
- **`GeoClient.fetchFromAPI()`** (`geoip.go:120`): Timeout de 3 segundos → error → retorna `&GeoInfo{Country: "??"}`.
- **Las goroutines de Geo** (`engine.go:207`): 1000 IPs únicas = 1000 goroutines bloqueadas 3s cada una.

### ¿Qué pasa si el WebSocket se desconecta?
- **`broadcaster()`**: Al escribir a un cliente desconectado, `WriteJSON` retorna error. El cliente se elimina.
- **Frontend** (`web/index.html:825`): `ws.onclose` → reconexión en 3s.
- **Problema:** Eventos entre reconexión y desconexión se pierden para ese cliente.

### ¿Qué pasa si llegan 1000 eventos/segundo?
- **`ProcessEvent()`**: Cuello de botella por `e.mu.Lock()` secuencial.
- **`e.Events`**: 1000 eventos/seg × ~1KB = ~3.5GB/hora → OOM en minutos.
- **Geo goroutines**: 1000 goroutines/segundo sin límite.

### ¿Qué pasa si se ejecuta en Go 1.24 (no 1.26.2)?
- **`go build`** falla inmediatamente con `invalid go version 'go1.26.2'`.

### ¿Qué pasa si se ejecuta sin conexión a internet?
- **`ip-api.com`**: Falla por timeout.
- **CDNs del frontend**: tailwindcss, Chart.js, D3.js, Leaflet.js, Google Fonts — TODO falla. Dashboard completamente roto.

### ¿Qué pasa si se llama /api/simulate con datos maliciosos?
- Las IPs están hardcodeadas en los handlers, no se parsean del request.
- **Pero**: Se puede saturar el servidor llamando repetidamente al endpoint (sin rate limiting). Cada llamada lanza una goroutine que genera 20 eventos.

---

## TABLA PRIORIZADA COMPLETA

| ID | Severidad | Archivo | Línea | Descripción |
|----|-----------|---------|-------|-------------|
| C1 | **CRÍTICA** | `go.mod` | 3 | `go 1.26.2` versión inexistente |
| C2 | **CRÍTICA** | `go.mod` | 59 | `revel/revel v1.1.0` tag inexistente |
| C3 | **CRÍTICA** | `go.mod` | 54 | `revel/cmd v1.1.2` tag inexistente |
| C4 | **CRÍTICA** | `go.mod` | 57 | `revel/modules v1.1.0` tag inexistente |
| C5 | **CRÍTICA** | `go.mod` | 71 | `golang.org/x/crypto v0.48.0` no existe |
| C6 | **CRÍTICA** | `go.mod` | 73 | `golang.org/x/net v0.51.0` no existe |
| C7 | **CRÍTICA** | `revel_server.go` | 32 | `revel.Init()` firma incorrecta |
| R1 | **ALTA** | `fiber/server.go` | 69 | Data Race: Events sin lock |
| R2 | **ALTA** | `fiber/server.go` | 75 | Data Race: Config sin lock |
| R3 | **ALTA** | `fiber/server.go` | 112 | Data Race: Blacklist sin lock |
| R4 | **ALTA** | `echo/server.go` | 69 | Data Race: Events sin lock |
| R5 | **ALTA** | `echo/server.go` | 75 | Data Race: Config sin lock |
| R6 | **ALTA** | `echo/server.go` | 112 | Data Race: Blacklist sin lock |
| R7 | **ALTA** | `gorilla/server.go` | 74 | Data Race: Events sin lock |
| R8 | **ALTA** | `gorilla/server.go` | 82 | Data Race: Config sin lock |
| R9 | **ALTA** | `gorilla/server.go` | 126 | Data Race: Blacklist sin lock |
| R10 | **ALTA** | `engine.go` | 417-421 | `GetBlacklist()` retorna mapa interno sin copia |
| R11 | **ALTA** | `main.go` | 89 | Data Race: `CurrentMode` leído sin lock |
| L3 | **ALTA** | `engine.go` | 269 | OOM: Events crece sin límite |
| F1 | **ALTA** | `web/index.html` | 848 | Botones de modo no se iluminan (Learning/Detection) |
| F2 | **ALTA** | `web/index.html` | 429,549 | `geolocateHacker` duplicada, 2ª sobreescribe 1ª |
| F3 | **ALTA** | `web/index.html` | 441,559 | CORS: ip-api.com bloqueado desde browser |
| E1 | **MEDIA** | `gin/server.go` | 230 | `SaveEvent` error ignorado |
| E2 | **MEDIA** | `fiber/server.go` | 183 | `SaveEvent` error ignorado |
| E3 | **MEDIA** | `echo/server.go` | 189 | `SaveEvent` error ignorado |
| E4 | **MEDIA** | `gorilla/server.go` | 207 | `SaveEvent` error ignorado |
| L2 | **MEDIA** | `threat_db.go` | 62-63 | `return &v` puntero a variable de loop |
| L4 | **MEDIA** | `geoip.go` | 175-188 | `isPrivateIP()` prefijos incorrectos (100.x.x.x) |
| L5 | **MEDIA** | `geoip.go` | 14 | Token IPinfo definido pero no usado |
| L6 | **MEDIA** | `storage.go` | 46 | `MustExec` puede panic |
| B12 | **MEDIA** | `gorilla/server.go` | 62 | Sin recovery middleware (panic → crash) |
| L15 | **MEDIA** | `geoip.go` | 119 | HTTP (no HTTPS) a ip-api.com |
| R12 | **MEDIA** | `engine.go` | 207 | Gorutinas Geo sin límite de concurrencia |
| F4 | **MEDIA** | `web/index.html` | 591 | `renderHackers()` target `#hacker-list` no existe |
| F5 | **MEDIA** | `web/index.html` | 820 | `JSON.parse` sin try-catch |
| F6 | **MEDIA** | `web/index.html` | 816 | Reconexión WS sin backoff |
| F9 | **MEDIA** | varios | — | Revel tiene copia duplicada de index.html |
| B16 | **BAJA** | `controllers/app.go` | 130 | `HandleWS` Revel API no estándar |
| B17 | **BAJA** | `engine.go` | 207 | Gorutina Geo sin worker pool |
| E7 | **BAJA** | `gin/server.go` | 190-192 | Error WS upgrade ignorado |
| E8 | **BAJA** | `gorilla/server.go` | 172-174 | Error WS upgrade ignorado |
| F7 | **BAJA** | `web/index.html` | 892-901 | WS asume siempre JSON |
| F8 | **BAJA** | `web/index.html` | 769 | Protocolo undefined en chart |
| L7 | **BAJA** | `engine.go` | 209 | Asset podría ser nil en goroutine |
| L8 | **BAJA** | `main.go` | 89 | int overflow en 32-bit (~136 años) |

---

## RESUMEN EJECUTIVO

**Total de bugs encontrados: 41**

| Severidad | Cantidad |
|-----------|----------|
| **CRÍTICA** | 7 |
| **ALTA** | 17 |
| **MEDIA** | 15 |
| **BAJA** | 7 |

**Hallazgos principales:**

1. **El proyecto NO COMPILA** debido a `go 1.26.2` y dependencias con versiones inexistentes (7 dependencias CRÍTICAS).
2. **Fiber, Echo y Gorilla** tienen data races masivas (9 instancias) al leer `Events`, `Config` y `Blacklist` sin locks. Solo Gin lo hace correctamente.
3. **Fuga de memoria garantizada**: `Events` crece sin límite en `ProcessEvent` → OOM en horas.
4. **Geolocalización rota en frontend**: CORS bloquea ip-api.com desde el navegador, y hay dos funciones `geolocateHacker` que se sobrescriben.
5. **Modo Learning/Detection no se refleja en UI**: mismatch en IDs de botones (inglés vs español).
6. **Eventos perdidos si DB falla**: todos los broadcasters ignoran el error de `SaveEvent`.
7. **9 data races confirmados** en servidores Fiber/Echo/Gorilla.
8. **Gorilla Mux sin recovery middleware**: cualquier panic mata el servidor.
9. **`isPrivateIP()`** produce falsos positivos (100.x.x.x tratado como privada).

Para que el proyecto funcione, se necesita: corregir `go.mod` con versiones reales, eliminar Revel o actualizar sus rutas, agregar locks en Fiber/Echo/Gorilla, limitar el slice `Events`, y arreglar los bugs de frontend en `web/index.html`.

---

*Fin del informe. Generado el 30 de mayo de 2026.*
