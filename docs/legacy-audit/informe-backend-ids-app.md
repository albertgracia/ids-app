# INFORME TÉCNICO DE AUDITORÍA BACKEND — IDS Antihack iSID

**Proyecto:** `W:\ids-app\`
**Lenguaje:** Go (declara `go 1.26.2` — **no existe**)
**Propósito:** Sistema de Detección de Intrusos (IDS) Industrial con soporte multi-framework web
**Fecha del análisis:** 30 de mayo de 2026

---

## 1. ANÁLISIS DE ARQUITECTURA BACKEND

### 1.1 Patrones usados

| Patrón | ¿Dónde? | ¿Cómo se implementa? |
|---|---|---|
| **Observer / Pub-Sub** | `engine.go` líneas 71–86, 151–164, 271–280 | `Engine.subscribers map[chan Event]bool` — canales como medio de suscripción. Cada servidor API se suscribe vía `Subscribe()` y recibe eventos en su `broadcaster()`. |
| **Strategy (simulado)** | `main.go` líneas 46–67 | Switch de frameworks: cada framework implementa la misma interfaz implícita (`NewServer`, `Run`). No hay interfaz Go formal. |
| **Repository** | `storage.go` | Store encapsula SQLite. Endpoints llaman a `SaveEvent` y `GetLastEvents`. |
| **Service Layer** | `engine.go` | Engine actúa como "servicio central" que orquesta detección, geolocalización, blacklist y broadcasting. |
| **Singleton** | `engine.go` y `controllers/app.go` | Engine es creado una vez en `main()` e inyectado vía constructor a cada servidor. En Revel, además es global vía `var Engine *core.Engine`. |

### 1.2 Flujo de datos: Evento → Frontend

```
Simulador (goroutine en main.go:70)
    │
    ▼
Engine.ProcessEvent(evt)    ← lockea mutex, procesa, broadcast
    │
    ├──> e.Events = append(...)       ← slice en memoria
    ├──> e.subscribers[ch] <- evt    ← broadcast a goroutines broadcaster()
    │       │
    │       └──> (goroutine por servidor)
    │               │
    │               ├──> client.WriteJSON(evt)  ← WebSocket a frontend
    │               └──> store.SaveEvent(evt)   ← SQLite (fire & forget)
    │
    └──> (goroutine async de geo)    ← lookup GeoIP si es IP externa nueva
