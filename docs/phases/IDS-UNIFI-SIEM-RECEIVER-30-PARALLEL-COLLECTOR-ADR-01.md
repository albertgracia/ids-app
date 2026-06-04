# IDS-UNIFI-SIEM-RECEIVER-30-PARALLEL-COLLECTOR-ADR-01

## 1. Resultado

PASS.

Se creo una ADR formal para fijar la decision de arquitectura del futuro collector paralelo UniFi IDS en `.30`, preservando el pipeline actual de observabilidad y definiendo una hoja de ruta por fases para una integracion segura con `ids-core` en `.40`.

## 2. Rama / HEAD

- Rama: `scaffold/ids-v2-dev-env-01`
- HEAD inicial: `6779273`
- HEAD final: pendiente del commit documental de esta fase

## 3. Motivo de la ADR

Las fases previas ya confirmaron:

- UniFi envia a `192.168.1.30:1514`.
- `Promtail` en `.30` recibe `job=unifi-ids`.
- `Promtail` empuja a `Loki` en `.40`.
- `Grafana` en `.30` ya consume ese pipeline y tiene dashboards UniFi activos.
- El parser CEF y la CLI dry-run del IDS ya existen.

La ADR era necesaria para fijar una decision formal que:

- preserve el pipeline actual;
- evite tocar UniFi o Promtail;
- defina como IDS sera un consumidor adicional;
- documente por que `Loki` no debe ser la frontera primaria de ingest IDS.

## 4. Pipeline actual

```text
UniFi Cloud Gateway Fiber
  -> 192.168.1.30:1514
  -> Promtail .30 / job=unifi-ids
  -> Loki .40:3100
  -> Grafana .30 / dashboards UniFi
```

Estado operativo resumido:

- `Promtail` escucha en `1514/tcp`.
- `Promtail` usa `listen_protocol: tcp`.
- `Promtail` envia a `http://192.168.1.40:3100/loki/api/v1/push`.
- `Grafana` tiene datasource `Loki` hacia `http://192.168.1.40:3100`.
- Hay dashboards con consultas `{job="unifi-ids"}`.

## 5. Decisión adoptada

**Adoptar un collector paralelo en `.30` como futura ruta de ingest IDS.**

Puntos clave:

- no sustituye `Promtail`;
- no modifica el flujo actual UniFi -> Promtail -> Loki -> Grafana;
- empieza en modo dry-run;
- usa parser CEF existente;
- calcula `raw_hash`;
- deduplica por `raw_hash` y ventana temporal;
- añade sanitizacion, retry, rate limit y backpressure;
- solo mas adelante enviara a `ids-core` `.40` mediante endpoint autenticado y controlado.

## 6. Opciones evaluadas

### A — Loki query

- util para apoyo o backfill;
- no adecuado como fuente primaria por `ready=503`, frescura incierta y acoplamiento a observabilidad.

### B — Duplicar Promtail

- descartada ahora por riesgo de romper `promtail.yml` y el pipeline actual.

### C — Collector paralelo

- seleccionada;
- preserva el pipeline existente y da control total al IDS.

### D — Alloy

- reservada para una evolucion futura, no para el siguiente paso.

### E — Mover UniFi a `.40`

- descartada ahora por mayor riesgo operativo y por tocar la fuente.

## 7. Arquitectura propuesta

### Etapa 1

```text
UniFi -> Promtail .30 -> Loki .40 -> Grafana .30
                   |
                   +-- collector paralelo futuro .30 -> normalizacion dry-run
```

### Etapa 2

```text
collector paralelo .30 -> ids-core .40 ingest endpoint
```

### Etapa 3

```text
collector paralelo .30 -> ids-core .40 -> dashboard IDS UniFi
```

## 8. Reglas de seguridad

- no tocar UniFi;
- no modificar `Promtail` ni `promtail.yml`;
- no reiniciar servicios;
- no abrir puertos;
- no hacer `POST` real hasta tener endpoint autenticado y allowlist;
- no subir logs reales completos al repo;
- sanitizar datos sensibles;
- usar `raw_hash` para trazabilidad y dedupe;
- dry-run por defecto.

## 9. Fases futuras

1. `IDS-UNIFI-PARALLEL-COLLECTOR-DRYRUN-DESIGN-01`
2. `IDS-UNIFI-PARALLEL-COLLECTOR-LOCAL-CLI-01`
3. `IDS-UNIFI-PARALLEL-COLLECTOR-SANITIZED-LOG-SAMPLE-01`
4. `IDS-UNIFI-PARALLEL-COLLECTOR-IDS-CORE-CONTRACT-01`
5. `IDS-UNIFI-PARALLEL-COLLECTOR-STAGING-DRYRUN-01`
6. `IDS-UNIFI-PARALLEL-COLLECTOR-LIVE-INGEST-GATED-01`
7. `IDS-UNIFI-GATEWAY-IDS-DASHBOARD-INTEGRATION-01`

## 10. Riesgos

- `Promtail 3.4.2` es legacy frente a Alloy.
- `Loki` muestra `ready=503` aunque responde labels/queries limitadas.
- El parser CEF todavia no esta validado con logs reales UniFi extremo a extremo.
- La deduplicacion es obligatoria para evitar contar doble el mismo evento.
- Los logs reales pueden incluir IPs, MACs y nombres de clientes.
- `.30` sigue siendo punto critico de entrada.
- `ids-core` aun requiere endurecimiento para ingest live autenticado y persistente.

## 11. Qué NO se tocó

- UniFi
- SIEM actual
- NetFlow/IPFIX
- Promtail
- Loki
- Grafana
- Docker destructivo
- firewall
- DB / Redis / Postgres
- Nginx / Cloudflare
- `.env`
- codigo funcional

## 12. Próxima fase recomendada

`IDS-UNIFI-PARALLEL-COLLECTOR-DRYRUN-DESIGN-01`
