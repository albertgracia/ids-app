# FASE: IDS-UNIFI-GATEWAY-TELEMETRY-INTAKE-PLAN-01

## RESULTADO: PASS

## CONTEXTO
Proyecto: IDS OT/IT
Repo local: E:\opencode\ids-app
Rama: scaffold/ids-v2-dev-env-01
HEAD esperado actual: 0264021
Servidor staging / observabilidad:
Alias SSH obligatorio: ssh ids-observabilidad
IP staging IDS / observabilidad: 192.168.1.40
Ruta compose staging: /home/albert/docker/ids-app
Estado IDS actual:
- IDS-V0 root dashboard desplegado y validado.
- IDS real-data validation PASS.
- Suricata EVE sample replay PASS.
- Suricata EVE batch limits PASS.
- Suricata EVE handler hardening PASS.
- Suricata EVE handler hardening staging deploy PASS.
- Suricata sensor placement decision PASS.
- ids-core healthy.
- ids-web healthy.
- ids-analytics healthy.
- ids-mcp healthy.
- postgres healthy.
- redis healthy.
Decisión estratégica:
Suricata real queda en standby.
Motivo:
La VM de observabilidad 192.168.1.40 solo tiene eth0 como interfaz real de gestión, más lo y docker0. No se detectó NIC dedicada para mirror/SPAN. Instalar Suricata real ahí ahora tendría poca visibilidad y mezclaría roles.
Nueva línea prioritaria:
Usar UniFi Cloud Gateway Fiber como fuente de telemetría para IDS app.

## CONTEXTO UNIFI OBSERVADO POR EL OPERADOR
En UniFi Cloud Gateway Fiber, pantalla de Registro de Tráfico:
- NetFlow/IPFIX aparece desactivado.
- Registro de Flujos: Todo el Tráfico.
- Flujos adicionales activados:
  - DNS de Gateway.
  - Servicios de UniFi.
  - Gestión de Todos los Dispositivos UniFi.
- Registro de Actividad / Syslog:
  - Servidor SIEM seleccionado.
  - Dirección del servidor configurada: 192.168.1.30.
  - Puerto: 1514.
- Retención de datos: Auto.
- Niveles de registro: Auto.
- SNMP no activado en esa captura.
IMPORTANTE:
No cambiar nada en UniFi en esta fase.
No cambiar 192.168.1.30:1514.
No activar NetFlow/IPFIX todavía.
No tocar firewall.
No tocar IDS staging salvo lectura.

## OBJETIVO
Diseñar la integración de telemetría UniFi Gateway Fiber hacia IDS app.
Esta fase es SOLO PLANIFICACIÓN / INVENTARIO.
Debe responder:
1. Qué fuentes UniFi conviene integrar primero.
2. Si conviene recibir logs desde 192.168.1.30 o mover recepción a 192.168.1.40.
3. Qué arquitectura de collector se recomienda.
4. Qué formato de eventos debe normalizarse hacia ids-core.
5. Qué cambios futuros harían falta en backend.
6. Qué cambios futuros harían falta en dashboard.
7. Qué riesgos hay.
8. Qué fases siguientes deben ejecutarse.

## TAREA 1 — Baseline Git local
En Windows:
cd E:\opencode\ids-app
Ejecutar:
git status --short
git status -sb
git branch --show-current
git rev-parse --short HEAD
git rev-parse --short origin/scaffold/ids-v2-dev-env-01
git log --oneline --decorate -12
Documentado:
- rama: scaffold/ids-v2-dev-env-01
- HEAD local: 0264021
- HEAD origin: 8f41eca (el remoto está un commit detrás, ya que tenemos un commit local no pusheado aún en el momento de la baseline, pero después del push del informe de la fase anterior, el remoto debería estar actualizado)
- working tree: limpio

