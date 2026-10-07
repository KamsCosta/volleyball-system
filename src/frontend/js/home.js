import { apiRequest } from "./auth.js";

const token = localStorage.getItem("token");
if (!token) {
    window.location.href = "./login.html";
} else {
    init();
}

async function init() {
    document.getElementById("logoutBtn")?.addEventListener("click", () => {
        localStorage.removeItem("token");
        window.location.href = "./login.html";
    });

    await loadHomeData();
}

async function loadHomeData() {
    try {
        const players = await apiRequest("/players", { method: "GET" });

        // Summary cards
        document.getElementById("totalAthletes").textContent = players.length;

        if (players.length > 0) {
            // Último cadastrado — ordena por createdAt desc
            const sorted = [...players].sort((a, b) =>
                new Date(b.createdAt) - new Date(a.createdAt)
            );
            document.getElementById("lastRegistered").textContent = sorted[0].name;

            // Posições únicas
            const uniquePositions = new Set(players.map(p => p.position));
            document.getElementById("totalPositions").textContent = uniquePositions.size;

            // Feed de atividades — últimos 10
            renderActivityFeed(sorted.slice(0, 10));
        } else {
            document.getElementById("lastRegistered").textContent = "None yet";
            document.getElementById("totalPositions").textContent = "0";
            renderEmpty();
        }

    } catch (err) {
        console.error("Erro ao carregar home:", err);
        document.getElementById("totalAthletes").textContent = "–";
        document.getElementById("lastRegistered").textContent = "–";
        document.getElementById("totalPositions").textContent = "–";
        renderError(err.message);
    }
}

function renderActivityFeed(players) {
    const feed = document.getElementById("activityFeed");

    feed.innerHTML = players.map(p => `
        <div class="activity-item">
            <div class="activity-avatar">${getInitials(p.name)}</div>
            <div class="activity-info">
                <div class="activity-name">${p.name}</div>
                <div class="activity-detail">${p.position} · ${p.height} cm</div>
            </div>
            <div class="activity-meta">
                <span class="activity-number">#${p.number}</span>
                <span class="activity-date">${formatDate(p.createdAt)}</span>
            </div>
        </div>
    `).join("");
}

function renderEmpty() {
    document.getElementById("activityFeed").innerHTML = `
        <div class="activity-empty">
            No athletes registered yet.<br>
            <a href="./players.html" style="color:#4e8fff; text-decoration:none;">Add your first athlete →</a>
        </div>
    `;
}

function renderError(msg) {
    document.getElementById("activityFeed").innerHTML = `
        <div class="activity-empty" style="color:#ffaaaa;">
            ${msg || "Failed to load activity."}
        </div>
    `;
}

function getInitials(name) {
    return name
        .split(" ")
        .slice(0, 2)
        .map(n => n[0].toUpperCase())
        .join("");
}

function formatDate(dateStr) {
    if (!dateStr) return "–";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric"
    });
}