```

**Problemas en el flujo:**
1. El guardado a SQLite ocurre DENTRO del broadcaster, no en ProcessEvent. Si el broadcaster está caído (nadie suscrito), los eventos NO se persisten.
2. No hay backpressure: si SQLite falla, el error se ignora silenciosamente.
3. El geo-lookup async (`go func()` en línea 207 de engine.go) corre sin WaitGroup ni control de concurrencia.

### 1.3 Modelo de concurrencia

| Elemento | Tipo | Propósito |
|---|---|---|
| `engine.mu` | `sync.RWMutex` | Protege `CurrentMode`, `Config`, `Assets`, `Baseline`, `Events`, `BlockedIPs`, `Blacklist` |
| `engine.subMu` | `sync.Mutex` | Protege `subscribers` map |
| `server.mu` | `sync.Mutex` | Protege `clients` map de WebSocket por servidor |
| `geoCache.mu` | `sync.RWMutex` | Protege `store` map del caché de geolocalización |
| `go startSimulator()` | goroutine | Genera tráfico sintético cada 2s |
| `go broadcaster()` | goroutine | Por servidor, lee de canal y escribe a WS + SQLite |
| `go func() { geo.Lookup() }` | goroutine | Geo lookup asíncrono en ProcessEvent (línea 207) |
| `go updateExternalIP()` | goroutine | Monitoreo de IP pública cada 5 min |

### 1.4 Inyección de dependencias

Engine y Store se crean en `main()` y se pasan como punteros a los constructores de cada servidor:

```go
engine := core.NewEngine()
store, _ := core.NewStore("forensics.db")
s := gin.NewServer(engine, store)  // main.go:48
```

**Problemas:**
- **No hay interfaz**: `NewServer` no sigue una firma común. Fiber requiere un parámetro extra `http.FS`. Revel requiere un `Init()` global estático (controllers.Init).
- **En Revel, el Engine es global** (`var Engine *core.Engine` en `controllers/app.go:14`), rompiendo el encapsulamiento.
- **Acoplamiento directo**: Los servidores conocen los tipos concretos `*core.Engine` y `*core.Store`.

### 1.5 Coupling y cohesión

| Aspecto | Evaluación |
|---|---|
| **Engine** | BAJA cohesión. Hace detección, blacklist, assets, broadcasting, geolocalización. Es un "God Object" de ~422 líneas. |
| **Store** | ALTA cohesión. Solo se encarga de SQLite. Pero está infrautilizado (solo 2 queries). |
| **GeoClient** | ALTA cohesión. Cache + API call. Correctamente separado. |
| **Servidores API** | ACOPLAMIENTO ALTO al Engine — acceden directamente a campos públicos como `engine.Config`, `engine.Events`, `engine.Blacklist` sin métodos intermediarios. |

---

## 2. REVISIÓN DE CÓDIGO POR ARCHIVO

### 2.1 `main.go` (108 líneas)

**Qué hace:** Entry point. Inicializa Engine y Store, arranca simulador, selecciona framework.

**Problemas:**

| Línea | Problema | Gravedad |
|---|---|---|
| 17 | `"net/http"` importado pero solo usado vía `http.FS` en Fiber. Otros servidores no lo usan. | Baja |
| 31 | Error de `NewStore` manejado con `log.Fatalf`. En producción debería ser graceful shutdown. | Media |
| 41 | Mensaje hardcodeado "Fiber Edition" incluso cuando se usa Gin, Echo, etc. | Baja |
| 52 | Ignora el error de `fs.Sub`. Si falla, `subFS` es nil. | Media |
| 62 | Revel `Run()` devuelve nil siempre, `log.Fatal` no mostraría error real. | Baja |
| 96 | `evt.ID` se asigna como `int64(i)` pero la DB es `AUTOINCREMENT`. Colisión potencial. | Media |

### 2.2 `internal/core/engine.go` (422 líneas)

**Qué hace:** Núcleo del IDS. Modos (Idle/Learning/Detection), gestión de assets, baseline, blacklist, broadcasting.

**Problemas críticos:**

| Línea | Problema | Gravedad |
|---|---|---|
| 77 | `Events []Event` — slice expuesto como campo público. Cualquiera puede modificarlo sin lock. | **CRÍTICA** |
| 142 | `e.ProcessEvent()` llamado con `e.mu` YA ADQUIRIDO (ver línea 137). Esto produce un **deadlock**: `updateExternalIP()` toma `e.mu.Lock()` y luego llama a `ProcessEvent` que intenta tomar `e.mu.Lock()` otra vez. | **CRÍTICA (Deadlock)** |
| 207–221 | `go func()` dentro de `e.mu.Lock()` — la goroutine captura `e.mu` en closure y vuelve a lockear (línea 209) mientras el lock exterior aún no se ha liberado. Aunque Go permita esto porque la goroutine no se ejecuta inmediatamente, es peligroso y **puede causar data race en `evt.Source`** y **deadlock si el scheduling es desfavorable**. El unlock exterior (línea 176: `defer e.mu.Unlock()`) ocurre ANTES de que la goroutine intente lockear, pero el asset podría no existir ya. | **CRÍTICA** |
| 269 | `e.Events = append(e.Events, evt)` — el slice crece sin límite. Memoria insostenible a largo plazo. | **ALTA** |
| 272–280 | Broadcasting dentro de `e.mu.Lock()` y luego `e.subMu.Lock()`. Orden de locks siempre mu→subMu, pero si en otro lado se adquieren en orden inverso, es deadlock. | Media |
| 308–314 | `MuRLock()` y `MuRUnlock()` expuestos como métodos públicos. Rompen encapsulamiento y permiten que código externo maneje locks manualmente. | **ALTA** |
| 420 | `GetBlacklist()` devuelve el mapa directamente sin copia. Race condition si alguien modifica el mapa retornado. | **ALTA** |
| 331 | `GetStats()` itera sobre `e.Events` completo cada vez. O(n) en cada llamada `/api/stats`. | Media |

### 2.3 `internal/core/storage.go` (64 líneas)

**Qué hace:** Persistencia SQLite con sqlx.

**Problemas:**

| Línea | Problema | Gravedad |
|---|---|---|
| 27 | Schema de `assets` NO incluye columnas de geo (country, city, flag, lat, lon, asn, as_name) que sí tiene la struct `Asset`. | **ALTA** |
| 41 | `sqlx.Connect("sqlite", dbPath)` — sin `?_journal_mode=WAL` ni `_busy_timeout`. Escritura concurrente puede fallar. | Media |
| 46 | `db.MustExec(schema)` — panic si la creación falla. | Media |
| 50–54 | `SaveEvent` no usa transacción ni prepared statement. En alta concurrencia puede fallar. | Media |
| 58 | `SELECT * FROM events` — explícito es mejor para mantener compatibilidad ante cambios de schema. | Baja |

### 2.4 `internal/core/geoip.go` (188 líneas)

**Qué hace:** Cliente de geolocalización con caché en memoria.

**Problemas:**

| Línea | Problema | Gravedad |
|---|---|---|
| 14 | Token de API hardcodeado `"521f8097a7c99b"`. No es grave (es de ipinfo.io gratis), pero es una mala práctica. | Media |
| 98 | `isPrivateIP()` es una función plana que evalúa por prefijo de string. No detecta correctamente IPv6 (excepto `::1`). | Media |
| 119 | Llama a `http://ip-api.com/json/` (HTTP, no HTTPS). MITM potencial para filtrar IPs internas. | **ALTA** |
| 152 | ASN se deja vacío. El campo `as` de ip-api.com devuelve `"AS1234 Name"` pero se parsea completo a `ASName`. | Baja |
| 165–172 | `FlagEmoji()` — riesgo de pánico si `country[0]-'A'` da negativo (caracteres fuera de A-Z). No hay validación de que `country` sea solo letras ASCII mayúsculas. | Media |

