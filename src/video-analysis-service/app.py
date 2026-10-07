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
import io
import re
import uuid
import base64
import tempfile
import numpy as np
import cv2
from flask import Flask, request, jsonify, send_file
from flask_socketio import SocketIO, emit
from video_analysis import analyze_video, LiveAnalyzer

app = Flask(__name__)
app.config["SECRET_KEY"] = "volleyball-video-analysis-dev"
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")  # dev only — restrinja em produção

ALLOWED_SKILLS = {"static_toque", "static_manchete"}

# Vídeos anotados ficam aqui até o backend buscar (GET /annotated/<id>)
ANNOTATED_DIR = os.path.join(tempfile.gettempdir(), "volleyball-annotated")
os.makedirs(ANNOTATED_DIR, exist_ok=True)

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
        return jsonify({"error": "No video file sent (field 'video')."}), 400

    video_file = request.files["video"]
    skill_type = request.form.get("skillType", "static_toque")

    if skill_type not in ALLOWED_SKILLS:
        return jsonify({
            "error": f"skillType '{skill_type}' is not supported yet. "
                     f"Available skills: {sorted(ALLOWED_SKILLS)}"
        }), 400

    # annotate=1 (padrão): gera também o vídeo anotado, que o backend busca depois em
    # GET /annotated/<annotatedVideoId>. annotate=0 pula essa etapa (mais rápido).
    annotate = request.form.get("annotate", "1") != "0"

    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        video_file.save(tmp.name)
        tmp_path = tmp.name

    annotated_id = uuid.uuid4().hex if annotate else None
    annotated_path = os.path.join(ANNOTATED_DIR, f"{annotated_id}.mp4") if annotate else None

    try:
        result = analyze_video(tmp_path, skill_type, annotated_path=annotated_path)
        result["annotatedVideoId"] = annotated_id
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.route("/annotated/<video_id>", methods=["GET"])
def get_annotated(video_id):
    """Entrega o vídeo anotado UMA vez (o backend salva junto do original) e apaga daqui."""
    if not re.fullmatch(r"[0-9a-f]{32}", video_id):
        return jsonify({"error": "invalid id"}), 400
    path = os.path.join(ANNOTATED_DIR, f"{video_id}.mp4")
    if not os.path.exists(path):
        return jsonify({"error": "annotated video not found"}), 404
    with open(path, "rb") as f:
        data = io.BytesIO(f.read())
    os.remove(path)
    return send_file(data, mimetype="video/mp4", download_name=f"{video_id}.mp4")


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
        emit("error", {"message": f"skillType '{skill_type}' is not supported."})
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
