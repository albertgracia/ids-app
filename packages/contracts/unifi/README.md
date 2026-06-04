# UniFi Contracts

This directory contains contract definitions and samples for UniFi devices.

## Samples

The `samples` directory contains synthetic CEF (Common Event Format) logs for testing purposes.

These samples are artificially generated and do not contain real data, secrets, or any sensitive information.

They are intended for use in developing and testing the UniFi CEF parser.

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

## Advertencias

- Los archivos en `samples/` son sinteticos. No representan trafico real ni contienen secretos.
- Esta fase no instala collector, no crea listeners UDP/TCP y no reenvia eventos a runtime/staging.
- El parser actual cubre el subconjunto CEF usado por los samples; no sustituye una validacion con logs reales de UniFi.
