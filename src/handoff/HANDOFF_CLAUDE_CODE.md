# Handoff — Volleyball Performance System

> **Documento único** para o Claude Code (VS Code). Ele não tem acesso à conversa em que
> este plano foi feito, então aqui estão: regras de trabalho, contexto, histórico resumido,
> tarefas e o **código completo dos arquivos novos** (Apêndice no final).
> A dona do projeto (Kamila) vai **revisar cada alteração** antes de aprovar.

---

## 0. Regras de trabalho (leia primeiro)

1. Trabalhe numa branch nova: `git checkout -b feat/video-analysis` (a partir de `feat/conexao-banco-sql`).
2. **Não faça commit nem push.** Deixe tudo no working tree para ela revisar no Source Control.
3. **Não rode `dotnet ef database update`** sem perguntar. Pode gerar migrations (`migrations add`), mas aplicar no banco é com ela.
4. Em arquivos que **já existem**, faça edições pontuais — não substitua o arquivo inteiro.
5. Explique em 1–2 linhas o motivo de cada mudança.
6. Comece rodando `dotnet build` em `src/backend` e **me mostre os erros antes de corrigir** (veja o aviso do item 5).
7. Se algo contradisser este documento, pergunte antes de agir.

## 1. Projeto

- **Backend:** ASP.NET Core 8, C#, EF Core 8, SQL Server Express, JWT (claim `sub` = id do usuário; `MapInboundClaims = false` já está no `Program.cs`), BCrypt.
- **Frontend:** HTML/CSS/JS puro com ES Modules em `src/frontend/{pages,css,js}`. CSS modular: `global.css` + um CSS por página. Chamadas à API passam por `apiRequest()` em `auth.js`.
- **Domínio:** teste TAT de vôlei com 16 habilidades (`SkillIndex` 0–15). `TestSkillResult` guarda `Hits`/`Errors` digitados pelo treinador.
- Pasta nova desta feature: `src/video-analysis-service/` (Python).

## 2. Histórico resumido (o que já foi feito e decidido)

**Concluído e funcionando:** CRUD de coaches (add/delete/toggle/profile), coach vinculado aos testes (lista, detalhe do atleta, formulário), Profile e Settings, sidebar padronizada, CSS modular, página de homenagem à Tifanny Abreu (`tifanny.html/css/js`, hero navy com faixa da bandeira trans, mural de mensagens).

**Bugs já resolvidos (não reintroduzir):**
- JWT: o ASP.NET remapeia a claim `sub`; sem `options.MapInboundClaims = false` o `/api/auth/me` devolvia 401 e o frontend deslogava.
- Nomes de arquivo da Tifanny: a grafia oficial é **Tifanny** (um F). Arquivos: `tifanny.html`, `tifanny.css`, `tifanny.js`; os links da sidebar usam `./tifanny.html`.
- `players.css` e `test.css` já tiveram versões truncadas no passado; as versões atuais estão completas — não regenerar.
- Paleta: o experimento de verde brasileiro foi **descartado**; o sistema voltou ao azul (`--accent: #4e8fff`). Imagem do hero: `assets/images/hero3-bg.jpg`.
- Os tokens `--pride-*` do `global.css` existem só para o item "Tifanny" da sidebar e a página dela.

**Análise de vídeo — o que a exploração mostrou:**
- MediaPipe Pose: 100% de detecção em vídeos de quadra reais. Precisa fixar `mediapipe==0.10.14` (versões novas removeram `mp.solutions.pose`).
- Static Toque, vídeo controlado (1 pessoa, 10 repetições): 10/10 detectadas com `PEAK_PROMINENCE=0.08`, `PEAK_MIN_DISTANCE=15`, `MERGE_WINDOW=19` (18–20 funciona; 21 já funde repetições distintas).
- Duas pessoas no quadro: o MediaPipe rastreia só uma, sem controle de qual. Solução usada nos testes: cortar o frame ao meio (esquerda/direita). A posição de professor/aluno muda entre vídeos.
- Levantamento, professor x aluno (mesma sessão): distância entre as mãos no contato (relativa à largura do ombro) — professor 0,00–0,15; aluno 0,54–1,25. Sugere uma boa métrica para diferenciar nível técnico (hipótese, amostra pequena).
  - **Corrigido em 06/10/2026:** esses vídeos são de manchete, e a medida era feita no topo do movimento, não no contato. A conclusão não vale. Ver `src/video-analysis-service/README.md`.
- Fragilidade: num vídeo, só 1 repetição do professor foi detectada. Detectar contato só pela altura da mão é frágil em jogo real. **Próximo passo combinado (fora desta tarefa): rastrear a bola por cor.**
- Manchete ainda não foi analisada (biomecânica diferente do toque; a regra atual de manchete é experimental).
- Modo ao vivo (WebSocket) foi testado simulando ~1100 frames; foi necessário um `threading.Lock` por sessão (MediaPipe exige timestamps crescentes). Há um atraso proposital de ~0,5 s para confirmar cada repetição.

## 3. Feature: análise de vídeo por IA (MVP)

**Ideia:** a máquina dá um **palpite provisório** de acertos/erros a partir do vídeo; o **treinador compara com o que digitou, confirma ou corrige** e pode comentar. A máquina nunca sobrescreve o valor do treinador sozinha.

**Fluxo:** frontend sobe o vídeo → .NET salva e chama o microsserviço Python (Flask + MediaPipe) por HTTP → resultado salvo em `TestSkillResults`.

**Suportadas no MVP:** `SkillIndex` 0 (Static Manchete, experimental) e 1 (Static Toque, calibrada com um vídeo controlado). As outras 14 seguem só com entrada manual.

### Tarefas

**T1 — Serviço Python → `src/video-analysis-service/`**
Criar `video_analysis.py`, `app.py`, `requirements.txt` com o conteúdo dos Apêndices A1–A3. Verificar que sobe com `pip install -r requirements.txt && python app.py` (porta 5001, `GET /health`).

**T2 — Backend (.NET)**
- Novos: `DTO/VideoAnalysisDTOs.cs` (A4) e `Controllers/VideoAnalysisController.cs` (A5).
- `Models/TestSkillResult.cs`: **acrescentar** os campos `MachineHits`, `MachineErrors`, `VideoPath`, `AnalyzedAt`, `CoachAgreesWithMachine`, `CoachComment`, `AnalysisDetailsJson` (todos nullable), como no A6. Manter o que já existe.
- `Program.cs`: `builder.Services.AddHttpClient();` logo após `AddControllers()`.
- `appsettings.json`: adicionar `"VideoAnalysis": { "ServiceUrl": "http://localhost:5001" }`.
- `DTO/TestDTOs.cs`: em `SkillResultResponse`, adicionar `public int Id { get; set; }` como primeiro campo.
- `Services/TestService.cs`: em `ToResponse`, no mapeamento de `SkillResults`, preencher `Id = s.Id`.
- (Opcional) servir `/uploads` como estático para reassistir os vídeos:
  ```csharp
  app.UseStaticFiles(new StaticFileOptions {
      FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(
          Path.Combine(app.Environment.ContentRootPath, "uploads")),
      RequestPath = "/uploads"
  });
  ```
  (a pasta `uploads` precisa existir antes de subir a API)
- Migration: `dotnet ef migrations add AddVideoAnalysisFields` (**não aplicar**).

**T3 — Frontend**
- `js/video-analysis.js` (A7), novo.
- Anexar o bloco CSS do A8 ao **final** de `css/test.css` (não duplicar se já existir).
- `js/test-list.js`, três mudanças pontuais:
  1. `import { loadSupportedSkills, renderVideoAnalysisBlock, bindVideoAnalysisEvents } from "./video-analysis.js";`
  2. Chamar `loadSupportedSkills();` uma vez, junto de `loadTests();`.
  3. Em `openModal(test)`, no `.map()` que monta `modalSkills`, acrescentar `${renderVideoAnalysisBlock(s.id, s.skillIndex, s.skillName)}` após cada linha de habilidade e, depois de atribuir o `innerHTML`, chamar `bindVideoAnalysisEvents(document.getElementById("modalSkills"));`.

