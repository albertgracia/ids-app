# IDS-UNIFI-PARALLEL-COLLECTOR-SANITIZED-LOG-SAMPLE-01

## 1. Resultado

PASS.

La fase obtuvo una muestra minima de lineas candidatas desde `.30`, la sanitizo fuera del repo, la valido con la CLI local del collector y elimino el raw real temporal. La validacion confirma un hallazgo importante: la muestra real no llega como `CEF:` puro al parser actual, por lo que se recomienda una fase de hardening antes de diseñar el contrato live con `ids-core`.

## 2. Rama / HEAD

- Rama: `scaffold/ids-v2-dev-env-01`
- HEAD inicial: `ff32b98`
- HEAD final: pendiente del commit documental de esta fase

## 3. Alcance

Se realizo solo:

- baseline local de Git;
- lectura read-only de `.30` con `ssh ailab`;
- extraccion minima de lineas candidatas desde `/var/log/syslog`;
- sanitizacion local fuera del repo;
- ejecucion local del collector sobre la muestra sanitizada;
- validacion con samples sinteticos;
- limpieza completa de temporales sensibles.

No se modifico UniFi, Promtail, Loki, Grafana ni ningun componente operativo.

## 4. Fuente de muestra

- Host: `.30 / ubuntu-ialab`
- Archivo fuente: `/var/log/syslog`
- Metodo: `grep` limitado por `unifi|ubiquiti|cef|Ubiquiti|UniFi|CEF:`
- Conteo limitado observado en `/var/log/syslog`: `84`
- Numero de lineas candidatas extraidas para muestra: `10`

No se imprimio ninguna linea real en chat ni en el repo.

## 5. Sanitizacion

La muestra se guardo temporalmente fuera del repo, en `C:\Users\leobc\AppData\Local\Temp\ids-unifi-sanitized-sample`.

Reglas aplicadas:

- MACs -> `AA:BB:CC:DD:EE:FF`
- `192.168.1.x` -> `192.168.1.10`
- `10.x.x.x` -> `10.0.0.10`
- `172.16.0.0/12` -> `172.16.0.10`
- IPs publicas -> `203.0.113.10`
- dominios -> `example.com`
- nombres tipo `CLIENT*` -> `CLIENT-REDACTED`
- nombres tipo `DEVICE*` -> `DEVICE-REDACTED`

Politica aplicada:

- no se commiteo la muestra cruda;
- no se commiteo la muestra sanitizada;
- no se imprimio raw real ni raw sanitizado completo;
- `include-raw` no se activo.

## 6. Validacion CLI sobre muestra sanitizada

### Entrada

- archivo temporal sanitizado fuera del repo

### Resultado agregado

- `total_lines`: `11`
- `parsed`: `0`
- `skipped`: `0`
- `errors`: `11`
- `duplicates`: `0`

### Parse status agregado

- `error`: `11`

### Observacion clave

Comprobacion agregada sobre el archivo sanitizado:

- `LineCount`: `10`
- `LinesWithCEF`: `0`
- `StartsWithCEF`: `0`

Interpretacion:

- las lineas candidatas reales no contienen `CEF:` puro como inicio de linea;
- el collector actual, que delega en `ParseCEF`, las rechaza con `invalid CEF prefix`;
- esto sugiere que los logs reales vistos en `syslog` tienen prefijo syslog, otro formato o una serializacion distinta a la esperada por el parser actual.

### Errores observados

- `invalid CEF prefix`

No se incluyen ejemplos de raw por privacidad.

## 7. Validacion con samples sinteticos

Se ejecuto la CLI sobre los cuatro samples sinteticos actuales.

Resultado:

- `ids-alert`: OK
- `firewall-blocked`: OK
- `dns-query`: OK
- `device-management`: OK con warning `missing dst`

Esto confirma que la CLI sigue funcionando correctamente con el contrato sintetico actual, y que la brecha esta en el formato de muestra real disponible, no en una regresion de la CLI.

## 8. Tests

### go test

Ejecutado:

```powershell
cd services/ids-core
go test ./... -count=1
```

Resultado: PASS.

### task check

Ejecutado y con fallos preexistentes fuera de scope:

- `apps/web`: ESLint 10 / `Converting circular structure to JSON`
- `services/mcp-server`: `ruff` `F401` por `uvicorn` importado y no usado

No se corrigieron por no pertenecer al alcance de la fase.

## 9. Limitaciones

- la muestra real fue minima (`10` lineas);
- no se valido una muestra amplia ni continua;
- el parser actual sigue asumiendo `CEF:` al inicio de linea;
- no se determino aun si el formato real incluye prefijo syslog estable, variaciones mixtas o multiples tipos de linea.

## 10. Qué NO se tocó

- UniFi
- SIEM actual
- NetFlow/IPFIX
- Promtail
- `promtail.yml`
- Loki
- Grafana
- runtime operativo `ids-core`
- puertos
- Docker destructivo
- firewall
- DB / Redis / Postgres
- Nginx / Cloudflare
- `.env`
- staging

## 11. Riesgos residuales

- parser aun no soporta de forma robusta una muestra real amplia;
- no hay ingest live;
- no hay contrato auth `ids-core` todavia;
- `ids-core` sigue con `storage_mode=memory`;
- puede existir prefijo syslog o variante real que requiera hardening previo.

## 12. Limpieza de temporales

Se elimino siempre el raw real temporal.

Comprobacion final:

- `RawExists = false`
- `SanitizedExists = false`
- `OutputExists = false`

No quedaron muestras reales ni derivadas en el repo.

## 13. Próxima fase recomendada

`IDS-UNIFI-CEF-PARSER-REAL-SAMPLE-HARDENING-01`

Motivo:

- antes del contrato live con `ids-core`, el parser debe endurecerse frente al formato real observado en `.30`.
