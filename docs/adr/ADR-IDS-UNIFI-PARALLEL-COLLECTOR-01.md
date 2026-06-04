# ADR-IDS-UNIFI-PARALLEL-COLLECTOR-01

## Estado

Propuesta aceptada / Accepted for staged implementation

## Fecha

2026-06-04

## Contexto

UniFi Cloud Gateway Fiber ya envia SIEM/Syslog a `192.168.1.30:1514`.

En `192.168.1.30` se confirmo un pipeline activo de observabilidad:

- `Promtail` recibe en `job=unifi-ids`.
- `Promtail` escucha en `0.0.0.0:1514` con `listen_protocol: tcp`.
- `Promtail` empuja a `Loki` en `192.168.1.40:3100`.
- `Grafana` en `.30` consume `Loki` en `.40`.
- Existen dashboards provisionados que ya usan consultas `{job="unifi-ids"}` y `count_over_time(...)`.

Ese pipeline ya esta en uso y no debe romperse.

El IDS necesita una ruta propia para eventos UniFi que permita:

- eventos normalizados;
- deduplicacion controlada;
- sanitizacion de datos sensibles;
- control de rate limit / backpressure;
- integracion futura con `ids-core` en `.40`.

Ya existen dos artefactos locales relevantes:

- parser CEF UniFi;
- CLI dry-run UniFi CEF.

Tambien existen limites importantes del pipeline actual de observabilidad:

- `Loki` responde a labels y consultas limitadas, pero `GET /ready` devuelve `503`.
- `Promtail 3.4.2` es una pieza legacy frente a Alloy.
- El pipeline actual esta orientado a observabilidad y dashboards, no a servir como frontera primaria de ingest IDS.

Por tanto, acoplar IDS directamente a Loki o a Promtail aumentaria el riesgo sobre un flujo ya operativo.

## Decisión

Adoptar un **collector paralelo en `.30`** como ruta futura de ingest IDS.

El collector paralelo debe:

- no sustituir `Promtail`;
- no modificar el flujo `UniFi -> Promtail -> Loki -> Grafana`;
- empezar en modo dry-run;
- leer primero samples, STDIN y logs sanitizados;
- en fase posterior, consumir una fuente controlada local;
- normalizar CEF con el parser existente;
- calcular `raw_hash`;
- deduplicar por `raw_hash` mas timestamp/ventana;
- aplicar rate limit y backpressure;
- sanitizar datos sensibles;
- solo mas adelante enviar a `ids-core` `.40` mediante endpoint controlado y autenticado.

## Opciones consideradas

### A — Consultar Loki existente

**Pros**

- no toca `Promtail`;
- no toca UniFi;
- aprovecha el pipeline actual;
- puede ser util para backfill o diagnostico.

**Contras**

- acopla IDS a `Loki`;
- `ready=503` en `3100`;
- query, retencion y frescura no son ideales como frontera primaria;
- riesgo de consumir mensajes reales sensibles fuera del camino minimo;
- no resuelve por si sola dedupe e idempotencia.

**Decision**

- no usar como fuente primaria;
- mantener como apoyo/backfill futuro si hace falta.

### B — Duplicar salida Promtail

**Pros**

- `Promtail` ya recibe UniFi;
- no cambia UniFi.

**Contras**

- requiere modificar `promtail.yml`;
- riesgo de romper dashboards y pipeline actuales;
- `Promtail` es legacy frente a Alloy;
- transformacion CEF limitada para necesidades IDS.

**Decision**

- no ahora.

### C — Collector paralelo en `.30`

**Pros**

- preserva el pipeline existente;
- control total de normalizacion;
- permite `raw_hash`, dedupe, rate limit y backpressure;
- puede evolucionar hacia `ids-core`;
- no requiere tocar UniFi inicialmente.

**Contras**

- hay que disenar la fuente de entrada;
- riesgo de duplicados si no se define bien la clave de dedupe;
- debe proteger privacidad y minimizacion de datos;
- requiere proceso/servicio futuro propio.