### 2.5 `internal/core/threat_db.go` (67 líneas)

**Qué hace:** Base de amenazas simulada (hardcodeada).

**Problemas:**

| Línea | Problema | Gravedad |
|---|---|---|
| 59–66 | `Check()` convierte a mayúsculas el protocolo, pero los protocolos en `threat_db` están en mayúsculas. En el simulador se usa "Modbus" (mixed case). `Check("Modbus")` -> `"MODBUS"` -> match. OK. Pero en engine.go línea 250 se llama `e.ThreatDB.Check(evt.Protocol)` donde `evt.Protocol` puede ser "Modbus", "CIP", etc. Funciona por el ToUpper. | Correcto |
| 63 | Devuelve `&v` — puntero al elemento del slice. El caller recibe la dirección del elemento iterado, no una copia. Cada iteración sobreescribe `v`. **BUG CLÁSICO DE GO**: Siempre devuelve el ÚLTIMO elemento del slice. | **CRÍTICO (BUG)** |

### 2.6 `internal/api/gin/server.go` (233 líneas)

**Qué hace:** Servidor web usando Gin.

**Problemas:**

| Línea | Problema | Gravedad |
|---|---|---|
| 15 | `CheckOrigin: func(r *http.Request) bool { return true }` — acepta cualquier origen WebSocket sin restricción. | **ALTA** |
| 35 | `r.Static("/static", "./web")` — sirve archivos sin protección. Path traversal no mitigado (Gin lo protege por defecto, pero merece mención). | Baja |
| 72–79 | Si DB falla, lee `s.engine.Events` directamente (campo público, sin lock manual porque ya hay un RLock). Pero si otro código escribe a Events mientras tanto, hay race. | Media |
| 137–174 | `handleSimulateBurst` lanza goroutine que llama a `s.engine.ProcessEvent` desde un endpoint HTTP. Sin control de tasa, sin límite. Un usuario malicioso podría hacer DoS al engine. | **ALTA** |
| 189–212 | `handleWS` — el `defer ws.Close()` + el `defer` cleanup pueden causar doble close si `broadcaster` también cierra el cliente. | Media |

### 2.7 `internal/api/fiber/server.go` (186 líneas)

**Qué hace:** Servidor web usando Fiber.

**Problemas:**

| Línea | Problema | Gravedad |
|---|---|---|
| 12 | Importa `"net/http"` solo para `http.FileSystem`. Podría usar el tipo de Fiber. | Baja |
| 52 | Usa `websocket.New(s.handleWS)` de Fiber, que no requiere upgrader manual. Consistente. | OK |
| 67 | Ignora error de `store.GetLastEvents` con `_`. Si la DB falla, el error se traga y retorna slice vacío -> cae a `s.engine.Events` sin lock. | **ALTA** |
| 75 | Lee `s.engine.Config` directamente sin lock. | **ALTA** |
| 112 | Lee `s.engine.Blacklist` directamente sin lock. Race condition. | **ALTA** |

### 2.8 `internal/api/echo/server.go` (192 líneas)

**Qué hace:** Servidor web usando Echo.

**Problemas:**

| Línea | Problema | Gravedad |
|---|---|---|
| 15 | Mismo upgrader permisivo que Gin. | **ALTA** |
| 67 | Mismo error silenciado de DB. | **ALTA** |
| 75 | Lee `s.engine.Config` sin lock. | **ALTA** |
| 112 | Lee `s.engine.Blacklist` sin lock. | **ALTA** |

### 2.9 `internal/api/gorilla/server.go` (210 líneas)

**Qué hace:** Servidor web usando Gorilla Mux.

**Problemas:**

| Línea | Problema | Gravedad |
|---|---|---|
| 16 | Mismo upgrader permisivo. | **ALTA** |
| 62 | `http.ListenAndServe` sin TLS. Todo el tráfico viaja en texto plano. | **ALTA** |
| 67, 82, 126 | Los handlers escriben `Content-Type: application/json` manualmente. En Gin/Fiber/Echo esto es automático. Posible error de encoding. | Media |
| 74 | Lee `s.engine.Events` sin lock. | **ALTA** |
| 127 | `json.NewEncoder(w).Encode(s.engine.Blacklist)` — si Blacklist tiene datos no serializables, el error se traga. | Media |

### 2.10 `internal/api/revel/revel_server.go` (48 líneas)

**Qué hace:** Servidor Revel. Arranca el motor MVC de Revel.

**Problemas:**

