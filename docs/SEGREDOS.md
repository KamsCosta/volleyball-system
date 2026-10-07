# Segredos do backend

A chave do JWT e a senha de app do Gmail **não ficam no repositório**. Elas são lidas do
`dotnet user-secrets`, que guarda os valores no seu perfil do Windows:

```
%APPDATA%\Microsoft\UserSecrets\5ea039b9-c23c-49fc-986d-b5ecc53e9493\secrets.json
```

No `appsettings.json` esses campos ficam vazios (`""`). O `Program.cs` carrega o
user-secrets sempre (não só em Development) e, se `Jwt:Secret` estiver faltando, o
backend nem sobe e mostra como resolver.

## Numa máquina nova (ou depois de clonar o repositório)

Em `src/backend`:

```powershell
# chave do JWT: qualquer texto longo e aleatório (64+ caracteres)
dotnet user-secrets set "Jwt:Secret" "cole-aqui-uma-chave-longa-e-aleatoria"

# senha de app do Gmail usada para enviar o e-mail de redefinição de senha
dotnet user-secrets set "Email:Password" "senha-de-app-do-gmail"
```

Para gerar uma chave aleatória no PowerShell:

```powershell
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Maximum 256 }))
```

Conferir o que está definido (sem mostrar os valores):

```powershell
dotnet user-secrets list
```

## Trocar a senha do Gmail (pendente)

A senha de app antiga ficou pública no histórico do GitHub (o repositório é público) e
deve ser considerada comprometida:

1. Entre em https://myaccount.google.com/apppasswords com a conta do e-mail do sistema.
2. Apague a senha de app antiga e crie uma nova.
3. Em `src/backend`: `dotnet user-secrets set "Email:Password" "senha-nova"`
4. Reinicie o backend.

A chave do JWT já foi trocada em 07/10/2026 (a antiga também estava no histórico).
Efeito: quem estava logado precisa entrar de novo.
