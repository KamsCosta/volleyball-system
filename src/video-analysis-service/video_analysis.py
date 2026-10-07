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
  - "static_manchete" (calibrado com 2 vídeos: professor e aluno, 06/10/2026)

Antes de analisar, o serviço escolhe automaticamente QUEM avaliar
(quadro inteiro, metade esquerda ou metade direita), porque nos
vídeos de treino costuma haver um alimentador jogando a bola.
Detalhes e resultados da calibração: README.md desta pasta.
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

# ── PARÂMETROS DA MANCHETE (calibrados com professor.mp4 e aluno.mp4) ──
# Tudo é medido em "troncos" (distância ombro-quadril na imagem), e não em
# largura do ombro: com a câmera de perfil a largura do ombro vai a zero e
# qualquer razão dividida por ela explode.
MANCHETE_PEAK_PROMINENCE = 0.6   # subida mínima dos punhos (em troncos) para contar uma repetição
MANCHETE_MIN_GAP_S       = 1.2   # segundos mínimos entre duas repetições
MANCHETE_CONTACT_WINDOW_S = 0.8  # janela antes do pico onde fica o contato com a bola
MANCHETE_BASE_MAX        = 0.75  # altura quadril-tornozelo (troncos); abaixo disso = base baixa
                                 # professor: média 0.60 / aluno: média 0.87
MANCHETE_HANDS_MAX       = 1.5   # distância entre punhos (troncos); acima disso = braços separados
                                 # (só pega separação grosseira: a janela de contato ainda é estimada)
ANALYSIS_SIZE_LIMIT      = 1280  # lado maior (px) da imagem enviada ao MediaPipe


def calculate_angle(a, b, c):
    """Ângulo em graus no ponto b, formado pelos pontos a-b-c."""
    a, b, c = np.array(a), np.array(b), np.array(c)
    ba, bc = a - b, c - b
    cosine = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-9)
    return math.degrees(math.acos(np.clip(cosine, -1.0, 1.0)))


