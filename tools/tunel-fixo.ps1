# tunel-fixo.ps1
# Publica o sistema no seu domínio (ex.: https://volleyballperformance.com.br) usando
# um túnel fixo da Cloudflare apontando para o backend em http://localhost:5000.
# Passo a passo completo, incluindo a compra do domínio: docs/ACESSO-CELULAR.md
#
# Rodar da raiz do projeto (o backend precisa estar no ar com `dotnet run`):
#   powershell -ExecutionPolicy Bypass -File tools\tunel-fixo.ps1 -Dominio volleyballperformance.com.br
#
# Na primeira vez o script configura tudo (abre o navegador para você autorizar a
# Cloudflare). Nas próximas, só liga o túnel. Para encerrar: Ctrl+C.

param(
    [Parameter(Mandatory = $true)][string]$Dominio,
    [string]$NomeTunel = "volleyball-performance"
)

$ErrorActionPreference = "Stop"
$Dominio = $Dominio.Trim().ToLower()
$cfDir = Join-Path $env:USERPROFILE ".cloudflared"
$configPath = Join-Path $cfDir "config.yml"

if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    Write-Host "O cloudflared não está instalado." -ForegroundColor Yellow
    Write-Host "Instale uma vez com:  winget install --id Cloudflare.cloudflared"
    Write-Host "Depois feche e abra o terminal e rode este script de novo."
    exit 1
}

# 1) Autorização na conta Cloudflare (abre o navegador; escolha o seu domínio na lista)
if (-not (Test-Path (Join-Path $cfDir "cert.pem"))) {
    Write-Host "Abrindo o navegador para autorizar a Cloudflare. Escolha o domínio $Dominio." -ForegroundColor Cyan
    cloudflared tunnel login
    if (-not (Test-Path (Join-Path $cfDir "cert.pem"))) {
        Write-Host "A autorização não foi concluída. Rode o script de novo." -ForegroundColor Yellow
        exit 1
    }
}

# 2) Cria o túnel (só na primeira vez)
$tunel = cloudflared tunnel list --output json | ConvertFrom-Json | Where-Object { $_.name -eq $NomeTunel }
if (-not $tunel) {
    Write-Host "Criando o túnel '$NomeTunel'..." -ForegroundColor Cyan
    cloudflared tunnel create $NomeTunel
    $tunel = cloudflared tunnel list --output json | ConvertFrom-Json | Where-Object { $_.name -eq $NomeTunel }
}
$tunelId = $tunel.id
$credenciais = Join-Path $cfDir "$tunelId.json"

# 3) Aponta o domínio (e o www) para o túnel. Se o registro já existir, o cloudflared avisa e segue.
foreach ($h in @($Dominio, "www.$Dominio")) {
    cloudflared tunnel route dns $NomeTunel $h 2>&1 | Write-Host
}

# 4) Configuração: tudo que chegar no domínio vai para o backend local
$config = @"
tunnel: $tunelId
credentials-file: $credenciais

ingress:
  - hostname: $Dominio
    service: http://localhost:5000
  - hostname: www.$Dominio
    service: http://localhost:5000
  - service: http_status:404
"@
Set-Content -Path $configPath -Value $config -Encoding ascii

# 5) Confere o backend e liga o túnel
try {
    Invoke-WebRequest -Uri "http://localhost:5000/login" -UseBasicParsing -TimeoutSec 5 | Out-Null
} catch {
    Write-Host "Aviso: o backend não respondeu em http://localhost:5000. Rode 'dotnet run' em src/backend." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Túnel ligado. O sistema está em https://$Dominio/login" -ForegroundColor Green
Write-Host "(na primeira vez, o domínio pode levar alguns minutos para responder)"
Write-Host ""
cloudflared tunnel run $NomeTunel
