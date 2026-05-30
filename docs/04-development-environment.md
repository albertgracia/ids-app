# Development Environment

## Workspace

```
E:\opencode\ids-app\
```

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| Git | ✅ | Version control |
| Node.js >= 22 | ✅ | Next.js development |
| Go >= 1.22 | ✅ | ids-core |
| Python >= 3.10 | ✅ | analytics-api, mcp-server |
| uv | Recommended | Python package manager |
| Docker Desktop | ✅ | PostgreSQL + Redis |
| Task | Recommended | Task runner (Taskfile.yml) |

## Quick Start

### 1. Install dependencies

```bash
# Node.js
cd apps/web
npm install

# Python (using uv)
cd services/analytics-api
uv sync

cd services/mcp-server
uv sync
```

### 2. Start infrastructure

```bash
task compose:up
# or
cd infra
docker compose -f docker-compose.dev.yml up -d
```

### 3. Start services (in separate terminals)

```bash
# Terminal 1: ids-core (Go)
task dev:core

# Terminal 2: analytics-api (Python)
task dev:analytics

# Terminal 3: mcp-server (Python)
task dev:mcp

# Terminal 4: Next.js console
task dev:web
```

### 4. Verify

```bash
curl http://localhost:8088/healthz
curl http://localhost:8090/healthz
# Open http://localhost:3000 in browser
```

## Using Taskfile

```bash
task --list              # Show all tasks
task compose:up          # Start PostgreSQL + Redis
task dev:core            # Start ids-core (Go)
task dev:analytics       # Start analytics-api (Python)
task dev:mcp             # Start mcp-server (Python)
task dev:web             # Start Next.js
task check               # Run all checks
task test                # Run all tests
```

## Service Ports

| Service | Port |
|---------|------|
| Next.js (web) | 3000 |
| ids-core | 8088 |
| analytics-api | 8090 |
| mcp-server | 8091 |
| PostgreSQL | 5433 |
| Redis | 6380 |

## Troubleshooting

### Port conflicts

If a port is already in use, set the corresponding environment variable:

```bash
$env:IDS_CORE_PORT = "8089"
$env:ANALYTICS_API_PORT = "8091"
```

### Docker not running

Start Docker Desktop first, then run `task compose:up`.

### uv not found

Install uv: https://docs.astral.sh/uv/#installation
