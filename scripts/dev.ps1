# dev.ps1 — Start development services

param(
    [ValidateSet("web", "core", "analytics", "mcp", "infra", "all")]
    [string]$Service = "all"
)

$ROOT = "E:\opencode\ids-app"

function Start-Web {
    Write-Host "[dev] Starting Next.js..." -ForegroundColor Cyan
    Push-Location "$ROOT\apps\web"
    npm run dev
    Pop-Location
}

function Start-Core {
    Write-Host "[dev] Starting ids-core..." -ForegroundColor Cyan
    Push-Location "$ROOT\services\ids-core"
    go run ./cmd/ids-core
    Pop-Location
}

function Start-Analytics {
    Write-Host "[dev] Starting analytics-api..." -ForegroundColor Cyan
    Push-Location "$ROOT\services\analytics-api"
    uv run uvicorn ids_analytics.main:app --reload --port 8090
    Pop-Location
}

function Start-Mcp {
    Write-Host "[dev] Starting mcp-server..." -ForegroundColor Cyan
    Push-Location "$ROOT\services\mcp-server"
    uv run python -m ids_mcp.main
    Pop-Location
}

function Start-Infra {
    Write-Host "[dev] Starting infrastructure (PostgreSQL + Redis)..." -ForegroundColor Cyan
    Push-Location "$ROOT\infra"
    docker compose -f docker-compose.dev.yml up -d
    Pop-Location
}

switch ($Service) {
    "web"      { Start-Web }
    "core"     { Start-Core }
    "analytics" { Start-Analytics }
    "mcp"      { Start-Mcp }
    "infra"    { Start-Infra }
    "all" {
        Write-Host "Use separate terminals for each service:"
        Write-Host "  task dev:web"
        Write-Host "  task dev:core"
        Write-Host "  task dev:analytics"
        Write-Host "  task dev:mcp"
        Write-Host ""
        Write-Host "Or start infra only:"
        Write-Host "  task compose:up"
    }
}
