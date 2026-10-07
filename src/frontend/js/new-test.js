import { apiRequest } from "./auth.js";
import { loadSupportedSkills, isSkillSupported, analyzeVideoInto, renderFilmingGuide } from "./video-analysis.js";

// Vídeos anexados no formulário: SkillIndex -> File.
// A análise só roda depois de salvar, porque precisa do Id de cada habilidade salva.
const attachedVideos = new Map();

const token = localStorage.getItem("token");
if (!token) { window.location.href = "./login.html"; }

document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "./login.html";
});

// Decodifica o JWT e retorna o ID do usuário logado
function getLoggedUserId() {
    try {
        const payload = token.split(".")[1];
        const data = JSON.parse(atob(payload));
        return data?.sub ? parseInt(data.sub) : null;
    } catch {
        return null;
    }
}

const SKILLS = [
    "Static Manchete", "Static Toque", "Dynamic Manchete", "Dynamic Toque",
    "Underhand Serve", "Overhand Serve", "Manchete Reception", "Toque Reception",
    "Toque Setting", "Manchete Setting", "Net Attack", "Back Attack",
    "Lateral Block", "Cross Block", "Body Defense", "Dive Defense"
];

function classify(hits) {
    const pct = (hits / 160) * 100;
    if (pct >= 75) return "Advanced 🏆";
    if (pct >= 50) return "Development 📈";
    return "Beginner 🌱";
}

function classifyColor(hits) {
    const pct = (hits / 160) * 100;
    if (pct >= 75) return "#38c4b0";
    if (pct >= 50) return "#f59e42";
    return "#a78bfa";
}

function updatePreview() {
    const inputs = document.querySelectorAll(".skill-input");
    let total = 0;

    inputs.forEach(input => {
        const idx = input.dataset.skill;
        let val = parseInt(input.value) || 0;
        if (val < 0) { val = 0; input.value = 0; }
        if (val > 10) { val = 10; input.value = 10; }
        total += val;
        const errEl = document.getElementById(`err-${idx}`);
        if (errEl) errEl.textContent = `❌ ${10 - val}`;
    });

    const errors = 160 - total;
    const pct    = Math.round((total / 160) * 100);
    const cls    = classify(total);
    const color  = classifyColor(total);

    document.getElementById("totalScore").textContent    = total;
    document.getElementById("previewHits").textContent   = total;
    document.getElementById("previewErrors").textContent = errors;
    document.getElementById("previewPct").textContent    = `${pct}%`;
    document.getElementById("previewClass").textContent  = cls;
    document.getElementById("previewClass").style.color  = color;

    const badge = document.getElementById("classificationBadge");
    badge.textContent       = cls;
    badge.style.color       = color;
    badge.style.borderColor = color;
}

document.querySelectorAll(".skill-input").forEach(input => {
    input.addEventListener("input", updatePreview);
});

// Carrega atletas no select
async function loadAthletes() {
    try {
        const players = await apiRequest("/players", { method: "GET" });
        const select  = document.getElementById("athleteId");

        const params    = new URLSearchParams(window.location.search);
        const preselect = params.get("playerId");

        players.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.id;
            opt.textContent = `${p.name} (#${p.number} – ${p.position})`;
            if (preselect && p.id === Number(preselect)) opt.selected = true;
            select.appendChild(opt);
        });
    } catch (err) {
        showMessage("Failed to load athletes.", "error");
    }
}

// Carrega coaches no select — pré-seleciona o usuário logado
async function loadCoaches() {
    try {
        const coaches = await apiRequest("/auth/users", { method: "GET" });
        const select  = document.getElementById("coachId");
        const loggedId = getLoggedUserId();

        coaches.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c.id;
            opt.textContent = c.name;
            if (c.id === loggedId) opt.selected = true; // pré-seleciona quem está logado
            select.appendChild(opt);
        });
    } catch (err) {
        showMessage("Failed to load coaches.", "error");
    }
}

// Data padrão = hoje
document.getElementById("testDate").value = new Date().toISOString().split("T")[0];

