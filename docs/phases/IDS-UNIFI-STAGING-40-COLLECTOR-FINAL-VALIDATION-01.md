# IDS-UNIFI-STAGING-40-COLLECTOR-FINAL-VALIDATION-01

**Resultado:** PASS
**Fecha:** 2026-06-06 ~13:06 CEST
**Rama:** `scaffold/ids-v2-dev-env-01`
**HEAD:** `16f96ed`

## Resumen

Validación final del pipeline completo: token inyectado en ids-core → collector envía eventos → ids-core acepta y persiste → timer instalado pero deshabilitado.

## Estado del Servidor (192.168.1.40)

| Componente | Estado |
|---|---|
| ids-unifi-collector.timer | **inactive (dead), disabled** ✅ |
| ids-unifi-collector.service | **inactive (dead)** — última ejecución exitosa 13:00:40 |
| rsyslog | **active (running), enabled** |
| Puerto 8088 | LISTEN — ids-core |
| ids-core | **Up healthy** (recreado ~12:58 con token) |
| ids-analytics | Up healthy (8090) |
| ids-web | Up healthy (3002) |
| ids-mcp | Up healthy (8091) |
| ids-redis | Up healthy |
| ids-postgres | Up healthy |
| Procesos collector activos | **Ninguno** (sin runaway) |

## Última Ejecución del Collector (13:00:40)

| Métrica | Valor |
|---|---|
| Líneas leídas | 865 |
| Parseadas (100%) | 587 |
| Duplicados (parseo) | 278 |
| Errores de parseo | 0 |
| Batches enviados | 24 |
| Eventos aceptados | 587 |
| Rechazados | 0 |
| Duplicados (ingest) | 0 |
| Estado HTTP | 200 en todos los batches |
| Errores de auth/endpoint | 0 |
| Offset anterior | 3,861,087 |
| Offset posterior | 4,179,774 |
| State escrito | true |

## Endpoints

| Endpoint | Respuesta |
|---|---|
| `GET /healthz` | `{"service":"ids-core","status":"ok"}` |
| `GET /api/v1/events/recent` | HTTP 200 — eventos retornados |
| `POST /api/v1/ingest/events/unifi` | 200 (validado en fase anterior) |

## Timer

- **Estado:** inactive (dead)
- **Habilitado en boot:** disabled ✅ (correcto — solo arranque manual)
- **Última activación:** 12:54:19 → desactivado 12:54:37 (no hubo intervalo completo)
- **Acción tomada:** No se requiere — el timer ya está inactivo y disabled

## Próximos Pasos / Recomendaciones

1. Decidir si se mantiene el token en el `.env` de producción o se rota (rollback a backups)
2. Si se desea ejecución periódica automatizada, habilitar el timer con `systemctl enable --now ids-unifi-collector.timer` (fase separada)
3. De lo contrario, el collector está listo para ejecución manual bajo demanda

## Confirmaciones

- No se modificó nada en el servidor durante esta validación
- No se reiniciaron servicios
- No se tocaron compose existentes
- No se expusieron secretos
- No se desplegó ids-app
- No se habilitó el timer en boot
- No se tocó UniFi, rsyslog, firewall, SIEM, Promtail, Loki, Grafana