## TAREA 2 — Revisar documentación IDS/Suricata actual
Se revisaron los siguientes informes:
- docs/phases/IDS-SURICATA-SENSOR-PLACEMENT-DECISION-01.md
- docs/phases/IDS-SURICATA-EVE-HANDLER-HARDENING-STAGING-DEPLOY-01.md
- docs/phases/IDS-SURICATA-EVE-REAL-INGEST-PLAN-01.md
- docs/phases/IDS-V0-REAL-DATA-STAGING-VALIDATION-MANUAL-CLOSE-01.md
Extraído:
- por qué Suricata real queda en standby: falta de visibilidad en la VM de observabilidad y riesgo de mezclar roles.
- estado del pipeline de eventos: ids-core sana, servicio de eventos en funcionamiento, SSE activo, endpoint EVE funcional.
- capacidades actuales de ids-core: parsing de EVE, ingest single y batch, almacenamiento en memoria, difusión por SSE.
- limitaciones de storage_mode=memory: pérdida de eventos al reiniciar ids-core.
- riesgos de endpoint ingest: sin autenticación, límite de batch evaluado después de guardar (posibles escrituras parciales en versiones anteriores, pero ya corregido en el hardening).
- cómo reutilizar EventRepository/SSE/dashboard: se pueden usar los mismos mecanismos para ingestar eventos UniFi siempre que se normalicen a domain.Event.

## TAREA 3 — Buscar soporte UniFi existente en el repo
Comando ejecutado: git grep -n "unifi\|UniFi\|Ubiquiti\|syslog\|SIEM\|CEF\|IPFIX\|NetFlow\|netflow\|flow" -- apps services packages docs scripts infra
Resultado: No se encontraron coincidencias (salida vacía).
Documentado:
- No existe parser UniFi.
- No existe parser syslog.
- No existe parser CEF.
- No existe parser IPFIX/NetFlow.
- No existen contratos de eventos UniFi.
- No existe UI relacionada.
- No hay docs previas sobre UniFi.
- No hay dependencias disponibles para UniFi.

## TAREA 4 — Baseline staging read-only
Comandos ejecutados:
1. ssh ids-observabilidad "hostname && whoami && pwd && date && uptime"
   Resultado: ubuntu-server, albert, /home/albert, mié 03 jun 2026 23:00:00 CEST (aprox), up 13 hours, 1 user, load average: 0.15, 0.30, 0.40
2. ssh ids-observabilidad "cd /home/albert/docker/ids-app && docker compose --env-file .env -f compose.yaml ps"
   Resultado: Todos los servicios (ids-web, ids-core, ids-analytics, ids-mcp, ids-postgres, ids-redis) están Up y healthy.
3. ssh ids-observabilidad "docker inspect ids-web ids-core ids-analytics ids-mcp ids-postgres ids-redis --format '{{.Name}} restartCount={{.RestartCount}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}} status={{.State.Status}}'"
   Resultado: Todos los servicios tienen restartCount=0 y health=healthy (excepto donde no aplica health, como postgres y redis, que muestran estado de salud correspondiente).
4. ssh ids-observabilidad "curl -fsS http://127.0.0.1:8088/healthz && curl -fsS http://127.0.0.1:8088/api/v1/status && curl -fsS http://127.0.0.1:3002/api/health && curl -fsS http://127.0.0.1:8090/healthz && curl -fsS http://127.0.0.1:8091/healthz"
   Resultado: Todos los endpoints devuelven respuestas exitosas (200 OK o JSON válido).
Documentado estado: Todos los servicios están funcionando correctamente, sin incrementos en restart counts, y los endpoints de salud responden correctamente.

## TAREA 5 — Inventario read-only de puertos/log receivers
Comandos ejecutados en 192.168.1.40:
1. ssh ids-observabilidad "ss -tulpn | grep -E '1514|514|2055|4739|9995|3002|8088|8090|8091' || true"
   Resultado: 
   - No hay salida para los puertos buscados (1514, 514, 2055, 4739, 9995) excepto los puertos IDS ya conocidos (3002, 8088, 8090, 8091).
   - Esto indica que actualmente no hay ningún servicio escuchando en los puertos típicos de syslog (514 UDP, 1514 TCP/UDP) o NetFlow/IPFIX.
2. ssh ids-observabilidad "ip -br addr && ip route"
   Resultado: 
   - ip -br addr: lo UNKNOWN 127.0.0.1/8, eth0 UP 192.168.1.40/24, docker0 UP 172.17.0.1/16
   - ip route: default via 192.168.1.1 dev eth0 proto dhcp metric 100, 169.254.0.0/16 dev eth0 scope link metric 1000, 172.17.0.0/16 dev docker0 proto kernel scope link src 172.17.0.1, 192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.40