**T4 — Página de teste isolada (só copiar, não integrar)**
`teste_ao_vivo_websocket.html` (A12): teste manual do modo ao vivo contra `localhost:5001`. Colocar fora de `pages/` (ex.: `docs/` ou `tools/`).

**T5 — Verificar o mural de apoio da Tifanny**
O commit anterior diz que o backend do mural foi criado, mas **`SupportMessage.cs`, `SupportMessageDTOs.cs` e `SupportMessagesController.cs` não aparecem no commit**, e o `ApplicationDbContext` visto não tinha `DbSet<SupportMessage>`. Confirmar se existem. Se não: criar a partir dos Apêndices A9–A11, adicionar `public DbSet<SupportMessage> SupportMessages { get; set; }` ao `ApplicationDbContext` e gerar a migration `AddSupportMessages` (**sem aplicar**). Sem isso o mural de `tifanny.html` falha ao carregar.

## 4. Como testar (ela faz)
1. `python app.py` em `src/video-analysis-service/`
2. `dotnet run` em `src/backend/`
3. Live Server no frontend → Test List → ver um teste → nas linhas **Static Manchete** e **Static Toque** deve aparecer "Enviar vídeo".

## 5. Avisos importantes

- **O código .NET e o JS desta feature nunca foram compilados/executados** (escritos sem SDK .NET disponível). Só o serviço Python foi testado de ponta a ponta. Esperar ajustes: o projeto parece usar `using` explícitos (sem implicit usings), então `VideoAnalysisController.cs` provavelmente precisa de `using Microsoft.AspNetCore.Hosting;`, `using Microsoft.AspNetCore.Http;` e `using System.Collections.Generic;`.
- **Segurança — segredos no repositório:** `appsettings.json` contém a senha de app do Gmail e o segredo do JWT em texto puro. Se já foi para o GitHub, considerar a senha comprometida: revogar/gerar outra na conta Google e mover os segredos para `dotnet user-secrets` / variáveis de ambiente (e tirar do versionamento). **Apenas sugerir a ela; não alterar sem confirmar.**
- Pendência a confirmar com ela: `sign.html` aponta para `../css/signup.css`, mas o commit renomeou o arquivo para `sign.css`. Conferir se o `<link>` foi atualizado.
- Fora do escopo agora: rastreamento de bola, análise de manchete real, suporte a duas pessoas no mesmo vídeo, integração do modo ao vivo na UI principal.

## Prompt pronto para colar no Claude Code

```
Leia handoff/HANDOFF_CLAUDE_CODE.md inteiro e siga as regras da seção 0.
Crie a branch feat/video-analysis e execute T1 a T5, criando os arquivos novos a partir
do Apêndice do próprio documento. Não faça commit e não aplique migrations; vou revisar
tudo no Source Control. Comece rodando o build do backend e me mostre os erros de
compilação antes de corrigir.
```

---

# Apêndice — código completo dos arquivos novos

## A1 — `video_analysis.py`

**Destino:** `src/video-analysis-service/video_analysis.py`

````python
"""
video_analysis.py
─────────────────────────────────────────────────────────────
Núcleo da análise de vídeo por habilidade. Extrai a pose do
atleta frame a frame (MediaPipe), detecta repetições e calcula
métricas objetivas de cada uma.

IMPORTANTE — sobre a classificação de acerto/erro:
Este módulo NÃO tenta ser a palavra final sobre "certo ou errado".
Ele calcula métricas objetivas (ângulos, distâncias) e dá um
PALPITE PROVISÓRIO baseado numa regra simples e transparente.
A palavra final é sempre do treinador, que revisa o palpite da
máquina e confirma ou corrige — é a comparação máquina x
profissional que o sistema existe para fazer.

Habilidades suportadas neste MVP:
  - "static_toque"    (calibrado com vídeo real)
  - "static_manchete" (regra experimental, menos testada)
"""

import cv2
import mediapipe as mp
import numpy as np
import math
import threading

mp_pose = mp.solutions.pose

# ── PARÂMETROS CALIBRADOS COM VÍDEO REAL (Static Toque) ─────
PEAK_PROMINENCE   = 0.08   # sensibilidade mínima pra considerar um "pico" de movimento
PEAK_MIN_DISTANCE = 15     # frames mínimos entre picos candidatos (filtro bruto)
MERGE_WINDOW      = 19     # frames — picos mais próximos que isso são a MESMA repetição
SHOULDER_MARGIN   = 0.03   # margem pra considerar "mãos acima do ombro"
HANDS_CLOSE_RATIO = 1.0    # mãos mais próximas que isso (relativo à largura do ombro) = provável acerto


def calculate_angle(a, b, c):
    """Ângulo em graus no ponto b, formado pelos pontos a-b-c."""
    a, b, c = np.array(a), np.array(b), np.array(c)
    ba, bc = a - b, c - b
    cosine = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-9)
    return math.degrees(math.acos(np.clip(cosine, -1.0, 1.0)))


def extract_landmarks_per_frame(video_path):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Não consegui abrir o vídeo: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frames_data = []

    with mp_pose.Pose(
        static_image_mode=False, model_complexity=1,
        min_detection_confidence=0.5, min_tracking_confidence=0.5
    ) as pose:
        frame_idx = 0
        while cap.isOpened():
            ok, frame = cap.read()
            if not ok:
                break
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            result = pose.process(rgb)
            if result.pose_landmarks:
                lm = result.pose_landmarks.landmark
                frames_data.append({
                    "frame": frame_idx,
                    "landmarks": {p.name: (lm[p.value].x, lm[p.value].y, lm[p.value].visibility)
                                  for p in mp_pose.PoseLandmark}
                })
            else:
                frames_data.append({"frame": frame_idx, "landmarks": None})
            frame_idx += 1

    cap.release()
    return frames_data, fps


def wrist_height_signal(frames_data):
    signal = []
    for f in frames_data:
        lm = f["landmarks"]
        if lm is None:
            signal.append(np.nan)
            continue
        ly, ry = lm["LEFT_WRIST"][1], lm["RIGHT_WRIST"][1]
        signal.append(1 - (ly + ry) / 2)
    return np.array(signal)


def find_peaks_simple(signal, prominence, min_distance):
    peaks = []
    n = len(signal)
    i = 1
    while i < n - 1:
        if np.isnan(signal[i]):
            i += 1
            continue
        if signal[i] > signal[i - 1] and signal[i] >= signal[i + 1]:
            lo, hi = max(0, i - 15), min(n, i + 15)
            window = signal[lo:hi]
            window = window[~np.isnan(window)]
            if len(window) == 0:
                i += 1
                continue
            if signal[i] - np.min(window) >= prominence:
                if not peaks or (i - peaks[-1]) >= min_distance:
                    peaks.append(i)
        i += 1
    return peaks


def get_pose_metrics(frames_data, frame_idx, window=5):
    """Extrai métricas de pose no frame mais próximo do índice pedido."""
    lo, hi = max(0, frame_idx - window), min(len(frames_data), frame_idx + window)
    valid = [f for f in frames_data[lo:hi] if f["landmarks"] is not None]
    if not valid:
        return None

    target = min(valid, key=lambda f: abs(f["frame"] - frame_idx))
    lm = target["landmarks"]

    l_sh, r_sh = lm["LEFT_SHOULDER"], lm["RIGHT_SHOULDER"]
    lw, rw = lm["LEFT_WRIST"], lm["RIGHT_WRIST"]

    shoulder_y = (l_sh[1] + r_sh[1]) / 2
    shoulder_width = abs(l_sh[0] - r_sh[0])
    wrist_avg_y = (lw[1] + rw[1]) / 2
    hands_dist_ratio = abs(lw[0] - rw[0]) / (shoulder_width + 1e-9)

    left_elbow = calculate_angle(l_sh[:2], lm["LEFT_ELBOW"][:2], lw[:2])
    right_elbow = calculate_angle(r_sh[:2], lm["RIGHT_ELBOW"][:2], rw[:2])

    return {
        "frame": target["frame"],
        "aboveShoulder": wrist_avg_y < shoulder_y - SHOULDER_MARGIN,
        "handsDistanceRatio": round(hands_dist_ratio, 2),
        "leftElbowAngle": round(left_elbow, 1),
        "rightElbowAngle": round(right_elbow, 1),
    }