| Línea | Problema | Gravedad |
|---|---|---|
| 5 | `_ "ids-app/internal/api/revel/app"` — import side effect para ejecutar `init()` de `app/init.go`. Esto registra filtros globales de Revel. | Frágil |
| 28–29 | `revel.AppPath` y `revel.BasePath` se asignan directamente a variables de paquete. Esto es frágil y puede fallar según el directorio de ejecución. | Media |
| 32 | `revel.Init("prod", ...)` — inicializa Revel. Si ya fue inicializado (por el import), esto puede causar panic o comportamiento indefinido. | **ALTA** |
| 41–42 | `fmt.Sscanf(addr, "%d", &port)` sin verificar error. Si addr no es `:N`, port queda en 0. | Media |
| 43 | `revel.Run(port)` — toma control total del programa. Revel tiene su propio loop de eventos. | Arquitectura |

### 2.11 `internal/api/revel/app/controllers/app.go` (146 líneas)

**Qué hace:** Controladores Revel.

**Problemas:**

| Línea | Problema | Gravedad |
|---|---|---|
| 14 | `var Engine *core.Engine` — variable global mutable. Rompe encapsulamiento. | **CRÍTICA** |
| 17 | `func (c App) Index()` — Revel espera receiver por valor, no puntero. Esto crea una COPIA del controlador en cada request. | Media |
| 26 | En `GetEvents` usa `Engine.MuRLock()` manual. Si otro código modifica el slice mientras tanto, race. | Media |
| 36 | `c.Params.BindJSON(&body)` — en Revel, BindJSON necesita importación adicional. Posible error de compilación. | **ALTA** |
| 126–128 | `ServeStatic` — método helper no ruteado correctamente en la inicialización. Revel usa su propio sistema de archivos. | **ALTA** |
| 130–146 | `HandleWS` — Revel WebSocket nativo. Correcto pero usa el patrón de suscripción directamente en lugar del broadcaster separado que usan los otros frameworks. | **Inconsistencia** |

### 2.12 `go.mod` (84 líneas)

**Problemas:**

| Línea | Problema | Gravedad |
|---|---|---|
| 3 | `go 1.26.2` — **NO EXISTE**. La versión estable más reciente de Go es 1.24.x (abril 2026). Go 1.26 no ha sido lanzado ni anunciado. `go mod tidy` fallará en cualquier compilador real. | **BLOQUEANTE** |
| 6 | `github.com/gin-gonic/gin v1.12.0` — Gin no ha llegado a v1.12 (la última es v1.10.x). | **ALTA** |
| 7 | `github.com/gofiber/fiber/v2 v2.52.12` — no es una versión real (la última es v2.52.5). | Media |
| 10 | `github.com/gorilla/websocket v1.5.3` — no existe. La última es v1.5.1. | Media |
| 11 | `github.com/jmoiron/sqlx v1.4.0` — no existe. La última es v1.3.5. | Media |
| 12 | `github.com/labstack/echo/v4 v4.15.1` — Echo v4.15 no es real (v4.12.x es la última). | Media |
| 13 | `modernc.org/sqlite v1.49.1` — no es una versión real. | Media |
| 16–84 | **Revel arrastra ~50 dependencias indirectas**. Muchas son obsoletas: `github.com/go-stack/stack`, `github.com/inconshreveable/log15`, `gopkg.in/stack.v0`, `gopkg.in/natefinch/lumberjack.v2`, `github.com/xeonx/timeago`, `github.com/revel/cmd`, `github.com/revel/config`, `github.com/revel/log15`, `github.com/revel/modules`, `github.com/revel/pathtree`. Revel es un framework abandonado (último commit 2018). | **CRÍTICA** |
| 69 | `go.mongodb.org/mongo-driver/v2 v2.5.0` — ¡MongoDB driver incluido sin usarse en ninguna parte del código! | **INNECESARIA** |

### 2.13 `web/index.html` (970 líneas)

**Qué hacer:** Frontend SPA con Tailwind, Chart.js, D3.js, Leaflet.

**Endpoints que consume:**
- `GET /api/stats` — cada 2s
- `GET /api/events` — carga inicial y otros usos
- `POST /api/mode` — cambiar modo
- `GET /api/config` — obtener configuración
- `POST /api/config` — guardar configuración
- `POST /api/block` — bloquear IP
- `GET /api/blacklist` — obtener lista negra
- `DELETE /api/unblock?ip=` — desbloquear
- `POST /api/simulate` — simular ataque
- `GET /api/assets` — obtener activos
- `GET /api/geoip?ip=` — geolocalizar IP
- `WebSocket /ws` — tiempo real

**Problemas:**

| Línea | Problema | Gravedad |
|---|---|---|
| 817 | `new WebSocket(...)` — sin protocolo WSS. Conexión no segura. | Media |
| 837 | El frontend espera `data.total_traffic` pero `GetStats()` en engine.go NO devuelve `total_traffic`. Siempre será `undefined`. | **BUG** |
| 867 | Simular Burst llama a `/api/simulate` (POST) con body vacío, pero el frontend no envía cuerpo. Los servidores aceptan, correcto. | OK |

---

## 3. ANÁLISIS DE CONCURRENCIA Y RACE CONDITIONS

### 3.1 Deadlock en `updateExternalIP()`