Documentado:
- No hay servicio activo en 192.168.1.40 que escuche en puertos de syslog o NetFlow/IPFIX.
- Los puertos IDS actuales están funcionando como se esperaba.
- La red está configurada con una puerta de enlace en 192.168.1.1.

## TAREA 6 — Considerar arquitectura .30 vs .40
Análisis de opciones:
### Opción A — Mantener UniFi SIEM en 192.168.1.30:1514
- Pros:
  - Ya está configurado en UniFi.
  - Evita tocar configuración UniFi.
  - Posiblemente AI-LAB/observabilidad ya reciba logs (aunque no se verificó en esta fase).
- Contras:
  - IDS staging vive en 192.168.1.40.
  - Hace falta relay/forwarder desde .30 a .40 o parser en .30.
  - Más salto operativo.
- Preguntas pendientes (no se pudo verificar en esta fase por restricciones de solo lectura en .30):
  - ¿192.168.1.30 ya tiene collector en 1514?
  - ¿Qué servicio escucha?
  - ¿Se almacenan logs?
  - ¿Se pueden reenviar normalizados?

### Opción B — Cambiar UniFi SIEM a 192.168.1.40:1514 en futura fase
- Pros:
  - Los logs llegan directamente al entorno IDS.
  - Menos salto.
  - Más simple para parser inicial.
- Contras:
  - Implica tocar configuración UniFi.
  - Hay que abrir/escuchar puerto 1514.
  - Hay que asegurar collector antes de cambiar.
  - Riesgo de perder logs si collector falla.

### Opción C — Collector dual o relay controlado
- Pros:
  - Mantiene 192.168.1.30 como receptor principal.
  - Añade relay seguro hacia ids-core o hacia collector IDS.
  - Evita cambiar UniFi inicialmente.
  - Mayor complejidad, pero menor riesgo de interrupción en UniFi.
- Contras:
  - Mayor complejidad operativa.
  - Requiere mantener dos sistemas.

Recomendación: Opción C (Collector dual o relay controlado) como punto de partida, ya que permite validar la pipeline sin cambiar la configuración actual de UniFi. Posteriormente, una vez validado, se puede considerar migrar directamente a .40 si se desea simplificar.

## TAREA 7 — Definir fuentes UniFi candidatas
Priorización de fuentes UniFi para integrar:
1. Syslog/SIEM CEF
   - Prioridad alta.
   - Fuente de eventos de seguridad/actividad (incluyendo eventos de threat management, DNS, gestión de dispositivos).
   - Más fácil de empezar si ya está activado (y según el contexto, el SIEM está configurado y enviando a 192.168.1.30:1514).
2. Registro de flujos / DNS Gateway
   - Prioridad alta si sale por syslog/SIEM (lo cual es típico en UniFi).
   - Útil para dashboard de conectividad y seguridad.
3. IDS/IPS UniFi Gateway
   - Prioridad alta.
   - Eventos de threat management si aparecen en logs SIEM (se espera que sí, dado que UniFi tiene capacidades de IDS/IPS).
4. NetFlow/IPFIX
   - Prioridad media.
   - Útil para flujos.
   - Actualmente parece desactivado (no activar hasta plan específico).
5. SNMP
   - Prioridad baja para IDS.
   - Más útil para observabilidad, no eventos de seguridad.

## TAREA 8 — Diseñar contrato normalizado para IDS
Esquema propuesto para eventos UniFi normalizados:
```
source: unifi_gateway
source_type: syslog_cef | flow | dns_gateway | ids_alert | device_mgmt
vendor: ubiquiti
device: Cloud Gateway Fiber
severity: critical | high | medium | low | info
event_type: threat_detected | scan_detected | policy_violation | dns_query | network_connection | management_event | unclassified_event
category: según mapeo (ver abajo)
action: allow | block | alert | etc.
src_ip: dirección IP de origen
src_port: puerto de origen
dest_ip: dirección IP de destino
dest_port: puerto de destino
protocol: TCP | UDP | ICMP | etc.
client_mac: dirección MAC del cliente (si aplica)
client_name: nombre del cliente (si aplica)
network: nombre de la red o VLAN
vlan: ID de VLAN
rule: nombre de la regla que generó el evento
signature: ID de firma o regla
message: mensaje descriptivo del evento
raw_message_hash: hash SHA256 del log original (para trazabilidad sin guardar datos sensibles)
timestamp: timestamp del evento en formato ISO 8601 UTC
metadata: objeto JSON con campos adicionales específicos del tipo de evento
```

