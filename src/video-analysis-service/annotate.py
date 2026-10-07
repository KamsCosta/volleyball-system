"""
annotate.py
─────────────────────────────────────────────────────────────
Gera o "vídeo anotado" da análise: o vídeo original com o que a IA
viu desenhado por cima. Serve para o treinador conferir se a máquina
rastreou a pessoa certa, achou as repetições nos momentos certos e
mediu o que devia.

O que aparece:
  - esqueleto rastreado (braços em amarelo, resto em azul);
  - metade ignorada escurecida (quando há alimentador no quadro);
  - barra de cima: habilidade, quem está sendo avaliado e contador;
  - barra de baixo: medidas ao vivo (base, mãos, cotovelo);
  - em cada repetição: número, ACERTO/ERRO e o checklist com os valores.

Saída em MP4 H.264 (toca em qualquer navegador, inclusive iPhone),
gerado pelo ffmpeg que vem no pacote imageio-ffmpeg.
"""

import subprocess
from pathlib import Path

import cv2
import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageFont

from video_analysis import body_frame_features, mp_pose

BLUE = (78, 143, 255)
YELLOW = (250, 204, 21)
WHITE = (255, 255, 255)
GREEN = (56, 196, 120)
RED = (248, 113, 113)
GRAY = (170, 176, 190)

SKILL_NAMES = {"static_manchete": "Static Manchete", "static_toque": "Static Toque"}
VIEW_NAMES = {"full": "full frame", "left": "left side", "right": "right side"}

# Corpo sem o rosto (o rosto polui o desenho e não entra na análise)
BODY = ["LEFT_SHOULDER", "RIGHT_SHOULDER", "LEFT_ELBOW", "RIGHT_ELBOW", "LEFT_WRIST", "RIGHT_WRIST",
        "LEFT_HIP", "RIGHT_HIP", "LEFT_KNEE", "RIGHT_KNEE", "LEFT_ANKLE", "RIGHT_ANKLE"]
BONES = [
    ("LEFT_SHOULDER", "RIGHT_SHOULDER"), ("LEFT_HIP", "RIGHT_HIP"),
    ("LEFT_SHOULDER", "LEFT_HIP"), ("RIGHT_SHOULDER", "RIGHT_HIP"),
    ("LEFT_HIP", "LEFT_KNEE"), ("LEFT_KNEE", "LEFT_ANKLE"),
    ("RIGHT_HIP", "RIGHT_KNEE"), ("RIGHT_KNEE", "RIGHT_ANKLE"),
]
ARMS = [
    ("LEFT_SHOULDER", "LEFT_ELBOW"), ("LEFT_ELBOW", "LEFT_WRIST"),
    ("RIGHT_SHOULDER", "RIGHT_ELBOW"), ("RIGHT_ELBOW", "RIGHT_WRIST"),
]

REP_BEFORE_S = 0.3   # o cartão da repetição aparece um pouco antes do contato
REP_AFTER_S = 1.4    # e fica na tela por este tempo depois


def _fmt(v, digits=2):
    if v is None:
        return "–"
    return f"{v:.{digits}f}"