def crop_view(frame, view):
    """
    Recorta o frame conforme a "vista" escolhida e amplia o recorte.
    O MediaPipe rastreia só UMA pessoa por imagem; cortar ao meio é o
    jeito de isolar o executante quando há um alimentador no quadro.
    Ampliar ajuda quando a pessoa aparece pequena no vídeo.
    """
    h, w = frame.shape[:2]
    if view == "left":
        frame = frame[:, : w // 2]
    elif view == "right":
        frame = frame[:, w // 2:]
    fh, fw = frame.shape[:2]
    scale = min(2.0, ANALYSIS_SIZE_LIMIT / max(fh, fw))
    if scale > 1.05:
        frame = cv2.resize(frame, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    return frame


def extract_landmarks_per_frame(video_path, view="full", frame_step=1, model_complexity=1):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Não consegui abrir o vídeo: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frames_data = []

    with mp_pose.Pose(
        static_image_mode=False, model_complexity=model_complexity,
        min_detection_confidence=0.5, min_tracking_confidence=0.5
    ) as pose:
        frame_idx = 0
        while cap.isOpened():
            ok, frame = cap.read()
            if not ok:
                break
            if frame_idx % frame_step != 0:
                frame_idx += 1
                continue
            rgb = cv2.cvtColor(crop_view(frame, view), cv2.COLOR_BGR2RGB)
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


# ══════════════════════════════════════════════════════════════
# SINAIS EM "TRONCOS" (independentes do tamanho da pessoa na imagem)
# ══════════════════════════════════════════════════════════════

def _pt(lm, name):
    return np.array(lm[name][:2])


def body_frame_features(lm):
    """
    Medidas de um frame normalizadas pelo comprimento do tronco
    (ombro-quadril). Funciona com a câmera de frente ou de perfil.
    Eixo y da imagem cresce para baixo, por isso as subtrações invertidas.
    """
    sh = (_pt(lm, "LEFT_SHOULDER") + _pt(lm, "RIGHT_SHOULDER")) / 2
    hip = (_pt(lm, "LEFT_HIP") + _pt(lm, "RIGHT_HIP")) / 2
    ankle = (_pt(lm, "LEFT_ANKLE") + _pt(lm, "RIGHT_ANKLE")) / 2
    lw, rw = _pt(lm, "LEFT_WRIST"), _pt(lm, "RIGHT_WRIST")
    torso = np.linalg.norm(sh - hip) + 1e-9
    wrists = (lw + rw) / 2
    return {
        "wristsAboveShoulder": (sh[1] - wrists[1]) / torso,       # >0 = punhos acima do ombro
        "wristsAboveNose": (lm["NOSE"][1] - wrists[1]) / torso,   # >0 = punhos acima da cabeça
        "handsDistance": np.linalg.norm(lw - rw) / torso,         # punhos juntos = perto de 0
        "baseHeight": (ankle[1] - hip[1]) / torso,                # menor = agachou mais
        "elbowMin": min(
            calculate_angle(_pt(lm, "LEFT_SHOULDER"), _pt(lm, "LEFT_ELBOW"), lw),
            calculate_angle(_pt(lm, "RIGHT_SHOULDER"), _pt(lm, "RIGHT_ELBOW"), rw)),
    }


def _fill_nan(x):
    x = np.array(x, dtype=float)
    mask = np.isnan(x)
    if mask.all():
        return np.zeros_like(x)
    if mask.any():
        x[mask] = np.interp(np.flatnonzero(mask), np.flatnonzero(~mask), x[~mask])
    return x


def _smooth(x, k=5):
    return np.convolve(_fill_nan(x), np.ones(k) / k, mode="same")


def find_peaks_prominent(signal, prominence, min_gap):
    """
    Picos com subida mínima `prominence` em relação ao vale de cada lado.
    Dois picos a menos de `min_gap` amostras viram um só (fica o mais alto).
    """
    peaks = []
    n = len(signal)
    for i in range(1, n - 1):
        if not (signal[i] >= signal[i - 1] and signal[i] > signal[i + 1]):
            continue
        lo, hi = max(0, i - min_gap), min(n, i + min_gap)
        rise = signal[i] - max(signal[lo:i].min(), signal[i:hi].min())
        if rise < prominence:
            continue
        if peaks and i - peaks[-1] < min_gap:
            if signal[i] > signal[peaks[-1]]:
                peaks[-1] = i
        else:
            peaks.append(i)
    return peaks


def feature_series(frames_data):
    return [None if f["landmarks"] is None else body_frame_features(f["landmarks"])
            for f in frames_data]


# ══════════════════════════════════════════════════════════════
# ESCOLHA DE QUEM AVALIAR (executante x alimentador)
# ══════════════════════════════════════════════════════════════

def executor_score(frames_data, fps):
    """
    Pontua o quanto a pessoa rastreada parece ser o EXECUTANTE.
    Nos vídeos de calibração, quem executa leva os punhos acima da cabeça
    a cada repetição; o alimentador só pega e joga a bola na altura do peito.
    Score = taxa de detecção x soma da altura dos picos acima do ombro.
    """
    feats = feature_series(frames_data)
    if not frames_data:
        return 0.0, 0.0
    detection = sum(f is not None for f in feats) / len(feats)
    if detection < 0.5:
        return 0.0, detection
    h = _smooth([np.nan if f is None else f["wristsAboveShoulder"] for f in feats], k=3)
    gap = max(2, int(MANCHETE_MIN_GAP_S * fps))
    peaks = find_peaks_prominent(h, MANCHETE_PEAK_PROMINENCE, gap)
    score = detection * sum(max(0.0, h[p]) + 0.1 for p in peaks)
    return score, detection


def choose_view(video_path):
    """
    Passada rápida (modelo leve, 1 a cada 3 frames) nas três vistas.
    Vence a de maior score; em empate prático vale o quadro inteiro,
    que é o caso normal quando o vídeo segue o protocolo de filmagem
    (só o atleta no quadro).
    """
    step = 3
    scores = {}
    for view in ("full", "left", "right"):
        frames, fps = extract_landmarks_per_frame(video_path, view=view, frame_step=step, model_complexity=0)
        scores[view], _ = executor_score(frames, fps / step)
    best = max(scores, key=scores.get)
    if scores["full"] >= 0.9 * scores[best]:
        best = "full"
    return best, {k: round(float(v), 2) for k, v in scores.items()}


# ══════════════════════════════════════════════════════════════
# MANCHETE
# ══════════════════════════════════════════════════════════════

def _median_filter(x, k=5):
    x = np.array(x, dtype=float)
    h = k // 2
    out = np.full(len(x), np.nan)
    for i in range(len(x)):
        w = x[max(0, i - h): i + h + 1]
        w = w[~np.isnan(w)]
        if len(w):
            out[i] = np.median(w)
    return out


def analyze_manchete(frames_data, fps):
    """
    Uma repetição = um ciclo em que os punhos sobem (contato com a bola
    seguido da subida dos braços, que faz parte do exercício).
    O contato fica na janela antes do pico, com os punhos entre a cintura
    e o peito. Em cada repetição é avaliado um checklist técnico.
    """
    feats = feature_series(frames_data)
    h = _smooth([np.nan if f is None else f["wristsAboveShoulder"] for f in feats])
    gap = max(2, int(MANCHETE_MIN_GAP_S * fps))
    peaks = find_peaks_prominent(h, MANCHETE_PEAK_PROMINENCE, gap)

    base = _median_filter([np.nan if f is None else f["baseHeight"] for f in feats])
    hands = _median_filter([np.nan if f is None else f["handsDistance"] for f in feats])
    elbow = _median_filter([np.nan if f is None else f["elbowMin"] for f in feats])
    window = int(MANCHETE_CONTACT_WINDOW_S * fps)

    repetitions = []
    for p in peaks:
        lo = max(0, p - window)
        contact = [i for i in range(lo, p)
                   if feats[i] is not None and -0.8 <= feats[i]["wristsAboveShoulder"] <= -0.2]
        if not contact:
            continue

        base_min = float(np.nanmin(base[lo:p + 1]))
        hands_med = float(np.nanmedian(hands[contact]))
        elbow_med = float(np.nanmedian(elbow[contact]))
        contact_frame = contact[len(contact) // 2]

        checks = [
            {"key": "baseBaixa", "label": "Low base (knee bend)",
             "value": round(base_min, 2), "passed": base_min <= MANCHETE_BASE_MAX, "reliable": True},
            {"key": "bracosUnidos", "label": "Arms together at contact",
             "value": round(hands_med, 2), "passed": hands_med <= MANCHETE_HANDS_MAX, "reliable": True},
            # Medido, mas fora do palpite: na resolução dos vídeos de calibração o
            # erro do MediaPipe no cotovelo é do tamanho da diferença que se quer ver.
            {"key": "bracosEstendidos", "label": "Arms extended (elbow)",
             "value": round(elbow_med, 1), "passed": None, "reliable": False},
        ]
        provisional_valid = all(c["passed"] for c in checks if c["reliable"])

        repetitions.append({
            "index": len(repetitions) + 1,
            "frame": contact_frame,
            "timeSeconds": round(contact_frame / fps, 2),
            "handsDistanceRatio": round(hands_med, 2),
            "leftElbowAngle": round(elbow_med, 1),
            "rightElbowAngle": round(elbow_med, 1),
            "provisionalValid": provisional_valid,
            "checks": checks,
        })
    return repetitions


# ══════════════════════════════════════════════════════════════
# TOQUE (algoritmo original, calibrado com o vídeo controlado)
# ══════════════════════════════════════════════════════════════

def analyze_toque(frames_data, fps):
    signal = wrist_height_signal(frames_data)
    rep_frames = detect_repetitions(frames_data, signal)

    repetitions = []
    for frame_idx in rep_frames:
        metrics = get_pose_metrics(frames_data, frame_idx)
        if metrics is None:
            continue
        provisional_valid = classify_repetition_toque(metrics)
        repetitions.append({
            "index": len(repetitions) + 1,
            "frame": metrics["frame"],
            "timeSeconds": round(metrics["frame"] / fps, 2),
            "handsDistanceRatio": metrics["handsDistanceRatio"],
            "leftElbowAngle": metrics["leftElbowAngle"],
            "rightElbowAngle": metrics["rightElbowAngle"],
            "provisionalValid": provisional_valid,
            "checks": [
                {"key": "maosProximas", "label": "Hands close at contact",
                 "value": metrics["handsDistanceRatio"], "passed": provisional_valid, "reliable": True},
            ],
        })
    return repetitions


def analyze_video(video_path, skill_type="static_toque", annotated_path=None):
    """
    `annotated_path`: se informado, grava ali o vídeo anotado (MP4) com o que
    a IA viu (esqueleto, repetições e checklist). Ver annotate.py.
    """
    view, view_scores = choose_view(video_path)
    frames_data, fps = extract_landmarks_per_frame(video_path, view=view)

    detected = sum(1 for f in frames_data if f["landmarks"] is not None)
    detection_rate = detected / len(frames_data) if frames_data else 0

    if skill_type == "static_manchete":
        repetitions = analyze_manchete(frames_data, fps)
    else:
        repetitions = analyze_toque(frames_data, fps)

    hits = sum(1 for r in repetitions if r["provisionalValid"])
    errors = len(repetitions) - hits

    result = {
        "skillType": skill_type,
        "totalFrames": len(frames_data),
        "poseDetectionRate": round(detection_rate, 2),
        "analyzedView": view,
        "viewScores": view_scores,
        "repetitionsDetected": len(repetitions),
        "machineHits": hits,
        "machineErrors": errors,
        "repetitions": repetitions,
        "disclaimer": "Provisional machine estimate based on simple posture rules. "
                      "The final evaluation must be confirmed by the coach."
    }

    if annotated_path:
        from annotate import render_annotated_video   # import local: annotate.py importa este módulo
        render_annotated_video(video_path, annotated_path, result, frames_data, fps, view)

    return result


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
