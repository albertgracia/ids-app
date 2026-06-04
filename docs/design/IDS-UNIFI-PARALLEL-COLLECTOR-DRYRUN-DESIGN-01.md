# IDS-UNIFI-PARALLEL-COLLECTOR-DRYRUN-DESIGN-01

## 1. Resumen ejecutivo

Se define el diseno del futuro collector paralelo UniFi en modo dry-run.

La decision de esta fase es:

- no implementar todavia un servicio persistente;
- empezar como herramienta CLI local reutilizando el parser CEF y el mapper ya existentes;
- ejecutar primero sobre samples sinteticos, STDIN y archivos sanitizados;
- no tocar Promtail, UniFi, Loki ni Grafana;
- preservar el pipeline actual de observabilidad y preparar a IDS como consumidor adicional futuro.

## 2. Contexto

El pipeline real actual es:

```text
UniFi Cloud Gateway Fiber
  -> 192.168.1.30:1514
  -> Promtail .30 / job=unifi-ids
  -> Loki .40:3100
  -> Grafana .30 / dashboards UniFi
```

Hechos relevantes ya confirmados:

- Promtail en `.30` escucha `1514/tcp`.
- Promtail envia a `http://192.168.1.40:3100/loki/api/v1/push`.
- Grafana en `.30` consume Loki en `.40`.
- Existen dashboards UniFi ya operativos.
- El parser CEF UniFi ya existe.
- La CLI `unifi-cef-dryrun` ya existe.
- `Loki /ready = 503`, por lo que no conviene usarlo como frontera primaria IDS.
- `Promtail 3.4.2` es legado frente a Alloy, por lo que no conviene acoplar mas el diseno IDS a Promtail.

## 3. No objetivos

Esta fase NO persigue:

- crear un listener TCP/UDP `1514`;
- leer trafico de red;
- consumir Loki de forma masiva;
- modificar `promtail.yml`;
- reemplazar Promtail;
- cambiar UniFi;
- hacer `POST` real a `ids-core`;
- desplegar un servicio en `.30` o `.40`;
- guardar logs reales completos;
- introducir geolocalizacion online, bloqueo automatico o acciones de enforcement.

## 4. Ubicación propuesta

### 4.1 Ubicacion operativa futura

El collector vivira logicamente en `192.168.1.30 (ubuntu-ialab)`.

Justificacion:

- ahi ya llega UniFi;
- evita tocar UniFi;
- evita abrir `1514` en `.40`;
- `.30` ya alcanza `.40`;
- preserva Promtail actual.

### 4.2 Ubicacion de codigo recomendada

Se consideran tres opciones:

#### A. Servicio nuevo fuera de ids-core

`services/unifi-collector/`

**Pros**

- separacion clara de responsabilidades;
- ciclo de vida independiente futuro.

**Contras**

- crea superficie y estructura nuevas demasiado pronto;
- duplica esfuerzo antes de validar la ruta dry-run.

#### B. Comando auxiliar dentro de ids-core

`services/ids-core/cmd/unifi-parallel-collector/`

**Pros**

- reutiliza parser, mapper y `domain.Event` ya existentes;
- facilita evolucion desde CLI dry-run;
- no acopla aun el collector al binario principal `ids-core`.

**Contras**

- sigue viviendo en el modulo `ids-core`, aunque no sea un servicio del runtime principal.

#### C. Paquete reusable + comando

`services/ids-core/internal/unifi/collector/`

`services/ids-core/cmd/unifi-parallel-collector/`

**Pros**

- separa logica reusable de la CLI;
- prepara mejor la evolucion a servicio futuro.

**Contras**

- aumenta complejidad de diseño antes de implementar la primera version.

### 4.3 Recomendacion

Empezar por **B**, con evolucion natural hacia **C** cuando haga falta extraer logica reusable.

Decision concreta:

- comenzar como CLI/local tool, no como servicio;
- reutilizar `services/ids-core/internal/unifi`;
- evitar acoplar el collector al binario `ids-core` principal inicialmente.

## 5. Entradas

### 5.1 Entradas permitidas en dry-run inicial

1. `--input file`
2. `--stdin`
3. directorio de samples sinteticos
4. archivo sanitizado manualmente