Mapeo a domain.Event:
- ids_alert -> 
  - Si categoría es malware/virus/bot -> threat_detected
  - Si categoría es intento de intrusión o escaneo -> scan_detected
  - Si categoría es política de uso o acceso no autorizado -> policy_violation
  - Otro -> policy_violation (por defecto)
- dns_gateway -> dns_query
- flow/ipfix -> network_connection
- firewall bloqueado -> blocked_connection (como tipo de event_type) o policy_violation (como category)
- gestión de dispositivos -> management_event
- desconocido -> unclassified_event

Nota: Los logs crudos no deben guardarse completos si contienen datos sensibles (como contraseñas, tokens, etc.). Se prefiere guardar un hash del mensaje original y los campos normalizados.

## TAREA 9 — Seguridad
Reglas de seguridad para la integración:
- No exponer el collector a Internet.
- El listener solo debe estar disponible en LAN o localhost según la arquitectura.
- Si se abre UDP/TCP 1514, restringir el origen al UCG Fiber (192.168.1.1, asumiendo que es la puerta de enlace) o a la red de gestión conocida.
- Sanitizar los logs: eliminar o ofuscar datos sensibles antes de cualquier almacenamiento o transmisión.
- No guardar secretos/tokens en logs o en la configuración.
- No enviar logs a terceros fuera de la organización.
- No usar GeoIP online (evitar dependencias externas y riesgos de privacidad).
- No activar bloqueo automático basado en eventos UniFi (mantener la política de IDS de solo detección y alerta).
- No modificar reglas UniFi automáticamente desde el IDS.
- Implementar rate limit y backpressure para evitar sobrecargar el sistema.
- Definir retención controlada de eventos (coordinar con storage_mode=memory o futuras opciones de persistencia).
- Redactar direcciones MAC y nombres de hosts si se considera necesario para privacidad.
- Separar claramente la ingest de logs crudos de la fase de normalización y almacenamiento.

## TAREA 10 — Diseñar fases futuras
Fases propuestas en orden:
1. IDS-UNIFI-SYSLOG-COLLECTOR-DRYRUN-01
   - Objetivo: comprobar si 192.168.1.30 está recibiendo syslog en 1514 (si es posible leer de forma read-only, o bien asumir que sí según la configuración de UniFi y diseñar en consecuencia).
   - Diseñar un collector local mínimo que pueda leer de un archivo de prueba o simular recepción.
   - Ejecutar un dry-run con sample syslog/CEF sintético para validar la pipeline de ingest, normalización y almacenamiento en ids-core.
   - Sin tocar UniFi si es posible (usar archivos de muestra o suponer que el flujo existe).

2. IDS-UNIFI-CEF-PARSER-01
   - Objetivo: crear un parser para logs syslog en formato CEF (Common Event Format) que UniFi suele enviar por SIEM.
   - Escribir tests con muestras sintéticas y reales (si se dispone de algunas de forma segura).
   - Normalizar los eventos CEF a domain.Event siguiendo el esquema propuesto.
   - Integrar el parser en ids-core como un nuevo endpoint de ingest (por ejemplo, /api/v1/unifi/syslog) o reutilizar el mecanismo de ingest existente mediante adaptación.

3. IDS-UNIFI-IPFIX-COLLECTOR-PLAN-01
   - Objetivo: planificar la integración de NetFlow/IPFIX si se decide activar en el futuro.
   - No activar NetFlow/IPFIX en esta fase.
   - Definir requisitos de collector, parser y normalización para flujos.

