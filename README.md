# ids-app — IDS OT/IT Platform

Plataforma moderna de Detección de Intrusiones para entornos OT/IT.

## Stack

| Componente | Tecnología | Propósito |
|-----------|------------|-----------|
| **Frontend** | Next.js 16 + TypeScript | Consola web |
| **Core IDS** | Go | API/motor principal |
| **Analítica** | Python / FastAPI | Scoring, reporting |
| **MCP** | Python | Capa de agentes read-only |
| **Persistencia** | PostgreSQL | Datos de eventos, assets |
| **Cache** | Redis | Eventos ligeros, sesiones |
| **Infra dev** | Docker Compose | PostgreSQL + Redis locales |

## Repositorio

- GitHub: https://github.com/albertgracia/ids-app
- Servidor staging: 192.168.1.40 (futuro)

## Inicio rápido

```bash
# Requisitos: Node.js, Go, Python + uv, Docker, Task

# 1. Clonar e instalar dependencias
git clone https://github.com/albertgracia/ids-app
cd ids-app
task install

# 2. Iniciar infraestructura de desarrollo
task compose:up

# 3. En terminales separadas:
task dev:web       # http://localhost:3000
task dev:core      # http://localhost:8088
task dev:analytics # http://localhost:8090
task dev:mcp       # MCP read-only
```

## Estado

Development Scaffold — Fase 1 completada.

## Documentación

Ver `docs/` para visión, arquitectura, roadmap y modelo de seguridad.