def detect_repetitions(frames_data, signal):
    """
    Detecção em 2 etapas:
      1. Acha todos os picos candidatos (sensível, pega ruído também)
      2. Filtra por "mãos acima do ombro" e funde picos muito próximos
         no tempo (o mesmo movimento pode gerar um pequeno solavanco
         que vira 2 picos separados por engano)
    """
    raw_peaks = find_peaks_simple(signal, PEAK_PROMINENCE, PEAK_MIN_DISTANCE)

    candidates = []
    for p in raw_peaks:
        m = get_pose_metrics(frames_data, p)
        if m and m["aboveShoulder"]:
            candidates.append(p)

    groups = []
    for p in candidates:
        if groups and (p - groups[-1][-1]) <= MERGE_WINDOW:
            groups[-1].append(p)
        else:
            groups.append([p])

    # representa cada grupo pelo frame de pico mais alto (contato real)
    final_reps = [max(g, key=lambda f: signal[f]) for g in groups]
    return final_reps


def classify_repetition_toque(metrics):
    """
    Palpite PROVISÓRIO de acerto/erro para Static Toque.
    Regra simples e transparente: mãos próximas uma da outra no
    contato = boa forma de toque. O treinador tem a palavra final.
    """
    provisional_valid = metrics["handsDistanceRatio"] < HANDS_CLOSE_RATIO
    return provisional_valid


def analyze_video(video_path, skill_type="static_toque"):
    frames_data, fps = extract_landmarks_per_frame(video_path)

    detected = sum(1 for f in frames_data if f["landmarks"] is not None)
    detection_rate = detected / len(frames_data) if frames_data else 0

    signal = wrist_height_signal(frames_data)
    rep_frames = detect_repetitions(frames_data, signal)

    repetitions = []
    for i, frame_idx in enumerate(rep_frames, start=1):
        metrics = get_pose_metrics(frames_data, frame_idx)
        if metrics is None:
            continue

        if skill_type == "static_toque":
            provisional_valid = classify_repetition_toque(metrics)
        else:
            provisional_valid = (
                metrics["leftElbowAngle"] > 130 and metrics["rightElbowAngle"] > 130
            )

        repetitions.append({
            "index": i,
            "frame": metrics["frame"],
            "timeSeconds": round(metrics["frame"] / fps, 2),
            "handsDistanceRatio": metrics["handsDistanceRatio"],
            "leftElbowAngle": metrics["leftElbowAngle"],
            "rightElbowAngle": metrics["rightElbowAngle"],
            "provisionalValid": provisional_valid
        })

    hits = sum(1 for r in repetitions if r["provisionalValid"])
    errors = len(repetitions) - hits

    return {
        "skillType": skill_type,
        "totalFrames": len(frames_data),
        "poseDetectionRate": round(detection_rate, 2),
        "repetitionsDetected": len(repetitions),
        "machineHits": hits,
        "machineErrors": errors,
        "repetitions": repetitions,
        "disclaimer": "Palpite provisório da máquina baseado em regras simples de posição. "
                      "A avaliação final deve ser confirmada pelo treinador."
    }


class LiveAnalyzer:
    """
    Versão "ao vivo" da análise — processa um frame de cada vez (em vez do
    vídeo inteiro de uma vez), mantendo um buffer deslizante em memória.

    Diferença importante em relação à análise por upload:
    Detectar um "pico" de movimento exige olhar um pouco pro FUTURO (ver se
    o movimento realmente desceu depois de subir). Como no modo ao vivo não
    existe "futuro" ainda, a confirmação de cada repetição sai com um
    pequeno atraso proposital (LIVE_CONFIRM_DELAY frames, ~0.5s) — é o
    preço de rodar em tempo real. Isso é normal em sistemas ao vivo.

    Uma instância = uma sessão de análise (um treinador, uma habilidade,
    um momento). Cria uma nova instância a cada "início" de análise ao vivo.
    """

    LIVE_CONFIRM_DELAY = 15   # frames de atraso antes de confirmar um pico (precisa ver o "depois")
    BUFFER_MAX_FRAMES = 300   # ~10s de buffer, suficiente e não deixa a memória crescer sem limite

    def __init__(self, skill_type="static_toque", fps=30):
        self.skill_type = skill_type
        self.fps = fps
        self.frame_idx = 0
        self.frames_data = []      # janela deslizante de landmarks
        self.signal_buffer = []    # janela deslizante do sinal (altura das mãos)
        self.reported_peaks = set()  # frames já confirmados, pra não repetir
        self.confirmed_repetitions = []

        self._pose = mp_pose.Pose(
            static_image_mode=False, model_complexity=1,  # mesmo modelo do modo upload — mais consistente
            min_detection_confidence=0.5, min_tracking_confidence=0.5
        )
        # Lock — o MediaPipe exige timestamps internos sempre crescentes.
        # Se dois frames chegarem rápido demais e forem processados ao
        # mesmo tempo por threads diferentes, ele quebra com um erro de
        # "timestamp mismatch". O lock garante processamento um por vez,
        # na ordem certa.
        self._lock = threading.Lock()

    def process_frame(self, frame_bgr):
        """
        Recebe um frame (formato OpenCV BGR), atualiza o estado interno,
        e retorna um dicionário com o status atual + repetições recém-confirmadas.
        """
        with self._lock:
            return self._process_frame_locked(frame_bgr)

    def _process_frame_locked(self, frame_bgr):
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        result = self._pose.process(rgb)

        if result.pose_landmarks:
            lm = result.pose_landmarks.landmark
            landmarks = {p.name: (lm[p.value].x, lm[p.value].y, lm[p.value].visibility)
                         for p in mp_pose.PoseLandmark}
            self.frames_data.append({"frame": self.frame_idx, "landmarks": landmarks})
            ly, ry = landmarks["LEFT_WRIST"][1], landmarks["RIGHT_WRIST"][1]
            self.signal_buffer.append(1 - (ly + ry) / 2)
            pose_detected = True
        else:
            self.frames_data.append({"frame": self.frame_idx, "landmarks": None})
            self.signal_buffer.append(np.nan)
            pose_detected = False

        # mantém o buffer limitado (janela deslizante)
        if len(self.frames_data) > self.BUFFER_MAX_FRAMES:
            self.frames_data.pop(0)
            self.signal_buffer.pop(0)

        new_repetitions = self._check_for_new_repetitions()

        self.frame_idx += 1

        return {
            "frameIndex": self.frame_idx,
            "poseDetected": pose_detected,
            "totalRepetitions": len(self.confirmed_repetitions),
            "newRepetitions": new_repetitions
        }

    def _check_for_new_repetitions(self):
        signal = np.array(self.signal_buffer)
        n = len(signal)
        # só olha picos que já têm "futuro" suficiente confirmado (não os últimos frames)
        safe_end = n - self.LIVE_CONFIRM_DELAY
        if safe_end < 20:
            return []

        raw_peaks = find_peaks_simple(signal[:safe_end], PEAK_PROMINENCE, PEAK_MIN_DISTANCE)

        new_reps = []
        for p in raw_peaks:
            absolute_frame = self.frames_data[p]["frame"]
            if absolute_frame in self.reported_peaks:
                continue

            metrics = get_pose_metrics(self.frames_data, p)
            if not metrics or not metrics["aboveShoulder"]:
                continue

            # evita reportar 2 picos muito próximos (mesma repetição, solavanco)
            if self.confirmed_repetitions:
                last_frame = self.confirmed_repetitions[-1]["frame"]
                if absolute_frame - last_frame <= MERGE_WINDOW:
                    continue

            if self.skill_type == "static_toque":
                provisional_valid = classify_repetition_toque(metrics)
            else:
                provisional_valid = (
                    metrics["leftElbowAngle"] > 130 and metrics["rightElbowAngle"] > 130
                )

            rep = {
                "index": len(self.confirmed_repetitions) + 1,
                "frame": absolute_frame,
                "timeSeconds": round(absolute_frame / self.fps, 2),
                "handsDistanceRatio": metrics["handsDistanceRatio"],
                "leftElbowAngle": metrics["leftElbowAngle"],
                "rightElbowAngle": metrics["rightElbowAngle"],
                "provisionalValid": provisional_valid
            }
            self.confirmed_repetitions.append(rep)
            self.reported_peaks.add(absolute_frame)
            new_reps.append(rep)

        return new_reps

    def get_summary(self):
        hits = sum(1 for r in self.confirmed_repetitions if r["provisionalValid"])
        return {
            "skillType": self.skill_type,
            "repetitionsDetected": len(self.confirmed_repetitions),
            "machineHits": hits,
            "machineErrors": len(self.confirmed_repetitions) - hits,
            "repetitions": self.confirmed_repetitions
        }

    def close(self):
        self._pose.close()
