# Fase: IDS-UNIFI-API-READONLY-CAPABILITY-INVENTORY-01

## Resultado: PASS

---

## Datos del repositorio

- Rama: `scaffold/ids-v2-dev-env-01`
- HEAD inicial: `864a1a8`
- HEAD final: `864a1a8` (commit documental posterior)
- Working tree: limpio

---

## Motivo

Inventariar las capacidades reales de la API oficial/local de UniFi Network para determinar si ids-app puede consumir eventos, amenazas, alarmas y tráfico de forma read-only como alternativa al syslog (que no exporta IDS alerts).

---

## Estado API key

| Aspecto | Estado |
|---|---|
| API key temporal nueva creada | SÍ |
| key impresa en chat/informe | NO |
| key guardada en repo/env/scripts | NO |
| key commiteada | NO |
| variable eliminada tras uso | SÍ |
| revocación recomendada | SÍ (tras finalizar fase) |

---

## /sites (validación inicial)

| Aspecto | Valor |
|---|---|
| HTTP status | 200 |
| JSON válido | SÍ |
| count | 1 (Default) |
| siteId | `88f7af54-98f8-306a-a1c7-c9349722b1f6` |
| internalReference | `default` |

---

## Documentación local

La URL `https://192.168.1.1/unifi-api/network` redirige a una SPA (Single Page Application) renderizada con JavaScript. No hay OpenAPI/Swagger accesible estáticamente. Los endpoints se descubrieron mediante probing sistemático.

---

## Endpoints GET inventariados y probados

### Integration API v1 (`/proxy/network/integration/v1/`)

| Endpoint | Status | JSON | Count | Utilidad IDS | Sensibilidad |
|---|---|---|---|---|---|
| `GET /sites` | 200 | SÍ | 1 site | Baja (contexto) | Baja |
| `GET /sites/{siteId}/devices` | 200 | SÍ | 4 devices | Media (inventario assets) | Alta (MACs) |
| `GET /sites/{siteId}/clients` | 200 | SÍ | ~48 clients | Media (contexto red) | Alta (IPs, MACs) |

### Classic Controller API (`/proxy/network/api/s/default/`) — con API key

| Endpoint | Status | JSON | Count | Utilidad IDS | Sensibilidad |
|---|---|---|---|---|---|
| `stat/health` | 200 | SÍ | 5 subsystems | Media (health operacional) | Baja |
| `stat/device` | 200 | SÍ | 4 devices | Media (inventario) | Alta (MACs) |
| `stat/alluser` | 200 | SÍ | 48 users | Media (clientes históricos) | Alta (IPs, MACs) |
| `stat/sta` | 200 | SÍ | 18 stations | Media (clientes conectados) | Alta (IPs, MACs) |
| `stat/dpi` | 200 | SÍ | 1 DPI group | Baja (categorización) | Media |
| `stat/rogueap` | 200 | SÍ | - | Media (detección APs falsos) | Media |
| `stat/voucher` | 200 | SÍ | - | Baja (guest mgmt) | Baja |
| `stat/payment` | 200 | SÍ | - | Baja | Alta (pagos) |
| `stat/authorization` | 200 | SÍ | - | Baja | Alta |
| `rest/user` | 200 | SÍ | 48 users | Media | Alta |
| `rest/alarm` | 200 | SÍ | 0 (vacío) | **Alta** (potencial IDS) | Media |
| `rest/setting` | 200 | SÍ | 42 settings | Baja (config) | Alta |
| `rest/networkconf` | 200 | SÍ | - | Baja | **Alta** (wan_username) |
| `rest/wlanconf` | 200 | SÍ | - | Baja | Alta (SSIDs) |
| `rest/firewallrule` | 200 | SÍ | 0 (vacío) | Media | Alta |
| `self` | 200 | SÍ | 1 admin | Baja | Alta (admin_id) |

### Endpoints NO disponibles (404/400)

| Endpoint buscado | Status | Notas |
|---|---|---|
| `stat/event` | 404 | No existe con API key |
| `stat/alarm` | 404 | No existe |
| `stat/threat` | 404 | No existe |
| `stat/threats` | 404 | No existe |
| `stat/ips` | 404 | No existe |
| `stat/blocked` | 404 | No existe |
| `stat/connection` | 404 | No existe |
| `stat/firewall` | 404 | No existe |
| `rest/event` | 400 | InvalidObject |
| `rest/eventlog` | 400 | InvalidObject |
| `rest/threat` | 400 | InvalidObject |
| `evtmgr/event` | 400 | InvalidObject (POST probable) |
| `evtmgr/threat` | 400 | InvalidObject |
| `cybersecure/threats` | 400 | InvalidObject |
| `security-events` | 400 | InvalidObject |
| `/v2/` paths | 404 | No existe v2 |
| `/api/` sin proxy | 404 | Solo funciona mediante proxy |

