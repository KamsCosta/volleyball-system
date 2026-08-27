import { apiRequest } from "./auth.js";

const token = localStorage.getItem("token");
if (!token) { window.location.href = "./login.html"; }

document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "./login.html";
});

const params   = new URLSearchParams(window.location.search);
const playerId = params.get("id");

if (!playerId) { window.location.href = "./players.html"; }

document.getElementById("newTestBtn").href   = `./new-test.html?playerId=${playerId}`;
document.getElementById("applyTestBtn").href = `./new-test.html?playerId=${playerId}`;

let evolutionChart = null;

async function init() {
    try {
        // Busca players, evolution e tests completos (com coachName) em paralelo
        const [players, evolutionData, fullTests] = await Promise.all([
            apiRequest("/players", { method: "GET" }),
            apiRequest(`/tests/player/${playerId}/evolution`, { method: "GET" }),
            apiRequest(`/tests/player/${playerId}`, { method: "GET" })
        ]);

        const player = players.find(p => p.id === Number(playerId));
        if (!player) { window.location.href = "./players.html"; return; }

        document.getElementById("athleteName").textContent = player.name;
        document.getElementById("athleteInfo").textContent =
            `#${player.number} · ${player.position} · ${player.height} cm`;

        const tests = evolutionData.evolution;
        const total = tests.length;

        document.getElementById("totalTestsBadge").textContent = `${total} Test${total !== 1 ? "s" : ""}`;

        if (total === 0) {
            document.getElementById("noTestsSection").style.display = "block";
            renderAthleteStats(player, null);
            return;
        }

        const last = tests[tests.length - 1];
        renderAthleteStats(player, last, total);
        renderChart(tests);
        renderHistory(fullTests); // usa fullTests que tem coachName

        document.getElementById("chartSection").style.display   = "block";
        document.getElementById("historySection").style.display = "block";

    } catch (err) {
        console.error(err);
    }
}

function renderAthleteStats(player, lastTest, totalTests) {
    document.getElementById("athleteStats").innerHTML = `
        <div class="athlete-stat-card">
            <span class="athlete-stat-label">Position</span>
            <span class="athlete-stat-value">${player.position}</span>
        </div>
        <div class="athlete-stat-card">
            <span class="athlete-stat-label">Number</span>
            <span class="athlete-stat-value">#${player.number}</span>
        </div>
        <div class="athlete-stat-card">
            <span class="athlete-stat-label">Height</span>
            <span class="athlete-stat-value">${player.height} cm</span>
        </div>
        <div class="athlete-stat-card">
            <span class="athlete-stat-label">Tests Applied</span>
            <span class="athlete-stat-value" style="color:#4e8fff;">${totalTests ?? 0}</span>
        </div>
        <div class="athlete-stat-card">
            <span class="athlete-stat-label">Last Hit Rate</span>
            <span class="athlete-stat-value" style="color:${lastTest ? rateColor(lastTest.hitRate) : 'var(--text-subtle)'};">
                ${lastTest ? lastTest.hitRate + "%" : "–"}
            </span>
        </div>
        <div class="athlete-stat-card">
            <span class="athlete-stat-label">Classification</span>
            <span class="athlete-stat-value" style="font-size:14px;color:${lastTest ? rateColor(lastTest.hitRate) : 'var(--text-subtle)'};">
                ${lastTest ? classLabel(lastTest.classification) : "–"}
            </span>
        </div>
    `;
}

function renderChart(tests) {
    const labels   = tests.map(t => t.date);
    const hitRates = tests.map(t => t.hitRate);
    const ctx      = document.getElementById("evolutionChart").getContext("2d");

    if (evolutionChart) evolutionChart.destroy();

    evolutionChart = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Hit Rate (%)",
                data: hitRates,
                borderColor: "#4e8fff",
                backgroundColor: "rgba(78,143,255,0.1)",
                borderWidth: 2.5,
                pointBackgroundColor: hitRates.map(r => rateColor(r)),
                pointBorderColor: "#fff",
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8,
                fill: true,
                tension: 0.35
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` Hit Rate: ${ctx.raw}%`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: "rgba(255,255,255,0.05)" },
                    ticks: { color: "#6a85b0", font: { size: 11 } }
                },
                y: {
                    min: 0, max: 100,
                    grid: { color: "rgba(255,255,255,0.05)" },
                    ticks: { color: "#6a85b0", font: { size: 11 }, callback: (v) => v + "%" }
                }
            }
        }
    });
}

function renderHistory(tests) {
    const tbody = document.getElementById("testHistoryBody");

    // Ordena do mais recente para o mais antigo
    const sorted = [...tests].sort((a, b) => new Date(b.testDate) - new Date(a.testDate));

    tbody.innerHTML = sorted.map(t => `
        <tr>
            <td>${formatDate(t.testDate)}</td>
            <td>${t.category}</td>
            <td><strong>${t.totalHits}</strong><span style="color:var(--text-subtle);font-size:11px;"> /160</span></td>
            <td>
                <div style="display:flex;align-items:center;gap:8px;">
                    <div style="flex:1;height:5px;background:var(--border);border-radius:3px;min-width:60px;">
                        <div style="width:${t.hitRate}%;height:100%;border-radius:3px;background:${rateColor(t.hitRate)};"></div>
                    </div>
                    <span style="font-size:12px;font-weight:700;color:${rateColor(t.hitRate)};">${t.hitRate}%</span>
                </div>
            </td>
            <td><span style="font-size:12px;font-weight:600;color:${rateColor(t.hitRate)};">${classLabel(t.classification)}</span></td>
            <td>
                ${t.coachName
                    ? `<span style="font-size:13px;color:var(--text-primary);font-weight:500;">${t.coachName}</span>`
                    : `<span style="font-size:12px;color:var(--text-subtle);font-style:italic;">Not assigned</span>`
                }
            </td>
        </tr>
    `).join("");
}

function formatDate(d) {
    if (!d) return "–";
    return new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
}

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

init();
