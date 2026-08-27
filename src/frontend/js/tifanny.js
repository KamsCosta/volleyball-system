import { apiRequest } from "./auth.js";

const token = localStorage.getItem("token");
if (!token) { window.location.href = "./login.html"; }

document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "./login.html";
});

// Contador de caracteres
const textarea = document.getElementById("tfMessage");
const charCount = document.getElementById("tfCharCount");
textarea?.addEventListener("input", () => {
    charCount.textContent = textarea.value.length;
});

// ─── CARREGAR MENSAGENS ─────────────────────────────────────────────────────
async function loadWall() {
    const grid = document.getElementById("tfWallGrid");
    grid.innerHTML = `<div class="tf-wall-loading">Carregando mensagens...</div>`;

    try {
        const messages = await apiRequest("/supportmessages", { method: "GET" });
        renderWall(messages);
    } catch (err) {
        grid.innerHTML = `<div class="tf-wall-empty">Não foi possível carregar as mensagens agora.</div>`;
    }
}

function renderWall(messages) {
    const grid = document.getElementById("tfWallGrid");

    if (!messages || messages.length === 0) {
        grid.innerHTML = `<div class="tf-wall-empty">Seja a primeira pessoa a deixar uma mensagem de apoio! 💌</div>`;
        return;
    }

    grid.innerHTML = messages.map(m => `
        <div class="tf-wall-card">
            <div class="tf-wall-msg">${escapeHtml(m.message)}</div>
            <div class="tf-wall-meta">
                <span class="tf-wall-author">${escapeHtml(m.authorName || "Torcedor(a) anônimo(a)")}</span>
                <span class="tf-wall-date">${formatDate(m.createdAt)}</span>
            </div>
        </div>
    `).join("");
}

// ─── ENVIAR MENSAGEM ────────────────────────────────────────────────────────
document.getElementById("tfWallForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const authorName = document.getElementById("tfAuthor").value.trim();
    const message = document.getElementById("tfMessage").value.trim();

    if (!message) {
        showMessage("Escreva uma mensagem antes de enviar.", "error");
        return;
    }

    const btn = document.getElementById("tfSubmitBtn");
    btn.disabled = true;
    btn.textContent = "Enviando...";

    try {
        await apiRequest("/supportmessages", {
            method: "POST",
            body: JSON.stringify({
                AuthorName: authorName || null,
                Message: message
            })
        });

        showMessage("Mensagem enviada! Obrigada por apoiar. 💚", "success");
        document.getElementById("tfWallForm").reset();
        charCount.textContent = "0";
        await loadWall();

    } catch (err) {
        showMessage(err.message || "Erro ao enviar mensagem.", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = "💌 Enviar mensagem";
    }
});

// ─── HELPERS ────────────────────────────────────────────────────────────────
function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function formatDate(d) {
    if (!d) return "";
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function showMessage(msg, type) {
    const box = document.getElementById("tfMessageBox");
    box.innerHTML = `<div class="msg-box ${type}">${msg}</div>`;
    setTimeout(() => { box.innerHTML = ""; }, 4000);
}

loadWall();