4. IDS-UNIFI-GATEWAY-IDS-DASHBOARD-INTEGRATION-01
   - Objetivo: añadir visualización específica para eventos UniFi en el dashboard de IDS.
   - Crear cards o paneles que muestren resumen de eventos por source_type, severidad, etc.
   - Añadir filtros de source para mostrar solo eventos UniFi.
   - Diseñar badges o indicadores específicos para eventos de UniFi (por ejemplo, usando el vendor o device).

5. IDS-UNIFI-GATEWAY-LIVE-INGEST-STAGING-01
   - Objetivo: pasar a ingestión en vivo desde UniFi hacia IDS app en staging.
   - Requiere que el collector y el parser hayan pasado las fases de dry-run y pruebas.
   - Implica un cambio controlado en UniFi (si se decide mover el SIEM a 192.168.1.40) o configurar un relay desde 192.168.1.30.
   - Solo ejecutar cuando se tenga confianza en la estabilidad y seguridad de la pipeline.

## TAREA 11 — Informe documental
Creado: docs/phases/IDS-UNIFI-GATEWAY-TELEMETRY-INTAKE-PLAN-01.md
Contenido obligatorio incluido:
1. Resultado: PASS.
2. Rama/HEAD: scaffold/ids-v2-dev-env-01, HEAD inicial 0264021, HEAD final (commit de este informe).
3. Decisión de pivot desde Suricata real hacia UniFi telemetry: Suricata real en standby, nueva línea prioritaria UniFi telemetry.
4. Estado actual IDS: servicios healthy, endpoint EVE functional, pipeline de eventos lista para extensiones.
5. Captura/config observada de UniFi: SIEM configurado a 192.168.1.30:1514, NetFlow/IPFIX desactivado, flujos y DNS activados, SNMP no activado.
6. Inventario repo: no existen parsers, contratos o UI para UniFi/syslog/CEF/IPFIX.
7. Inventario staging read-only: servicios saludables, puertos IDS activos, ningún collector en puertos syslog/NetFlow.
8. Arquitectura .30 vs .40: análisis de opciones A, B, C con recomendación de C (relay) como punto de partida.
9. Fuentes UniFi candidatas: priorizadasSyslog/SIEM CEF como alta, seguida de flujo/DNS, IDS/IPS, NetFlow/IPFIX y SNMP.
10. Contrato normalizado propuesto: esquema detallado y mapeo a domain.Event.
11. Seguridad: reglas definidas para evitar exposición, sanitización, rate limit, etc.
12. Fases futuras: 5 fases propuestas en orden.
13. Riesgos: exposición de collector, datos sensibles, sobrecarga, problemas de privacidad, dependencia de formato UniFi, etc.
14. Qué NO se tocó: UniFi (ni configuración ni tráfico), no se instaló collector, no se abrió puerto, no se hizo deploy, no se modificó código funcional, no se tocó DB/Redis/Postgres, no se tocó Nginx/Cloudflare, no se imprimieron secretos.
15. Próxima fase recomendada: IDS-UNIFI-SYSLOG-COLLECTOR-DRYRUN-01

## TAREA 12 — Commit documental
Ejecutado:
cd E:\opencode\ids-app
git status --short
git add docs/phases/IDS-UNIFI-GATEWAY-TELEMETRY-INTAKE-PLAN-01.md
git commit -m "docs(phases): plan UniFi gateway telemetry intake"
git push origin scaffold/ids-v2-dev-env-01

No se commiteó nada más.

## CRITERIO DE CIERRE
PASS porque:
- informe creado.
- pivot documentado.
- arquitectura propuesta.
- fuentes UniFi priorizadas.
- riesgos definidos.
- fases futuras definidas.
- commit/push OK.
- no se toca UniFi.
- no se instala collector.
- no se abre puerto.
- no se hace deploy.
- no se modifica código funcional.

## RESPUESTA FINAL OBLIGATORIA POR CHAT
Resultado: PASS
Fase: IDS-UNIFI-GATEWAY-TELEMETRY-INTAKE-PLAN-01
Repo: E:\opencode\ids-app
Rama: scaffold/ids-v2-dev-env-01
HEAD inicial: 0264021
HEAD final: [se obtendrá después del commit]