````

## A2 — `app.py`

**Destino:** `src/video-analysis-service/app.py`

````python
"""
app.py — Serviço de Análise de Vídeo (Python)
─────────────────────────────────────────────────────────────
Dois modos de uso:

1. UPLOAD (REST) — POST /analyze
   Manda o vídeo inteiro de uma vez, espera o processamento, recebe
   o resultado completo. Simples, mas sem feedback em tempo real.

2. AO VIVO (WebSocket) — eventos "start_live", "frame", "stop_live"
   O navegador manda um frame de cada vez (enquanto grava da webcam),
   o servidor processa e devolve o status na hora. Tem um pequeno
   atraso proposital (~0.5s) pra confirmar repetições — ver LiveAnalyzer
   em video_analysis.py pra entender por quê.

RODAR LOCALMENTE:
    pip install -r requirements.txt
    python app.py
    (sobe em http://localhost:5001, REST e WebSocket no mesmo servidor)
"""

import os
import base64
import tempfile
import numpy as np
import cv2
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from video_analysis import analyze_video, LiveAnalyzer

app = Flask(__name__)
app.config["SECRET_KEY"] = "volleyball-video-analysis-dev"
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")  # dev only — restrinja em produção

ALLOWED_SKILLS = {"static_toque", "static_manchete"}

# Uma sessão de análise ao vivo por conexão WebSocket (sid = session id do socket)
live_sessions = {}


# ══════════════════════════════════════════════════════════════
# MODO 1 — UPLOAD (REST, já existia)
# ══════════════════════════════════════════════════════════════

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "video-analysis"})


@app.route("/analyze", methods=["POST"])
def analyze():
    if "video" not in request.files:
        return jsonify({"error": "Nenhum arquivo de vídeo enviado (campo 'video')."}), 400

    video_file = request.files["video"]
    skill_type = request.form.get("skillType", "static_toque")

    if skill_type not in ALLOWED_SKILLS:
        return jsonify({
            "error": f"skillType '{skill_type}' não suportado ainda. "
                     f"Habilidades disponíveis: {sorted(ALLOWED_SKILLS)}"
        }), 400

    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        video_file.save(tmp.name)
        tmp_path = tmp.name

    try:
        result = analyze_video(tmp_path, skill_type)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


# ══════════════════════════════════════════════════════════════
# MODO 2 — AO VIVO (WebSocket, novo)
# ══════════════════════════════════════════════════════════════

@socketio.on("connect")
def handle_connect():
    print(f"[live] Cliente conectado: {request.sid}")


@socketio.on("disconnect")
def handle_disconnect():
    session = live_sessions.pop(request.sid, None)
    if session:
        session.close()
    print(f"[live] Cliente desconectado: {request.sid}")


@socketio.on("start_live")
def handle_start_live(data):
    """
    data: { skillType: "static_toque" | "static_manchete", fps: 30 }
    Cria uma nova sessão de análise ao vivo pra essa conexão.
    """
    skill_type = data.get("skillType", "static_toque")
    fps = data.get("fps", 30)

    if skill_type not in ALLOWED_SKILLS:
        emit("error", {"message": f"skillType '{skill_type}' não suportado."})
        return

    # se já tinha uma sessão rodando nessa conexão, fecha antes de criar outra
    old_session = live_sessions.pop(request.sid, None)
    if old_session:
        old_session.close()

    live_sessions[request.sid] = LiveAnalyzer(skill_type=skill_type, fps=fps)
    emit("live_started", {"skillType": skill_type})
    print(f"[live] Sessão iniciada para {request.sid} — habilidade: {skill_type}")


@socketio.on("frame")
def handle_frame(data):
    """
    data: { image: "data:image/jpeg;base64,..." }
    Recebe um frame da webcam, processa, devolve o status atualizado.
    """
    session = live_sessions.get(request.sid)
    if not session:
        emit("error", {"message": "Sessão não iniciada. Chame 'start_live' primeiro."})
        return

    try:
        image_b64 = data["image"].split(",")[1] if "," in data["image"] else data["image"]
        image_bytes = base64.b64decode(image_b64)
        np_arr = np.frombuffer(image_bytes, np.uint8)
        frame_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if frame_bgr is None:
            emit("error", {"message": "Não consegui decodificar o frame recebido."})
            return

        status = session.process_frame(frame_bgr)
        emit("analysis_update", status)

    except Exception as e:
        emit("error", {"message": f"Erro processando frame: {str(e)}"})


@socketio.on("stop_live")
def handle_stop_live():
    """Encerra a sessão ao vivo e devolve o resumo final."""
    session = live_sessions.pop(request.sid, None)
    if not session:
        emit("error", {"message": "Nenhuma sessão ativa pra encerrar."})
        return

    summary = session.get_summary()
    session.close()
    emit("live_finished", summary)
    print(f"[live] Sessão encerrada para {request.sid} — {summary['repetitionsDetected']} repetições")


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5001, debug=False, allow_unsafe_werkzeug=True)
````

## A3 — `requirements.txt`

**Destino:** `src/video-analysis-service/requirements.txt`

````
flask==3.0.3
flask-socketio==5.3.6
python-socketio==5.11.2
mediapipe==0.10.14
opencv-python-headless==4.13.0.92
numpy==2.4.4
eventlet==0.36.1
````

## A4 — `VideoAnalysisDTOs.cs`

**Destino:** `src/backend/DTO/VideoAnalysisDTOs.cs`

````csharp
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace VolleyballSystem.API.DTO
{
    // O que o serviço Python devolve por repetição
    public class RepetitionAnalysis
    {
        public int Index { get; set; }
        public int Frame { get; set; }
        public double TimeSeconds { get; set; }
        public double HandsDistanceRatio { get; set; }
        public double LeftElbowAngle { get; set; }
        public double RightElbowAngle { get; set; }
        public bool ProvisionalValid { get; set; }
    }

    // Resposta completa do serviço Python
    public class PythonAnalysisResponse
    {
        public string SkillType { get; set; } = string.Empty;
        public int TotalFrames { get; set; }
        public double PoseDetectionRate { get; set; }
        public int RepetitionsDetected { get; set; }
        public int MachineHits { get; set; }
        public int MachineErrors { get; set; }
        public List<RepetitionAnalysis> Repetitions { get; set; } = new();
        public string Disclaimer { get; set; } = string.Empty;
    }

    // O que o frontend recebe depois que o .NET processa e salva
    public class VideoAnalysisResultResponse
    {
        public int TestSkillResultId { get; set; }
        public int SkillIndex { get; set; }
        public string SkillName { get; set; } = string.Empty;
        public int ManualHits { get; set; }         // o que o treinador digitou originalmente
        public int? MachineHits { get; set; }
        public int? MachineErrors { get; set; }
        public int RepetitionsDetected { get; set; }
        public double PoseDetectionRate { get; set; }
        public List<RepetitionAnalysis> Repetitions { get; set; } = new();
        public string Disclaimer { get; set; } = string.Empty;
        public DateTime AnalyzedAt { get; set; }
    }

    // Requisição do treinador pra confirmar/corrigir o palpite da máquina
    public class CoachReviewRequest
    {
        [Required]
        public bool AgreesWithMachine { get; set; }

        [MaxLength(500)]
        public string? Comment { get; set; }

        // Se o treinador discordar, ele pode informar o valor final correto
        [Range(0, 10)]
        public int? FinalHits { get; set; }
    }
}
````