### Endpoints que requieren cookie/session (no API key)

| Ruta | Status | Notas |
|---|---|---|
| `/proxy/network/api/s/{uuid}/stat/health` | 401 | api.err.NoSiteContext |
| Todos los `/api/s/{uuid}/` | 401 | Requiere sesión/cookie (site UUID) |
| `/proxy/network/api/s/default/rest/threat` | 400 | Existe pero requiere POST? |

---

## Matriz de canales

| Canal | Estado | Formato | ¿Llegan IDS alerts? | Utilidad |
|---|---|---|---|---|
| **A: Syslog 1514** | Funciona | BSD syslog operacional + CEF | **NO** (BlackSun no aparece) | Logs operacionales, health gateway |
| **B: Syslog 15514** | Funciona (redundante) | Mismo syslog operacional que 1514 | **NO** | Redundante con 1514 |
| **C: API oficial (Integration v1)** | SÍ, 3 endpoints | JSON | **NO** (no hay threats/events) | Inventario sites/devices/clients |
| **C: API oficial (Controller v2)** | SÍ, con `default` site | JSON | **NO** (no hay threats/events endpoint) | Health, devices, users, alarms (vacíos), settings |
| **D: API interna UI** | No probada (requiere cookie) | - | **Desconocida** | Riesgo alto, no oficial |
| **E: SNMP/IPFIX/NetFlow** | No activado | - | **NO** | Flujos, no alertas |

---

## Decisión técnica

**Ruta seleccionada:** Ruta 4 — Se necesitaría API interna UI o cambio de estrategia.

**Hallazgo crítico:** La API oficial de UniFi (tanto Integration v1 como Controller v2 con API key) **NO expone**:
- Eventos de seguridad
- Amenazas IDS/IPS
- Detecciones
- Tráfico/bloqueos

El endpoint `rest/alarm` existe pero siempre devuelve vacío con API key (posiblemente requiere permisos adicionales o solo se llena con ciertos tipos de alarma).

**Implicación:** Las alertas IDS/IPS visibles en la UI de UniFi (probado con BlackSun) **no están disponibles ni por syslog ni por API oficial read-only**. Las opciones restantes son:
1. **API interna UI** (cookie/sesión) — riesgo de rotura por updates, no oficial
2. **Cambiar a "Notify and Block"** — forzaría CEF "Threat Detected and Blocked" por syslog 1514
3. **Proxy inverso con captura de tráfico** — capturar peticiones entre UI y backend
4. **Aceptar limitación** — IDs-app funciona con logs operacionales + health + inventario, sin alerts IDS en tiempo real

---

## Canal recomendado para alertas IDS/IPS

Actualmente **ninguno disponible** de forma oficial y estable. Se recomienda evaluar la opción 2 (Notify and Block) como siguiente paso, ya que:
- No requiere desarrollo de API poller con cookie/sesión
- Es una configuración soportada oficialmente por UniFi
- Generaría CEF "Threat Detected and Blocked" por syslog 1514
- El collector CEF existente podría parsearlo

---

## Tests

| Suite | Resultado |
|---|---|
| `go test ./...` (ids-core) | PASS (8 packages) |
| `task check` | No ejecutado (pre-existentes conocidos) |

---

## Qué NO se tocó

- ✅ No se tocó UniFi
- ✅ No se cambió SIEM
- ✅ No se activó NetFlow/IPFIX
- ✅ No se usó POST/PATCH/PUT/DELETE
- ✅ No se modificó rsyslog
- ✅ No se reinició rsyslog
- ✅ No se modificó Promtail
- ✅ No se tocó Loki/Grafana
- ✅ No se tocó Docker/firewall
- ✅ No se hizo live ingest
- ✅ No se imprimieron secretos
- ✅ No se commitearon secretos
- ✅ No se imprimieron datos sensibles completos
- ✅ No se commitearon respuestas API reales
- ✅ No se imprimieron logs sensibles
- ✅ API key eliminada de variable temporal

---

## Riesgos

- La API key temporal debería revocarse si ya no se necesita
- `rest/networkconf` expone `wan_username` — sensible
- API interna UI (no probada) podría exponer threats pero con riesgo de rotura

---

## Próxima fase recomendada

**IDS-UNIFI-NOTIFY-AND-BLOCK-EVALUATION-01**

Evaluar el cambio de IDS/IPS a "Notify and Block" (temporal, controlado) para verificar si genera CEF "Threat Detected and Blocked" por syslog. Si funciona, el canal 1514 + collector CEF existente cubriría las alertas IDS. Si no funciona, evaluar API interna UI como último recurso.
