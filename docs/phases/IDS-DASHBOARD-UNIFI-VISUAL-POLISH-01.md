# IDS-DASHBOARD-UNIFI-VISUAL-POLISH-01

**Estado:** PASS  
**Fecha:** 2026-06-06

---

## Objetivo

Pulir las zonas del dashboard que todavía mostraban lenguaje y campos de paquetes cuando se presentan eventos UniFi.

## Cambios Realizados

### `apps/web/src/components/v0-network/packet-detail-modal.tsx`
- Cambiado el título a `Detalles del Evento` en modo UniFi.
- Ocultados campos packet-centric cuando el item es UniFi:
  - IP origen/destino vacías
  - puertos 0
  - tamaño 0 B
  - TTL
- Mostrado bloque descriptivo del evento con `eventTitle`.
- El campo `Tipo` ahora usa `suricata.eventType` cuando existe, o `UniFi` como fallback.
- Conservado el modo clásico para paquetes reales.

### `apps/web/src/components/v0-network/connection-tracker.tsx`
- Añadido `isEventMode`.
- En modo evento muestra panel explicativo en lugar de `0 → 0` o conexiones falsas.
- Conservado el render clásico para tráfico/IPs reales.

### `apps/web/src/components/v0-network/v0-network-dashboard.tsx`
- Calcula `isEventMode` a partir de `eventStats`.
- Pasa `isEventMode` a `ConnectionTracker`.

## Validación

| Check | Resultado |
|---|---|
| TypeScript | ✅ PASS |
| Frontend build | ✅ PASS |
| `task check` | ✅ PASS funcional, con incidencias preexistentes en lint/ESLint ya conocidas |
| `go test` | Ejecutado en fase anterior; no necesario para este cambio |

## Incidencias Conocidas

- `task check` sigue mostrando la compatibilidad conocida de ESLint 10 en `apps/web`.
- `task check` también reporta el `uvicorn` import unused en `services/mcp-server`, preexistente y fuera de esta fase.

## Confirmaciones

- ✅ No se tocó UniFi
- ✅ No se modificó rsyslog
- ✅ No se paró collector
- ✅ No se deshabilitó timer
- ✅ No se modificó token
- ✅ No se modificó systemd
- ✅ No se modificó `.env`
- ✅ No se modificó `compose.yaml`
- ✅ No se recrearon contenedores
- ✅ No se hizo deploy staging
- ✅ No se modificó backend salvo justificación mínima inexistente aquí
- ✅ No se imprimieron logs reales
- ✅ No se imprimieron secretos
- ✅ No se commitearon logs/secretos/tokens/binarios/state-files

## Próxima Fase Recomendada

`IDS-DASHBOARD-UNIFI-VISUAL-POLISH-STAGING-DEPLOY-01`