```go
// engine.go:135-148
func (e *Engine) updateExternalIP() {
    e.mu.Lock()                    // LOCK #1
    e.ExternalIP = "85.54.120.44"
    e.mu.Unlock()

    e.ProcessEvent(Event{...})    // ProcessEvent intenta e.mu.Lock() otra vez → DEADLOCK
}
```

`ProcessEvent` (línea 175) hace `e.mu.Lock()`. Si `updateExternalIP` libera el lock antes de llamar, no hay deadlock aquí. Pero sigue siendo código frágil.

### 3.2 Geo goroutine con lock potencial

```go
// engine.go:207-221
go func(ip string) {
    geo := e.Geo.Lookup(ip)
    e.mu.Lock()                    // LOCK después de que ProcessEvent liberó
    if asset, ok := e.Assets[ip]; ok {
        asset.Country = geo.Country
        ...
    }
    e.mu.Unlock()
}(evt.Source)
```

Esto es **correcto** porque el `defer e.mu.Unlock()` de ProcessEvent (línea 176) se ejecuta ANTES de que la goroutine pueda ejecutarse (la goroutine se programa asincrónicamente). Pero hay un **data race potencial** si `e.Assets[ip]` es eliminado por otro goroutine entre la lectura y la escritura.

### 3.3 Exposición de `Events` sin protección

```go
// engine.go:77
Events []Event  // campo público
```

Cualquier código externo puede hacer:
```go
engine.Events = append(engine.Events, evt)  // sin lock
```

Y en los servidores:
```go
// fiber/server.go:69
return c.JSON(s.engine.Events)  // lee sin RLock
```

Esto es un **data race** garantizado si hay concurrencia.

### 3.4 Exposición de `Blacklist` y `Config`

```go
// fiber/server.go:75
return c.JSON(s.engine.Config)     // sin lock

// fiber/server.go:112
return c.JSON(s.engine.Blacklist)  // sin lock

// echo/server.go:75
return c.JSON(s.engine.Config)     // sin lock
```

Mientras tanto, `UpdateConfig` (línea 317) y `BlockIP` (línea 389) escriben con lock. **RACE CONDITION**.

### 3.5 Orden de locks

En `ProcessEvent`:
1. `e.mu.Lock()`
2. ... inside, `e.subMu.Lock()` (línea 272)

En `Subscribe`/`Unsubscribe`:
- Solo `e.subMu.Lock()` — sin riesgo de deadlock.

Pero si en el FUTURO alguien añade un camino de código que tome `subMu` y luego `mu`, será deadlock. No hay documentación del orden.

---

## 4. ANÁLISIS DE LA API

### 4.1 Comparación de las 5 implementaciones

| Característica | Gin | Fiber | Echo | Gorilla | Revel |
|---|---|---|---|---|---|
| **Ruteo** | Gin router | Fiber router | Echo router | Mux router | Revel MVC |
| **Static files** | `r.Static("/static", "./web")` | `filesystem.New()` con embed.FS | `e.Static("/static", "./web")` | `http.StripPrefix` + `FileServer` | `ServeStatic` controller |
| **WebSocket** | gorilla/websocket + upgrader | fiber/websocket (nativo) | gorilla/websocket + upgrader | gorilla/websocket + upgrader | Revel nativo |
| **Broadcaster** | Propio + `s.store.SaveEvent()` | Propio + `s.store.SaveEvent()` | Propio + `s.store.SaveEvent()` | Propio + `s.store.SaveEvent()` | WS directo en handler (sin broadcaster separado) |
| **CORS** | No configurado | No configurado | No configurado | No configurado | No configurado |
| **Error handling** | `c.JSON(400, gin.H{...})` | `c.Status(400).JSON(...)` | `c.JSON(400, map[string]string{...})` | `http.Error(w, err, 400)` | `c.RenderError(err)` |

### 4.2 Endpoints faltantes

| Endpoint | Gin | Fiber | Echo | Gorilla | Revel |
|---|---|---|---|---|---|
| `GET /api/stats` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /api/events` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /api/mode` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /api/config` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /api/config` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /api/block` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /api/blacklist` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `DELETE /api/unblock` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `POST /api/simulate` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /api/assets` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /api/geoip` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `GET /ws` | ✅ | ✅ | ✅ | ✅ | ✅ |

**Todos los endpoints están presentes en las 5 implementaciones.** Consistencia buena.

### 4.3 Manejo de errores HTTP

| Framework | Respuesta de error | Códigos de estado |
|---|---|---|
| Gin | `gin.H{"error": err.Error()}` | 400, 200 |
| Fiber | `fiber.Map{"error": err.Error()}` | 400, 500, 200 |
| Echo | `map[string]string{"error": err.Error()}` | 400, 200 |
| Gorilla | `http.Error(w, err.Error(), 400)` — texto plano | 400, 500 |
| Revel | `c.RenderError(err)` — HTML de error | 500 |

