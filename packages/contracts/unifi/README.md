# UniFi Contracts

This directory contains contract definitions and samples for UniFi devices.

## Samples

The `samples` directory contains synthetic CEF (Common Event Format) logs for testing purposes.

These samples are artificially generated and do not contain real data, secrets, or any sensitive information.

They are intended for use in developing and testing the UniFi CEF parser.

Tambien incluyen variantes sinteticas de formatos observados de manera abstracta:

- `CEF` puro que empieza por `CEF:`
- lineas `syslog` con `CEF` embebido
- lineas UniFi/syslog candidatas sin `CEF`, usadas para validar clasificacion segura

No se incluyen logs reales ni muestras derivadas directamente de logs reales.

## Format

The samples follow the CEF format:
CEF:Version|Device Vendor|Device Product|Device Version|Signature ID|Name|Severity|Extension

For more information on CEF, see: https://www.microfocus.com/documentation/arcsight-logger/[version]/AdminGuide/AdminGuide.html#_Toc445183182

## Dry-run CLI local

El parser CEF de UniFi puede validarse localmente con la CLI `unifi-cef-dryrun` sin abrir puertos, sin collector real y sin enviar nada a `ids-core`.

Ejecutar desde `services/ids-core`:

### Archivo unico

```powershell
go run ./cmd/unifi-cef-dryrun --input ..\..\packages\contracts\unifi\samples\ids-alert.cef --output both
```

### Varios archivos

```powershell
go run ./cmd/unifi-cef-dryrun --input ..\..\packages\contracts\unifi\samples\ids-alert.cef --input ..\..\packages\contracts\unifi\samples\dns-query.cef --output both
```

### STDIN

```powershell
Get-Content ..\..\packages\contracts\unifi\samples\ids-alert.cef | go run ./cmd/unifi-cef-dryrun --stdin --output both
```

### Salidas soportadas

- `--output normalized`: solo `UniFiEvent` normalizado.
- `--output domain`: solo proyeccion JSON del `domain.Event` resultante.
- `--output both`: incluye ambas vistas. Es el valor por defecto.

## Parallel Collector CLI local

El collector paralelo UniFi se implementa primero como herramienta local, one-shot y dry-run. No abre puertos, no crea listeners y no hace `POST` a `ids-core`.

Ejecutar desde `services/ids-core`:

### Archivo unico

```powershell
go run ./cmd/unifi-parallel-collector --input ..\..\packages\contracts\unifi\samples\ids-alert.cef
```

### Varios archivos

```powershell
go run ./cmd/unifi-parallel-collector --input ..\..\packages\contracts\unifi\samples\ids-alert.cef --input ..\..\packages\contracts\unifi\samples\firewall-blocked.cef --input ..\..\packages\contracts\unifi\samples\dns-query.cef --input ..\..\packages\contracts\unifi\samples\device-management.cef
```

### STDIN

```powershell
Get-Content ..\..\packages\contracts\unifi\samples\ids-alert.cef | go run ./cmd/unifi-parallel-collector --stdin
```

### Modos de salida

- `--output ndjson`: salida por defecto, una linea JSON por evento mas una linea final de resumen.
- `--output json`: objeto JSON pretty con `events` y `summary`.

### Flags relevantes

- `--mode dry-run`: unico modo soportado.
- `--dedupe=true`: deduplicacion in-memory por `raw_hash`.
- `--include-raw=false`: no imprime el mensaje raw por defecto.

### Soporte de formatos

- `CEF` puro: soportado.
- `syslog` con `CEF` embebido: soportado por el collector paralelo.
- `syslog` UniFi sin `CEF`: clasificado de forma segura como no soportado, sin falso positivo.

## Samples de syslog operacional

El subdirectorio `samples/operational/` contiene muestras sinteticas de logs operacionales UniFi, no derivadas de logs reales:

| Archivo | Fuente simulada | Kind esperado |
|---|---|---|
| `coredns.json.log` | coredns (JSON dnsAdBlock) + unifi-mq-broker | dns_gateway_event |
| `dpi.log` | ubios-udapi-server (DPI timeout/ML failure/lifecycle) | dpi_event |
| `odhcp6c.log` | odhcp6c + ubios-udapi-server wrapping | dhcp_ipv6_event |
| `earlyoom.log` | earlyoom (memory status) | gateway_health_event |
| `syslog-ng.log` | syslog-ng (lifecycle) | syslog_operational_event |
| `unclassified.log` | unknown-service | unclassified_unifi_syslog |
| `mca.log` | MCA + mcad (device agent heartbeat/timeout) | mca_event |
| `dpi-flow-stats.log` | dpi-flow-stats + ubios-udapi-server (flow stats/timeout) | dpi_flow_stats_event |
| `systemd.log` | systemd (service lifecycle) | systemd_event |

Los samples operacionales usan el formato de syslog enriquecido por rsyslog:

```
Mon DD HH:MM:SS HOSTNAME HOSTNAME process[pid]: mensaje
```

Todos son sinteticos. No contienen datos reales, IPs reales, MACs reales ni dominios reales.

## Advertencias

- Los archivos en `samples/` son sinteticos. No representan trafico real ni contienen secretos.
- Esta fase no instala collector, no crea listeners UDP/TCP y no reenvia eventos a runtime/staging.
- El parser actual cubre el subconjunto CEF usado por los samples; no sustituye una validacion con logs reales de UniFi.
- El collector paralelo actual es solo local/dry-run; no conecta con `.30`, `.40`, Promtail, Loki ni Grafana.
- Las muestras `syslog-embedded-*` y `syslog-unifi-no-cef.log` representan formas observadas de manera abstracta; no derivan directamente de logs reales commiteados.
- Las muestras en `samples/operational/` representan patrones observados de forma agregada en la fase de mapping; no derivan directamente de logs reales.