**Decision**

- opcion seleccionada.

### D — Migrar a Alloy

**Pros**

- camino moderno;
- pipeline de observabilidad mas unificado a futuro.

**Contras**

- cambio grande;
- riesgo alto para AI-LAB/observabilidad si se hace antes de desacoplar;
- requiere fase dedicada, rollback y ventana operativa.

**Decision**

- futuro, no ahora.

### E — Mover UniFi a `.40`

**Pros**

- ruta directa al IDS.

**Contras**

- toca UniFi;
- obliga a abrir/gestionar `1514` en `.40`;
- rompe o duplica el pipeline actual;
- aumenta el riesgo sin necesidad inmediata.

**Decision**

- no ahora.

## Arquitectura propuesta

### Fase actual / futura inicial

```text
UniFi -> Promtail .30 -> Loki .40 -> Grafana .30
                   |
                   +-- collector paralelo futuro .30 -> normalizacion dry-run
```

### Fase posterior controlada

```text
collector paralelo .30 -> ids-core .40 ingest endpoint
```

### Fase posterior avanzada

```text
collector paralelo .30 -> ids-core .40 -> dashboard IDS UniFi
```

## Contrato del collector futuro

### Entradas iniciales

- archivo sample;
- STDIN;
- logs sanitizados;
- eventualmente una fuente controlada local.

### Entradas NO iniciales

- listener TCP/UDP `1514`;
- lectura directa de trafico;
- modificacion de `Promtail`;
- consumo masivo de `Loki`.

### Salida dry-run

- JSON normalizado;
- `domain.Event` local;
- `raw_hash`;
- estadisticas de parseo;
- errores controlados.

### Salida futura

- `POST` autenticado a `ids-core` `.40`;
- batch controlado;
- retry limitado;
- backpressure;
- metricas del collector.

## Seguridad

El collector futuro debe incluir estas reglas desde diseño:

- no exponer Internet;
- allowlist de origen si alguna vez escucha;
- no guardar secretos;
- no subir logs reales completos al repo;
- sanitizacion de IP/MAC/nombres si procede;
- `raw_hash` para trazabilidad;
- dedupe;
- rate limit;
- modo dry-run por defecto;
- no bloqueo automatico;
- no modificar reglas UniFi;
- no usar GeoIP online;
- retencion controlada.

## Decisiones de implementación futura

Fases propuestas:

1. `IDS-UNIFI-PARALLEL-COLLECTOR-DRYRUN-DESIGN-01`
2. `IDS-UNIFI-PARALLEL-COLLECTOR-LOCAL-CLI-01`
3. `IDS-UNIFI-PARALLEL-COLLECTOR-SANITIZED-LOG-SAMPLE-01`
4. `IDS-UNIFI-PARALLEL-COLLECTOR-IDS-CORE-CONTRACT-01`
5. `IDS-UNIFI-PARALLEL-COLLECTOR-STAGING-DRYRUN-01`
6. `IDS-UNIFI-PARALLEL-COLLECTOR-LIVE-INGEST-GATED-01`
7. `IDS-UNIFI-GATEWAY-IDS-DASHBOARD-INTEGRATION-01`

## Consecuencias

### Positivas

- menor riesgo inmediato;
- preserva `Promtail/Loki/Grafana`;
- permite maduracion progresiva;
- IDS mantiene control de normalizacion y dedupe.

### Negativas

- mas componentes;
- mas diseño previo;
- dedupe necesario;
- el ingest live tardara mas que una duplicacion directa.

## Riesgos residuales

- logs reales UniFi todavia no validados extremo a extremo con el parser;
- `Promtail` legacy;
- `Loki /ready = 503`;
- posible duplicidad si el collector lee una fuente no canonica;
- datos sensibles en logs reales;
- `.30` como punto critico de entrada;
- `ids-core` todavia usa `storage_mode=memory`;
- el endpoint futuro de ingest debe tener auth y allowlist.
