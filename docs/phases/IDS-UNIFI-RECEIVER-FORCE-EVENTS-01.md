# IDS-UNIFI-RECEIVER-FORCE-EVENTS-01

## 1. Resultado

PARTIAL.

Receptor rsyslog TCP 1514 en `.40` funciona correctamente, pero UniFi Cloud Gateway Fiber no envía datos a pesar de la configuración confirmada por el operador y el reinicio del gateway.

## 2. Rama / HEAD

- Rama: `scaffold/ids-v2-dev-env-01`
- HEAD inicial: `c8914e3`
- HEAD final: pendiente del commit documental de esta fase

## 3. Estado receptor .40

| Verificación | Estado |
|-------------|--------|
| rsyslog | active (v8.2512.0) |
| TCP 1514 | LISTEN (0.0.0.0 + [::]) |
| Log file | `/var/log/unifi/ids.log` presente |
| IDS health | ALL OK |
| Conectividad externa | Verificada desde .30 TCP 1514 OK |

## 4. Confirmación UniFi

- Destino confirmado: 192.168.1.40:1514 TCP — **SÍ** (operador verificó)
- Acción benigna del operador: **SÍ** (navegación, actividad de red normal)
- Reinicio del gateway: **SÍ** (operador reinició para forzar emisión)

## 5. Before / After

| Métrica | Before (19:46) | After (20:10+) | Delta |
|---------|---------------|----------------|-------|
| Lines | 3 | 3 | **0** |
| Size | 259 bytes | 259 bytes | **0** |
| CEF count | 1 | 1 | **0** |
| Keyword count | 1 | 1 | **0** |
| Active TCP :1514 | none | none | 0 |
| Conexiones desde .1 | — | 0 | 0 |

No hubo crecimiento real en ninguna métrica tras ~25 min de espera con actividad benigna del operador.

## 6. Muestra

No se tomó muestra porque no llegaron datos reales. No hay CEF, JSON ni logfmt de origen UniFi.

No se ejecutaron tareas 7-9 (sanitizar + collector) por ausencia de datos.

## 7. Tests

### Control sintético

```
parsed:     1
errors:     0
event_type: threat_detected
```

PASS.

### go test

```
go test ./... -count=1
```

PASS.

## 8. Interpretación

### Receptor
Funciona. Verificado:
- Test local `nc 127.0.0.1 1514` → escribe en `/var/log/unifi/ids.log`
- Test remoto desde `.30` (192.168.1.30 → 192.168.1.40:1514) → escribe correctamente

### UniFi no emite
A pesar de:
- Configuración correcta verificada por operador
- Actividad benigna del operador (navegación, etc.)
- Reinicio del gateway por parte del operador

No se estableció ninguna conexión TCP desde 192.168.1.1 hacia 192.168.1.40:1514.

### Causas probables

1. El cambio de destino syslog en UniFi Network requiere **Apply Changes** / **Provision** explícito para enviar la configuración al gateway — puede que solo esté guardada en el controlador pero no aplicada al dispositivo.
2. UniFi Cloud Gateway Fiber puede no implementar el envío activo de syslog TCP; quizás necesita un receptor que escuche y el gateway solo responde a consultas.
3. El gateway puede requerir un **reinicio completo** (no solo del servicio syslog, sino del dispositivo físico).
4. Es posible que el contenido seleccionado ("Contenido") requiera eventos específicos que no se generaron (ej. amenazas reales, no tráfico normal).

## 9. Qué NO se tocó

- UniFi (desde agente)
- SIEM
- NetFlow/IPFIX
- Promtail / Loki / Grafana
- Docker
- Firewall
- DB / Redis / Postgres
- Nginx / Cloudflare
- POST / live ingest

## 10. Próxima fase recomendada

`IDS-UNIFI-GATEWAY-SYSLOG-DEBUG-01`

Acciones:
1. Operador verifica que el cambio de syslog está **Provisioned** / aplicado al gateway (no solo en configuración del controller).
2. Operador prueba con puerto 514 UDP como alternativa (si UniFi lo permite), con un `nc -u -l` rápido de prueba para ver si emite por UDP.
3. Si no funciona, considerar reinicio completo del gateway físico.
4. Si persiste, abrir caso con soporte UniFi sobre envío de syslog a destino TCP personalizado.