// Submit
document.getElementById("testForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessage();

    const athleteId = document.getElementById("athleteId").value;
    const coachId   = document.getElementById("coachId").value;
    const category  = document.getElementById("category").value;
    const testDate  = document.getElementById("testDate").value;
    const notes     = document.getElementById("notes").value.trim();

    if (!athleteId || !category || !testDate) {
        showMessage("Please fill in all required fields.", "error");
        return;
    }

    const skillResults = [];
    document.querySelectorAll(".skill-input").forEach(input => {
        const idx  = parseInt(input.dataset.skill);
        const hits = parseInt(input.value) || 0;
        skillResults.push({ SkillIndex: idx, SkillName: SKILLS[idx], Hits: hits, Errors: 10 - hits });
    });

    const totalHits = skillResults.reduce((s, r) => s + r.Hits, 0);

    const payload = {
        PlayerId:       parseInt(athleteId),
        CoachId:        coachId ? parseInt(coachId) : null,
        Category:       category,
        TestDate:       testDate,
        Notes:          notes,
        TotalHits:      totalHits,
        TotalErrors:    160 - totalHits,
        Classification: classify(totalHits).replace(/[^a-zA-Z]/g, "").trim(),
        SkillResults:   skillResults
    };

    const btn = document.getElementById("submitBtn");
    btn.disabled = true;
    btn.textContent = "Saving...";

    let saved = null;
    try {
        saved = await apiRequest("/tests", { method: "POST", body: JSON.stringify(payload) });
    } catch (err) {
        showMessage(err.message || "Error saving test.", "error");
        btn.disabled = false;
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save Test`;
        return;
    }

    if (attachedVideos.size === 0 || !saved) {
        showMessage("Test saved successfully! Redirecting...", "success");
        setTimeout(() => { window.location.href = "./test-list.html"; }, 1500);
        return;
    }

    // Com vídeos anexados: fica na página e mostra a análise de cada um
    btn.textContent = "Saved";
    document.querySelector(".form-actions").classList.add("hidden");
    showMessage(`Test saved! Analyzing ${attachedVideos.size} video(s). Keep this page open.`, "success");
    await analyzeAttachedVideos(saved);
});

// ── Vídeo: anexar no formulário ────────────────────────────────

async function setupVideoAttachments() {
    await loadSupportedSkills();
    let any = false;

    document.querySelectorAll(".skill-input").forEach(input => {
        const idx = parseInt(input.dataset.skill);
        if (!isSkillSupported(idx)) return;
        any = true;

        const attach = document.createElement("div");
        attach.className = "va-attach";
        attach.innerHTML = `
            <label class="va-attach-btn">
                🎥 <span class="va-attach-label">Attach video</span>
                <input type="file" accept="video/*" hidden />
            </label>
            <button type="button" class="va-attach-remove hidden" title="Remove video">✕</button>
        `;
        const fileInput = attach.querySelector("input[type=file]");
        const label = attach.querySelector(".va-attach-label");
        const removeBtn = attach.querySelector(".va-attach-remove");

        fileInput.addEventListener("change", () => {
            const file = fileInput.files[0];
            if (!file) return;
            attachedVideos.set(idx, file);
            label.textContent = file.name;
            attach.classList.add("has-file");
            removeBtn.classList.remove("hidden");
        });
        removeBtn.addEventListener("click", () => {
            attachedVideos.delete(idx);
            fileInput.value = "";
            label.textContent = "Attach video";
            attach.classList.remove("has-file");
            removeBtn.classList.add("hidden");
        });

        input.closest(".skill-row").appendChild(attach);
    });

    if (any) {
        const info = document.querySelector(".skills-info");
        info.insertAdjacentHTML("afterend", `
            <div class="va-attach-info">
                🎥 Static Manchete and Static Toque accept a video (optional). The analysis runs
                when you save the test, and you compare the machine result with what you entered.
                ${renderFilmingGuide()}
            </div>
        `);
    }
}

// ── Vídeo: analisar depois de salvar ───────────────────────────

async function analyzeAttachedVideos(savedTest) {
    const panel = document.createElement("section");
    panel.className = "panel";
    panel.id = "videoResults";
    panel.innerHTML = `
        <div class="panel-header"><h3>Video analysis</h3><span class="panel-badge">AI</span></div>
        <div class="va-new-test-results"></div>
        <div class="form-actions">
            <a href="./test-list.html" class="btn-secondary hidden" id="videoDoneBtn">Go to the test list</a>
        </div>
    `;
    document.getElementById("testForm").after(panel);
    panel.scrollIntoView({ behavior: "smooth", block: "start" });

    const list = panel.querySelector(".va-new-test-results");
    const skills = savedTest.skillResults || [];

    // Um vídeo por vez: o serviço de análise processa em sequência
    for (const [idx, file] of attachedVideos) {
        const skill = skills.find(s => s.skillIndex === idx);
        const block = document.createElement("div");
        block.className = "va-block";
        block.innerHTML = `<div class="va-new-test-title">${SKILLS[idx]}</div><div class="va-result"></div>`;
        list.appendChild(block);
        const box = block.querySelector(".va-result");

        if (!skill) {
            box.innerHTML = `<div class="va-error">❌ This skill was not found in the saved test.</div>`;
            continue;
        }
        await analyzeVideoInto(box, skill.id, file);
    }

    panel.querySelector("#videoDoneBtn").classList.remove("hidden");
    showMessage("Test saved and video analysis finished.", "success");
}

function showMessage(msg, type) {
    clearMessage();
    const box = document.getElementById("messageBox");
    const div = document.createElement("div");
    div.className = `msg-box ${type}`;
    div.textContent = msg;
    box.appendChild(div);
}

function clearMessage() {
    document.getElementById("messageBox").innerHTML = "";
}

// Init
loadAthletes();
loadCoaches();
updatePreview();
setupVideoAttachments();