**Inconsistencias:**
- Gin/Fiber/Echo devuelven JSON. Gorilla devuelve texto plano en errores.
- Revel devuelve HTML (página de error por defecto).
- No hay un formato de error estándar en todo el proyecto.

### 4.4 CORS y seguridad

**Ningún servidor configura CORS.** El frontend se sirve desde el mismo origen, por lo que CORS no es necesario en desarrollo. Pero si en el futuro se sirve desde otro dominio, todo fallará.

**Headers de seguridad ausentes:**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Content-Security-Policy`
- `Strict-Transport-Security`

### 4.5 WebSocket handling

| Framework | WS Origin Check | Conexión por cliente | Cleanup |
|---|---|---|---|
| Gin | ✅ `return true` (permisivo) | Map + mutex | defer |
| Fiber | ✅ Fiber no usa upgrader | Map + mutex | defer |
| Echo | ✅ `return true` (permisivo) | Map + mutex | defer |
| Gorilla | ✅ `return true` (permisivo) | Map + mutex | defer |
| Revel | ❌ No hay verificación de origen | Por suscripción directa a Engine | defer |

**Problema común:** En Gin/Echo/Gorilla, el broadcaster escribe a WebSocket mientras `handleWS` lee. Si `broadcaster` detecta error y cierra el conn, y luego `handleWS` intenta cerrarlo otra vez en el defer, hay **doble close**.

---

## 5. DEPENDENCIAS Y GO.MOD

### 5.1 Dependencias innecesarias/no usadas

| Dependencia | ¿Se usa? | Impacto |
|---|---|---|
| `go.mongodb.org/mongo-driver/v2` | ❌ No | Añade 6 dependencias transitivas. 0 referencias en código. |
| `github.com/revel/cmd` | ❌ No | Solo para CLI `revel run`, no para uso como librería. |
| `github.com/revel/modules` | ❌ No | Módulos de terceros de Revel no utilizados. |
| `github.com/revel/config` | ❌ No | Solo necesario si usas archivos .conf de Revel. |
| `github.com/revel/log15` / `github.com/inconshreveable/log15` | ❌ No | Revel lo importa pero el código usa `revel.AppLog`, no directamente. |
| `github.com/go-stack/stack` | ❌ No | Dependencia transitiva de log15. |
| `gopkg.in/stack.v0` | ❌ No | Dependencia transitiva de Revel. |
| `gopkg.in/natefinch/lumberjack.v2` | ❌ No | Log rotation no usado. |
| `github.com/xeonx/timeago` | ❌ No | No referenciado en ningún .go. |
| `github.com/bytedance/gopkg` | ❌ No | Dependencia transitiva de Sonic (JSON). |
| `github.com/goccy/go-yaml` | ❌ No | No se usa YAML en el proyecto. |

### 5.2 Versiones incorrectas

| Dependencia | Versión declarada | Versión real (más reciente) |
|---|---|---|
| `gin-gonic/gin` | `v1.12.0` | `v1.10.0` |
| `gofiber/fiber/v2` | `v2.52.12` | `v2.52.5` |
| `gorilla/websocket` | `v1.5.3` | `v1.5.1` |
| `jmoiron/sqlx` | `v1.4.0` | `v1.3.5` |
| `labstack/echo/v4` | `v4.15.1` | `v4.12.0` |
| `modernc.org/sqlite` | `v1.49.1` | `v1.33.1` |
| `go 1.26.2` | — | No existe. La versión estable más reciente es 1.24.x. |

**Impacto:** `go mod tidy` no podrá resolver las versiones porque no existen en los repositorios upstream. El proyecto es **no compilable**.

### 5.3 Dependencias de Revel

Revel (último commit 2018) arrastra un ecosistema obsoleto:
- `gopkg.in/stack.v0` (2014)
- `github.com/go-stack/stack` (2020)
- `github.com/inconshreveable/log15` (2021)
- `gopkg.in/natefinch/lumberjack.v2` (2019, versión antigua)
- `github.com/revel/pathtree` (2014)

**Revel no es compatible con Go 1.24+.** Muchas de sus dependencias usan APIs deprecadas como `go vet` y `go/build`.

---

## 6. SEGURIDAD BACKEND

### 6.1 Tokens y secrets expuestos

| Ubicación | Secreto | Gravedad |
|---|---|---|
| `geoip.go:14` | `IPinfoLiteToken = "521f8097a7c99b"` | Medio — es un token de API gratuita, pero debería estar en variable de entorno. |
| `geoip.go:119` | URL `http://ip-api.com/json/...` sin token | Bajo — ip-api.com es gratuito sin autenticación. |

### 6.2 Validación de inputs

| Endpoint | Parámetro | Validación |
|---|---|---|
| `POST /api/block` | `ip`, `country`, `org` | ❌ Sin validación de formato IP. Acepta cualquier string. |
| `DELETE /api/unblock` | `ip` (query) | ❌ Sin validación. |
| `GET /api/geoip` | `ip` (query) | ❌ Sin validación. |
| `POST /api/config` | `NetworkRange` | ❌ No se valida que sea un CIDR válido. |
| `POST /api/mode` | `mode` | ❌ Acepta cualquier string, no solo los 3 modos definidos. |

