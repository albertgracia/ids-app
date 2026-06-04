# IDS-UNIFI-SIEM-RECEIVER-30-TO-40-RELAY-PLAN-01

## 1. Resultado

PASS.

La fase permitio inventariar en modo read-only el pipeline actual de recepcion UniFi en `.30`, confirmar su destino real hacia Loki en `.40`, revisar de forma sanitizada la configuracion de Promtail y recopilar evidencia suficiente para recomendar una estrategia de integracion con IDS que preserve el pipeline existente.

## 2. Rama / HEAD

- Rama: `scaffold/ids-v2-dev-env-01`
- HEAD inicial: `68d36be`
- HEAD final: pendiente del commit documental de esta fase

## 3. Estado .40 IDS

### Host

- Hostname: `ubuntu-server`
- Usuario: `albert`
- PWD: `/home/albert`

### Compose ids-app

Servicios observados sanos:

- `ids-core`
- `ids-web`
- `ids-analytics`
- `ids-mcp`
- `ids-postgres`
- `ids-redis`

Todos con:

- `status=running`
- `health=healthy`
- `restartCount=0`

### Health endpoints locales

- `127.0.0.1:8088/healthz` -> OK (`ids-core`)
- `127.0.0.1:3002/api/health` -> OK (`ids-web`)
- `127.0.0.1:8090/healthz` -> OK (`analytics-api`)
- `127.0.0.1:8091/healthz` -> OK (`ids-mcp`)

## 4. Estado .30 Promtail

### Host

- Hostname: `ubuntu-ialab`
- Usuario: `albert`
- PWD: `/home/albert`

### Contenedor Promtail

- Contenedor: `promtail`
- Imagen: `grafana/promtail:3.4.2`
- Estado: `running`
- Restart count: `0`
- StartedAt: `2026-06-03T07:53:51.358755266Z`
- Puerto expuesto: `0.0.0.0:1514->1514/tcp`, `[::]:1514->1514/tcp`

### Puertos / listener

Comprobacion read-only:

```bash
ss -tulpn | grep -Ei '1514|:514|3100|9080|12345|promtail|loki|grafana|alloy'
```

Hallazgo:

- listener TCP en `0.0.0.0:1514`
- listener TCP en `[::]:1514`

### Mounts relevantes de Promtail

`docker inspect` mostro mounts read-only:

- `/opt/ai-lab/stacks/promtail/promtail.yml` -> `/etc/promtail/promtail.yml`
- `/var/log`
- `/var/log/journal`
- `/var/lib/docker/containers`
- `/var/run/docker.sock`
- `/run/log`

Esto confirma que Promtail ve logs de host, journald y logs de contenedores.

## 5. Config Promtail sanitizada / resumida

### Ficheros del stack

En `/opt/ai-lab/stacks/promtail/`:

- `docker-compose.yml` (`676 bytes`)
- `promtail.yml` (`1799 bytes`)

### Resumen de configuracion

Bloques relevantes detectados en `promtail.yml`:

- `server:`
  - `http_listen_port: 9080`
  - `grpc_listen_port: 0`
- `positions:`
  - `filename: /tmp/positions.yaml`
- `clients:`
  - `url: http://192.168.1.40:3100/loki/api/v1/push`
- `scrape_configs:`
  - `job_name: docker`
  - `job_name: journald`
  - `job_name: unifi-ids`

### Bloque syslog UniFi

Para `job_name: unifi-ids`:

- `listen_address: 0.0.0.0:1514`
- `listen_protocol: tcp`
- `idle_timeout: 60s`
- `max_message_length: 8192`

### Relabeling / labels

Promtail aplica `relabel_configs` para convertir metadata syslog en labels Loki:

- `__syslog_message_hostname` -> `host`
- `__syslog_message_facility` -> `facility`
- `__syslog_message_severity` -> `severity`
- `__syslog_message_app_name` -> `app_name`
- `replacement: unifi-ids` -> `job`

### Pipeline stages

