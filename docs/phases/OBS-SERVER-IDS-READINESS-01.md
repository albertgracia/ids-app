# Fase: OBS-SERVER-IDS-READINESS-01 — Informe de Readiness

**Fecha:** 2026-05-30
**Servidor:** 192.168.1.40
**Ruta local:** `E:\opencode\ids-app\`
**Rama:** `scaffold/ids-v2-dev-env-01`

---

## RESULTADO: PASS

**Apto para staging: Sí**
**Apto para producción homelab: Sí, con condiciones**
**Apto para captura IDS real: Parcial (requiere sensor separado)**

---

## 1. Resumen Ejecutivo

El servidor `192.168.1.40` es una VM Hyper-V con Ubuntu 26.04 LTS, 4 vCPU, 7.2 GB RAM, 39 GB libres en disco LVM. Alberga 13 contenedores Docker del stack de observabilidad del homelab (Prometheus, Grafana, Loki, Alloy, Node Exporter, cAdvisor, Dozzle, UnPoller, Nginx Proxy Manager, Cloudflare Tunnel, Portainer, WordPress).

**Es apto para alojar ids-app como stack separado de staging**, con las siguientes condiciones:

- Crear red Docker separada (`ids-net`).
- No reutilizar la red `monitoring`.
- Usar puertos no ocupados (3002, 8088, 8090, 8091).
- PostgreSQL y Redis en contenedores internos (no exponer innecesariamente).
- Todos los servicios ids-app deben escribir logs a stdout para integración con Docker/Alloy/Loki.
- No tocar los stacks de observabilidad existentes.

---

## 2. Recursos

| Recurso | Valor | Evaluación |
|---------|-------|------------|
| CPU/vCPU | 4 vCPU (AMD Ryzen 7 255, 2 cores/4 threads) | ✅ Suficiente |
| RAM total | 7.2 GB | ✅ Suficiente |
| RAM disponible | ~5.2 GB (2.1 GB usada) | ✅ Amplio margen |
| Swap | 2.5 GB (0 usada) | ✅ |
| Disco root | 62 GB LVM (39 GB libres, 33% usado) | ⚠️ Suficiente para staging, monitorizar |
| Disco total VM | 127 GB (sda) | ⚠️ 39 GB libres en LV |
| LVM adicional | No hay volumen separado | ⚠️ Considerar expandir LV o añadir disco |
| Load average | 0.43 / 0.35 / 0.30 | ✅ Muy baja carga |
| Uptime | 2h 19m | Reinicio reciente |

### Margen para ids-app (estimado)

| Servicio | RAM estimada | Disco estimado |
|----------|-------------|----------------|
| ids-web (Next.js) | ~200 MB | ~1 GB (build + estáticos) |
| ids-core (Go) | ~100 MB | ~50 MB (binario) |
| ids-analytics (FastAPI) | ~200 MB | ~200 MB (deps + código) |
| ids-mcp | ~50 MB | ~50 MB |
| PostgreSQL | ~500 MB | ~5 GB (datos iniciales) |
| Redis | ~100 MB | ~100 MB |
| **Total** | **~1.15 GB** | **~6.4 GB** |

El servidor tiene margen suficiente para staging homelab con ~4 GB de RAM disponibles y ~33 GB de disco libre.

---

## 3. Puertos

| Puerto | Estado | Servicio actual | Recomendación ids-app |
|--------|--------|-----------------|----------------------|
| 22 | LISTEN | SSH | Mantener |
| 80 | LISTEN | Nginx Proxy Manager | Mantener |
| 81 | LISTEN | Nginx Proxy Manager (admin) | Mantener |
| 443 | LISTEN | Nginx Proxy Manager (HTTPS) | Mantener |
| 139/445 | LISTEN | Samba (smbd) | Mantener |
| 137/138 | LISTEN | Samba (NetBIOS) | Mantener |
| 3000 | LISTEN | Grafana | Mantener |
| 3100 | LISTEN | Loki | Mantener |
| 5514/udp | LISTEN | Syslog/Loki | Mantener |
| 8000 | LISTEN | Portainer (HTTP) | Mantener |
| 8080 | LISTEN | Dozzle | Mantener |
| 8081 | LISTEN | cAdvisor | Mantener |
| 9090 | LISTEN | Prometheus | Mantener |
| 9100 | LISTEN | Node Exporter | Mantener |
| 9130 | LISTEN | UnPoller | Mantener |
| 9443 | LISTEN | Portainer (HTTPS) | Mantener |
| 12345 | LISTEN | localhost | Interno (mantener) |
| 33541 | LISTEN | localhost | Interno (mantener) |
| 53 | LISTEN | systemd-resolved | Mantener |
| 323 | LISTEN | chronyd | Mantener |

### Puertos recomendados para ids-app

| Servicio | Puerto | Estado actual |
|----------|--------|---------------|
| **ids-web** | **3002** | Libre ✅ |
| **ids-core** | **8088** | Libre ✅ |
| **ids-analytics** | **8090** | Libre ✅ |
| **ids-mcp** | **8091** | Libre ✅ |
| **PostgreSQL** | **5432** | No expuesto (solo interno Docker) ✅ |
| **Redis** | **6379** | No expuesto (solo interno Docker) ✅ |

Ningún puerto recomendado para ids-app está ocupado actualmente.

---

## 4. Docker y Redes

### Versiones
- Docker Engine: **29.1.3**
- Docker Compose: **2.40.3**
- Contenedores activos: **13**
- Imágenes: **13** (6.2 GB)
- Volúmenes: **2** (667 MB)

### Redes existentes

| Nombre | Driver | Propósito |
|--------|--------|-----------|
| `bridge` | bridge | Default |
| `host` | host | Default |
| `monitoring` | bridge | Stack de observabilidad (Prometheus, Grafana, Loki, etc.) |
| `red-servicios` | bridge | WordPress/MariaDB/Redis/phpMyAdmin |
| `none` | null | Default |

### Contenedores activos

| Contenedor | Imagen | Estado |
|-----------|--------|--------|
| prometheus | prom/prometheus:latest | Up 2h |
| grafana | grafana/grafana:latest | Up 2h |
| loki | grafana/loki:latest | Up 2h |
| alloy | (systemd service) | Active |
| node_exporter | (systemd service) | Active |
| cadvisor | gcr.io/cadvisor/cadvisor:latest | Up 2h (healthy) |
| dozzle | amir20/dozzle:latest | Up 2h |
| unpoller | ghcr.io/unpoller/unpoller:latest | Up 2h (healthy) |
| cloudflare-tunnel | cloudflare/cloudflared:latest | Up 2h |
| nginx-proxy | jc21/nginx-proxy-manager:latest | Up 2h |
| portainer | portainer/portainer-ce:latest | Up 2h |
| wordpress-site | wordpress:latest | Up 2h |
| redis-cache | redis:7-alpine | Up 2h |
| mariadb-web | mariadb:10.11 | Up 2h |
| phpmyadmin-web | phpmyadmin:latest | Up 2h |

### Recomendaciones Docker

1. **Crear red separada `ids-net`** para el stack ids-app.
2. **No reutilizar `monitoring`** para evitar conflictos con el stack de observabilidad.
3. **No modificar compose de monitorización existente.**
4. **Usar el directorio `/home/albert/docker/ids-app/`** para el nuevo stack.
5. **PostgreSQL y Redis en contenedores internos**, no exponer puertos al host si no es necesario.

---

## 5. Estructura Recomendada Futura

```text
/home/albert/docker/ids-app/
├── compose.yaml
├── .env
├── config/
│   ├── ids-core/
│   ├── ids-analytics/
│   └── ids-web/
├── data/
│   ├── postgres/
│   ├── redis/
│   └── ids/
├── logs/
├── rules/
├── backups/
└── README.md
```

Esta estructura no debe crearse todavía. Es solo propuesta para la fase de despliegue.

---

## 6. Integración con Observabilidad

### Endpoints futuros propuestos

```text
ids-core:8088/healthz    → Health check
ids-core:8088/readyz     → Readiness
ids-core:8088/metrics    → Métricas Prometheus (futuro)
ids-analytics:8090/healthz  → Health check
ids-analytics:8090/metrics  → Métricas Prometheus (futuro)
ids-web:3002/api/health     → Health check
ids-mcp:8091/healthz        → Health check
```

### Jobs Prometheus propuestos (futuros)

```yaml
# NO APLICAR — solo propuesta para fase futura
- job_name: 'ids-core'
  static_configs:
    - targets: ['ids-core:8088']