### 5.2 Entradas NO permitidas todavia

1. listener TCP/UDP `1514`
2. lectura directa de `/var/log/syslog` real completa
3. lectura directa de `Promtail positions`
4. `Loki query` masiva
5. `docker logs`
6. trafico de red
7. `POST` live a `ids-core`

### 5.3 Entradas futuras controladas

- archivo sanitizado extraido manualmente;
- tail controlado de fuente local, si se aprueba;
- `Loki query` limitada para backfill, si se aprueba;
- live relay con auth, si se aprueba.

## 6. Salidas

### 6.1 Salida dry-run

- JSON normalizado por `stdout`;
- resumen final de conteos;
- errores por `stderr`;
- exit code distinto de `0` si hay errores bloqueantes;
- sin escritura en disco por defecto;
- sin `POST`.

### 6.2 Formato por evento

```json
{
  "source": "unifi_parallel_collector",
  "mode": "dry_run",
  "line": 1,
  "raw_hash": "sha256:...",
  "parse_status": "ok|error|skipped|duplicate",
  "normalized": {},
  "domain_event": {},
  "warnings": []
}
```

### 6.3 Resumen final

```json
{
  "summary": {
    "total_lines": 10,
    "parsed": 8,
    "skipped": 1,
    "errors": 1,
    "duplicates": 0,
    "event_types": {},
    "severities": {}
  }
}
```

### 6.4 Formato de emision

Recomendacion:

- **NDJSON por defecto** para pipeline y lotes;
- **JSON pretty** opcional para humanos.

Motivo:

- NDJSON escala mejor para lotes grandes y pipeado;
- JSON pretty es mas legible para analisis manual.

## 7. raw_hash y deduplicacion

### 7.1 raw_hash

`raw_hash` sera:

- `sha256:` + hash SHA-256 del mensaje CEF canonicalizado.

Canonicalizacion minima:

- trim de whitespace externo;
- normalizacion de fin de linea;
- sin reordenar campos;
- sin reinterpretar escapes;
- sin guardar raw completo por defecto.

### 7.2 Dedupe dry-run

Modo inicial:

- dedupe in-memory.

Clave minima:

- `raw_hash`.

Clave ampliada futura:

- `raw_hash + source + timestamp_bucket`.

### 7.3 Casos a contemplar

- duplicado exacto;
- mismo mensaje con timestamp distinto;
- misma alerta repetida por UniFi;
- multiline / noise.

### 7.4 Riesgos

- dedupe solo por `raw_hash` puede no colapsar eventos semanticamente iguales con pequeñas variaciones;
- una ventana demasiado agresiva puede ocultar repeticiones relevantes;
- una ventana demasiado laxa puede inflar conteos.

## 8. Sanitizacion y privacidad

### 8.1 Campos sensibles posibles

- IPs internas;
- MACs;
- nombres de clientes;
- nombres de dispositivos;
- dominios DNS;
- usuarios;
- mensajes raw.

### 8.2 Politica base

- no guardar raw completo por defecto;
- `raw_hash` si;
- no commitear logs reales;
- no enviar a terceros;
- no GeoIP online.

### 8.3 Flags futuras previstas

- `--redact-ip`
- `--redact-mac`
- `--redact-client-name`
- `--include-raw=false` por defecto

## 9. Error handling

### 9.1 Clasificacion por linea

- `empty line` -> `skipped` o warning agregado
- `invalid CEF` -> error controlado
- `unsupported CEF` -> warning
- `invalid port` -> warning, no silencio
- `unknown signature` -> `unclassified_event` + warning
- `missing src/dst` -> warning
- `escape not supported` -> warning si se detecta patron sospechoso
- `duplicate exact` -> `duplicate`

### 9.2 Exit codes

- `0`: parsed > 0 y errors = 0
- `1`: errors > 0
- `2`: input invalido o no existe
- `3`: configuracion invalida
- `4`: limite de seguridad excedido

## 10. Reutilizacion de codigo

### 10.1 Reutilizar

- `ParseCEF`
- `NormalizeCEF`
- `ToDomainEvent`
- flujo de lectura `--input/--stdin`
- calculo base de `raw_hash`
- proyeccion JSON estable inspirada en `unifi-cef-dryrun`
- samples sinteticos existentes

