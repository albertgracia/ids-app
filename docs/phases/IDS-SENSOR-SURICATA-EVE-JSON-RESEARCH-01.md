# Fase: IDS-SENSOR-SURICATA-EVE-JSON-RESEARCH-01 — Informe

**Fecha:** 2026-05-30
**Rama:** `scaffold/ids-v2-dev-env-01`
**Ruta local:** `E:\opencode\ids-app\`
**Repo:** `https://github.com/albertgracia/ids-app`

---

## RESULTADO: PASS

---

## Cambios realizados

### Archivos creados

| Archivo | Propósito |
|---------|-----------|
| `docs/11-suricata-eve-json-integration.md` | Documento completo de integración Suricata EVE JSON |

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `docs/02-roadmap.md` | Añadidas fases 9-11 completadas, reestructurado con fases Suricata futuras |
| `docs/01-architecture.md` | Añadida sección "Future Suricata Sensor Integration" con diagrama |
| `docs/10-analytics-scoring.md` | Añadida nota sobre Suricata y scoring normalizado |

---

## Suricata Research

| Aspecto | Estado |
|---------|--------|
| Posición en arquitectura | ✅ Definida (sensor separado → EVE JSON → parser → ids-core) |
| Tipos EVE prioritarios | ✅ MVP (alert, flow, dns, http, tls, ssh, rdp, smb, modbus) + fase 2 |
| Mapping EVE → domain.Event | ✅ Tabla completa 16 campos |
| Mapping severidad | ✅ 1→critical, 2→high, 3→medium |
| Mapping protocolos | ✅ app_proto > event_type > proto fallback |
| Zone/direction inference | ✅ CIDR-based desde ids-core config |
| Asset enrichment | ✅ DNS, HTTP, TLS, DHCP mapeados a Asset |
| Scoring integration | ✅ Mismo pipeline que eventos simulados |
| Deployment options | ✅ 3 opciones: sensor dedicado, servidor central, offline |
| Security rules | ✅ Sin PCAPs, sin bloqueo automático, sin firewall |
| Fases futuras | ✅ 6 fases definidas |

---

## Decisiones

1. **Sensor separado dedicado** (Opción A) como recomendación principal.
2. **Sin parser implementado todavía** — fase futura con sample contract primero.
3. **Scoring reutiliza pipeline existente** — sin cambios en analytics-api.
4. **Modbus como protocolo OT prioritario** — soporte nativo en Suricata.
5. **No se ejecutará bloqueo automático** desde Suricata (solo IDS mode).

---

## Fases futuras Suricata

```
IDS-SENSOR-SURICATA-EVE-SAMPLE-CONTRACT-01
IDS-SENSOR-SURICATA-EVE-PARSER-01
IDS-SENSOR-SURICATA-EVE-INGEST-01
IDS-SENSOR-SURICATA-LAB-DEPLOY-01
IDS-SENSOR-SURICATA-SPAN-MIRROR-PLAN-01
IDS-SENSOR-SURICATA-RULES-GOVERNANCE-01
```

---

## Validaciones

| Validación | Resultado |
|-----------|-----------|
| `task check` | ✅ |
| Documentos sin secretos | ✅ |
| Sin archivos prohibidos | ✅ |

---

## Git sync

| Paso | Estado |
|------|--------|
| Commit local creado | ✅ `docs(sensor): plan Suricata EVE JSON integration` |
| Push realizado | ✅ `origin/scaffold/ids-v2-dev-env-01` |
| HEAD local/remoto sincronizado | ✅ |

---

## Confirmaciones

- ✅ No se tocó `192.168.1.40`.
- ✅ No se instaló Suricata.
- ✅ No se usaron PCAPs reales.
- ✅ No se copiaron eve.json reales.
- ✅ No se copiaron secretos.
- ✅ No se copiaron binarios legacy.
- ✅ No se implementó parser — solo documentación.
- ✅ No se modificó código de runtime.

---

## Próxima fase recomendada

`IDS-MCP-READONLY-INTEGRATION-01` — Integración MCP con eventos y scoring.