- job_name: 'ids-analytics'
  static_configs:
    - targets: ['ids-analytics:8090']
```

No modificar la configuración de Prometheus existente. La integración se hará en una fase posterior.

---

## 7. Logs

Todos los servicios ids-app deben escribir logs a **stdout/stderr** para que Docker los capture.

**Flujo de logs propuesto:**
```
ids-app containers → stdout → Docker logs → Dozzle (visualización en tiempo real)
                                        → Alloy → Loki → Grafana (consulta histórica)
```

No modificar Alloy. La recolección de logs se hará automáticamente si los contenedores usan `json-logging` driver (por defecto en Docker).

---

## 8. Riesgos

### BLOQUEANTES

| Riesgo | Descripción | Mitigación |
|--------|-------------|------------|
| Espacio en disco limitado | 39 GB libres para ~6 GB estimados de ids-app + datos. Con eventos creciendo, podría agotarse. | Monitorizar uso de disco. Expandir LV o añadir disco adicional antes de producción. |
| Sin backups del stack de observabilidad | No se detectaron backups de Prometheus/Grafana/Loki. | Implementar backups antes de desplegar ids-app en producción. |
| Sin UFW/firewall activo | `sudo ufw` requiere terminal. `iptables -S` no accesible sin sudo. | Verificar estado del firewall antes del despliegue. |

### IMPORTANTES

| Riesgo | Descripción | Mitigación |
|--------|-------------|------------|
| Loki responde 503 | `/ready` de Loki devuelve 503 (no ready). Puede estar en bootstrapping. | Verificar health de Loki antes de integrar. |
| Uso de imágenes `:latest` | Prometheus, Grafana, Loki, Dozzle, Portainer, etc. usan `:latest`. | Para producción ids-app, usar versiones fijas. |
| Sin límites de recursos Docker | Contenedores sin `mem_limit` / `cpus`. | Añadir resource limits en compose de ids-app. |
| Prometheus warnings | Múltiples warnings de sample timestamp collision con target `192.168.1.50:9183`. | No es bloqueante para ids-app, pero monitorizar. |
| Log rotation Docker | Usa driver por defecto (json-file). Sin límite de tamaño configurado. | Configurar `max-size` y `max-file` en compose de ids-app. |
| Almacenamiento Loki | Loki usa almacenamiento local en el contenedor. Sin retención visible. | Verificar configuración de retención de Loki. |

### RECOMENDADOS

| Riesgo | Descripción |
|--------|-------------|
| Contenedor Dozzle tuvo error de shutdown | `context deadline exceeded` al hacer graceful shutdown. |
| Servidor sin volúmenes LVM separados para datos | Todo en el mismo LV de 62 GB. |
| Sin node_exporter como contenedor | Es servicio systemd, no Docker. Consistencia para monitoreo. |
| Exposición de puertos Samba (139, 445) a todas las interfaces | Solo permite LAN pero no debería exponerse a Internet. |

---

## 9. Decisión Final

| Contexto | Resultado | Notas |
|----------|-----------|-------|
| **Apto para staging** | **Sí** | Recursos suficientes, puertos libres, Docker disponible |
| **Apto para producción homelab** | **Sí, con condiciones** | Requiere backup de datos, resource limits, y monitorización de disco |
| **Apto para captura IDS real** | **Parcial** | La captura real de tráfico OT/IT debe hacerse desde un sensor separado o puerto SPAN/mirror, no desde este servidor |

### ¿192.168.1.40 puede alojar ids-app?

**Sí**, el servidor puede alojar la plataforma central:
- **ids-web** (Next.js console)
- **ids-core** (Go engine)
- **ids-analytics** (FastAPI)
- **ids-mcp** (MCP server)
- **PostgreSQL**
- **Redis**

### ¿Qué debe separarse?

- **Sensor IDS real**: La captura de tráfico OT/IT (SPAN/mirror, Suricata/Zeek) debe ejecutarse en un sensor separado (físico o VM) que envíe eventos a ids-core. Este servidor no debe recibir tráfico de red directo.
- **Almacenamiento**: Para producción homelab con alta retención, considerar expandir el disco LVM o añadir almacenamiento externo.

---

## 10. Próximas Fases Propuestas

```text
1. OBS-SERVER-IDS-STAGING-SCAFFOLD-01     → Crear estructura /home/albert/docker/ids-app/ y compose inicial
2. IDS-CORE-EVENT-MODEL-01                 → Modelo de eventos, endpoints, base de datos
3. FRONTEND-LINT-WINDOWS-COMPAT-01         → Corregir ESLint en Next.js 16
4. OBS-HARDENING-SECRETS-01                → Auditoría de secrets en .env files
5. OBS-DOCKER-STABILITY-01                 → Resource limits, log rotation, health checks
6. OBS-BACKUP-MONITORING-DATA-01           → Backup de Prometheus/Grafana/Loki
```

---

## 11. Notas de Seguridad

- No se expusieron secretos en este informe.
- Se encontraron archivos `.env` en `monitorizacion/prometheus/`, `monitorizacion/unpoller/`, `monitorizacion/dozzle/`, `monitorizacion/grafana/` y otros. Estos deben ser auditados en una fase futura.
- No se modificó ninguna configuración del servidor.
- No se reinició ningún servicio.

---

## Confirmaciones

- ✅ No se modificó el servidor `192.168.1.40`.
- ✅ No se reiniciaron servicios ni contenedores.
- ✅ No se tocaron compose existentes.
- ✅ No se expusieron secretos en el informe.
- ✅ No se desplegó ids-app.
- ✅ No se tocó firewall.
- ✅ No se tocó Nginx Proxy Manager.
- ✅ No se tocó Cloudflare Tunnel.
- ✅ No se tocó Prometheus/Grafana/Loki/Alloy.
- ✅ No se modificó nada fuera de `E:\opencode\ids-app\`.
