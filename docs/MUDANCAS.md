# Registro de mudanças

Mudanças feitas com o Claude Code na branch `feat/video-analysis`. Nada foi commitado:
tudo está no working tree para revisão no Source Control.

## 06/10/2026

### 1. Fotos do site

Substituídas as fotos de baixa resolução e removidas as que não serviam.

| Arquivo | Resolução | Onde é usado |
|---|---|---|
| `assets/images/gabi-saque.jpg` (novo) | 2560x1600 | hero do dashboard (`dashboard.css`), header do perfil (`profile.css`) |
| `assets/images/rosamaria-toquio.jpg` (novo, comprimido de 770 para 360 KB) | 2048x1536 | fundo do cadastro (`sign.css`) |
| `assets/images/carol-ataque.jpg` (novo, faixas laterais borradas recortadas) | 1144x768 | header padrão das páginas internas (`global.css`) e de players (`players.css`) |
| `assets/images/login-bg.png` | 1440x1024 | sem mudança (login, home, testes) |

Removidos: `hero3-bg.jpg` (736x264) e `sign-bg.jpg` (735x468), substituídos acima; e
as fotos baixadas que não entraram (resolução baixa ou formato vertical sem espaço
no layout).

### 2. Análise de vídeo: manchete

Detalhes completos, números da calibração e limites: `src/video-analysis-service/README.md`.

- **Descoberta:** os vídeos de teste (`professor.mp4` e `aluno.mp4`) são de **manchete**,
  não de toque. A métrica de "distância entre as mãos" registrada no handoff media o fim
  do movimento, não o contato; a conclusão foi corrigida no README.
- **Contagem de repetições:** medida em "troncos" (ombro-quadril) em vez de largura do
  ombro, que vai a zero com a câmera de perfil. Professor 13/13 e aluno 10/10 (antes, 8 e 6).
- **Escolha automática de quem avaliar:** o serviço testa quadro inteiro, metade esquerda
  e metade direita e escolhe o executante (quem leva os punhos acima do ombro a cada
  repetição), ignorando o alimentador.
- **Checklist técnico por repetição:** base baixa e braços unidos entram no palpite;
  braços estendidos (cotovelo) é medido e mostrado, mas fica fora do palpite porque não
  é confiável nessa resolução.
- **Toque:** algoritmo original mantido (sem vídeo para validar mudanças), só ganhou a
  escolha automática de quem avaliar.
- **Orientação de filmagem** na tela de envio do vídeo (botão "Como filmar").

Arquivos:
- `src/video-analysis-service/video_analysis.py`: escolha de vista, sinais em troncos,
  `analyze_manchete`, `analyze_toque`, campos `analyzedView`, `viewScores` e `checks`.
- `src/video-analysis-service/README.md` (novo).
- `src/video-analysis-service/samples/` (nova, vídeos fora do git; só o `README.md` é versionado).
- `src/backend/DTO/VideoAnalysisDTOs.cs`: classe `TechniqueCheck`, campos `Checks` e `AnalyzedView`.
- `src/backend/Controllers/VideoAnalysisController.cs`: repassa `AnalyzedView`.
- `src/frontend/js/video-analysis.js`: checklist por repetição e orientação de filmagem.
- `src/frontend/css/test.css`: estilos `.va-check` e `.va-guide`.
- `.gitignore`: ignora os vídeos de `samples/`.

Não precisa de migration: o checklist é salvo dentro de `AnalysisDetailsJson`, que já existia.

### 3. Acesso pelo celular e link para compartilhar

Passo a passo: `docs/ACESSO-CELULAR.md`.

- `src/backend/Program.cs`: o backend serve a pasta `src/frontend` (site e API no mesmo
  endereço), `/` redireciona para o login e o login recebe o endereço público nas tags
  de prévia.
- `src/frontend/js/config.js`: a API passa a ser a do próprio endereço da página
  (continua `http://localhost:5000/api` no Live Server).
- `src/frontend/css/login.css` e `sign.css`: o card passava da borda da tela no celular
  (`width: 100%` mais margem lateral); agora desconta a margem.
- `tools/compartilhar.ps1` (novo): abre o túnel da Cloudflare e mostra o link.

### 4. Ícone e nome do sistema