## A5 — `VideoAnalysisController.cs`

**Destino:** `src/backend/Controllers/VideoAnalysisController.cs`

````csharp
using System;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using VolleyballSystem.API.Data;
using VolleyballSystem.API.DTO;
using VolleyballSystem.API.Models;

namespace VolleyballSystem.API.Controllers
{
    // Habilidades suportadas pela análise de vídeo neste MVP.
    // Mapeamento SkillIndex -> tipo de análise no serviço Python.
    // (0 = Static Manchete, 1 = Static Toque — ver lista completa em new-test.js)
    public static class VideoAnalysisSkillMap
    {
        public static readonly System.Collections.Generic.Dictionary<int, string> SupportedSkills = new()
        {
            { 0, "static_manchete" },
            { 1, "static_toque" },
        };
    }

    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class VideoAnalysisController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _config;
        private readonly IWebHostEnvironment _env;

        public VideoAnalysisController(
            ApplicationDbContext context,
            IHttpClientFactory httpClientFactory,
            IConfiguration config,
            IWebHostEnvironment env)
        {
            _context = context;
            _httpClientFactory = httpClientFactory;
            _config = config;
            _env = env;
        }

        // GET api/videoanalysis/supported-skills
        // Frontend usa isso pra saber em quais habilidades mostrar o botão de upload
        [HttpGet("supported-skills")]
        public IActionResult GetSupportedSkills()
        {
            return Ok(VideoAnalysisSkillMap.SupportedSkills.Keys);
        }

        // POST api/videoanalysis/test-skill-results/{id}/analyze
        // Recebe o vídeo, envia pro serviço Python, salva o resultado
        [HttpPost("test-skill-results/{id}/analyze")]
        [RequestSizeLimit(200_000_000)] // ~200MB, vídeos podem ser grandes
        public async Task<IActionResult> AnalyzeVideo(int id, IFormFile video)
        {
            if (video == null || video.Length == 0)
                return BadRequest(new { message = "Nenhum vídeo enviado." });

            var skillResult = await _context.TestSkillResults
                .FirstOrDefaultAsync(s => s.Id == id);

            if (skillResult == null)
                return NotFound(new { message = "Resultado de habilidade não encontrado." });

            if (!VideoAnalysisSkillMap.SupportedSkills.TryGetValue(skillResult.SkillIndex, out var skillType))
            {
                return BadRequest(new
                {
                    message = "Análise por vídeo ainda não está disponível para esta habilidade.",
                    supportedSkillIndexes = VideoAnalysisSkillMap.SupportedSkills.Keys
                });
            }

            // Salva o vídeo em disco (wwwroot/uploads/videos)
            var uploadsFolder = Path.Combine(_env.ContentRootPath, "uploads", "videos");
            Directory.CreateDirectory(uploadsFolder);
            var fileName = $"skill_{id}_{DateTime.UtcNow:yyyyMMddHHmmss}{Path.GetExtension(video.FileName)}";
            var filePath = Path.Combine(uploadsFolder, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await video.CopyToAsync(stream);
            }

            // Chama o serviço Python
            var pythonServiceUrl = _config["VideoAnalysis:ServiceUrl"] ?? "http://localhost:5001";
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromMinutes(5); // vídeo pode demorar pra processar

            PythonAnalysisResponse? analysisResult;
            try
            {
                using var form = new MultipartFormDataContent();
                await using var videoStream = System.IO.File.OpenRead(filePath);
                var streamContent = new StreamContent(videoStream);
                streamContent.Headers.ContentType = MediaTypeHeaderValue.Parse("video/mp4");
                form.Add(streamContent, "video", fileName);
                form.Add(new StringContent(skillType), "skillType");

                var response = await client.PostAsync($"{pythonServiceUrl}/analyze", form);
                var responseBody = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    return StatusCode(502, new
                    {
                        message = "O serviço de análise de vídeo retornou um erro.",
                        details = responseBody
                    });
                }

                analysisResult = JsonSerializer.Deserialize<PythonAnalysisResponse>(responseBody,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch (HttpRequestException ex)
            {
                return StatusCode(503, new
                {
                    message = "Não consegui conectar ao serviço de análise de vídeo. Ele está rodando? (python app.py)",
                    details = ex.Message
                });
            }

            if (analysisResult == null)
                return StatusCode(500, new { message = "Resposta inválida do serviço de análise." });

            // Salva o resultado no banco
            skillResult.MachineHits = analysisResult.MachineHits;
            skillResult.MachineErrors = analysisResult.MachineErrors;
            skillResult.VideoPath = $"/uploads/videos/{fileName}";
            skillResult.AnalyzedAt = DateTime.UtcNow;
            skillResult.AnalysisDetailsJson = JsonSerializer.Serialize(analysisResult.Repetitions);
            skillResult.CoachAgreesWithMachine = null; // aguardando revisão
            skillResult.CoachComment = null;

            await _context.SaveChangesAsync();

            return Ok(new VideoAnalysisResultResponse
            {
                TestSkillResultId = skillResult.Id,
                SkillIndex = skillResult.SkillIndex,
                SkillName = skillResult.SkillName,
                ManualHits = skillResult.Hits,
                MachineHits = skillResult.MachineHits,
                MachineErrors = skillResult.MachineErrors,
                RepetitionsDetected = analysisResult.RepetitionsDetected,
                PoseDetectionRate = analysisResult.PoseDetectionRate,
                Repetitions = analysisResult.Repetitions,
                Disclaimer = analysisResult.Disclaimer,
                AnalyzedAt = skillResult.AnalyzedAt.Value
            });
        }

        // GET api/videoanalysis/test-skill-results/{id}
        // Recupera uma análise já feita (pra reabrir a tela sem reprocessar o vídeo)
        [HttpGet("test-skill-results/{id}")]
        public async Task<IActionResult> GetAnalysis(int id)
        {
            var skillResult = await _context.TestSkillResults.FirstOrDefaultAsync(s => s.Id == id);
            if (skillResult == null)
                return NotFound(new { message = "Resultado de habilidade não encontrado." });

            if (skillResult.AnalyzedAt == null)
                return NotFound(new { message = "Esta habilidade ainda não foi analisada por vídeo." });

            var repetitions = string.IsNullOrEmpty(skillResult.AnalysisDetailsJson)
                ? new System.Collections.Generic.List<RepetitionAnalysis>()
                : JsonSerializer.Deserialize<System.Collections.Generic.List<RepetitionAnalysis>>(
                    skillResult.AnalysisDetailsJson,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();

            return Ok(new VideoAnalysisResultResponse
            {
                TestSkillResultId = skillResult.Id,
                SkillIndex = skillResult.SkillIndex,
                SkillName = skillResult.SkillName,
                ManualHits = skillResult.Hits,
                MachineHits = skillResult.MachineHits,
                MachineErrors = skillResult.MachineErrors,
                RepetitionsDetected = repetitions.Count,
                PoseDetectionRate = 0, // não guardamos isso separadamente hoje
                Repetitions = repetitions,
                Disclaimer = "Palpite provisório da máquina. A avaliação final é do treinador.",
                AnalyzedAt = skillResult.AnalyzedAt.Value
            });
        }

        // PUT api/videoanalysis/test-skill-results/{id}/review
        // O treinador confirma ou corrige o palpite da máquina
        [HttpPut("test-skill-results/{id}/review")]
        public async Task<IActionResult> ReviewAnalysis(int id, [FromBody] CoachReviewRequest request)
        {
            var skillResult = await _context.TestSkillResults.FirstOrDefaultAsync(s => s.Id == id);
            if (skillResult == null)
                return NotFound(new { message = "Resultado de habilidade não encontrado." });

            if (skillResult.AnalyzedAt == null)
                return BadRequest(new { message = "Esta habilidade ainda não foi analisada por vídeo." });

            skillResult.CoachAgreesWithMachine = request.AgreesWithMachine;
            skillResult.CoachComment = request.Comment;

            // Se o treinador discordou e informou o valor certo, isso vira o valor oficial
            if (!request.AgreesWithMachine && request.FinalHits.HasValue)
            {
                skillResult.Hits = request.FinalHits.Value;
                skillResult.Errors = 10 - request.FinalHits.Value;
            }
            else if (request.AgreesWithMachine && skillResult.MachineHits.HasValue)
            {
                // Se concordou com a máquina, o valor da máquina vira o oficial
                skillResult.Hits = skillResult.MachineHits.Value;
                skillResult.Errors = skillResult.MachineErrors ?? (10 - skillResult.MachineHits.Value);
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Revisão salva com sucesso.",
                finalHits = skillResult.Hits,
                finalErrors = skillResult.Errors
            });
        }
    }
}
````