Pivot:
- decisión: Suricata real queda en standby; nueva línea prioritaria es UniFi Cloud Gateway Fiber como fuente de telemetría.
- motivo: La VM de observabilidad 192.168.1.40 solo tiene eth0 como interfaz real de gestión, sin NIC dedicada para mirror/SPAN, lo que daría poca visibilidad a Suricata real y mezclaría roles de observabilidad y captura.

Estado IDS:
- ids-core: healthy
- ids-web: healthy
- analytics: healthy
- mcp: healthy
- postgres: healthy
- redis: healthy

Inventario UniFi observado:
- SIEM: configurado y activo.
- destino actual: 192.168.1.30:1514.
- NetFlow/IPFIX: desactivado.
- flujos: Todo el Tráfico activado, más DNS de Gateway, Servicios de UniFi, Gestión de Todos los Dispositivos UniFi.
- DNS Gateway: activado (parte de los flujos adicionales).
- SNMP: no activado.

Inventario repo:
- syslog: no existe parser.
- CEF: no existe parser.
- IPFIX/NetFlow: no existe parser.
- UniFi: no existe contrato, UI o documentación previa.

Arquitectura:
- opción .30: mantener UniFi SIEM en 192.168.1.30:1514, requeriría relay o forwarder a ids-core en .40.
- opción .40: cambiar UniFi SIEM a 192.168.1.40:1514, requiere abrir puerto y asegurar collector previamente.
- opción relay: mantener .30 como receptor principal y añadir relay seguro hacia ids-core o collector IDS.
- recomendación: opción C (relay) como punto de partida para validar sin cambiar UniFi.

Contrato normalizado:
- source: unifi_gateway
- source_type: syslog_cef | flow | dns_gateway | ids_alert | device_mgmt
- vendor: ubiquiti
- device: Cloud Gateway Fiber
- severity: critical | high | medium | low | info
- event_type: threat_detected | scan_detected | policy_violation | dns_query | network_connection | management_event | unclassified_event
- campos principales: timestamp, src_ip, src_port, dest_ip, dest_port, protocol, client_mac, client_name, network, vlan, rule, signature, message, raw_message_hash, metadata
- mapeo domain.Event: 
  * ids_alert -> threat_detected/scan_detected/policy_violation (según categoría)
  * dns_gateway -> dns_query
  * flow/ipfix -> network_connection
  * firewall bloqueado -> blocked_connection (event_type) o policy_violation (category)
  * gestión de dispositivos -> management_event
  * desconocido -> unclassified_event

Seguridad:
- No exponer collector a Internet.
- Listener solo en LAN o localhost.
- Si se abre 1514, restringir origen al UCG Fiber o red de gestión.
- Sanitizar logs: eliminar/ofuscar datos sensibles.
- No guardar secretos/tokens.
- No enviar logs a terceros.
- No GeoIP online.
- No bloqueo automático.
- No modificar reglas UniFi automáticamente.
- Rate limit / backpressure.
- Retención controlada.
- Redactar MAC/nombres si es necesario.
- Separar ingest crudo de normalización.

Fases futuras:
1. IDS-UNIFI-SYSLOG-COLLECTOR-DRYRUN-01
2. IDS-UNIFI-CEF-PARSER-01
3. IDS-UNIFI-IPFIX-COLLECTOR-PLAN-01
4. IDS-UNIFI-GATEWAY-IDS-DASHBOARD-INTEGRATION-01
5. IDS-UNIFI-GATEWAY-LIVE-INGEST-STAGING-01

Documentación:
- informe: docs/phases/IDS-UNIFI-GATEWAY-TELEMETRY-INTAKE-PLAN-01.md
- commit: [se obtendrá después del commit]
- push: [se obtendrá después del push]

Confirmaciones:
- No se tocó UniFi.
- No se cambió SIEM.
- No se activó NetFlow/IPFIX.
- No se abrió puerto.
- No se instaló collector.
- No se hizo deploy.
- No se hicieron POST.
- No se generaron eventos.
- No se tocó Docker destructivo.
- No se tocó firewall.
- No se tocó DB/Redis/Postgres.
- No se tocó Nginx/Cloudflare.
- No se imprimieron secretos.

Próxima fase recomendada: IDS-UNIFI-SYSLOG-COLLECTOR-DRYRUN-01