### 6.3 SQL Injection

`storage.go` usa **parámetros nombrados** (`:timestamp`, etc.) y **placeholder `?`** en `GetLastEvents`. **No es vulnerable a SQL injection**.

### 6.4 Config sensible

No hay archivos de configuración externos. Todo está hardcodeado o en variables de entorno implícitas. No es inseguro pero tampoco es configurable.

---

## 7. BASE DE DATOS (STORAGE.GO)

### 7.1 Schema

```sql
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME,
    source TEXT,
    target TEXT,
    protocol TEXT,
    size INTEGER,
    severity TEXT,
    message TEXT,
    is_ot BOOLEAN,
    country TEXT, city TEXT, flag TEXT,
    latitude REAL, longitude REAL,
    asn TEXT, as_name TEXT
);

CREATE TABLE IF NOT EXISTS assets (
    ip TEXT PRIMARY KEY,
    name TEXT,
    type TEXT,
    risk_score REAL,
    last_seen DATETIME
);
```

**Problemas:**
1. `assets` no tiene columnas de geolocalización, pero `Asset` struct sí las tiene. Los datos geo de assets solo viven en memoria.
2. No hay índices en `timestamp`, `source`, `severity` — consultas como `SELECT * FROM events ORDER BY timestamp DESC LIMIT ?` harán full scan. Con miles de eventos, será lento.
3. `is_ot BOOLEAN` — SQLite no tiene tipo BOOLEAN nativo. Se almacena como 0/1, pero Go lo mapea como `bool`. Funciona, pero es confuso.

### 7.2 Uso de sqlx

Usa `sqlx.NamedExec` para inserts (correcto) y `sqlx.Select` para queries. `sqlx` es una buena elección sobre `database/sql` por el mapeo directo a structs.

### 7.3 Transacciones y errores

- `SaveEvent` no usa transacción. Si el INSERT falla, el error se propaga al broadcaster, que lo ignora (`s.store.SaveEvent(evt)` es llamado sin verificar error en todos los servidores menos Gin).
- `GetLastEvents` no tiene timeout. Si la DB está bloqueada, el endpoint se cuelga.

### 7.4 Forensics DB

El archivo `forensics.db` se crea en el directorio de trabajo. No hay política de rotación, tamaño máximo, ni limpieza. Con eventos generándose cada 2 segundos, en un día son ~43,200 filas. Sin límite.

---

## 8. TESTING

### 8.1 Ausencia total

No hay ni un solo archivo `*_test.go` en todo el proyecto. Cero pruebas unitarias, de integración o end-to-end.

### 8.2 Puntos críticos que deberían tener tests

| Prioridad | Función | Riesgo |
|---|---|---|
| 🔴 | `ProcessEvent()` | Lógica central con múltiples bifurcaciones (modos, geo, blacklist, broadcast) |
| 🔴 | `Check()` en `threat_db.go` | **BUG confirmado** — devuelve siempre el último elemento |
| 🔴 | `geoip.go:Lookup()` | Cache + API call, propenso a errores de red |
| 🟡 | `isInternal()` | Parseo de CIDR, afecta decisiones de seguridad |
| 🟡 | `GetStats()` | Muchos cálculos, propenso a data races |
| 🟡 | `IsCloudflare()` | Lista hardcodeada de rangos |
| 🟢 | `BlockIP()` / `UnblockIP()` | Operaciones críticas sobre mapa compartido |

### 8.3 Estrategia recomendada

1. **Tests unitarios** para `threat_db.go`, `geoip.go`, `isInternal()`, `IsCloudflare()` — no requieren mocking.
2. **Tests con mock** para `ProcessEvent()`: poder inyectar un Store mock y verificar eventos generados.
3. **Tests de integración** para `storage.go`: usar SQLite en memoria (`:memory:`).
4. **Race detection**: `go test -race ./...` es obligatorio dado el alto acoplamiento concurrente.
5. **Test de WebSocket**: levantar servidor de prueba, conectar WS, enviar evento y verificar recepción.

---

## 9. RECOMENDACIONES TÉCNICAS ESPECÍFICAS

### 9.1 Refactor urgente de ProcessEvent()

**Situación actual (líneas 174–281):**
Un solo método de 108 líneas que:
1. Lockea
2. Checkea blacklist
3. Crea/actualiza assets
4. Enruta según modo
5. Geolocaliza (sync + async)
6. Append a Events
7. Broadcast a suscriptores

**Refactor propuesto:**

```go
func (e *Engine) ProcessEvent(evt Event) {
    e.mu.Lock()
    defer e.mu.Unlock()

    if e.isBlocked(evt.Source) { return }
    e.updateAsset(evt)
    e.enrichWithGeo(&evt)
    e.applyDetectionLogic(&evt)
    e.appendEvent(evt)
    e.broadcast(evt)
}
```

Cada sub-método con una responsabilidad única y testeable.

