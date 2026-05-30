# AGENTS.md — OpenCode Agent Instructions

## Project Context

This is a monorepo for `ids-app`, an IDS OT/IT platform.

- `apps/web` — Next.js 16 console
- `services/ids-core` — Go IDS engine
- `services/analytics-api` — Python/FastAPI analytics
- `services/mcp-server` — Python MCP server (read-only)
- `infra/` — Docker Compose for PostgreSQL + Redis
- Root `Taskfile.yml` — single command interface

## Rules

- No touch server `192.168.1.40` without explicit approval.
- No SSH (unless phase explicitly authorizes).
- No systemd.
- No Kubernetes.
- No modify anything outside `E:\opencode\ids-app\`.
- MCP must remain read-only.
- No real data, PCAPs, secrets, credentials, or tokens.
- No real firewall or network blocking.
- No copy legacy code from `W:\ids-app\` without approval.
- Use `task` commands as the primary interface.
- Use `docs/` for project documentation.

## Remote Operations Policy

Before any remote operation (SSH, server audit, staging, deployment),
the agent MUST read and comply with:

**`docs/agent-remote-operations.md`**

If there is a conflict between the phase prompt and this policy document,
the most restrictive rule prevails.

## Available Commands

See `Taskfile.yml` for all tasks: `task --list`

## Development Workflow

1. `task compose:up` — start PostgreSQL + Redis
2. `task dev:core` — start ids-core (Go)
3. `task dev:analytics` — start analytics-api (Python)
4. `task dev:mcp` — start mcp-server (Python)
5. `task dev:web` — start Next.js
6. `task check` — lint + typecheck + test
