# IDS-UNIFI-SIEM-RECEIVER-30-READONLY-INVENTORY-01

## 1. Resultado

PARTIAL.

La fase produjo inventario read-only valido sobre `192.168.1.40` y confirmo que `192.168.1.30` responde a ICMP, pero no tiene acceso SSH no interactivo disponible para continuar el inventario read-only del receptor SIEM real. Por politica, no se insistio con password ni workarounds.

## 2. Rama / HEAD

- Rama: `scaffold/ids-v2-dev-env-01`
- HEAD inicial: `0b689c9`
- HEAD final: pendiente del commit documental de esta fase

## 3. Alcance

Se ejecutaron solo comandos read-only:

- baseline local de Git;
- comprobacion de reachability ICMP a `.40` y `.30`;
- inventario read-only de `ids-observabilidad (.40)` por SSH;
- prueba de SSH no interactivo a `.30`.

No se instalaron servicios, no se abrieron puertos, no se reinicio nada y no se hizo POST a `ids-core`.

## 4. Estado IDS .40

### Identidad del host

- Hostname: `ubuntu-server`
- Usuario: `albert`
- PWD: `/home/albert`

### Fecha / uptime

- Fecha observada: `jue 04 jun 2026 02:36:10 CEST`
- Uptime observado: `16:42`

### Docker compose ids-app

Comando ejecutado:

```bash
ssh ids-observabilidad "cd /home/albert/docker/ids-app && docker compose --env-file .env -f compose.yaml ps"
```

Estado observado:

- `ids-core`: `Up` / `healthy`
- `ids-web`: `Up` / `healthy`
- `ids-analytics`: `Up` / `healthy`
- `ids-mcp`: `Up` / `healthy`
- `ids-postgres`: `Up` / `healthy`
- `ids-redis`: `Up` / `healthy`

### Restart count / health

Todos los contenedores inspeccionados mostraron:

- `restartCount=0`
- `status=running`
- `health=healthy` o equivalente esperado

### Health endpoints locales

Comando ejecutado:

```bash
ssh ids-observabilidad "curl -fsS http://127.0.0.1:8088/healthz && curl -fsS http://127.0.0.1:3002/api/health && curl -fsS http://127.0.0.1:8090/healthz && curl -fsS http://127.0.0.1:8091/healthz"
```

Respuestas:

- `ids-core` (`8088`): `{"service":"ids-core","status":"ok"}`
- `ids-web` (`3002`): `{"service":"ids-web","status":"ok","mode":"development"}`
- `analytics` (`8090`): `{"service":"analytics-api","status":"ok"}`
- `mcp` (`8091`): `{"service":"ids-mcp","status":"ok","mode":"read_only"}`

## 5. Acceso SSH .30

### Reachability local

Comando ejecutado:

```powershell
Test-Connection -ComputerName 192.168.1.30 -Count 2 -Quiet
```

Resultado: `True`

### SSH no interactivo

Comando ejecutado:

```bash
ssh -o BatchMode=yes 192.168.1.30 "hostname && whoami && pwd"
```

Resultado:

```text
leobc@192.168.1.30: Permission denied (publickey,password).
```

Interpretacion:

- `.30` es alcanzable por red.
- No hay autenticacion SSH no interactiva disponible con la identidad actual.
- La fase se detiene aqui para `.30`, como exige el prompt.

## 6. Inventario .30

No disponible por falta de SSH no interactivo.

Por tanto, no se pudo validar read-only:

- hostname real de `.30`;
- usuario remoto efectivo;
- interfaces y rutas;
- si escucha en `1514`;
- que proceso escucha;
- si hay `rsyslog`, `syslog-ng`, `vector`, `fluent-bit`, `promtail`, `alloy`, `filebeat`, `logstash`, `graylog` u otro collector;
- paths de configuracion;
- evidencia de logs UniFi.

## 7. Estado puerto 1514

No validado.

Con la evidencia actual, solo se puede afirmar que:

- UniFi esta configurado para enviar SIEM/Syslog a `192.168.1.30:1514`.
- `.30` responde a ICMP.
- No existe evidencia read-only en esta fase de que haya un listener activo en `1514`.

## 8. Servicios syslog / collector

No validados en `.30` por falta de acceso SSH no interactivo.

No se debe asumir presencia de:

- `rsyslog`
- `syslog-ng`
- `vector`
- `fluent-bit`
- `promtail`
- `alloy`
- `filebeat`
- `logstash`
- `graylog`

## 9. Config paths encontrados

No aplicable en `.30` por falta de acceso.

## 10. Evidencia de logs UniFi sin contenido sensible

No aplicable en `.30` por falta de acceso.

## 11. Conectividad .30 -> .40

No validada desde `.30`.

Lo unico confirmado es:

- `.40` responde y esta sano desde su propia vista local.
- `.30` responde a ICMP desde el operador local.

No hay evidencia en esta fase de que `.30` pueda alcanzar por HTTP a:

- `http://192.168.1.40:8088/healthz`
- `http://192.168.1.40:3002/api/health`

## 12. Opciones evaluadas

### Opcion A — `.30` receiver + relay a `.40`

No recomendable todavia.

Motivo:

- no hay inventario del listener `1514`;
- no se sabe si `.30` ya recibe;
- no se sabe si `.30` puede relayar a `.40`.

### Opcion B — mover UniFi a `.40` en futuro

Posible a futuro, pero no recomendada aun como accion inmediata.

Motivo:

- evita depender de `.30`;
- pero requeriria futura fase operativa para exponer o permitir `1514` en `.40`;
- esta fase no autoriza cambios en UniFi ni en red.

### Opcion C — dry-run offline hasta tener acceso `.30`

Recomendada.

Motivo:

- ya existe parser CEF UniFi;
- ya existe CLI dry-run local;
- no hay evidencia suficiente sobre `.30`;
- permite seguir validando formato y flujo sin tocar red ni staging.

### Opcion D — collector dual futuro

No recomendable por ahora.

Motivo:

- añade complejidad sin conocer el estado real de `.30`.

## 13. Recomendacion

Recomendacion principal: **Opcion C — dry-run offline hasta tener acceso `.30`**.

Motivos:

- `.40` esta sano y disponible como destino futuro.
- `.30` sigue siendo una dependencia opaca.
- ya existen artefactos locales suficientes para avanzar sin riesgo:
  - parser CEF UniFi;
  - samples sinteticos;
  - CLI local de dry-run.

Condicion para pasar a una arquitectura `.30 -> .40` real:

- habilitar acceso SSH no interactivo aprobado a `.30` para inventario read-only;
- confirmar listener `1514` y proceso asociado;
- validar reachability `.30 -> .40` a health endpoints antes de plantear relay.

## 14. Riesgos

- Riesgo principal: no se sabe si `.30:1514` escucha realmente.
- Riesgo de suposicion falsa: configuracion UniFi no equivale a evidencia de recepcion.
- Riesgo de arquitectura prematura: disenar relay real sin inventario de `.30` puede causar retrabajo.
- Riesgo operativo residual: si `.30` es el receptor real actual, podria haber eventos perdiendose sin visibilidad.

## 15. Que NO se toco

- UniFi
- destino SIEM configurado
- NetFlow/IPFIX
- firewall
- Docker en modo destructivo
- contenedores
- servicios systemd
- DB / Redis / Postgres
- Nginx / Cloudflare
- `.env`
- puertos
- staging
- trafico real
- logs sensibles

## 16. Proxima fase recomendada

`IDS-UNIFI-SIEM-RECEIVER-30-SSH-READONLY-01`

Objetivo sugerido:

- habilitar o verificar acceso SSH no interactivo aprobado a `.30`;
- repetir inventario read-only del puerto `1514`, proceso, servicios y conectividad `.30 -> .40`.
