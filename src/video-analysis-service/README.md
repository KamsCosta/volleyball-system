# Serviço de análise de vídeo

Microsserviço Python (Flask + MediaPipe Pose) que recebe o vídeo de um teste,
encontra as repetições e dá um **palpite provisório** de acerto ou erro para cada
uma. A palavra final é sempre do treinador, que confirma ou corrige no sistema.

## Como rodar

```powershell
cd src/video-analysis-service
python -m venv .venv                 # só na primeira vez
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python app.py          # sobe em http://localhost:5001  (GET /health)
```

`mediapipe` precisa ficar fixo em `0.10.14`: as versões novas removeram `mp.solutions.pose`.

## Habilidades suportadas

| SkillIndex | Habilidade | Situação |
|---|---|---|
| 0 | Static Manchete | Calibrada com 2 vídeos (professor e aluno), 06/10/2026 |
| 1 | Static Toque | Calibrada com 1 vídeo controlado (10/10 repetições) |

As outras 14 habilidades do teste continuam só com entrada manual.

## Como a análise funciona

1. **Escolha de quem avaliar.** O MediaPipe rastreia uma pessoa só por imagem, e nos
   vídeos de treino costuma haver um alimentador jogando a bola. O serviço faz uma
   passada rápida (modelo leve, 1 a cada 3 frames) em três vistas: quadro inteiro,
   metade esquerda e metade direita. Vence a vista em que a pessoa mais leva os
   punhos acima do ombro a cada repetição, que é o padrão do executante. Em empate,
   fica o quadro inteiro (caso normal quando o vídeo segue o protocolo de filmagem).
   A vista escolhida volta na resposta em `analyzedView`.
2. **Pose quadro a quadro** na vista escolhida (recorte ampliado até 1280 px).
3. **Repetições e checklist**, que dependem da habilidade (abaixo).

### Manchete

Todas as medidas são feitas em **troncos** (distância ombro-quadril na imagem), e não
em largura do ombro. Com a câmera de perfil, a largura do ombro vai a zero e qualquer
razão dividida por ela explode (foi o que gerou valores como 4,17 e 18,67 na versão
anterior).

- **Repetição:** cada ciclo em que os punhos sobem pelo menos 0,6 tronco, com no mínimo
  1,2 s entre repetições. No exercício, os braços sobem acima da cabeça depois do
  contato para receber a bola de novo; isso faz parte do exercício e não é avaliado.
- **Contato:** janela de 0,8 s antes do topo, nos frames com os punhos entre a cintura
  e o peito (o contato exato só vai ser conhecido quando a bola for rastreada).
- **Checklist de cada repetição:**

| Item | Medida | Regra | Entra no palpite? |
|---|---|---|---|
| Base baixa | altura quadril-tornozelo (troncos), menor valor da janela | ≤ 0,75 | Sim |
| Braços unidos | distância entre punhos (troncos) no contato | ≤ 1,5 (só separação grosseira) | Sim |
| Braços estendidos | menor ângulo de cotovelo no contato | (nenhuma) | **Não**, só informativo |

A repetição é palpite de acerto quando todos os itens que entram no palpite passam.
Os limites ficam no topo de `video_analysis.py` (`MANCHETE_*`).

### Toque

Mantido o algoritmo original, calibrado com o vídeo controlado: picos da altura dos
punhos (`PEAK_PROMINENCE=0.08`, `PEAK_MIN_DISTANCE=15`, `MERGE_WINDOW=19`) e palpite de
acerto quando as mãos ficam próximas no contato. Ele não foi alterado porque não havia
vídeo de toque para validar uma mudança. A única novidade é a escolha de quem avaliar.

## Calibração da manchete (06/10/2026)

Vídeos em `samples/` (fora do git): `professor.mp4` (47 s) e `aluno.mp4` (33 s),
478x850, 30 fps. Nos dois, uma pessoa à esquerda alimenta e a da direita executa a
manchete. As pessoas ocupam cerca de 150 px de altura.

| | Professor | Aluno |
|---|---|---|
| Repetições reais | 13 | 10 |
| Detectadas pela versão anterior | 8 | 6 |
| Detectadas pela versão atual | **13** | **10** |
| Vista escolhida automaticamente | metade direita | quadro inteiro (rastreou o executante) |
| Base (quadril-tornozelo, média) | 0,60 | 0,87 |
| Palpite de acertos | 8 de 13 | 0 de 10 |

Das 5 repetições do professor marcadas como erro, 4 são as últimas do vídeo, em que a
base dele de fato sobe (0,77 a 0,97); a outra (11,4 s) foi pelos braços separados.
O aluno erra todas pela base alta (0,89 a 1,23).

### O que foi medido e não funcionou

A observação do treinador é que o aluno dobra o braço e o professor mantém reto.
Isso foi medido de quatro formas e **nenhuma separou os dois**:

