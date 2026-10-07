"""
gerar_icones.py
Gera o ícone do sistema (bola de vôlei nas cores do site) e a imagem
de compartilhamento usada na prévia do link (WhatsApp, Telegram...).

Rodar da raiz do projeto:
    python tools/gerar_icones.py
(precisa de Pillow, numpy e opencv; o .venv do video-analysis-service já tem:
     src/video-analysis-service/.venv/Scripts/python tools/gerar_icones.py)

Arquivos gerados em src/frontend/assets/icons/:
    favicon.ico, favicon-32.png, apple-touch-icon.png (180),
    icon-192.png, icon-512.png, icon-maskable-512.png, og-image.png (1200x630)
"""

import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "frontend" / "assets" / "icons"
FONTS = Path(__file__).resolve().parent / "fonts"

# Cores do global.css
BG = (0, 0, 0)
ACCENT = (78, 143, 255)        # --accent
ACCENT_LIGHT = (122, 171, 255) # --accent-light
WHITE = (255, 255, 255)
SEAM = (10, 20, 40)
TEXT_MUTED = (170, 176, 190)


def draw_ball(size):
    """
    Bola de vôlei no desenho clássico, com 4x de supersampling:
    3 costuras curvas saem do centro até a borda (girando 120°); cada região
    entre duas costuras tem uma cor e faixas paralelas à costura que a limita.
    """
    ss = 4
    n = size * ss
    y, x = np.mgrid[0:n, 0:n].astype(float)
    c = (n - 1) / 2
    R = n / 2 - 1.5 * ss
    px, py = (x - c) / R, (y - c) / R
    r = np.hypot(px, py)
    inside = r <= 1.0

    bend = 0.55   # curvatura das costuras (0 = reta)
    seam_w, stripe_w = 0.045, 0.026
    region_colors = [ACCENT, WHITE, ACCENT_LIGHT]

    # 1) costuras: arco de círculo que passa pelo centro O e pelo ponto P da borda
    seams = np.zeros((n, n), dtype=bool)
    circles = []
    for k in range(3):
        a = math.radians(-90 + 120 * k)
        P = np.array([math.cos(a), math.sin(a)])
        perp = np.array([-P[1], P[0]])
        C = P / 2 + bend * perp
        rho = float(np.linalg.norm(C))
        d = np.hypot(px - C[0], py - C[1])
        minor = ((px - P[0] / 2) * perp[0] + (py - P[1] / 2) * perp[1]) < 0   # só o arco curto O -> P
        seams |= (np.abs(d - rho) < seam_w / 2) & minor & inside
        circles.append((d, rho))

    # 2) regiões: preenchimento a partir de um ponto no meio de cada região
    lab = np.where(seams | ~inside, 255, 0).astype(np.uint8)
    for k in range(3):
        mid = math.radians(-90 + 120 * k + 60)
        seed = (int(c + 0.7 * R * math.cos(mid)), int(c + 0.7 * R * math.sin(mid)))
        cv2.floodFill(lab, None, seed, k + 1)

    img = np.zeros((n, n, 4), dtype=np.uint8)
    img[..., :3] = WHITE
    stripes = np.zeros((n, n), dtype=bool)
    for k in range(3):
        region = lab == k + 1
        img[region, :3] = region_colors[k]
        # faixas: arcos paralelos à costura que deixa a região do lado de FORA
        # do seu círculo (assim as faixas atravessam a região, como na bola real)
        mid = math.radians(-90 + 120 * k + 60)
        sx, sy = int(c + 0.7 * R * math.cos(mid)), int(c + 0.7 * R * math.sin(mid))
        for j in (k, (k + 1) % 3):
            d, rho = circles[j]
            if d[sy, sx] > rho:
                for off in (0.17, 0.34):
                    stripes |= (np.abs(d - (rho + off)) < stripe_w / 2) & region
                break

    img[seams | stripes, :3] = SEAM

    # contorno e máscara do círculo
    ring = (r > 1.0 - 0.06) & inside
    img[ring, :3] = SEAM
    img[inside, 3] = 255

    # leve sombreado para dar volume
    shade = np.clip(1.0 - 0.28 * np.clip((px + py) / 2 + 0.3, 0, 1) ** 2, 0, 1)
    img[..., :3] = (img[..., :3] * shade[..., None]).astype(np.uint8)

    return Image.fromarray(img, "RGBA").resize((size, size), Image.LANCZOS)


