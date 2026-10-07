# compartilhar.ps1
# Cria um link público temporário (https://xxxx.trycloudflare.com) para abrir o
# sistema no celular ou mandar para colegas. Detalhes: docs/ACESSO-CELULAR.md
#
# Antes de rodar, deixe o sistema no ar no computador:
#   1) src/video-analysis-service:  .venv\Scripts\python app.py   (porta 5001, só para a análise de vídeo)
#   2) src/backend:                 dotnet run                     (porta 5000, site + API)
#
# Rodar da raiz do projeto:
#   powershell -ExecutionPolicy Bypass -File tools\compartilhar.ps1
#
# O link funciona enquanto este terminal e o computador estiverem ligados.
# Para encerrar: Ctrl+C.

$ErrorActionPreference = "Stop"

if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    Write-Host "O cloudflared não está instalado." -ForegroundColor Yellow
    Write-Host "Instale uma vez com:  winget install --id Cloudflare.cloudflared"
    Write-Host "Depois feche e abra o terminal e rode este script de novo."
    exit 1
}

try {
    Invoke-WebRequest -Uri "http://localhost:5000/pages/login.html" -UseBasicParsing -TimeoutSec 5 | Out-Null
} catch {
    Write-Host "O backend não respondeu em http://localhost:5000." -ForegroundColor Yellow
    Write-Host "Rode 'dotnet run' em src/backend e tente de novo."
    exit 1
}

try {
    Invoke-WebRequest -Uri "http://localhost:5001/health" -UseBasicParsing -TimeoutSec 5 | Out-Null
} catch {
    Write-Host "Aviso: o serviço de análise de vídeo (porta 5001) não está no ar." -ForegroundColor Yellow
    Write-Host "O site funciona, mas o envio de vídeo vai dar erro até ele subir."
}

Write-Host ""
Write-Host "Abrindo o túnel. Procure abaixo a linha com https://....trycloudflare.com" -ForegroundColor Cyan
Write-Host "Esse é o link para abrir no celular ou compartilhar. Ele muda toda vez que o script roda."
Write-Host ""

cloudflared tunnel --url http://localhost:5000