- Ícone de bola de vôlei nas cores do site (preto e azul `#4e8fff`) e imagem de prévia
  do link com o nome **Volleyball Performance**, em `src/frontend/assets/icons/`.
- `tools/gerar_icones.py` (novo) gera todos os ícones; fontes Barlow em `tools/fonts/` (licença OFL).
- `src/frontend/manifest.webmanifest` (novo): permite instalar na tela inicial do celular.
- Todas as páginas em `src/frontend/pages/` ganharam as tags de ícone e manifesto; o
  login ganhou também as tags de prévia do link.
- Títulos de `login.html` e `sign.html` passaram de "Volleyball System" para
  "Volleyball Performance", como as demais páginas.

### 5. Logo das páginas e endereços limpos

- O desenho da bola no cabeçalho das 11 páginas internas foi trocado pela mesma bola do
  ícone, em vetor e preto e branco (acompanha a cor do texto). O SVG é gerado por
  `tools/gerar_icones.py` e salvo em `src/frontend/assets/icons/ball.svg`.
- `Program.cs`: endereços limpos (`/login`, `/home`...) quando o site é aberto pelo
  backend; os endereços com `.html` redirecionam para eles. Testado: `/`, `/login`,
  `/home`, `/pages/home.html`, `/home.html`, link de redefinição de senha com `?token=`,
  CSS, JS, ícones, manifesto, API e página inexistente (404).
- `login.html`: `og:url` da prévia passou a apontar para `/login`.

### 6. Domínio próprio

- `tools/tunel-fixo.ps1` (novo): configura e liga um túnel fixo da Cloudflare para um
  domínio próprio (autorização, criação do túnel, DNS do domínio e do `www`, arquivo de
  configuração). Passo a passo em `docs/ACESSO-CELULAR.md`, seção "Link fixo com domínio próprio".
- Não testado de ponta a ponta: depende da compra do domínio e da conta Cloudflare.

### 7. Upload de vídeo na página New TAT Test

Antes, o vídeo só podia ser enviado pelo modal da lista de testes, depois do teste salvo.

- Nas habilidades com análise por IA (hoje Static Manchete e Static Toque), a página New
  Test mostra "Anexar vídeo" abaixo do campo de acertos. A lista vem do backend
  (`/videoanalysis/supported-skills`), então novas habilidades aparecem sozinhas.
- Ao salvar: sem vídeo, o comportamento é o de antes (redireciona para a lista). Com
  vídeo, a página fica aberta e mostra a análise de cada vídeo, um por vez, com a
  comparação treinador x máquina, o checklist e os botões de concordar ou corrigir.
- `js/new-test.js`: anexos, análise depois de salvar e painel "Análise de vídeo".
- `js/video-analysis.js`: `analyzeVideoInto` e `renderFilmingGuide` exportados para serem
  usados nas duas telas (o modal da lista continua funcionando igual).
- `css/test.css`: estilos `.va-attach*`, `.va-attach-info` e `.va-new-test-*`.
- Verificado: sintaxe dos scripts e visual dos botões com o CSS real. O fluxo completo
  (salvar e analisar) não foi rodado, porque exige login e criaria dados no banco.

### 8. Ver como a IA analisou (vídeo anotado)

- O serviço Python gera um vídeo com o esqueleto rastreado, as repetições, ACERTO/ERRO,
  o checklist e as medidas ao vivo desenhados por cima (`annotate.py`, novo). Detalhes
  no README do serviço, seção "Vídeo anotado".
- `app.py`: `/analyze` gera o vídeo anotado e devolve `annotatedVideoId`; rota nova
  `GET /annotated/<id>`. `requirements.txt`: `imageio-ffmpeg` (ffmpeg com H.264).
  Fontes Barlow copiadas para `src/video-analysis-service/fonts/`.
- Backend: o controller busca o vídeo anotado e salva como `<nome>_ia.mp4` ao lado do
  original; a resposta (e a de uma análise já salva) traz `VideoUrl`, `AnnotatedVideoUrl`,
  `CoachAgreesWithMachine` e `CoachComment`. Sem migration: o caminho do vídeo anotado é
  derivado do caminho do original.