## A6 — `TestSkillResult.cs`

**Destino:** `src/backend/Models/TestSkillResult.cs  (MESCLAR com o existente — só os campos de análise de vídeo são novos)`

````csharp
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VolleyballSystem.API.Models
{
    public class TestSkillResult
    {
        [Key]
        public int Id { get; set; }

        public int TestId { get; set; }

        [ForeignKey("TestId")]
        public Test Test { get; set; } = null!;

        public int SkillIndex { get; set; }

        [MaxLength(100)]
        public string SkillName { get; set; } = string.Empty;

        [Range(0, 10)]
        public int Hits { get; set; }

        [Range(0, 10)]
        public int Errors { get; set; }

        // ─── ANÁLISE DE VÍDEO (IA) ──────────────────────────────
        // Palpite provisório da máquina — nunca substitui Hits/Errors
        // automaticamente. O treinador decide se aceita ou não.
        public int? MachineHits { get; set; }
        public int? MachineErrors { get; set; }

        [MaxLength(400)]
        public string? VideoPath { get; set; }

        public DateTime? AnalyzedAt { get; set; }

        // Revisão do treinador sobre o palpite da máquina
        public bool? CoachAgreesWithMachine { get; set; }

        [MaxLength(500)]
        public string? CoachComment { get; set; }

        // JSON serializado com o detalhe de cada repetição analisada
        // (ângulos, distâncias, timestamps) — guardado como texto simples
        // pra não precisar de uma tabela nova só pra isso no MVP.
        public string? AnalysisDetailsJson { get; set; }
    }
}
````

## A7 — `video-analysis.js`

**Destino:** `src/frontend/js/video-analysis.js`

````javascript
import { apiRequest } from "./auth.js";
import API_URL from "./config.js";

// Habilidades suportadas pela análise de vídeo neste MVP
// (mantido em sincronia com VideoAnalysisSkillMap no backend)
let SUPPORTED_SKILL_INDEXES = [0, 1];

// Busca do backend quais habilidades estão disponíveis (fallback pro hardcoded acima se falhar)
export async function loadSupportedSkills() {
    try {
        const supported = await apiRequest("/videoanalysis/supported-skills", { method: "GET" });
        if (Array.isArray(supported)) SUPPORTED_SKILL_INDEXES = supported;
    } catch {
        // usa o fallback
    }
    return SUPPORTED_SKILL_INDEXES;
}

export function isSkillSupported(skillIndex) {
    return SUPPORTED_SKILL_INDEXES.includes(skillIndex);
}

/**
 * Renderiza o bloco de análise de vídeo para uma habilidade dentro do modal.
 * `skillResultId` é o Id do TestSkillResult (não o índice 0-15).
 */
export function renderVideoAnalysisBlock(skillResultId, skillIndex, skillName) {
    if (!isSkillSupported(skillIndex)) return "";

    return `
        <div class="va-block" data-skill-result-id="${skillResultId}">
            <div class="va-header">
                <span class="va-badge">🎥 Análise por IA disponível</span>
                <button class="va-upload-btn" data-skill-result-id="${skillResultId}" data-skill-index="${skillIndex}">
                    Enviar vídeo
                </button>
                <input type="file" accept="video/*" class="va-file-input hidden" data-skill-result-id="${skillResultId}"/>
            </div>
            <div class="va-result" id="va-result-${skillResultId}"></div>
        </div>
    `;
}

/**
 * Liga os eventos de clique/upload depois que o modal foi renderizado no DOM.
 */
export function bindVideoAnalysisEvents(container) {
    container.querySelectorAll(".va-upload-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = btn.dataset.skillResultId;
            const fileInput = container.querySelector(`.va-file-input[data-skill-result-id="${id}"]`);
            fileInput.click();
        });
    });

    container.querySelectorAll(".va-file-input").forEach(input => {
        input.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const skillResultId = input.dataset.skillResultId;
            await uploadAndAnalyze(skillResultId, file, container);
        });
    });
}

async function uploadAndAnalyze(skillResultId, file, container) {
    const resultBox = container.querySelector(`#va-result-${skillResultId}`);
    resultBox.innerHTML = `<div class="va-loading">⏳ Analisando vídeo... isso pode levar 1-2 minutos.</div>`;

    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("video", file);

    try {
        const response = await fetch(`${API_URL}/videoanalysis/test-skill-results/${skillResultId}/analyze`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` },
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            resultBox.innerHTML = `<div class="va-error">❌ ${data.message || "Erro ao analisar vídeo."}</div>`;
            return;
        }

        renderAnalysisResult(resultBox, data, skillResultId);

    } catch (err) {
        resultBox.innerHTML = `<div class="va-error">❌ Não consegui conectar ao serviço de análise. Ele está rodando?</div>`;
    }
}

function renderAnalysisResult(resultBox, data, skillResultId) {
    const machineHits = data.machineHits ?? "–";
    const machineErrors = data.machineErrors ?? "–";

    resultBox.innerHTML = `
        <div class="va-comparison">
            <div class="va-compare-card manual">
                <span class="va-compare-label">Treinador digitou</span>
                <span class="va-compare-value">${data.manualHits}/10</span>
            </div>
            <div class="va-compare-vs">vs</div>
            <div class="va-compare-card machine">
                <span class="va-compare-label">Máquina detectou</span>
                <span class="va-compare-value">${machineHits}/10</span>
            </div>
        </div>

        <div class="va-disclaimer">ℹ️ ${data.disclaimer}</div>

        <div class="va-reps-title">Detalhe de cada repetição (${data.repetitionsDetected} detectadas)</div>
        <div class="va-reps-list">
            ${data.repetitions.map(r => `
                <div class="va-rep-row ${r.provisionalValid ? 'valid' : 'invalid'}">
                    <span class="va-rep-index">#${r.index}</span>
                    <span class="va-rep-time">${r.timeSeconds}s</span>
                    <span class="va-rep-metric">Mãos: ${r.handsDistanceRatio}</span>
                    <span class="va-rep-metric">Cotovelo E/D: ${r.leftElbowAngle}° / ${r.rightElbowAngle}°</span>
                    <span class="va-rep-status">${r.provisionalValid ? '✅ Válido' : '❌ Inválido'}</span>
                </div>
            `).join("")}
        </div>

        <div class="va-review">
            <div class="va-review-title">Sua avaliação como treinador:</div>
            <div class="va-review-buttons">
                <button class="va-agree-btn" data-id="${skillResultId}">✅ Concordo com a máquina</button>
                <button class="va-disagree-btn" data-id="${skillResultId}">✏️ Corrigir valor</button>
            </div>
            <div class="va-correction hidden" id="va-correction-${skillResultId}">
                <input type="number" min="0" max="10" placeholder="Valor correto (0-10)" class="va-correction-input"/>
                <textarea placeholder="Comentário (opcional) — por que você discorda?" class="va-correction-comment"></textarea>
                <button class="va-submit-correction-btn" data-id="${skillResultId}">Salvar avaliação</button>
            </div>
        </div>
    `;

    bindReviewEvents(resultBox, skillResultId);
}

function bindReviewEvents(resultBox, skillResultId) {
    resultBox.querySelector(".va-agree-btn")?.addEventListener("click", async () => {
        await submitReview(skillResultId, true, null, null, resultBox);
    });

    resultBox.querySelector(".va-disagree-btn")?.addEventListener("click", () => {
        resultBox.querySelector(`#va-correction-${skillResultId}`).classList.remove("hidden");
    });

    resultBox.querySelector(".va-submit-correction-btn")?.addEventListener("click", async () => {
        const finalHits = resultBox.querySelector(".va-correction-input").value;
        const comment = resultBox.querySelector(".va-correction-comment").value;
        await submitReview(skillResultId, false, comment, finalHits ? parseInt(finalHits) : null, resultBox);
    });
}