No se detectaron `pipeline_stages` explicitos para transformar o parsear CEF. El pipeline actual parece recibir syslog y etiquetarlo, no normalizarlo para IDS.

## 6. Destino Loki actual

### Destino configurado

Promtail envia actualmente a:

- `http://192.168.1.40:3100/loki/api/v1/push`

### Evidencia Grafana

La provision de datasource en `.30` confirma:

- datasource `Prometheus` -> `http://192.168.1.40:9090`
- datasource `Loki` -> `http://192.168.1.40:3100`

### Estado read-only observado

En `.40`:

- `GET /loki/api/v1/labels` -> responde OK
- `GET /loki/api/v1/label/job/values` -> responde OK
- `GET /ready` -> `503`

Desde `.30` hacia `.40`:

- `GET http://192.168.1.40:3100/ready` -> `503`
- `GET http://192.168.1.40:3100/loki/api/v1/labels` -> responde OK

Interpretacion:

- Loki es alcanzable y responde consultas de labels.
- El endpoint `ready` no esta sano, por lo que el estado de ingesta/serving no puede asumirse como plenamente saludable.
- Es un pipeline activo de observabilidad, pero con señal de degradacion parcial.

## 7. Evidencia limitada UniFi sin logs sensibles

### Syslog host

Conteo limitado en `/var/log/syslog` para `unifi|ubiquiti|cef|Ubiquiti|UniFi`:

- `61`

### Grafana / dashboards

Se observaron referencias directas a UniFi en dashboards provisionados, por ejemplo:

- `UniFi Cloud Gateway Fiber`
- `UniFi Switch USW Flex 2.5G 8 PoE`
- `UniFi Access Points WiFi`

Ademas, dashboards Loki provisionados contienen expresiones como:

- `{job="unifi-ids"}`
- `sum(rate({job="unifi-ids"}[$__auto]))`
- `count_over_time({job="unifi-ids"}[$__auto])`

Esto confirma que ya existe un pipeline de observabilidad pensado para eventos UniFi, aunque no se haya validado aqui el payload completo ni la frescura exacta del job en Loki.

### Logs sensibles impresos

No. Solo se usaron conteos, labels y metadatos limitados.

## 8. Opciones A/B/C/D/E

### Opcion A — Query desde Loki existente

**Pros**

- no toca Promtail;
- aprovecha un pipeline ya existente.

**Contras**

- acopla IDS a Loki como fuente primaria;
- complica polling, dedupe y frescura;
- `job=unifi-ids` aparece en dashboards/config, pero no se observo activo en `label/job/values` actual;
- `ready=503` en Loki indica riesgo operacional.

**Riesgo**: medio-alto.

### Opcion B — Duplicar salida en Promtail

**Pros**

- UniFi seguiria igual;
- Promtail ya recibe el stream.

**Contras**

- requiere modificar `promtail.yml`;
- arriesga romper el pipeline actual de observabilidad;
- Promtail 3.4.2 es una pieza legacy frente a Alloy;
- no es ideal para transformar CEF hacia contrato IDS.

**Riesgo**: alto.

### Opcion C — Añadir collector/relay paralelo en `.30`

**Pros**

- preserva Promtail/Loki/Grafana actuales;
- IDS pasa a ser consumidor adicional;
- permite usar parser CEF existente y estrategia propia de `raw_hash`/dedupe;
- desacopla observabilidad de ingest IDS;
- minimiza riesgo de romper logs actuales.

**Contras**

- requiere decidir fuente controlada (`syslog`, `journald` u otra copia host-side);
- necesita diseno de buffering, rate limit y autenticacion hacia `.40`.

**Riesgo**: medio, pero controlable.

### Opcion D — Migrar a Alloy como pipeline futuro

**Pros**

- camino moderno;
- podria unificar observabilidad y recepcion futura.

**Contras**

- cambio grande sobre un stack ya activo;
- no encaja como siguiente paso inmediato si la prioridad es no romper el pipeline actual.

**Riesgo**: alto en el corto plazo.