def _to_full(point, view, w, h):
    """Converte coordenadas normalizadas da vista analisada para o quadro inteiro."""
    x, y = point[0], point[1]
    if view == "left":
        return int(x * (w // 2)), int(y * h)
    if view == "right":
        return int(w // 2 + x * (w - w // 2)), int(y * h)
    return int(x * w), int(y * h)


FONT_DIR = Path(__file__).resolve().parent / "fonts"


def _font(size, bold=False):
    """Barlow, a fonte do site (tem acentos; a fonte padrão do Pillow não tem)."""
    name = "BarlowCondensed-SemiBold.ttf" if bold else "Barlow-Medium.ttf"
    try:
        return ImageFont.truetype(str(FONT_DIR / name), size)
    except OSError:
        return ImageFont.load_default(size=size)


def render_annotated_video(video_path, out_path, result, frames_data, fps, view):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Não consegui abrir o vídeo: {video_path}")
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # vídeos pequenos são ampliados para o texto ficar legível
    scale = min(1.6, 1280 / max(w, h)) if max(w, h) < 1280 else 1.0
    W, H = int(w * scale) // 2 * 2, int(h * scale) // 2 * 2
    unit = max(W, H) / 1280                        # tamanho de referência do texto
    f_small, f_mid, f_big = _font(int(22 * unit)), _font(int(28 * unit), bold=True), _font(int(42 * unit), bold=True)

    reps = result.get("repetitions", [])
    skill = SKILL_NAMES.get(result.get("skillType"), result.get("skillType", ""))
    total = len(reps)

    ffmpeg = subprocess.Popen(
        [imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-loglevel", "error",
         "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", f"{fps:.3f}", "-i", "-",
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
         "-pix_fmt", "yuv420p", "-movflags", "+faststart", out_path],
        stdin=subprocess.PIPE)

    try:
        idx = 0
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            if scale != 1.0:
                rgb = cv2.resize(rgb, (W, H), interpolation=cv2.INTER_LINEAR)
            img = Image.fromarray(rgb).convert("RGBA")
            overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
            d = ImageDraw.Draw(overlay)

            # metade ignorada
            if view in ("left", "right"):
                x0, x1 = (W // 2, W) if view == "left" else (0, W // 2)
                d.rectangle([x0, 0, x1, H], fill=(0, 0, 0, 150))
                d.text(((x0 + x1) // 2, H // 2), "ignored\n(feeder)", font=f_small,
                       fill=GRAY + (255,), anchor="mm", align="center")

            fd = frames_data[idx] if idx < len(frames_data) else None
            lm = fd["landmarks"] if fd else None
            feats = body_frame_features(lm) if lm else None

            # esqueleto
            if lm:
                pts = {n: _to_full(lm[n], view, W, H) for n in BODY}
                lw = max(2, int(4 * unit))
                for a, b in BONES:
                    d.line([pts[a], pts[b]], fill=BLUE + (230,), width=lw)
                for a, b in ARMS:
                    d.line([pts[a], pts[b]], fill=YELLOW + (255,), width=lw + 1)
                r = max(3, int(5 * unit))
                for n in BODY:
                    x, y = pts[n]
                    d.ellipse([x - r, y - r, x + r, y + r], fill=WHITE + (255,))

            # contador: conta a repetição junto com o cartão dela
            done = sum(1 for rep in reps if rep["frame"] - REP_BEFORE_S * fps <= idx)

            # barra de cima
            bar = int(78 * unit)
            d.rectangle([0, 0, W, bar], fill=(0, 0, 0, 170))
            d.text((int(14 * unit), int(10 * unit)), f"AI analysis · {skill}", font=f_mid, fill=WHITE + (255,))
            d.text((int(14 * unit), int(44 * unit)),
                   f"Evaluating: {VIEW_NAMES.get(view, view)}   ·   Reps: {done}/{total}",
                   font=f_small, fill=GRAY + (255,))

            # barra de baixo: medidas ao vivo
            if feats:
                bottom = int(70 * unit)
                d.rectangle([0, H - bottom, W, H], fill=(0, 0, 0, 170))
                base, hands, elbow = feats["baseHeight"], feats["handsDistance"], feats["elbowMin"]
                items = [
                    (f"Base {_fmt(base)}", GREEN if base <= 0.75 else RED),
                    (f"Hands {_fmt(hands)}", GREEN if hands <= 1.5 else RED),
                    (f"Elbow {_fmt(elbow, 0)}°", GRAY),
                ]
                x = int(14 * unit)
                for text, color in items:
                    d.text((x, H - bottom + int(12 * unit)), text, font=f_small, fill=color + (255,))
                    x += int(d.textlength(text, font=f_small) + 28 * unit)
                d.text((int(14 * unit), H - bottom + int(40 * unit)),
                       "green/red = within/outside the limit · elbow is informational only",
                       font=_font(int(16 * unit)), fill=GRAY + (220,))

            # cartão da repetição (perto do contato)
            for rep in reps:
                c = rep["frame"]
                if c - REP_BEFORE_S * fps <= idx <= c + REP_AFTER_S * fps:
                    good = rep.get("provisionalValid")
                    color = GREEN if good else RED
                    lines = []
                    for chk in rep.get("checks", []):
                        if not chk.get("reliable"):
                            mark, col = "i", GRAY
                        else:
                            mark, col = ("OK", GREEN) if chk.get("passed") else ("X", RED)
                        value = chk.get("value")
                        shown = f"{_fmt(value, 0)}°" if chk.get("key") == "bracosEstendidos" else _fmt(value)
                        lines.append((f"{mark}  {chk['label']}: {shown}", col))
                    top = bar + int(14 * unit)
                    card_h = int((60 + 30 * len(lines)) * unit)
                    d.rectangle([int(10 * unit), top, W - int(10 * unit), top + card_h],
                                fill=(0, 0, 0, 185), outline=color + (255,), width=max(2, int(3 * unit)))
                    d.text((int(24 * unit), top + int(8 * unit)),
                           f"#{rep['index']}  {'HIT' if good else 'ERROR'}",
                           font=f_big, fill=color + (255,))
                    y = top + int(56 * unit)
                    for text, col in lines:
                        d.text((int(24 * unit), y), text, font=f_small, fill=col + (255,))
                        y += int(30 * unit)
                    # marca o instante do contato nos punhos
                    if lm and abs(idx - c) <= 3:
                        for n in ("LEFT_WRIST", "RIGHT_WRIST"):
                            x, y2 = _to_full(lm[n], view, W, H)
                            rr = int(18 * unit)
                            d.ellipse([x - rr, y2 - rr, x + rr, y2 + rr], outline=color + (255,),
                                      width=max(2, int(4 * unit)))
                    break

            out = Image.alpha_composite(img, overlay).convert("RGB")
            ffmpeg.stdin.write(np.asarray(out).tobytes())
            idx += 1
    finally:
        cap.release()
        ffmpeg.stdin.close()
        ffmpeg.wait()

    if ffmpeg.returncode != 0:
        raise RuntimeError("O ffmpeg falhou ao gerar o vídeo anotado.")
