# IDS-UNIFI-LIVE-VALIDATION-01

## 1. Resultado

PARTIAL.

El receptor rsyslog TCP 1514 en `.40` funciona correctamente (verificado con test sintético local y remoto desde `.30`). Sin embargo, durante la ventana de validación (~10 minutos) no llegaron logs reales desde UniFi Cloud Gateway Fiber. No se generaron eventos de seguridad ni tráfico detectable en `/var/log/unifi/ids.log`.

## 2. Rama / HEAD

- Rama: `scaffold/ids-v2-dev-env-01`
- HEAD inicial: `3da6995`
- HEAD final: pendiente del commit documental de esta fase

## 3. Confirmación cambio manual UniFi

- Operador confirmó cambio a `192.168.1.40:1514` TCP: **SÍ**
- Configuración UniFi verificada:
  - Registro de Actividad (Syslog): activado
  - Contenido: Gateway, Switches, Crítico, Detecciones de Seguridad, Activadores, Política Predeterminada del Firewall
  - Dirección: `192.168.1.40`
  - Puerto: `1514`
  - Protocolo: TCP

## 4. Estado receptor .40

| Verificación | Estado |
|-------------|--------|
| rsyslog | active (v8.2512.0) |
| TCP 1514 | LISTEN (0.0.0.0:1514 + [::]:1514) |
| Log file | `/var/log/unifi/ids.log` presente |
| IDS health | ALL OK (ids-core, ids-web, analytics-api, ids-mcp) |
| AppArmor rsyslog | enforce — sin denegaciones |

### Test de conectividad remota

Se verificó que `.30` (192.168.1.30) puede conectar a `.40:1514` TCP y enviar mensajes que rsyslog escribe correctamente en `/var/log/unifi/ids.log`. El receptor acepta conexiones externas.

## 5. Before / After

| Métrica | Before (19:25) | After (19:40) | Diferencia |
|---------|---------------|---------------|-----------|
| Line count | 1 | 3 | +2 (tests) |
| Size | 208 bytes | 357 bytes | +149 (tests) |
| CEF count | 1 | 1 | 0 |
| Keyword count | 1 | 1 | 0 |
| Active TCP :1514 | none | none | 0 |

Las 2 líneas adicionales son de tests sintéticos locales/remotos, no datos reales UniFi.

## 6. Muestra

No se tomó muestra real porque no llegaron datos nuevos de UniFi. No hay CEF, JSON, ni logfmt de origen UniFi en el archivo de log durante la ventana de validación.

No se ejecutaron tareas 6 y 7 (sanitizar + collector dry-run) por ausencia de datos reales.

## 7. Tests

### Control sintético (sample del repo)

```
parsed:     1
errors:     0
skipped:    0
event_type: threat_detected
severity:   critical
```

PASS — el collector sigue parseando correctamente los formatos sintéticos.

### go test

```
go test ./... -count=1
```

Resultado: **PASS** — todos los tests existentes en verde.

## 8. Interpretación

### Llegan logs reales
**NO** durante la ventana de validación.

### Causa probable
El receptor funciona (verificado local y remotamente). La ausencia de datos probablemente se debe a que:

1. La configuración UniFi puede requerir un "Apply Changes" / "Provision" adicional tras cambiar el destino SIEM — el cambio puede no haberse aplicado al dispositivo.
2. UniFi solo envía syslog cuando hay eventos de seguridad o tráfico que dispara las categorías seleccionadas (Detecciones de Seguridad, Firewall, etc.). Si no ha habido actividad de red relevante, no hay nada que enviar.
3. Existe la posibilidad de que UniFi requiera un reinicio del servicio syslog en el gateway para que el cambio de destino surta efecto.

### Parser actual
No se pudo validar contra datos reales. El parser sintético sigue funcionando.

## 9. Qué NO se tocó

- UniFi desde el agente
- SIEM desde el agente
- NetFlow/IPFIX
- Promtail / Loki / Grafana
- Docker
- Firewall / iptables
- DB / Redis / Postgres
- Nginx / Cloudflare
- `.env`
- POST a ids-core
- Eventos en ids-core
- Tráfico capturado
- Logs sensibles impresos

## 10. Riesgos residuales

- No se ha validado el parseo de CEF real de UniFi.
- El formato real de los mensajes UniFi sigue siendo desconocido.
- No hay eventos IDS en el sistema.
- `ids-core` sigue con `storage_mode=memory`.
- El cambio UniFi puede requerir provisión adicional para aplicarse.

## 11. Próxima fase recomendada

`IDS-UNIFI-RECEIVER-FORCE-EVENTS-01`

Acciones recomendadas antes de repetir validación:
1. Operador verifica que el cambio SIEM en UniFi está "Provisionado" / aplicado al gateway (no solo guardado en configuración).
2. Opcional: generar tráfico de prueba controlado (escaneo inocuo entre segmentos) para forzar una detección de seguridad.
3. Repetir validación con ventana de 15-30 minutos.