### 10.2 No duplicar

- parser CEF paralelo
- modelo normalizado distinto de `UniFiEvent`
- contrato distinto de `domain.Event`
- otra CLI con la misma logica base del dry-run actual

### 10.3 Limitaciones conocidas del parser actual

- subset de CEF;
- sin soporte completo de escapes;
- validado con samples sinteticos, no con logs reales extremos;
- clasificacion `EventType/Category` heuristica;
- logica `Direction/Zone` simplificada.

## 11. Contrato futuro hacia ids-core

### 11.1 Opciones consideradas

- `POST` single event
- `POST` batch
- endpoint especifico `/api/v1/unifi/cef`
- endpoint generico `/api/v1/events/ingest`

### 11.2 Recomendacion

- no reutilizar endpoint Suricata;
- disenar endpoint futuro especifico o generico controlado, por ejemplo:
  - `POST /api/internal/v1/ingest/events/unifi`
  - o `POST /api/v1/events/ingest` si se generaliza bien.

### 11.3 Requisitos minimos

- auth/token obligatorio;
- allowlist de origen `.30`;
- batch limitado;
- `idempotency_key` basada inicialmente en `raw_hash`;
- sin live hasta persistencia o aceptacion explicita del riesgo.

### 11.4 Storage risk

- `ids-core` sigue con `storage_mode=memory`;
- antes de live ingest hace falta persistencia o aceptacion explicita del riesgo de perdida tras reinicio.

## 12. Seguridad operacional

- dry-run por defecto;
- no listener por defecto;
- no `POST` por defecto;
- confirmacion explicita para live;
- token futuro en env/secret, nunca en repo;
- allowlist de origen;
- timeout y retry limitados;
- circuit breaker;
- rate limit;
- backpressure;
- logs del collector sin raw completo;
- health endpoint futuro solo local/LAN;
- no auto-blocking;
- no modificar reglas UniFi.

## 13. Fases futuras

1. `IDS-UNIFI-PARALLEL-COLLECTOR-LOCAL-CLI-01`
   - implementar CLI collector dry-run con `--input/--stdin`;
   - reutilizar parser existente;
   - sin `POST`.

2. `IDS-UNIFI-PARALLEL-COLLECTOR-SANITIZED-LOG-SAMPLE-01`
   - procedimiento para extraer 5-10 lineas reales sanitizadas manualmente;
   - no commitear raw real;
   - validar parser contra variaciones reales.

3. `IDS-UNIFI-PARALLEL-COLLECTOR-IDS-CORE-CONTRACT-01`
   - disenar e implementar contrato endpoint `ids-core`;
   - auth/allowlist/batch/dedupe;
   - todavia sin live.

4. `IDS-UNIFI-PARALLEL-COLLECTOR-STAGING-DRYRUN-01`
   - ejecutar collector en `.30` en dry-run sin `POST`;
   - medir parse rate;
   - no servicio persistente.

5. `IDS-UNIFI-PARALLEL-COLLECTOR-LIVE-INGEST-GATED-01`
   - live limitado con token, batch pequeno y rollback;
   - solo tras persistencia o aceptacion del riesgo.

6. `IDS-UNIFI-GATEWAY-IDS-DASHBOARD-INTEGRATION-01`
   - UI cuando haya flujo real o contrato estable.

## 14. Riesgos residuales

- logs reales UniFi aun no validados extremo a extremo;
- necesidad de dedupe bien calibrado;
- riesgo de parseo parcial por CEF simplificado;
- riesgo de fuga de datos sensibles si no se fuerza sanitizacion;
- `ids-core` aun no es un destino live endurecido.

## 15. Preguntas abiertas

1. Cual sera la fuente canonica futura: archivo sanitizado, `journald`, `syslog` o una extraccion manual intermedia.
2. Si el collector live debera ejecutarse como proceso one-shot, timer o servicio persistente.
3. Si el endpoint futuro de `ids-core` sera especifico UniFi o generico de ingest.
4. Que politica exacta de retencion y persistencia se aprobara antes de live ingest.
