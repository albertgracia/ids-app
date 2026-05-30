# check.ps1 — Run all available checks

$ROOT = "E:\opencode\ids-app"
$exitCode = 0

Write-Host "=== Environment Checks ===" -ForegroundColor Cyan
Write-Host "Node:       $(node --version 2>$null)" $(if (Get-Command node -ErrorAction SilentlyContinue) { "✅" } else { "❌" })
Write-Host "npm:        $(npm --version 2>$null)" $(if (Get-Command npm -ErrorAction SilentlyContinue) { "✅" } else { "❌" })
Write-Host "Go:         $(go version 2>$null)" $(if (Get-Command go -ErrorAction SilentlyContinue) { "✅" } else { "❌" })
Write-Host "Python:     $(python --version 2>$null)" $(if (Get-Command python -ErrorAction SilentlyContinue) { "✅" } else { "❌" })
Write-Host "uv:         $(uv --version 2>$null)" $(if (Get-Command uv -ErrorAction SilentlyContinue) { "✅" } else { "❌" })
Write-Host "Docker:     $(docker --version 2>$null)" $(if (Get-Command docker -ErrorAction SilentlyContinue) { "✅" } else { "❌" })
Write-Host "Task:       $(task --version 2>$null)" $(if (Get-Command task -ErrorAction SilentlyContinue) { "✅" } else { "❌" })
Write-Host ""

# Check Go service
if (Get-Command go -ErrorAction SilentlyContinue) {
    Write-Host "=== [Go] ids-core ===" -ForegroundColor Cyan
    Push-Location "$ROOT\services\ids-core"
    go vet ./...
    if ($LASTEXITCODE -ne 0) { $exitCode = 1 }
    Pop-Location
    Write-Host ""
}

# Check Python services
if (Get-Command uv -ErrorAction SilentlyContinue) {
    Write-Host "=== [Python] analytics-api lint ===" -ForegroundColor Cyan
    Push-Location "$ROOT\services\analytics-api"
    uv run ruff check src/
    if ($LASTEXITCODE -ne 0) { $exitCode = 1 }
    Pop-Location
    Write-Host ""

    Write-Host "=== [Python] mcp-server lint ===" -ForegroundColor Cyan
    Push-Location "$ROOT\services\mcp-server"
    uv run ruff check src/
    if ($LASTEXITCODE -ne 0) { $exitCode = 1 }
    Pop-Location
    Write-Host ""
}

# Check Node service
if (Get-Command npm -ErrorAction SilentlyContinue) {
    Write-Host "=== [Node] web lint ===" -ForegroundColor Cyan
    Push-Location "$ROOT\apps\web"
    npm run lint
    if ($LASTEXITCODE -ne 0) { $exitCode = 1 }
    Pop-Location
    Write-Host ""
}

if ($exitCode -eq 0) {
    Write-Host "=== All checks PASS ===" -ForegroundColor Green
} else {
    Write-Host "=== Some checks FAILED ===" -ForegroundColor Red
}

exit $exitCode
