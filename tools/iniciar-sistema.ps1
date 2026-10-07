# iniciar-sistema.ps1
# Liga o sistema inteiro com um comando:
#   - serviço de análise de vídeo (Python, porta 5001)
#   - backend + site (dotnet, porta 5000)
# Cada um abre na sua própria janela (feche a janela para desligar).
# No fim, abre o navegador no login.
#
# Rodar da raiz do projeto:
#   powershell -ExecutionPolicy Bypass -File tools\iniciar-sistema.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$py = Join-Path $root "src\video-analysis-service\.venv\Scripts\python.exe"

function Test-Url($url) {
    try { Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3 | Out-Null; return $true } catch { return $false }
}

function Wait-Url($url, $name, $seconds) {
    for ($i = 0; $i -lt $seconds; $i++) {
        if (Test-Url $url) { Write-Host "  $name no ar." -ForegroundColor Green; return $true }
        Start-Sleep -Seconds 1
    }
    Write-Host "  $name não respondeu em $seconds s. Veja a janela dele para o erro." -ForegroundColor Yellow
    return $false
}

# 1) Serviço de análise de vídeo
if (Test-Url "http://localhost:5001/health") {
    Write-Host "Serviço de análise já estava no ar (porta 5001)." -ForegroundColor Green
} elseif (-not (Test-Path $py)) {
    Write-Host "Não achei o ambiente Python em $py" -ForegroundColor Yellow
    Write-Host "Crie uma vez (ver src/video-analysis-service/README.md) e rode de novo."
} else {
    Write-Host "Ligando o serviço de análise de vídeo..."
    Start-Process -FilePath $py -ArgumentList "app.py" `
        -WorkingDirectory (Join-Path $root "src\video-analysis-service") -WindowStyle Normal
    Wait-Url "http://localhost:5001/health" "Serviço de análise" 60 | Out-Null
}

# 2) Backend + site
if (Test-Url "http://localhost:5000/login") {
    Write-Host "Backend já estava no ar (porta 5000). Se você mudou código, feche a janela dele e rode este script de novo." -ForegroundColor Green
} else {
    Write-Host "Ligando o backend..."
    Start-Process -FilePath "dotnet" -ArgumentList "run" `
        -WorkingDirectory (Join-Path $root "src\backend") -WindowStyle Normal
    Wait-Url "http://localhost:5000/login" "Backend" 120 | Out-Null
}

Start-Process "http://localhost:5000/login"
Write-Host ""
Write-Host "Pronto: http://localhost:5000/login" -ForegroundColor Cyan
Write-Host "Para compartilhar com link público: tools\compartilhar.ps1"