- Frontend: seção "Ver como a IA analisou o vídeo" com player, velocidade 0,25x/0,5x/1x
  e legenda. O modal da lista de testes agora **carrega a análise já salva** ao abrir (antes
  só mostrava "Enviar vídeo"), e mostra se o treinador já registrou a avaliação.
- Acesso: todos os treinadores logados veem (decisão da Kamila; o sistema não tem perfil
  de administrador).
- Verificado: serviço Python de ponta a ponta com o vídeo do aluno (análise, entrega única
  do vídeo anotado, id inválido recusado), quadros do vídeo anotado conferidos, backend
  compilando. O fluxo pela tela não foi rodado (exige login e dados reais).

### 9. Análise que "não aparecia" e script para ligar o sistema

- Causa: o serviço Python (porta 5001) estava desligado. O backend salvava o vídeo
  (`skill_49_...mp4`) e a chamada à análise falhava, então nada era gravado no banco.
- `VideoAnalysisController.cs`: confere `GET /health` do serviço Python **antes** de salvar
  o vídeo; se estiver desligado, responde 503 com instrução clara e não deixa arquivo órfão.
- `tools/iniciar-sistema.ps1` (novo): liga o serviço de análise e o backend, cada um na sua
  janela, espera os dois responderem e abre o login no navegador.

### 10. Interface toda em inglês

Pedido: tudo em inglês na tela (o navegador traduz a página quando necessário).

- Frontend: textos da análise de vídeo (`video-analysis.js`, `new-test.js`), mensagens de
  erro (`auth.js`), página e mural da Tifanny (`tifanny.html`, `tifanny.js`, com `lang="en"`
  e datas em `en-GB` como as demais páginas), descrição da prévia do link (`login.html`) e
  do manifesto.
- Backend: mensagens que aparecem na tela (`VideoAnalysisController`, `PlayersController`,
  `AuthController`) e mensagens de validação dos formulários (`LoginRequest`,
  `SignUpRequest`, `PlayerRequest`).
- Serviço Python: rótulos do checklist, aviso do palpite, erros do `app.py` e todo o texto
  do vídeo anotado (HIT/ERROR, números com ponto decimal).
- Imagem de prévia do link regenerada com "Technical assessment for volleyball athletes".
- Mantido em português de propósito: a opção "Português" do seletor de idioma em Settings
  (é o nome do idioma), nomes próprios (clubes, cidades, ANTRA, CVV) e as mensagens que as
  pessoas escrevem no mural.
- Análises já salvas continuam com os rótulos antigos em português até o vídeo ser enviado
  de novo (os rótulos ficam gravados em `AnalysisDetailsJson`).
- Documentação (`docs/`, READMEs) continua em português.

### 11. Segredos fora do repositório

O repositório é público e o `appsettings.json` tinha a senha de app do Gmail e a chave
do JWT desde commits antigos. Passo a passo e configuração em `docs/SEGREDOS.md`.

- `Jwt:Secret` e `Email:Password` movidos para o `dotnet user-secrets` (`UserSecretsId`
  no `.csproj`); no `appsettings.json` ficam vazios.
- Chave do JWT **trocada** por uma nova aleatória (a antiga está no histórico público).
  Quem estava logado precisa entrar de novo.
- `Program.cs`: carrega o user-secrets sempre e para com mensagem clara se `Jwt:Secret`
  estiver faltando.
- Pendente (só a Kamila pode fazer): revogar a senha de app do Gmail antiga e cadastrar a
  nova com `dotnet user-secrets set "Email:Password" "..."`.
- Verificado: backend de teste sobe lendo os segredos, API protegida responde 401 e o
  login responde normalmente.

### Como foi verificado

- `dotnet build` sem erros nem avisos (compilado em pasta separada, porque a API estava
  rodando e travava o executável).
- Backend de teste na porta 5055: `/` redireciona, login com prévia preenchida pelo
  endereço do túnel, manifesto com o tipo certo, ícones e CSS carregando, API respondendo.
- Login e cadastro renderizados com 390 px de largura (tamanho de celular) no Edge.
- Serviço Python: `POST /analyze` testado com os dois vídeos de amostra.

### Não verificado

- O túnel em si não foi aberto (o `cloudflared` não está instalado e a instalação fica a
  seu critério).
- As páginas internas (dashboard, atletas, testes) não foram conferidas no celular,
  porque precisam de login.
