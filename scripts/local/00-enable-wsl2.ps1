# 00-enable-wsl2.ps1
# Habilita WSL 2 en Windows 11 Pro de forma controlada.
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

Assert-Admin

Show-Section "Comprobando Windows"
Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, OsHardwareAbstractionLayer

Show-Section "Estado actual de WSL"
wsl --status 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "WSL todavía no parece estar inicializado. Continuamos." -ForegroundColor Yellow
}

Show-Section "Instalando/Habilitando WSL sin distribución"
Write-Host "Esto habilita las características de Windows necesarias para WSL." -ForegroundColor Yellow
Write-Host "Si Windows pide reinicio, reinicia antes de continuar con el Script 2." -ForegroundColor Yellow

wsl --install --no-distribution

Show-Section "Forzando WSL 2 como versión por defecto"
wsl --set-default-version 2

Show-Section "Actualizando WSL"
wsl --update

Show-Section "Estado final de WSL"
wsl --status
wsl -l -v

Write-Host ""
Write-Host "WSL 2 preparado o en proceso de preparación." -ForegroundColor Green
Write-Host "Si el sistema indica que hace falta reiniciar, reinicia ahora." -ForegroundColor Yellow