def ball_svg_markup(stroke_outline=1.5, stroke_seam=1.3, stroke_stripe=0.9):
    """
    Mesma bola do ícone, em vetor e monocromática (traço em currentColor),
    para o logo das páginas. viewBox 0 0 24 24, bola de raio 10 no centro.
    """
    cx = cy = 12.0
    R = 10.0
    bend = 0.55

    def pt(v):
        return f"{cx + v[0] * R:.2f} {cy + v[1] * R:.2f}"

    seams = []
    for k in range(3):
        a = math.radians(-90 + 120 * k)
        P = np.array([math.cos(a), math.sin(a)])
        perp = np.array([-P[1], P[0]])
        C = P / 2 + bend * perp
        rho = float(np.linalg.norm(C))
        # sentido do arco curto O -> P: o meio dele fica do lado oposto ao centro C
        mid = C + rho * (P / 2 - C) / np.linalg.norm(P / 2 - C)
        ang = lambda v: math.atan2(v[1] - C[1], v[0] - C[0])
        a0, am, a1 = ang(np.zeros(2)), ang(mid), ang(P)
        d1 = (am - a0) % (2 * math.pi)
        d2 = (a1 - a0) % (2 * math.pi)
        sweep = 1 if d1 < d2 else 0
        seams.append((P, C, rho, sweep))

    parts = []
    clip_defs = []
    stripes = []
    for k in range(3):
        P0, C0, rho0, sw0 = seams[k]
        P1, C1, rho1, sw1 = seams[(k + 1) % 3]
        # região k: centro -> costura k -> borda até P(k+1) -> costura k+1 de volta
        region = (f"M{pt((0, 0))} A{rho0 * R:.2f} {rho0 * R:.2f} 0 0 {sw0} {pt(P0)} "
                  f"A{R:.2f} {R:.2f} 0 0 1 {pt(P1)} "
                  f"A{rho1 * R:.2f} {rho1 * R:.2f} 0 0 {1 - sw1} {pt((0, 0))}Z")
        clip_defs.append(f'<clipPath id="vbr{k}"><path d="{region}"/></clipPath>')
        # faixas: paralelas à costura que deixa a região do lado de fora do seu círculo
        mid = math.radians(-90 + 120 * k + 60)
        seed = np.array([0.7 * math.cos(mid), 0.7 * math.sin(mid)])
        for P, C, rho, _ in (seams[k], seams[(k + 1) % 3]):
            if np.linalg.norm(seed - C) > rho:
                circles = "".join(
                    f'<circle cx="{cx + C[0] * R:.2f}" cy="{cy + C[1] * R:.2f}" r="{(rho + off) * R:.2f}"/>'
                    for off in (0.17, 0.34))
                stripes.append(f'<g clip-path="url(#vbr{k})" stroke-width="{stroke_stripe}">{circles}</g>')
                break
    for P, C, rho, sw in seams:
        parts.append(f"M{pt((0, 0))} A{rho * R:.2f} {rho * R:.2f} 0 0 {sw} {pt(P)}")

    return (
        '<svg class="brand-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        'stroke-linecap="round" aria-hidden="true">'
        f'<defs>{"".join(clip_defs)}</defs>'
        f'{"".join(stripes)}'
        f'<path stroke-width="{stroke_seam}" d="{" ".join(parts)}"/>'
        f'<circle cx="12" cy="12" r="10" stroke-width="{stroke_outline}"/>'
        '</svg>'
    )


def app_icon(size, ball_ratio, rounded=True):
    """Ícone quadrado: fundo preto (cantos arredondados) com a bola no centro."""
    ss = 4
    bg = Image.new("RGBA", (size * ss, size * ss), (0, 0, 0, 0))
    d = ImageDraw.Draw(bg)
    radius = int(size * ss * 0.22) if rounded else 0
    d.rounded_rectangle([0, 0, size * ss - 1, size * ss - 1], radius=radius, fill=BG + (255,))
    bg = bg.resize((size, size), Image.LANCZOS)
    ball_size = int(size * ball_ratio)
    ball = draw_ball(ball_size)
    off = (size - ball_size) // 2
    bg.alpha_composite(ball, (off, off))
    return bg


def og_image():
    """Imagem 1200x630 da prévia do link: bola + nome do sistema."""
    w, h = 1200, 630
    img = Image.new("RGBA", (w, h), BG + (255,))
    d = ImageDraw.Draw(img)

    # faixa de destaque, mesmo detalhe do topo do card de login
    d.rectangle([0, 0, w, 8], fill=ACCENT)

    ball = draw_ball(360)
    img.alpha_composite(ball, (110, (h - 360) // 2))

    title = ImageFont.truetype(str(FONTS / "BarlowCondensed-SemiBold.ttf"), 112)
    sub = ImageFont.truetype(str(FONTS / "Barlow-Medium.ttf"), 30)
    x = 540
    d.text((x, 160), "VOLLEYBALL", font=title, fill=WHITE)
    d.text((x, 270), "PERFORMANCE", font=title, fill=ACCENT)
    d.text((x, 410), "Technical assessment for volleyball athletes", font=sub, fill=TEXT_MUTED)
    return img.convert("RGB")


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    app_icon(512, 0.80).save(OUT / "icon-512.png")
    app_icon(192, 0.80).save(OUT / "icon-192.png")
    # maskable: o Android recorta em círculo, então a bola fica dentro da zona segura (80%)
    app_icon(512, 0.62, rounded=False).save(OUT / "icon-maskable-512.png")
    # apple-touch-icon: o iOS arredonda sozinho, fundo precisa ser opaco
    app_icon(180, 0.80, rounded=False).convert("RGB").save(OUT / "apple-touch-icon.png")
    draw_ball(32).save(OUT / "favicon-32.png")
    draw_ball(48).save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    og_image().save(OUT / "og-image.png", optimize=True)
    # versão vetorial monocromática (logo do cabeçalho das páginas)
    (OUT / "ball.svg").write_text(ball_svg_markup() + "\n", encoding="utf-8")

    for f in sorted(OUT.iterdir()):
        print(f"{f.name:28} {f.stat().st_size // 1024:>4} KB")


if __name__ == "__main__":
    main()