### Opcion E — Mover UniFi a `.40`

**Pros**

- camino directo al IDS.

**Contras**

- toca UniFi;
- requiere abrir o gestionar `1514` en `.40`;
- rompe el principio de preservar el pipeline actual probado.

**Riesgo**: alto e innecesario ahora.

## 9. Matriz simple

| Opcion | Impacto sobre pipeline actual | Complejidad | Riesgo | Encaje actual |
|--------|-------------------------------|-------------|--------|---------------|
| A Loki query | Bajo | Medio | Medio-alto | Util solo como apoyo/backfill |
| B Duplicar Promtail | Alto | Medio | Alto | No recomendado ahora |
| C Collector paralelo | Bajo | Medio | Medio | Recomendado |
| D Migrar Alloy | Alto | Alto | Alto | Futuro, no inmediato |
| E Mover UniFi a .40 | Alto | Medio | Alto | No recomendado ahora |

## 10. Recomendacion

### Opcion recomendada

**Opcion C — collector/relay paralelo en `.30`, manteniendo Promtail/Loki/Grafana intactos y agregando IDS como consumidor adicional.**

### Motivo

- cumple la restriccion operativa del operador;
- preserva el pipeline activo que ya soporta dashboards/alertas UniFi en Grafana;
- evita modificar Promtail, reiniciar contenedores o tocar UniFi;
- encaja bien con el parser CEF y la CLI dry-run ya construidos;
- permite introducir deduplicacion por `raw_hash`, control de backpressure y autenticacion hacia `.40` sin mezclar esos requisitos con el stack actual de observabilidad.

### Sobre Loki

Loki debe considerarse **fuente secundaria de observabilidad o backfill**, no fuente primaria de ingest IDS, por estas razones:

- `ready=503`;
- evidencia de dashboards/labels, pero no confirmacion fuerte de stream vivo `job=unifi-ids` en valores actuales;
- riesgo de falsa confianza operacional si se usa como frontera primaria.

## 11. Fases futuras

### Fase inmediata recomendada

`IDS-UNIFI-SIEM-RECEIVER-30-PARALLEL-COLLECTOR-ADR-01`

Objetivo:

- decidir fuente canonica del collector paralelo (`syslog` host-side, journald u otra via segura);
- definir contrato de evento relayado a `.40`;
- definir `raw_hash`, dedupe e idempotencia;
- definir auth/allowlist y politicas de retry/backoff;
- no desplegar todavia.

### Fase posterior

`IDS-UNIFI-SIEM-RECEIVER-30-PARALLEL-COLLECTOR-DRYRUN-01`

Objetivo:

- probar el relay en modo local/dry-run con eventos sanitizados o lectura controlada, sin tocar Promtail actual.

## 12. Riesgos

- `promtail 3.4.2` es componente legacy frente a Alloy.
- Cambiar `promtail.yml` podria romper la recepcion SIEM actual.
- Los logs UniFi pueden contener IPs, MACs y nombres de clientes.
- Duplicar logs puede duplicar eventos si no se aplica dedupe por `raw_hash`.
- Se necesitan rate limit y backpressure en cualquier envio a `.40`.
- No se debe exponer un endpoint IDS sin auth/allowlist.
- La retencion Loki no equivale a almacenamiento IDS.
- El parser CEF todavia no esta validado con logs reales UniFi extremo a extremo.
- `.30` y `.40` cumplen roles distintos; conviene evitar acoplamiento fuerte.

## 13. Que NO se toco

- UniFi
- destino SIEM configurado
- NetFlow/IPFIX
- Promtail
- `promtail.yml`
- Docker en modo destructivo
- reinicios de contenedores o servicios
- puertos
- firewall
- DB / Redis / Postgres
- Nginx / Cloudflare
- `.env`
- staging
- trafico real
- logs sensibles
- secretos

## 14. Proxima fase recomendada

`IDS-UNIFI-SIEM-RECEIVER-30-PARALLEL-COLLECTOR-ADR-01`
