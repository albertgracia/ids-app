# 01-install-local-dev-tools.ps1
# Instala Go + Docker Desktop + Task en Windows 11 Pro.
# Ejecutar como Administrador.
# No toca el servidor 192.168.1.40.

$ErrorActionPreference = "Stop"

function Assert-Admin {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    $isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

    if (-not $isAdmin) {
        Write-Host "ERROR: Abre PowerShell como Administrador y vuelve a ejecutar este script." -ForegroundColor Red
        exit 1
    }
}

function Show-Section($title) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host $title -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
}

function Install-WinGetPackage($id, $name) {
    Show-Section "Instalando $name"

    $existing = winget list --id $id -e 2>$null

    if ($LASTEXITCODE -eq 0 -and $existing -match $id) {
        Write-Host "$name ya parece estar instalado. Intentando actualizar..." -ForegroundColor Yellow
        winget upgrade --id $id -e --accept-package-agreements --accept-source-agreements
        return
    }

    winget install --id $id -e --accept-package-agreements --accept-source-agreements
}

Assert-Admin

Show-Section "Comprobando winget"
winget --version

Show-Section "Comprobando WSL"
wsl --status
wsl -l -v

Install-WinGetPackage "GoLang.Go" "Go"
Install-WinGetPackage "Docker.DockerDesktop" "Docker Desktop"
Install-WinGetPackage "Task.Task" "Task / go-task"

Show-Section "Validación inicial"
Write-Host "Abre una PowerShell nueva después de este script para que el PATH se refresque." -ForegroundColor Yellow

Write-Host ""
Write-Host "Validaciones que debes ejecutar en una PowerShell nueva:" -ForegroundColor Cyan
Write-Host "go version"
Write-Host "docker version"
Write-Host "docker compose version"
Write-Host "task --version"

Write-Host ""
Write-Host "IMPORTANTE:" -ForegroundColor Yellow
Write-Host "1. Reinicia Windows si Docker o WSL lo piden."
Write-Host "2. Abre Docker Desktop manualmente al menos una vez."
Write-Host "3. Acepta la licencia de Docker Desktop si aparece."
Write-Host "4. Espera a ver 'Docker Desktop is running'."

Write-Host ""
Write-Host "Instalación finalizada. Puede requerir reinicio." -ForegroundColor Green