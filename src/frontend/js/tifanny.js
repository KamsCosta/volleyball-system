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
        grid.innerHTML = `<div class="tf-wall-empty">Could not load the messages right now.</div>`;
    }
}

function renderWall(messages) {
    const grid = document.getElementById("tfWallGrid");

    if (!messages || messages.length === 0) {
        grid.innerHTML = `<div class="tf-wall-empty">Be the first to leave a message of support! 💌</div>`;
        return;
    }

    grid.innerHTML = messages.map(m => `
        <div class="tf-wall-card">
            <div class="tf-wall-msg">${escapeHtml(m.message)}</div>
            <div class="tf-wall-meta">
                <span class="tf-wall-author">${escapeHtml(m.authorName || "Anonymous fan")}</span>
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
        showMessage("Write a message before sending.", "error");
        return;
    }

    const btn = document.getElementById("tfSubmitBtn");
    btn.disabled = true;
    btn.textContent = "Sending...";

    try {
        await apiRequest("/supportmessages", {
            method: "POST",
            body: JSON.stringify({
                AuthorName: authorName || null,
                Message: message
            })
        });

        showMessage("Message sent! Thank you for your support. 💚", "success");
        document.getElementById("tfWallForm").reset();
        charCount.textContent = "0";
        await loadWall();

    } catch (err) {
        showMessage(err.message || "Error sending the message.", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = "💌 Send message";
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
    return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function showMessage(msg, type) {
    const box = document.getElementById("tfMessageBox");
    box.innerHTML = `<div class="msg-box ${type}">${msg}</div>`;
    setTimeout(() => { box.innerHTML = ""; }, 4000);
}

loadWall();
