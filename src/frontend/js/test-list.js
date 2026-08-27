import { apiRequest } from "./auth.js";

const token = localStorage.getItem("token");
if (!token) { window.location.href = "./login.html"; }

document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "./login.html";
});

document.getElementById("refreshBtn")?.addEventListener("click", loadTests);

// Filtros
document.getElementById("filterAthlete")?.addEventListener("change", applyFilters);
document.getElementById("filterCategory")?.addEventListener("change", applyFilters);
document.getElementById("filterClassification")?.addEventListener("change", applyFilters);

// Modal
const modal = document.getElementById("detailModal");
document.getElementById("closeModal")?.addEventListener("click", hideModal);
document.getElementById("closeModalBtn")?.addEventListener("click", hideModal);
modal?.addEventListener("click", (e) => { if (e.target === modal) hideModal(); });

let allTests = [];

async function loadTests() {
    const tbody = document.getElementById("testTableBody");
    tbody.innerHTML = `<tr><td colspan="8" class="empty-row">Loading tests...</td></tr>`;

    try {
        allTests = await apiRequest("/tests", { method: "GET" });
        await loadAthleteFilter();
        applyFilters();
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8" class="empty-row">Failed to load tests.</td></tr>`;
        showMessage(err.message || "Error loading tests.", "error");
    }
}

async function loadAthleteFilter() {
    try {
        const players = await apiRequest("/players", { method: "GET" });
        const select = document.getElementById("filterAthlete");
        select.innerHTML = `<option value="">All athletes</option>`;
        players.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.id;
            opt.textContent = `${p.name} (#${p.number})`;
            select.appendChild(opt);
        });
    } catch {}
}

function applyFilters() {
    const athleteId      = document.getElementById("filterAthlete").value;
    const category       = document.getElementById("filterCategory").value;
    const classification = document.getElementById("filterClassification").value;

    let filtered = allTests;
    if (athleteId)      filtered = filtered.filter(t => t.playerId == athleteId);
    if (category)       filtered = filtered.filter(t => t.category === category);
    if (classification) filtered = filtered.filter(t => t.classification === classification);

    renderTable(filtered);
}

function renderTable(tests) {
    const tbody = document.getElementById("testTableBody");
    document.getElementById("totalBadge").textContent = `${tests.length} Test${tests.length !== 1 ? "s" : ""}`;

    if (!tests || tests.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="empty-row">No tests found. <a href="./new-test.html" style="color:#4e8fff">Apply first test →</a></td></tr>`;
        return;
    }

    tbody.innerHTML = tests.map(t => `
        <tr>
            <td>
                <div style="font-weight:600;">${t.playerName}</div>
                <div style="font-size:11px;color:var(--text-muted);">#${t.playerNumber} · ${t.playerPosition}</div>
            </td>
            <td><span class="category-badge ${t.category.toLowerCase()}">${t.category}</span></td>
            <td>${formatDate(t.testDate)}</td>
            <td><strong>${t.totalHits}</strong><span style="color:var(--text-subtle);font-size:11px;"> /160</span></td>
            <td>
                <div class="hit-rate-wrap">
                    <div class="hit-rate-bar">
                        <div class="hit-rate-fill" style="width:${t.hitRate}%;background:${rateColor(t.hitRate)};"></div>
                    </div>
                    <span style="font-size:12px;color:${rateColor(t.hitRate)};font-weight:600;">${t.hitRate}%</span>
                </div>
            </td>
            <td><span class="class-badge ${t.classification.toLowerCase()}">${classLabel(t.classification)}</span></td>
            <td class="coach-cell">
                ${t.coachName
                    ? `<span class="coach-cell-name">${t.coachName}</span>`
                    : `<span class="coach-cell-empty">Not assigned</span>`
                }
            </td>
            <td class="actions-cell">
                <button class="btn-view" data-id="${t.id}">👁 View</button>
                <button class="btn-del" data-id="${t.id}">🗑️ Delete</button>
            </td>
        </tr>
    `).join("");

    document.querySelectorAll(".btn-view").forEach(btn => {
        btn.addEventListener("click", () => {
            const test = allTests.find(t => t.id === Number(btn.dataset.id));
            if (test) openModal(test);
        });
    });

    document.querySelectorAll(".btn-del").forEach(btn => {
        btn.addEventListener("click", async () => {
            if (!confirm("Delete this test?")) return;
            try {
                await apiRequest(`/tests/${btn.dataset.id}`, { method: "DELETE" });
                showMessage("Test deleted.", "success");
                await loadTests();
            } catch (err) {
                showMessage(err.message || "Error deleting test.", "error");
            }
        });
    });
}

function openModal(test) {
    document.getElementById("modalTitle").textContent    = `${test.playerName} — TAT`;
    document.getElementById("modalSubtitle").textContent =
        `${test.category} · ${formatDate(test.testDate)}${test.coachName ? " · Applied by " + test.coachName : ""}${test.notes ? " · " + test.notes : ""}`;

    document.getElementById("modalSummary").innerHTML = `
        <div class="summary-stat">
            <span class="summary-stat-label">Total Hits</span>
            <span class="summary-stat-value" style="color:#38c4b0;">${test.totalHits}/160</span>
        </div>
        <div class="summary-stat">
            <span class="summary-stat-label">Total Errors</span>
            <span class="summary-stat-value" style="color:#f87171;">${test.totalErrors}/160</span>
        </div>
        <div class="summary-stat">
            <span class="summary-stat-label">Hit Rate</span>
            <span class="summary-stat-value" style="color:#4e8fff;">${test.hitRate}%</span>
        </div>
        <div class="summary-stat">
            <span class="summary-stat-label">Classification</span>
            <span class="summary-stat-value" style="color:${rateColor(test.hitRate)};">${classLabel(test.classification)}</span>
        </div>
    `;

    document.getElementById("modalSkills").innerHTML = test.skillResults.map(s => `
        <div class="skill-detail-row">
            <span class="skill-detail-name">${s.skillIndex + 1}. ${s.skillName}</span>
            <div class="skill-detail-bar-wrap">
                <div class="skill-detail-bar">
                    <div class="skill-detail-fill" style="width:${s.hitRate}%;background:${rateColor(s.hitRate)};"></div>
                </div>
                <span class="skill-detail-pct" style="color:${rateColor(s.hitRate)};">${s.hits}/10</span>
            </div>
        </div>
    `).join("");

    modal.classList.remove("hidden");
}

function hideModal() { modal.classList.add("hidden"); }

function rateColor(rate) {
    if (rate >= 75) return "#38c4b0";
    if (rate >= 50) return "#f59e42";
    return "#f87171";
}

function classLabel(cls) {
    if (cls === "Advanced")    return "Advanced 🏆";
    if (cls === "Development") return "Development 📈";
    return "Beginner 🌱";
}

function formatDate(d) {
    if (!d) return "–";
    return new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
}

function showMessage(msg, type) {
    const box = document.getElementById("messageBox");
    box.innerHTML = `<div class="msg-box ${type}">${msg}</div>`;
    setTimeout(() => { box.innerHTML = ""; }, 4000);
}

loadTests();