async function submitReview(skillResultId, agreesWithMachine, comment, finalHits, resultBox) {
    try {
        const data = await apiRequest(`/videoanalysis/test-skill-results/${skillResultId}/review`, {
            method: "PUT",
            body: JSON.stringify({
                AgreesWithMachine: agreesWithMachine,
                Comment: comment,
                FinalHits: finalHits
            })
        });

        const reviewSection = resultBox.querySelector(".va-review");
        reviewSection.innerHTML = `
            <div class="va-review-done">
                ✅ Avaliação salva! Valor final: <strong>${data.finalHits}/10</strong>
            </div>
        `;
    } catch (err) {
        alert(err.message || "Erro ao salvar avaliação.");
    }
}
````

## A8 — `video-analysis.css`

**Destino:** `ANEXAR ao final de src/frontend/css/test.css`

````css
/* =========================
   VIDEO ANALYSIS (IA)
========================= */
.va-block {
  margin-top: 12px; padding: 14px;
  background: rgba(78,143,255,0.05); border: 1px dashed rgba(78,143,255,0.3);
  border-radius: 8px;
}

.va-header { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.va-badge {
  font-size: 11px; font-weight: 600; color: var(--accent);
  background: rgba(78,143,255,0.12); padding: 3px 10px; border-radius: 20px;
}

.va-upload-btn {
  padding: 6px 14px; border: 1px solid var(--accent); border-radius: 6px;
  background: none; color: var(--accent); font-size: 12px; font-weight: 600;
  cursor: pointer; transition: background 0.15s;
}
.va-upload-btn:hover { background: rgba(78,143,255,0.12); }

.va-result { margin-top: 12px; }

.va-loading { font-size: 13px; color: var(--text-muted); padding: 12px 0; }
.va-error   { font-size: 13px; color: #f87171; padding: 12px 0; }

.va-comparison { display: flex; align-items: center; gap: 14px; margin-bottom: 12px; }
.va-compare-card {
  flex: 1; text-align: center; padding: 14px;
  background: var(--bg-main); border: 1px solid var(--border); border-radius: 8px;
}
.va-compare-card.machine { border-color: rgba(78,143,255,0.3); }
.va-compare-label { display: block; font-size: 11px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px; }
.va-compare-value { display: block; font-size: 22px; font-weight: 700; color: var(--text-primary); }
.va-compare-vs { font-size: 12px; color: var(--text-subtle); font-weight: 700; }

.va-disclaimer {
  font-size: 11.5px; color: var(--text-subtle); font-style: italic;
  margin-bottom: 14px; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: 6px;
}

.va-reps-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 10px; }
.va-reps-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; max-height: 220px; overflow-y: auto; }