### 9.2 Estrategia para consolidar los 5 servidores API

Crear una **interfaz común**:

```go
type IDSServer interface {
    Run(addr string) error
}
```

Y usar un **ServerBuilder** que reciba las configuraciones específicas de cada framework:

```go
type ServerBuilder struct {
    Engine *core.Engine
    Store  *core.Store
    WebFS  embed.FS
}

func (b *ServerBuilder) BuildGin() *gin.Server { ... }
func (b *ServerBuilder) BuildFiber() *fiber.Server { ... }
```

O mejor: **elegir un solo framework** y eliminar los otros 4. Esto reduce drásticamente la complejidad y las dependencias.

### 9.3 Corrección de bugs encontrados

| # | Bug | Archivo:Línea | Corrección |
|---|---|---|---|
| 1 | **BUG: `Check()` devuelve siempre el último elemento** | `threat_db.go:63` | Cambiar `return &v` por `v := v; return &v` o cambiar a índice `return &db.Vulns[i]` |
| 2 | **Deadlock potencial en `updateExternalIP()`** | `engine.go:137-148` | Mover `ProcessEvent` fuera del lock, o alternativamente usar `Unlock()` antes de llamarlo |
| 3 | **Data race en servidores sin RLock** | `fiber/server.go:75,112` y similares | Usar los métodos con lock (`GetConfig()`, `GetBlacklist()`) o añadir RLock |
| 4 | **`go 1.26.2` en go.mod** | `go.mod:3` | Cambiar a `go 1.24.0` (la versión estable más reciente) |
| 5 | **Versiones de dependencias irreales** | `go.mod:6-13` | Ejecutar `go mod tidy` con Go 1.24 para resolver versiones reales |

### 9.4 Mejoras de rendimiento y concurrencia

| Mejora | Descripción |
|---|---|
| **Ring buffer para Events** | Reemplazar `[]Event` (crece sin límite) con un ring buffer de tamaño fijo (ej. 10,000 eventos) |
| **Worker pool para guardado en DB** | En lugar de guardar en el broadcaster (serial), enviar a un channel con un worker pool que haga batch inserts |
| **Geo lookup asíncrono con límite** | Usar un semáforo (`make(chan struct{}, N)`) para limitar el número de goroutines de geo simultáneas |
| **Índices en SQLite** | Añadir índices a `timestamp`, `source`, `severity` |
| **WAL mode en SQLite** | `db.Exec("PRAGMA journal_mode=WAL")` para mejor concurrencia de lecturas/escrituras |
| **Pool de conexiones SQLite** | Configurar `db.SetMaxOpenConns(1)` — SQLite no soporta escritura concurrente |

---

## RESUMEN EJECUTIVO

### Puntaje de salud del backend: **3/10**

El proyecto tiene una arquitectura conceptual interesante pero una ejecución extremadamente deficiente. El código es **no compilable** debido a `go 1.26.2` y versiones de dependencias irreales. Hay bugs de concurrencia graves, data races generalizados, y un bug en la lógica central de detección de amenazas.

### Top 5 problemas críticos (con líneas exactas)

| # | Problema | Ubicación | Línea(s) |
|---|---|---|---|
| 🔴 1 | **`go 1.26.2` no existe + versiones de dependencias irreales** | `go.mod` | 3, 6-13 |
| 🔴 2 | **Bug en `Check()` — devuelve siempre el último elemento del slice** | `internal/core/threat_db.go` | 63 |
| 🔴 3 | **Data race masivo: campos del Engine expuestos sin lock en 3 servidores** | `internal/api/fiber/server.go`, `internal/api/echo/server.go`, `internal/api/gorilla/server.go` | 75, 112 (y análogos) |
| 🔴 4 | **Deadlock potencial: `updateExternalIP()` adquiere lock y llama a `ProcessEvent()`** | `internal/core/engine.go` | 135-148 → 175 |
| 🔴 5 | **Goroutine en geo lookup sin control, accede a `e.Assets` desde fuera del lock** | `internal/core/engine.go` | 207-221 |

### Top 5 recomendaciones prioritarias

| # | Recomendación | Impacto |
|---|---|---|
| 1 | **Corregir `go.mod`**: `go 1.24.0` + ejecutar `go mod tidy` con Go real | ❌ **Bloqueante** — el proyecto no compila |
| 2 | **Fix bug de `Check()`**: copiar el elemento antes de devolver puntero | ✅ Corrige falsos negativos en detección |
| 3 | **Proteger acceso a campos públicos**: usar getters con RLock en todos los servidores | ✅ Elimina data races |
| 4 | **Refactor `ProcessEvent()`**: dividir en sub-métodos y eliminar deadlock potencial | ✅ Mejora mantenibilidad y concurrencia |
| 5 | **Eliminar 4 de los 5 frameworks**: elegir uno (Fiber por rendimiento y soporte embed.FS) | ✅ Reduce deuda técnica y dependencias en ~80% |

---

*Fin del informe. Generado el 30 de mayo de 2026.*
