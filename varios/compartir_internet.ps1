Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   Compartiendo App de Territorios a Internet" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Iniciando LocalTunnel (Servidor alternativo muy estable)..." -ForegroundColor Yellow
Write-Host "Asegúrate de que start_server.ps1 esté encendido." -ForegroundColor Green
Write-Host ""
Write-Host "Tu enlace aparecerá aquí abajo (empezará con 'https://' y terminará en '.loca.lt')." -ForegroundColor Yellow
Write-Host "Ese es el enlace que debes enviarle a tu amigo." -ForegroundColor Yellow
Write-Host "Nota: Cuando tu amigo entre, le pedirá una 'contraseña' que en realidad es la IP de esta PC." -ForegroundColor Yellow
Write-Host "Para dejar de compartir, cierra esta ventana." -ForegroundColor Red
Write-Host "=============================================" -ForegroundColor Cyan

$env:PATH += ";$PWD\node_env"
npx localtunnel --port 3000 --local-host 127.0.0.1