.va-rep-row {
  display: flex; align-items: center; gap: 12px; padding: 8px 10px;
  border-radius: 6px; font-size: 12px; flex-wrap: wrap;
  border-left: 3px solid transparent;
}
.va-rep-row.valid   { background: rgba(56,196,176,0.06); border-left-color: #38c4b0; }
.va-rep-row.invalid { background: rgba(248,113,113,0.06); border-left-color: #f87171; }

.va-rep-index  { font-weight: 700; color: var(--text-primary); min-width: 28px; }
.va-rep-time   { color: var(--text-muted); min-width: 44px; }
.va-rep-metric { color: var(--text-muted); }
.va-rep-status { margin-left: auto; font-weight: 600; }

.va-review { border-top: 1px solid var(--border); padding-top: 14px; }
.va-review-title { font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 10px; text-transform: uppercase; }
.va-review-buttons { display: flex; gap: 10px; }

.va-agree-btn, .va-disagree-btn, .va-submit-correction-btn {
  padding: 8px 16px; border-radius: 6px; font-size: 12.5px; font-weight: 600;
  cursor: pointer; transition: opacity 0.15s;
}
.va-agree-btn { background: rgba(56,196,176,0.15); color: #38c4b0; border: 1px solid rgba(56,196,176,0.3); }
.va-disagree-btn { background: rgba(245,158,66,0.15); color: #f59e42; border: 1px solid rgba(245,158,66,0.3); }
.va-agree-btn:hover, .va-disagree-btn:hover { opacity: 0.8; }

.va-correction { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
.va-correction-input, .va-correction-comment {
  padding: 8px 12px; background: var(--bg-main); border: 1px solid var(--border);
  border-radius: 6px; color: var(--text-primary); font-size: 13px; font-family: Arial, sans-serif;
}
.va-correction-comment { min-height: 60px; resize: vertical; }
.va-submit-correction-btn {
  background: var(--accent); color: white; border: none; align-self: flex-start;
}

.va-review-done {
  font-size: 13px; color: #38c4b0; font-weight: 600;
  background: rgba(56,196,176,0.08); padding: 10px 14px; border-radius: 6px;
}
````

## A9 — `SupportMessage.cs`

**Destino:** `src/backend/Models/SupportMessage.cs  (só se não existir — ver T5)`

````csharp
using System;
using System.ComponentModel.DataAnnotations;

namespace VolleyballSystem.API.Models
{
    // Mensagens do mural de apoio na página de homenagem à Tifanny Abreu.
    // Público, sem necessidade de ser o autor logado a exibir — mas o
    // envio ainda exige estar autenticado no sistema (Authorize no controller).
    public class SupportMessage
    {
        public int Id { get; set; }

        [MaxLength(60)]
        public string? AuthorName { get; set; } // null = anônimo

        [Required]
        [MaxLength(300)]
        public string Message { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
````

## A10 — `SupportMessageDTOs.cs`

**Destino:** `src/backend/DTO/SupportMessageDTOs.cs  (só se não existir — ver T5)`

````csharp
using System;
using System.ComponentModel.DataAnnotations;

namespace VolleyballSystem.API.DTO
{
    public class CreateSupportMessageRequest
    {
        [MaxLength(60)]
        public string? AuthorName { get; set; }

        [Required]
        [MinLength(2, ErrorMessage = "Message is too short.")]
        [MaxLength(300)]
        public string Message { get; set; } = string.Empty;
    }

    public class SupportMessageResponse
    {
        public int Id { get; set; }
        public string? AuthorName { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}
````

## A11 — `SupportMessagesController.cs`

**Destino:** `src/backend/Controllers/SupportMessagesController.cs  (só se não existir — ver T5)`

````csharp
using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VolleyballSystem.API.Data;
using VolleyballSystem.API.DTO;
using VolleyballSystem.API.Models;

namespace VolleyballSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SupportMessagesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public SupportMessagesController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET api/supportmessages — lista o mural, mais recentes primeiro
        // (leitura pública dentro do sistema logado, qualquer coach pode ver)
        [Authorize]
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var messages = await _context.SupportMessages
                .OrderByDescending(m => m.CreatedAt)
                .Take(200) // limite razoável pra não sobrecarregar a página
                .Select(m => new SupportMessageResponse
                {
                    Id = m.Id,
                    AuthorName = m.AuthorName,
                    Message = m.Message,
                    CreatedAt = m.CreatedAt
                })
                .ToListAsync();

            return Ok(messages);
        }

        // POST api/supportmessages — adiciona uma mensagem de apoio
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateSupportMessageRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var trimmedMessage = request.Message.Trim();
            if (trimmedMessage.Length < 2)
                return BadRequest(new { message = "Message is too short." });

            var entity = new SupportMessage
            {
                AuthorName = string.IsNullOrWhiteSpace(request.AuthorName) ? null : request.AuthorName.Trim(),
                Message = trimmedMessage,
                CreatedAt = DateTime.UtcNow
            };

            _context.SupportMessages.Add(entity);
            await _context.SaveChangesAsync();

            return StatusCode(201, new SupportMessageResponse
            {
                Id = entity.Id,
                AuthorName = entity.AuthorName,
                Message = entity.Message,
                CreatedAt = entity.CreatedAt
            });
        }
    }
}
````

## A12 — `teste_ao_vivo_websocket.html`

**Destino:** `docs/ ou tools/teste_ao_vivo_websocket.html  (opcional)`

````html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Teste — Análise ao Vivo via WebSocket</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: Arial, sans-serif;
    background: #0a1220;
    color: #e8eef8;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px;
    min-height: 100vh;
  }
  h1 { font-size: 20px; margin-bottom: 4px; }
  p.subtitle { color: #8aa0c4; font-size: 13px; margin-bottom: 20px; text-align: center; max-width: 500px; }

  .controls { display: flex; gap: 10px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; justify-content: center; }
  select, input {
    padding: 8px 12px; background: #0d2145; border: 1px solid #1a3265;
    border-radius: 6px; color: #e8eef8; font-size: 13px;
  }
  button {
    padding: 10px 22px; background: #4e8fff; border: none; border-radius: 8px;
    color: white; font-size: 14px; font-weight: 600; cursor: pointer;
  }
  button:hover { background: #6aa3ff; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  button.stop { background: #e05555; }
  button.stop:hover { background: #f47070; }

  .video-wrap {
    position: relative; width: 100%; max-width: 480px;
    background: #000; border-radius: 12px; overflow: hidden;
    border: 1px solid #1a3265; display: none;
  }
  video { width: 100%; display: block; transform: scaleX(-1); }

  .stats { display: flex; gap: 12px; margin-top: 16px; flex-wrap: wrap; justify-content: center; }
  .stat-card {
    background: #0d2145; border: 1px solid #1a3265; border-radius: 8px;
    padding: 12px 20px; text-align: center; min-width: 100px;
  }
  .stat-label { font-size: 11px; color: #6a85b0; text-transform: uppercase; display: block; margin-bottom: 4px; }
  .stat-value { font-size: 24px; font-weight: 700; }
  .stat-value.hits { color: #38c4b0; }
  .stat-value.errors { color: #f87171; }

  #repList {
    margin-top: 20px; width: 100%; max-width: 480px;
    display: flex; flex-direction: column; gap: 6px;
  }
  .rep-row {
    display: flex; justify-content: space-between; padding: 8px 12px;
    border-radius: 6px; font-size: 12px; border-left: 3px solid transparent;
  }
  .rep-row.valid { background: rgba(56,196,176,0.08); border-left-color: #38c4b0; }
  .rep-row.invalid { background: rgba(248,113,113,0.08); border-left-color: #f87171; }

  #log { margin-top: 16px; font-size: 12px; color: #6a85b0; text-align: center; max-width: 480px; }
</style>
</head>
<body>

<h1>🔴 Teste — Análise Ao Vivo (WebSocket)</h1>
<p class="subtitle">Conecta na sua webcam e manda os frames pro servidor Python em tempo real. Certifique-se que <code>python app.py</code> está rodando em localhost:5001.</p>

<div class="controls">
  <select id="skillSelect">
    <option value="static_toque">Static Toque</option>
    <option value="static_manchete">Static Manchete</option>
  </select>
  <button id="startBtn">🔴 Iniciar ao vivo</button>
  <button id="stopBtn" class="stop" style="display:none;">⏹ Encerrar</button>
</div>

<div class="video-wrap" id="videoWrap">
  <video id="video" autoplay playsinline muted></video>
</div>

<div class="stats" id="stats" style="display:none;">
  <div class="stat-card">
    <span class="stat-label">Repetições</span>
    <span class="stat-value" id="repCount">0</span>
  </div>
  <div class="stat-card">
    <span class="stat-label">Acertos</span>
    <span class="stat-value hits" id="hitCount">0</span>
  </div>
  <div class="stat-card">
    <span class="stat-label">Erros</span>
    <span class="stat-value errors" id="errorCount">0</span>
  </div>
</div>

<div id="repList"></div>
<div id="log">Escolha a habilidade e clique em "Iniciar ao vivo".</div>

<script src="https://cdn.jsdelivr.net/npm/socket.io-client@4.7.5/dist/socket.io.min.js"></script>
<script>
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const skillSelect = document.getElementById("skillSelect");
const videoWrap = document.getElementById("videoWrap");
const video = document.getElementById("video");
const stats = document.getElementById("stats");
const repCount = document.getElementById("repCount");
const hitCount = document.getElementById("hitCount");
const errorCount = document.getElementById("errorCount");
const repList = document.getElementById("repList");
const log = document.getElementById("log");

let socket = null;
let stream = null;
let captureInterval = null;
let hits = 0, errors = 0;

const SERVER_URL = "http://localhost:5001";
const CAPTURE_FPS = 10; // manda 10 frames por segundo pro servidor (suficiente e leve)

startBtn.addEventListener("click", async () => {
  startBtn.disabled = true;
  log.textContent = "Conectando no servidor Python...";

  socket = io(SERVER_URL);

  socket.on("connect", async () => {
    log.textContent = "Conectado! Pedindo acesso à câmera...";
    stream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 854 } });
    video.srcObject = stream;
    videoWrap.style.display = "block";

    video.addEventListener("loadeddata", () => {
      socket.emit("start_live", { skillType: skillSelect.value, fps: CAPTURE_FPS });
    });
  });

  socket.on("live_started", (data) => {
    log.textContent = `Analisando ao vivo — habilidade: ${data.skillType}. Faça o movimento!`;
    stats.style.display = "flex";
    startBtn.style.display = "none";
    stopBtn.style.display = "inline-block";
    startCapturing();
  });

  socket.on("analysis_update", (data) => {
    if (data.newRepetitions && data.newRepetitions.length > 0) {
      data.newRepetitions.forEach(rep => {
        if (rep.provisionalValid) hits++; else errors++;
        addRepRow(rep);
      });
      repCount.textContent = hits + errors;
      hitCount.textContent = hits;
      errorCount.textContent = errors;
    }
  });

  socket.on("live_finished", (summary) => {
    log.textContent = `Sessão encerrada. Total: ${summary.repetitionsDetected} repetições, ${summary.machineHits} acertos.`;
  });

  socket.on("error", (data) => {
    log.textContent = "Erro: " + data.message;
  });

  socket.on("connect_error", () => {
    log.textContent = "Não consegui conectar ao servidor Python. Ele está rodando em localhost:5001?";
    startBtn.disabled = false;
  });
});

function startCapturing() {
  const canvas = document.createElement("canvas");
  canvas.width = 480;
  canvas.height = 854;
  const ctx = canvas.getContext("2d");

  captureInterval = setInterval(() => {
    if (!video.videoWidth) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    socket.emit("frame", { image: dataUrl });
  }, 1000 / CAPTURE_FPS);
}

function addRepRow(rep) {
  const row = document.createElement("div");
  row.className = `rep-row ${rep.provisionalValid ? "valid" : "invalid"}`;
  row.innerHTML = `
    <span>#${rep.index} — ${rep.timeSeconds}s</span>
    <span>mãos: ${rep.handsDistanceRatio} | cotovelo: ${rep.leftElbowAngle}°/${rep.rightElbowAngle}°</span>
    <span>${rep.provisionalValid ? "✅" : "❌"}</span>
  `;
  repList.prepend(row);
}

stopBtn.addEventListener("click", () => {
  clearInterval(captureInterval);
  socket.emit("stop_live");
  if (stream) stream.getTracks().forEach(t => t.stop());
  stopBtn.style.display = "none";
  startBtn.style.display = "inline-block";
  startBtn.disabled = false;
  videoWrap.style.display = "none";
});
</script>
</body>
</html>
````