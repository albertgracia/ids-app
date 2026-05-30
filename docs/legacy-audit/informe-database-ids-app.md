# INFORME TÉCNICO: Análisis de Base de Datos y Persistencia
## Proyecto: Antihack IDS (Intrusion Detection System) — Go

**Fecha:** 2026-05-30
**Analista:** Database Architect
**Versión del análisis:** 1.0

---

## ÍNDICE

1. [Análisis del Schema](#1-análisis-del-schema)
2. [Análisis de Queries](#2-análisis-de-queries)
3. [Persistencia y Flujo de Datos](#3-persistencia-y-flujo-de-datos)
4. [Cachés en Memoria](#4-cachés-en-memoria)
5. [Análisis de Dependencias](#5-análisis-de-dependencias)
6. [Seguridad de Datos](#6-seguridad-de-datos)
7. [Recomendaciones Técnicas](#7-recomendaciones-técnicas)

---

## 1. Análisis del Schema

### 1.1 Schema SQL Actual

El schema se define en `internal/core/storage.go` (líneas 8–34) con dos tablas:

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
    country TEXT,
    city TEXT,
    flag TEXT,
    latitude REAL,
    longitude REAL,
    asn TEXT,
    as_name TEXT
);

CREATE TABLE IF NOT EXISTS assets (
    ip TEXT PRIMARY KEY,
    name TEXT,
    type TEXT,
    risk_score REAL,
    last_seen DATETIME
);
```

### 1.2 Columnas Faltantes vs Structs de Go

| Tabla | Campo en Struct `Event` | ¿En Schema SQL? | Problema |
|-------|------------------------|-----------------|----------|
| events | `ID int64` | ✅ `id` | OK |
| events | `Timestamp time.Time` | ✅ `timestamp` | OK |
| events | `Source string` | ✅ `source` | OK |
| events | `Target string` | ✅ `target` | OK |
| events | `Protocol string` | ✅ `protocol` | OK |
| events | `Size int` | ✅ `size` | OK |
| events | `Severity Severity` | ✅ `severity` | OK |
| events | `Message string` | ✅ `message` | OK |
| events | `IsOT bool` | ✅ `is_ot` | OK |
| events | `Country string` | ✅ `country` | OK |
| events | `City string` | ✅ `city` | OK |
| events | `Flag string` | ✅ `flag` | OK |
| events | `Latitude float64` | ✅ `latitude` | OK |
| events | `Longitude float64` | ✅ `longitude` | OK |
| events | `ASN string` | ✅ `asn` | OK |
| events | `ASName string` | ✅ `as_name` | OK |

| Tabla | Campo en Struct `Asset` | ¿En Schema SQL? | Problema |
|-------|------------------------|-----------------|----------|
| assets | `IP string` | ✅ `ip` (PK) | OK |
| assets | `Name string` | ✅ `name` | OK |
| assets | `Type string` | ✅ `type` | OK |
| assets | `RiskScore float64` | ✅ `risk_score` | OK |
| assets | `LastSeen time.Time` | ✅ `last_seen` | OK |
| assets | `Protocols []string` | ❌ **NO EXISTE** | **No se persisten los protocolos del asset** |
| assets | `Country string` | ❌ **NO EXISTE** | No se persiste geolocalización del asset |
| assets | `City string` | ❌ **NO EXISTE** | No se persiste geolocalización del asset |
| assets | `Flag string` | ❌ **NO EXISTE** | No se persiste geolocalización del asset |
| assets | `Latitude float64` | ❌ **NO EXISTE** | No se persiste geolocalización del asset |
| assets | `Longitude float64` | ❌ **NO EXISTE** | No se persiste geolocalización del asset |
| assets | `ASN string` | ❌ **NO EXISTE** | No se persiste geolocalización del asset |
| assets | `ASName string` | ❌ **NO EXISTE** | No se persiste geolocalización del asset |

**Conclusión:** La tabla `assets` está incompleta. El struct `Asset` en Go tiene 14 campos, pero el schema SQL solo almacena 5. La geolocalización y los protocolos de cada asset se pierden al reiniciar la aplicación.

### 1.3 Tipos de Datos

| Columna | Tipo Declarado | Problema |
|---------|---------------|----------|
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | ✅ Correcto |
| `timestamp` | `DATETIME` | ⚠️ SQLite no tiene tipo DATETIME nativo; lo almacena como TEXT con afinidad NUMERIC. Funciona, pero no hay validación de formato. |
| `size` | `INTEGER` | ✅ Correcto |
| `is_ot` | `BOOLEAN` | ⚠️ SQLite no tiene BOOLEAN; lo almacena como INTEGER (0/1). Funciona en la práctica, pero es inconsistente con el tipo `bool` de Go. |
| `latitude` / `longitude` | `REAL` | ✅ Correcto |
| `risk_score` | `REAL` | ✅ Correcto |
| `severity` | `TEXT` | ⚠️ Podría ser `VARCHAR(10)` o un CHECK constraint para limitar los valores válidos ("Baja", "Media", "Alta", "Crítica"). |
| `protocol` | `TEXT` | ⚠️ Sin índice. Es el campo más consultado en joins lógicos con ThreatDB. |
| `source` / `target` | `TEXT` | ⚠️ Sin índices. Se usan en consultas de assets. |

### 1.4 Falta de Índices — Impacto

**No hay ningún índice explícito** fuera de la PK de `events` (autogenerado por AUTOINCREMENT) y la PK de `assets` (implícito por PRIMARY KEY).

| Query | Índice Necesario | Impacto Sin Índice |
|-------|-----------------|-------------------|
| `SELECT * FROM events ORDER BY timestamp DESC LIMIT ?` | `CREATE INDEX idx_events_timestamp ON events(timestamp DESC)` | **Full scan de toda la tabla events** para ordenar antes de tomar LIMIT. Con millones de filas, esta query se vuelve O(n log n) en lugar de O(log n + limit). |
| Búsqueda por `source` o `target` (si se añade) | `CREATE INDEX idx_events_source ON events(source)` | Full scan inevitable. |
| Búsqueda por `protocol` | `CREATE INDEX idx_events_protocol ON events(protocol)` | Full scan inevitable. |
| Búsqueda por `severity` | `CREATE INDEX idx_events_severity ON events(severity)` | Full scan inevitable. |
| Join con assets por IP | La PK de assets ya es `ip` | ✅ OK para assets. |

**Impacto en producción:** Con el tiempo, `GetLastEvents(100)` degradará su rendimiento sustancialmente. Con ~100K eventos, será notable. Con ~1M+, será muy lento.

### 1.5 Política de Almacenamiento

**No existe política de retención ni límite de crecimiento.** La tabla `events` crece sin restricciones. No hay:
- **TTL** (time-to-live) para eventos antiguos
- **Límite de filas** (CHECK o trigger)
- **Particionamiento por fecha**
- **Rotación de la base de datos**
- **Mecanismo de purga** (ni automático ni manual vía API)

Con el simulador generando 1 evento cada 2 segundos, eso son ~43,200 eventos/día, ~1.3M/mes. Una instancia real podría generar órdenes de magnitud más.

---

## 2. Análisis de Queries

### 2.1 Revisión de Cada Query

#### Query 1: `SaveEvent` (storage.go:50-53)

```go
func (s *Store) SaveEvent(e Event) error {
    _, err := s.db.NamedExec(`INSERT INTO events (...) VALUES (:timestamp, :source, ...)`, e)
    return err
}
```

| Aspecto | Evaluación |
|---------|-----------|
| **Parámetros** | ✅ Usa `sqlx.NamedExec` con named parameters. Excelente — evita SQL injection y es legible. |
| **SQL Injection** | ✅ Ningún riesgo. Los parámetros son vinculados por nombre. |
| **Columnas explícitas** | ✅ Lista completa de columnas. |
| **Eficiencia** | ⚠️ Cada INSERT es individual. Sin batch. Sin `BEGIN/COMMIT` explícito. Cada evento genera una transacción implícita. |
| **Error handling** | ⚠️ El error se retorna pero **nunca se verifica** en los llamadores (ver sección 3.2). |

#### Query 2: `GetLastEvents` (storage.go:56-59)

```go
func (s *Store) GetLastEvents(limit int) ([]Event, error) {
    var events []Event
    err := s.db.Select(&events, "SELECT * FROM events ORDER BY timestamp DESC LIMIT ?", limit)
    return events, err
}
```

| Aspecto | Evaluación |
|---------|-----------|
| **Parámetros** | ✅ Usa placeholder `?` con positional parameter. Correcto para sqlx. |
| **SQL Injection** | ✅ Ningún riesgo. |
| **SELECT \*** | ❌ **SELECCIONA TODAS LAS COLUMNAS.** Aunque actualmente coinciden con el struct Event, si en el futuro se agregan columnas internas o calculadas, `SELECT *` puede romper el mapeo o traer datos innecesarios. |
| **Eficiencia** | ❌ **Sin índice en `timestamp`** implica full scan + sort para devolver solo las últimas N filas. |
| **LIMIT sin parámetro fijo** | ✅ El límite es parametrizable. En los handlers siempre se usa 100. |

### 2.2 Uso de Parámetros

- `NamedExec` con estructuras de Go: **Correcto**. sqlx mapea automáticamente por tags `json` o `db`.
- `Select` con `?`: **Correcto** para sqlx con SQLite.
- No hay concatenación de strings SQL en ningún lado. ✅

### 2.3 Potencial SQL Injection

**No se detecta riesgo de SQL injection.** Todas las queries usan parameterized queries. Sin embargo, hay un punto débil indirecto:

- El handler `handleUnblock` en todos los servidores recibe `ip` por query string sin validación de formato. Aunque no se usa en SQL directamente, esta IP se almacena en `BlockedIPs` y `Blacklist` (mapas en memoria), y eventualmente podría llegar a la DB si se implementa persistencia de blacklist. Sería prudente validar el formato IP.

### 2.4 `SELECT *` vs Columnas Explícitas

**Problema confirmado.** `GetLastEvents` usa `SELECT *`. Aunque ahora coincide con la struct, cualquier cambio futuro en el schema (ej: añadir `raw_packet BLOB`) rompería la query o requeriría manejo explícito de columnas nuevas.

---

## 3. Persistencia y Flujo de Datos

### 3.1 ¿Cuándo y Cómo se Guardan los Eventos?

El flujo completo es:

```
Simulador/API → ProcessEvent(evt) → broadcaster (goroutine) → SaveEvent(evt)
                         ↓
                  Events[] (memoria) + subscribers (websocket)
```

**Ruta crítica:**
1. `ProcessEvent(evt)` en `engine.go` (línea 174) recibe el evento.
2. Se evalúa si la IP está bloqueada, se actualiza el asset, se aplican reglas del modo.
3. Se añade a `e.Events` (slice en memoria, línea 269).
4. Se envía a todos los subscribers vía canal (líneas 272-280).
5. **Cada servidor** tiene su propia goroutine `broadcaster()` que:
   - Lee del canal suscrito
   - Envía a WebSocket clients
   - **Llama a `SaveEvent(evt)`** (persistencia SQLite)

**Problema de duplicación:** Si hay 2 servidores corriendo (no es el caso actual, pero la arquitectura lo permite), cada uno llamaría `SaveEvent` para el mismo evento → duplicados.

**Problema de consistencia:** El broadcaster guarda el evento **después** de enviarlo por WebSocket. Si `SaveEvent` falla, el WebSocket ya entregó el evento al cliente, pero no se persiste. En un reinicio, ese evento se pierde.

### 3.2 ¿Qué Pasa si la DB Falla?

**Manejo de errores inconsistente y deficiente.**

| Lugar | Código | Problema |
|-------|--------|----------|
| `main.go:30-34` | `store, err := core.NewStore(...)` | ❌ Si falla la creación de la DB = **log.Fatalf** (cierra la app). Correcto para startup, pero catastrófico si la DB falla en runtime. |
| `gin/server.go:230` | `s.store.SaveEvent(evt)` | ❌ **El error se ignora completamente.** No hay log, no hay retry, no hay fallback. |
| `fiber/server.go:183` | `s.store.SaveEvent(evt)` | ❌ Idem. |
| `echo/server.go:189` | `s.store.SaveEvent(evt)` | ❌ Idem. |
| `gorilla/server.go:207` | `s.store.SaveEvent(evt)` | ❌ Idem. |
| `revel/controllers/app.go` | No llama a SaveEvent | ❌ **Nunca persiste eventos.** |

**Consecuencias:**
- Si SQLite encuentra un `SQLITE_BUSY` (contensión de escritura), el evento se pierde silenciosamente.
- Si el archivo `forensics.db` está corrupto, los nuevos eventos se descartan en silencio.
- El usuario no tiene forma de saber que la persistencia falló.

### 3.3 Transacciones y Batch Inserts

**No hay manejo de transacciones.** Cada `SaveEvent` ejecuta un INSERT individual, cada uno en su propia transacción implícita.

**No hay batch inserts.** En escenarios de ráfaga (simulate burst con 20 eventos en ~3 segundos), se generan 20 transacciones separadas. Para un IDS real, esto es inaceptable.

SQLite se comporta mejor con transacciones explícitas que agrupan múltiples INSERTs. Sin embargo, la arquitectura basada en canales individuales dificulta el batching.

### 3.4 Sin Límite en Events Slice (Memoria)

En `engine.go` línea 269:
```go
e.Events = append(e.Events, evt)
```

**Este slice crece sin límite.** Cada evento, típicamente ~500 bytes a ~2 KB en memoria. Con el simulador generando 1 evento/2s:
- 1 día: ~43K eventos → ~40-80 MB
- 1 mes: ~1.3M eventos → ~1.2-2.6 GB
- 1 año: ~15.7M eventos → ~14-31 GB

**Riesgo:** OOM (Out of Memory) en horas o días dependiendo de la carga real. Especialmente crítico si es un entorno edge/serverless con límites de memoria ajustados.

**El slice se usa para:**
1. `GetStats()` → cuenta eventos OT/IT
2. Fallback en handlers (`len(events) == 0`)
3. Revel controller `GetEvents()` (que nunca consulta la DB)

---

## 4. Cachés en Memoria

### 4.1 GeoIP Cache (`geoip.go` - 188 líneas)

| Aspecto | Estado |
|---------|--------|
| **Estructura** | `map[string]*GeoInfo` con `sync.RWMutex` |
| **TTL** | 24 horas (configurable en `NewGeoCache`) |
| **Límite de tamaño** | ❌ **Sin límite.** Crece indefinidamente. |
| **Política de expiración** | ❌ **Pasiva.** Solo se verifica al hacer `Get()`. Las entradas expiradas no se limpian. |
| **Evicción LRU/LFU** | ❌ No implementada. |
| **Cliente HTTP** | `http.Client` con timeout de 3s. |
| **API externa** | ip-api.com (sin autenticación, tier gratuita). Límite de 45 requests/minuto según su política. |
| **Token no usado** | `IPinfoLiteToken = "521f8097a7c99b"` declarado pero nunca usado — la API real es ip-api.com. |

**Riesgos:**
- El cache puede crecer hasta contener todas las IPs externas únicas jamás vistas. Con TTL de 24h, podría acumular millones de entradas.
- Sin limpieza de entradas expiradas (lazy cleanup o background goroutine), el map sigue creciendo incluso después de que expiren.
- La API ip-api.com tiene rate limiting. No hay control de throttling.
- El token de IPinfo (posiblemente válido) está hardcodeado y nunca se usa, lo que es confuso.

### 4.2 ThreatDB (Memoria, Hardcodeada)

| Aspecto | Estado |
|---------|--------|
| **Almacenamiento** | Slice de `Vulnerability` en memoria. |
| **Persistencia** | ❌ **No existe.** 4 vulnerabilidades hardcodeadas. No se pueden añadir/editar/eliminar en runtime. |
| **Actualización** | ❌ Requiere recompilar la app. |
| **Escalabilidad** | ❌ Búsqueda O(n) lineal sobre el slice. Para 4 elementos es irrelevante, pero el diseño no escala. |

**Impacto:** El ThreatDB es una lista demostrativa. En un IDS real, debería ser alimentado por feeds externos (NVD, CVE) o al menos ser configurable desde archivos/db.

### 4.3 Assets Map (Engine)

| Aspecto | Estado |
|--------|--------|
| **Estructura** | `map[string]*Asset` |
| **Persistencia** | ❌ **Solo en memoria.** La tabla SQL `assets` existe pero **nunca se escribe** desde el engine. |
| **Crecimiento** | Sin límite. Cada IP única vista se añade permanentemente. |
| **Enriquecimiento async** | Las goroutines de geolocalización (engine.go:207-221) modifican assets con riesgo de race condition. Aunque usan `e.mu`, la goroutine se lanza sin waitgroup, sin control de completitud. |

### 4.4 Events Slice (Engine)

Ya analizado en 3.4. El riesgo principal es la memoria ilimitada.

---

## 5. Análisis de Dependencias

### 5.1 modernc.org/sqlite (v1.49.1)

| Aspecto | Evaluación |
|---------|-----------|
| **CGO-free** | ✅ Pure Go. Sin dependencia de GCC/MSVC. Compilación cruzada sencilla. |
| **Rendimiento** | ⚠️ ~10-20% más lento que `mattn/go-sqlite3` (CGO) en benchmarks, pero suficiente para este caso de uso. |
| **Estabilidad** | ✅ Maduro, ampliamente usado en producción. |
| **Configuración** | ❌ **No se configura ningún PRAGMA.** La conexión usa defaults que no son óptimos para un IDS. |

**PRAGMAs que deberían configurarse:**

```sql
PRAGMA journal_mode=WAL;              -- Write-Ahead Logging para lecturas concurrentes
PRAGMA busy_timeout=5000;             -- Esperar 5s en lugar de fallar inmediatamente
PRAGMA synchronous=NORMAL;            -- Balance seguridad/rendimiento (WAL mode)
PRAGMA cache_size=-8000;              -- 8MB de cache
PRAGMA temp_store=MEMORY;             -- Tablas temporales en memoria
PRAGMA mmap_size=268435456;           -- Mmap de 256MB para lectura más rápida
PRAGMA page_size=4096;                -- 4KB pages (mejor para I/O)
PRAGMA foreign_keys=ON;               -- No hay FKs ahora, pero por precaución
```

### 5.2 jmoiron/sqlx (v1.4.0)

| Aspecto | Evaluación |
|---------|-----------|
| **NamedExec** | ✅ Uso correcto con mapeo automático de struct. |
| **Select** | ✅ Uso correcto con slice de structs. |
| **Pool de conexiones** | ⚠️ `sqlx.Connect` usa `sql.Open` internamente, pero SQLite no soporta conexiones concurrentes de escritura. El pool `SetMaxOpenConns` por defecto es 0 (ilimitado), lo que puede causar `SQLITE_BUSY` con escrituras desde múltiples goroutines. |
| **Necesidad de sqlx** | ⚠️ El uso es mínimo (NamedExec, Select). Podría reemplazarse por `database/sql` estándar con poco esfuerzo adicional, reduciendo dependencias. |

**Configuración recomendada que falta:**
```go
db.SetMaxOpenConns(1)        // SQLite solo soporta 1 escritor
db.SetMaxIdleConns(1)
db.SetConnMaxLifetime(time.Hour)
```

### 5.3 Dependencia No Usada: go.mongodb.org/mongo-driver/v2

**Confirmado:** `go.mongodb.org/mongo-driver/v2 v2.5.0` aparece en `go.mod` (línea 69) y `go.sum` como dependencia indirecta.

**Origen:** Es arrastrada por `revel/revel` como dependencia transitiva.

**Impacto:**
- Aumenta el tamaño del binario innecesariamente (~12 MB adicionales compilados)
- Aumenta el tiempo de compilación
- Podría incluirse en el SBOM (bill of materials) como falsa dependencia
- Revel no usa MongoDB en el código de este proyecto

**Solución:** Si no se usa Revel, eliminar Revel eliminaría la dependencia MongoDB. Si Revel es necesario, no hay mucho que hacer salvo contribuir a Revel para que la haga opcional.

### 5.4 Otras Observaciones de go.mod

- `go 1.26.2` — Versión extremadamente reciente de Go (futura). Asegura características modernas pero puede tener limitaciones de compatibilidad con algunas librerías.
- `modernc.org/sqlite v1.49.1` → Correcto para CGO-free.
- `github.com/mattn/go-sqlite3 v2.0.1+incompatible` → Está como indirecta, probablemente traída por otra dependencia. Entra en conflicto conceptual con modernc.org/sqlite.

---

## 6. Seguridad de Datos

### 6.1 forensics.db en el Repositorio

**❌ PROBLEMA CRÍTICO:** El archivo `forensics.db` (20,480 bytes, última modificación 23/04/2026) existe en la raíz del proyecto.

**Riesgos:**
- **Datos sensibles commitados:** Contiene IPs reales o sintéticas, timestamps de tráfico, severidades, mensajes de eventos.
- **Historial de tráfico de red:** Revela la topología de red, patrones de comunicación, assets.
- **Información geo:** IPs + ubicaciones geográficas + ASNs.
- **No hay `.gitignore` para `*.db`** (verificar).

**Recomendación inmediata:**
1. Añadir `*.db` al `.gitignore`
2. Eliminar `forensics.db` del historial de git con `git filter-branch` o `bfg`
3. Si se necesita una base de demostración, generar un script de seed

### 6.2 SQLite Sin Encriptación

SQLite no tiene encriptación nativa. El archivo `forensics.db` es un archivo binario que puede leerse con cualquier herramienta SQLite:
```
sqlite3 forensics.db "SELECT * FROM events"
```

**Contenido almacenado sin protección:**
- IPs de origen y destino
- Protocolos de red
- Marcas de tiempo de eventos
- Ubicaciones geográficas (país, ciudad, coordenadas lat/lon)
- ASNs y nombres de organización

**Riesgo:** Si alguien accede al servidor, tiene acceso completo al historial de tráfico.

**Soluciones posibles:**
- SQLCipher (encriptación en reposo)
- Encriptación a nivel de archivo (OS)
- No almacenar datos sensibles (anonimización)

### 6.3 Datos Geo sin Anonimización

El schema almacena `country`, `city`, `latitude`, `longitude`, `asn`, `as_name` directamente vinculados a IPs. Esto permite reconstruir la ubicación física de cada evento.

**Problema:** Para un IDS, almacenar coordenadas exactas (lat/lon) puede ser un riesgo de privacidad, especialmente bajo regulaciones GDPR (si IPs de usuarios de la UE son procesadas).

**Recomendación:** Almacenar solo código de país y ASN, no coordenadas exactas o ciudad. O implementar anonimización (hash de IP, redondeo de coordenadas).

### 6.4 Backup y Rotación de DB

**No existe mecanismo de backup ni rotación.**
- Sin copia de seguridad automática
- Sin rotación por fecha/tamaño
- Sin archive de eventos antiguos
- Si el archivo DB se corrompe, se pierde todo el historial

---

## 7. Recomendaciones Técnicas

### 7.1 Migraciones de Schema (Prioridad: ALTA)

Implementar un sistema de migraciones (puede ser manual con versionado numérico):

```sql
-- migration_001_add_asset_geo.sql
ALTER TABLE assets ADD COLUMN protocols TEXT;     -- JSON array como string
ALTER TABLE assets ADD COLUMN country TEXT;
ALTER TABLE assets ADD COLUMN city TEXT;
ALTER TABLE assets ADD COLUMN flag TEXT;
ALTER TABLE assets ADD COLUMN latitude REAL;
ALTER TABLE assets ADD COLUMN longitude REAL;
ALTER TABLE assets ADD COLUMN asn TEXT;
ALTER TABLE assets ADD COLUMN as_name TEXT;
```

**O crear una tabla de versión:**
```go
func (s *Store) Migrate() error {
    // Check schema version
    var version int
    err := s.db.Get(&version, "PRAGMA user_version")
    if version < 1 {
        s.db.MustExec("ALTER TABLE assets ADD COLUMN ...")
        s.db.MustExec("PRAGMA user_version = 1")
    }
}
```

### 7.2 Estrategia de Indexación (Prioridad: ALTA)

```sql
-- Índice primario para ordenación por tiempo
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);

-- Índices para búsqueda (si se agregan filters en la UI)
CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);
CREATE INDEX IF NOT EXISTS idx_events_severity ON events(severity);
CREATE INDEX IF NOT EXISTS idx_events_protocol ON events(protocol);

-- Índice compuesto para queries de rango temporal
CREATE INDEX IF NOT EXISTS idx_events_ts_severity ON events(timestamp, severity);
```

### 7.3 PRAGMAs de Conexión Recomendados (Prioridad: MEDIA)

```go
func NewStore(dbPath string) (*Store, error) {
    db, err := sqlx.Connect("sqlite", dbPath)
    if err != nil {
        return nil, fmt.Errorf("cannot connect to sqlite: %w", err)
    }

    // Configuración óptima para SQLite en modo WAL
    pragmas := []string{
        "PRAGMA journal_mode=WAL",
        "PRAGMA busy_timeout=5000",
        "PRAGMA synchronous=NORMAL",
        "PRAGMA cache_size=-8000",        -- 8 MB cache
        "PRAGMA temp_store=MEMORY",
        "PRAGMA mmap_size=268435456",     -- 256 MB mmap
        "PRAGMA page_size=4096",
        "PRAGMA foreign_keys=ON",
    }
    for _, p := range pragmas {
        db.MustExec(p)
    }

    // Pool configuration for SQLite
    db.SetMaxOpenConns(1)    // Single writer for SQLite
    db.SetMaxIdleConns(1)
    db.SetConnMaxLifetime(0) // Keep connection alive

    db.MustExec(schema)
    return &Store{db: db}, nil
}
```

### 7.4 Ring Buffer vs Slice Infinito (Prioridad: ALTA)

Reemplazar `e.Events []Event` por un ring buffer:

```go
type RingBuffer struct {
    buffer []Event
    maxSize int
    pos     int
    count   int
    mu      sync.RWMutex
}

func NewRingBuffer(maxSize int) *RingBuffer {
    return &RingBuffer{
        buffer: make([]Event, maxSize),
        maxSize: maxSize,
    }
}

func (rb *RingBuffer) Add(e Event) {
    rb.mu.Lock()
    defer rb.mu.Unlock()
    rb.buffer[rb.pos] = e
    rb.pos = (rb.pos + 1) % rb.maxSize
    if rb.count < rb.maxSize {
        rb.count++
    }
}

func (rb *RingBuffer) GetAll() []Event {
    rb.mu.RLock()
    defer rb.mu.RUnlock()
    // Return events in chronological order
    result := make([]Event, 0, rb.count)
    if rb.count < rb.maxSize {
        result = append(result, rb.buffer[:rb.count]...)
    } else {
        result = append(result, rb.buffer[rb.pos:]...)
        result = append(result, rb.buffer[:rb.pos]...)
    }
    return result
}
```

Tamaño sugerido: 10,000 eventos (~10-20 MB). Esto es más que suficiente para estadísticas en tiempo real y fallback de UI. Los eventos históricos se sirven desde SQLite.

### 7.5 Estrategia de Backup/Limpieza (Prioridad: MEDIA)

```go
// En un goroutine aparte
func (s *Store) StartCleanupRoutine(ctx context.Context, retention time.Duration, interval time.Duration) {
    ticker := time.NewTicker(interval)
    go func() {
        for {
            select {
            case <-ticker.C:
                cutoff := time.Now().Add(-retention)
                _, err := s.db.Exec("DELETE FROM events WHERE timestamp < ?", cutoff)
                if err != nil {
                    log.Printf("Error cleaning old events: %v", err)
                }
                // Opcional: VACUUM cada N limpiezas
                s.db.Exec("PRAGMA wal_checkpoint(TRUNCATE)")
            case <-ctx.Done():
                ticker.Stop()
                return
            }
        }
    }()
}
```

**Recomendación de retención:** 30 días para producción, configurable.

### 7.6 Batch Inserts con Buffer (Prioridad: ALTA)

En lugar de insertar cada evento individualmente, usar un buffer con flush periódico:

```go
type BatchWriter struct {
    mu      sync.Mutex
    buffer  []Event
    db      *sqlx.DB
    batchSize int
    ticker  *time.Ticker
}

func NewBatchWriter(db *sqlx.DB, batchSize int, flushInterval time.Duration) *BatchWriter {
    bw := &BatchWriter{
        buffer:    make([]Event, 0, batchSize),
        db:        db,
        batchSize: batchSize,
        ticker:    time.NewTicker(flushInterval),
    }
    go bw.flushLoop()
    return bw
}

func (bw *BatchWriter) Add(e Event) {
    bw.mu.Lock()
    bw.buffer = append(bw.buffer, e)
    if len(bw.buffer) >= bw.batchSize {
        bw.flush()
    }
    bw.mu.Unlock()
}

func (bw *BatchWriter) flush() {
    if len(bw.buffer) == 0 { return }
    tx := bw.db.MustBegin()
    for _, e := range bw.buffer {
        tx.NamedExec(`INSERT INTO events (...) VALUES (...)`, e)
    }
    tx.Commit()
    bw.buffer = bw.buffer[:0]
}
```

Tamaño sugerido: batch de 100 eventos o flush cada 1 segundo, lo que ocurra primero.

### 7.7 Anonimización de Datos (Prioridad: MEDIA)

```go
// Opción 1: Hashear IPs antes de almacenar
func anonymizeIP(ip string) string {
    // Almacenar solo /24 de la IP (ej: 192.168.1.0)
    parts := strings.Split(ip, ".")
    if len(parts) == 4 {
        return fmt.Sprintf("%s.%s.%s.0", parts[0], parts[1], parts[2])
    }
    return ip
}

// Opción 2: Hash SHA256 con salt
func hashIP(ip string) string {
    h := sha256.Sum256([]byte("pepper-salt-" + ip))
    return fmt.Sprintf("%x", h[:8]) // 16 chars hex
}
```

### 7.8 Integración de Eventos desde ProcessEvent (Prioridad: ALTA)

Actualemente, `ProcessEvent` en el engine no persiste en DB. La persistencia ocurre en el broadcaster de cada servidor. Esto tiene varios problemas:

1. Revel no persiste eventos (nunca llama a SaveEvent)
2. Si múltiples servidores escuchan, hay duplicación
3. Si el broadcaster se cae, los eventos se pierden

**Recomendación:** Integrar la persistencia directamente en `ProcessEvent` o en el engine:

```go
type Store interface {
    SaveEvent(e Event) error
    SaveAsset(a Asset) error
    GetLastEvents(limit int) ([]Event, error)
    Close() error
}

type Engine struct {
    // ...
    store Store  // interface instead of concrete
}

func (e *Engine) ProcessEvent(evt Event) {
    // ... existing logic ...
    
    e.Events = append(e.Events, evt)
    
    // Persist async (no bloquear el procesamiento)
    if e.store != nil {
        go func(event Event) {
            if err := e.store.SaveEvent(event); err != nil {
                log.Printf("Warning: failed to persist event: %v", err)
            }
        }(evt)
    }
    
    // Broadcast
    // ...
}
```

### 7.9 Alternativas de Base de Datos

| Opción | Ventajas | Desventajas | Veredicto |
|--------|----------|-------------|-----------|
| **SQLite (actual)** | Simple, sin servidor, embedded | Sin concurrencia real, sin replicación, límite de tamaño | ✅ OK para prototipo/MVP |
| **PostgreSQL (Neon)** | Concurrencia, índices avanzados, pgvector, replicación | Requiere servidor, más complejo | ⭐ Recomendado para producción |
| **Turso (edge SQLite)** | Distribuido, edge, réplicas lectoras | Beta features, limitaciones de SQLite extendido | Opción interesante para edge |
| **DuckDB** | Analytics, columnar, rápido para agregaciones | No diseñado para OLTP transaccional | No para este caso |

**Recomendación:** Mantener SQLite para desarrollo/prototipo. Si el proyecto llega a producción con alta carga, migrar a PostgreSQL (Neon para serverless). La interfaz `Store` como struct (y no como interface) dificulta el cambio — se recomienda abstraerla como interfaz desde ahora.

---

## Resumen de Prioridades

| Prioridad | Acción | Archivo |
|-----------|--------|---------|
| 🔴 CRÍTICA | Eliminar `forensics.db` del repo + añadir `.gitignore` | Repo root |
| 🔴 CRÍTICA | Implementar ring buffer para `Events` slice | engine.go |
| 🔴 CRÍTICA | Añadir índices (timestamp, source, severity) | storage.go |
| 🔴 CRÍTICA | Batch inserts para eventos | storage.go / nuevo batch_writer.go |
| 🔴 CRÍTICA | Revel no persiste eventos nunca | revel controllers |
| 🟡 ALTA | Manejo de errores en SaveEvent (al menos log) | Todos los broadcasters |
| 🟡 ALTA | Completar schema de assets | storage.go |
| 🟡 ALTA | Agregar PRAGMAs de conexión (WAL, busy timeout) | storage.go |
| 🟡 ALTA | Migrar `Event` slice a interfaz `Store` | engine.go |
| 🟡 MEDIA | Política de retención de eventos (purga automática) | storage.go |
| 🟡 MEDIA | Limitar tamaño del GeoIP cache + LRU | geoip.go |
| 🟡 MEDIA | Configurar pool de sqlx (MaxOpenConns=1) | storage.go |
| 🟡 MEDIA | Cambiar `SELECT *` por columnas explícitas | storage.go |
| 🟢 MEJORA | Validar formato IP en handlers de desbloqueo | API servers |
| 🟢 MEJORA | Sistema de migraciones de schema | storage.go |
| 🟢 MEJORA | Anonimización de IPs | storage.go / engine.go |
| 🟢 MEJORA | ThreatDB configurable (desde archivo) | threat_db.go |
| 🟢 MEJORA | Backup automático de forensics.db | Nuevo archivo |

---

## Diagrama de Flujo Actual

```
                   main.go
                      │
                      ├──► NewEngine()
                      │      ├── Events []Event (∞)
                      │      ├── Assets map (∞)
                      │      ├── ThreatDB (4 hardcoded)
                      │      ├── BlockedIPs map
                      │      └── Geo cache (∞)
                      │
                      ├──► NewStore("forensics.db")
                      │      ├── sqlx.Connect (sin PRAGMAs)
                      │      └── MustExec(schema)
                      │
                      └──► Server(engine, store)
                             ├── ProcessEvent()
                             │    ├── Bloqueo mutex
                             │    ├── Update Asset (memoria)
                             │    ├── Threat Check
                             │    ├── Append Events[] (memoria)
                             │    └── Broadcast canal
                             │
                             └── broadcaster() [goroutine]
                                  ├── Subscribe canal
                                  ├── for evt := range ch
                                  │    ├── WebSocket a clientes
                                  │    └── SaveEvent(evt) ← error ignorado
```

---

*Fin del informe.*
