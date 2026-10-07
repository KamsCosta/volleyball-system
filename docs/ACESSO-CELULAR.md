# Abrir no celular e compartilhar o link

O sistema roda no seu computador. Para abrir no celular ou mandar para colegas, um
túnel (Cloudflare Quick Tunnel, gratuito e sem conta) cria um endereço público
`https://xxxx.trycloudflare.com` que aponta para o seu computador.

## Instalar (uma vez só)

```powershell
winget install --id Cloudflare.cloudflared
```

Feche e abra o terminal depois de instalar.

## Toda vez que quiser compartilhar

Atalho para os passos 1 e 2: `powershell -ExecutionPolicy Bypass -File tools\iniciar-sistema.ps1`
(liga os dois serviços e abre o login).

1. Suba o serviço de análise de vídeo (necessário para o envio de vídeo funcionar):
   ```powershell
   cd src/video-analysis-service
   .venv\Scripts\python app.py
   ```
2. Suba o backend, que agora também serve as páginas:
   ```powershell
   cd src/backend
   dotnet run
   ```
   Teste no computador: http://localhost:5000 abre o login.
3. Em outro terminal, na raiz do projeto:
   ```powershell
   powershell -ExecutionPolicy Bypass -File tools\compartilhar.ps1
   ```
4. Copie o link `https://....trycloudflare.com` que aparece no terminal e mande. Ele
   abre direto no login.

O link funciona enquanto o computador e os dois terminais estiverem ligados, e **muda
toda vez** que o túnel é aberto. Para encerrar: `Ctrl+C` no terminal do túnel.

## Link fixo com domínio próprio

Em vez do link `trycloudflare.com` que muda a cada vez, o sistema fica sempre em
`https://volleyballperformance.com.br/login` (ou no domínio que você escolher). O
computador continua sendo o servidor: precisa estar ligado e com o backend rodando.

Disponibilidade consultada em 06/10/2026: `volleyballperformance.com.br`,
`volleyperformance.com.br` e `volleyball-performance.com` estavam livres;
`volleyballperformance.com` já tem dono.

### Configuração (uma vez só)

1. **Comprar o domínio** em https://registro.br (cerca de R$ 40 por ano para `.com.br`;
   precisa de CPF).
2. **Criar conta grátis na Cloudflare** em https://dash.cloudflare.com e clicar em
   "Add a domain" (plano Free). A Cloudflare mostra dois *nameservers*, algo como
   `xxx.ns.cloudflare.com`.
3. **No registro.br**, abrir o domínio, ir em "DNS", "Alterar servidores DNS" e colocar
   os dois *nameservers* da Cloudflare. A troca leva de alguns minutos a algumas horas;
   a Cloudflare manda um e-mail quando o domínio fica ativo.
4. **Instalar o cloudflared:** `winget install --id Cloudflare.cloudflared` (feche e abra
   o terminal depois).
5. **Rodar o script**, na raiz do projeto, com o backend no ar:
   ```powershell
   powershell -ExecutionPolicy Bypass -File tools\tunel-fixo.ps1 -Dominio volleyballperformance.com.br
   ```
   Na primeira vez, ele abre o navegador para você autorizar a Cloudflare (escolha o
   domínio na lista), cria o túnel, aponta o domínio e o `www` para ele e grava a
   configuração em `%USERPROFILE%\.cloudflared\config.yml`.

### Uso no dia a dia

Suba o backend (`dotnet run`) e rode o mesmo comando do passo 5. Nas próximas vezes ele
só liga o túnel. O endereço é sempre o mesmo.

Para o túnel ligar sozinho junto com o Windows (opcional), num terminal como
administrador: `cloudflared service install`. O backend continua precisando ser iniciado.

## Prévia do link e ícone

- Ao colar o link no WhatsApp ou Telegram, aparece um cartão com a bola, o nome
  "Volleyball Performance" e a frase "Avaliação técnica de atletas de vôlei".
  O WhatsApp guarda a prévia em cache; como o endereço muda a cada túnel, cada link
  novo gera uma prévia nova.
- No celular, "Adicionar à tela inicial" (Safari) ou "Instalar app" (Chrome) cria um
  ícone da bola na tela, e o sistema abre em tela cheia, como um app.
- O ícone e a imagem da prévia são gerados por `tools/gerar_icones.py`. Para mudar
  cores ou texto, edite o script e rode:
  ```powershell
  src\video-analysis-service\.venv\Scripts\python tools\gerar_icones.py
  ```

## Endereços das páginas

Quando o site é aberto pelo backend (localhost:5000 ou link do túnel), os endereços
ficam limpos: `/login`, `/home`, `/dashboard`, `/players` etc. Endereços antigos como
`/pages/home.html` redirecionam para `/home`. No Live Server (porta 5500) nada muda,
porque ele não passa pelo backend.

## Como funciona por dentro

- O backend (`Program.cs`) passou a servir a pasta `src/frontend`. Site e API ficam no
  mesmo endereço, então um link só basta. O endereço `/` redireciona para `/login`.
- `/x` é servido a partir de `pages/x.html`; `/x.html` e `/pages/x.html` redirecionam
  para `/x`. Por isso os links internos das páginas (`./home.html`) não precisaram mudar.
- `js/config.js` usa a API do próprio endereço da página. Se a página for aberta pelo
  Live Server (portas 5500 e 5501), continua usando `http://localhost:5000/api`, como
  antes.
- As tags de prévia (`og:image`) precisam de endereço absoluto. A página de login tem o
  marcador `__PUBLIC_ORIGIN__`, que o backend troca pelo endereço público, lido dos
  cabeçalhos `X-Forwarded-Proto` e `X-Forwarded-Host` que o túnel envia.

## Cuidados

- **Quem tiver o link acessa o sistema** e pode criar conta, enquanto o túnel estiver
  aberto. Os dados ficam no banco do seu computador. Feche o túnel quando terminar.
- O `appsettings.json` ainda tem a senha de app do Gmail e o segredo do JWT em texto.
  Antes de deixar o sistema aberto por muito tempo, vale mover esses segredos para
  `dotnet user-secrets` (pendência já registrada no handoff).
- Mantenha o computador ligado e sem suspender durante os testes dos colegas.
