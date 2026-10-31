Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "     INICIANDO APP TERRITORIOS + CLOUDFLARE TUNNEL     " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location -Path $PSScriptRoot

# Verificar si node esta corriendo en el puerto 3000
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
$serverProcess = $null

if (-not $port3000) {
    Write-Host "[1/2] Iniciando servidor backend en puerto 3000..." -ForegroundColor Yellow
    $serverProcess = Start-Process node -ArgumentList "app_base\backend\server.cjs" -PassThru -NoNewWindow
    Start-Sleep -Seconds 2
} else {
    Write-Host "[1/2] El servidor backend ya esta activo en el puerto 3000." -ForegroundColor Green
}

Write-Host "[2/2] Creando tunel HTTPS de Cloudflare..." -ForegroundColor Yellow
Write-Host ""
Write-Host ">>> Copia el enlace que aparezca abajo (termina en .trycloudflare.com) <<<" -ForegroundColor Green
Write-Host ">>> Para detener el servidor y el tunel, simplemente cierra esta ventana. <<<" -ForegroundColor Magenta
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

try {
    & ".\varios\cloudflared.exe" tunnel --url http://localhost:3000
} finally {
    if ($serverProcess -and -not $serverProcess.HasExited) {
        Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
    }
}