| Medida no contato | Professor | Aluno |
|---|---|---|
| Cotovelo 2D (mediana na fase de contato) | 152° | 158° |
| Cotovelo 3D (`pose_world_landmarks`, modelo heavy) | 141° | 141° |
| Abertura do ombro 3D (braço à frente do corpo) | 75° | 73° |
| Tempo de braço reto antes do topo | 0,55 s | 0,43 s |

Motivo: com a pessoa em ~150 px, o antebraço tem poucos pixels, e o erro típico do
MediaPipe no cotovelo (10° a 20°) é do tamanho da diferença que se quer ver. Além
disso, o professor aparece de perfil e o aluno virado ~45° para a câmera, o que
distorce o ângulo 2D. Por isso o cotovelo é medido e mostrado, mas **não entra no
palpite**. O próximo teste é com um vídeo gravado seguindo o protocolo abaixo.

Também não serve, nesta resolução: ângulo do joelho em 2D (pernas se cruzam de perfil
e o valor sai entre 8° e 50°). A altura quadril-tornozelo substitui bem.

### Correção sobre o handoff

O handoff registrava que, no levantamento, a distância entre as mãos no contato
separava professor (0,00 a 0,15) e aluno (0,54 a 1,25). Esses vídeos são de
**manchete**, e aquele valor era medido no topo do movimento (braços subindo depois
do contato), não no contato. A conclusão não vale.

## Vídeo anotado ("Ver como a IA analisou")

Para conferir o trabalho da máquina, cada análise gera também um vídeo com o que a IA
viu desenhado por cima do original (`annotate.py`):

- esqueleto rastreado (braços em amarelo, corpo em azul);
- metade ignorada escurecida, quando há alimentador no quadro;
- barra de cima: habilidade, quem está sendo avaliado e contador de repetições;
- cartão de cada repetição no momento do contato: ACERTO/ERRO e o checklist com valores
  (OK / X / i = informativo), e um círculo nos punhos no instante do contato;
- barra de baixo: base, mãos e cotovelo ao vivo (verde dentro do limite, vermelho fora).

Fluxo: `POST /analyze` grava o vídeo anotado em uma pasta temporária e devolve
`annotatedVideoId`; o backend busca em `GET /annotated/<id>` (entregue uma vez e apagado)
e salva como `uploads/videos/<nome>_ia.mp4`, ao lado do original. No sistema, aparece em
"Ver como a IA analisou o vídeo", com velocidade 0,25x / 0,5x / 1x, no modal da lista de
testes e no resultado da página New Test. Qualquer treinador logado vê.

- Saída em MP4 H.264 (toca em qualquer navegador, inclusive iPhone), gerada pelo ffmpeg
  do pacote `imageio-ffmpeg`. Fontes Barlow em `fonts/` (as do site; têm acentos).
- Custo: cerca de 30 s a mais por vídeo. `annotate=0` no formulário pula essa etapa.
- Os vídeos em `uploads/` são servidos sem login (quem tiver o endereço exato abre).

## Protocolo de filmagem

Também aparece no sistema, no botão "Como filmar" ao lado de "Enviar vídeo".

- Câmera parada, de lado para o atleta (de perfil), na altura da cintura.
- Atleta ocupando pelo menos metade da altura da imagem (câmera a 3 ou 4 m).
- De preferência só o atleta avaliado no quadro; se houver alimentador, cada um de um lado.
- Celular na horizontal, em 1080p, com boa iluminação.

## Pendências

- Rastrear a bola por cor para achar o instante exato do contato.
- Testar o cotovelo com vídeo gravado no protocolo; se continuar impreciso, testar um
  modelo de pose mais forte (ex.: YOLO-pose).
- O modo ao vivo (`LiveAnalyzer`, WebSocket) ainda usa as regras antigas e não
  escolhe a vista; só o modo de upload foi atualizado.
- Processamento leva de 40 a 60 s por vídeo de 30 a 50 s.

## Resposta de `POST /analyze`

```json
{
  "skillType": "static_manchete",
  "analyzedView": "right",
  "viewScores": { "full": 3.1, "left": 3.06, "right": 7.34 },
  "poseDetectionRate": 1.0,
  "repetitionsDetected": 13,
  "machineHits": 8,
  "machineErrors": 5,
  "repetitions": [
    {
      "index": 1, "frame": 27, "timeSeconds": 0.9,
      "handsDistanceRatio": 0.35, "leftElbowAngle": 173.6, "rightElbowAngle": 173.6,
      "provisionalValid": true,
      "checks": [
        { "key": "baseBaixa", "label": "Base baixa (flexão de pernas)", "value": 0.41, "passed": true, "reliable": true },
        { "key": "bracosUnidos", "label": "Braços unidos no contato", "value": 0.35, "passed": true, "reliable": true },
        { "key": "bracosEstendidos", "label": "Braços estendidos (cotovelo)", "value": 173.6, "passed": null, "reliable": false }
      ]
    }
  ]
}
```

`handsDistanceRatio` e os ângulos de cotovelo continuam na resposta para não quebrar
quem já lia esses campos.
