# test.ps1 — Run all tests

$ROOT = "E:\opencode\ids-app"
$exitCode = 0

Write-Host "=== Running all tests ===" -ForegroundColor Cyan

# Go tests
if (Get-Command go -ErrorAction SilentlyContinue) {
    Write-Host "[Go] ids-core..." -ForegroundColor Yellow
    Push-Location "$ROOT\services\ids-core"
    go test ./... -v
    if ($LASTEXITCODE -ne 0) { $exitCode = 1 }
    Pop-Location
} else {
    Write-Host "[Go] SKIP: go not installed" -ForegroundColor DarkYellow
}

# Python tests
if (Get-Command uv -ErrorAction SilentlyContinue) {
    Write-Host "[Python] analytics-api..." -ForegroundColor Yellow
    Push-Location "$ROOT\services\analytics-api"
    uv run pytest -v
    if ($LASTEXITCODE -ne 0) { $exitCode = 1 }
    Pop-Location

    Write-Host "[Python] mcp-server..." -ForegroundColor Yellow
    Push-Location "$ROOT\services\mcp-server"
    uv run pytest -v
    if ($LASTEXITCODE -ne 0) { $exitCode = 1 }
    Pop-Location
} else {
    Write-Host "[Python] SKIP: uv not installed" -ForegroundColor DarkYellow
}

# Node tests
if (Get-Command npm -ErrorAction SilentlyContinue) {
    Write-Host "[Node] web..." -ForegroundColor Yellow
    Push-Location "$ROOT\apps\web"
    npm test
    if ($LASTEXITCODE -ne 0) { $exitCode = 1 }
    Pop-Location
} else {
    Write-Host "[Node] SKIP: npm not installed" -ForegroundColor DarkYellow
}

if ($exitCode -eq 0) {
    Write-Host "=== All tests PASS ===" -ForegroundColor Green
} else {
    Write-Host "=== Some tests FAILED ===" -ForegroundColor Red
}

exit $exitCode
