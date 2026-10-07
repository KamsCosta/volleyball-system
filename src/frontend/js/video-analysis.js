import { apiRequest } from "./auth.js";
import API_URL from "./config.js";

// Habilidades suportadas pela análise de vídeo neste MVP
// (mantido em sincronia com VideoAnalysisSkillMap no backend)
let SUPPORTED_SKILL_INDEXES = [0, 1];

// Busca do backend quais habilidades estão disponíveis (fallback pro hardcoded acima se falhar)
export async function loadSupportedSkills() {
    try {
        const supported = await apiRequest("/videoanalysis/supported-skills", { method: "GET" });
        if (Array.isArray(supported)) SUPPORTED_SKILL_INDEXES = supported;
    } catch {
        // usa o fallback
    }
    return SUPPORTED_SKILL_INDEXES;
}

export function isSkillSupported(skillIndex) {
    return SUPPORTED_SKILL_INDEXES.includes(skillIndex);
}

/**
 * Renderiza o bloco de análise de vídeo para uma habilidade dentro do modal.
 * `skillResultId` é o Id do TestSkillResult (não o índice 0-15).
 */
export function renderVideoAnalysisBlock(skillResultId, skillIndex, skillName) {
    if (!isSkillSupported(skillIndex)) return "";

    return `
        <div class="va-block" data-skill-result-id="${skillResultId}">
            <div class="va-header">
                <span class="va-badge">🎥 AI analysis available</span>
                <button class="va-upload-btn" data-skill-result-id="${skillResultId}" data-skill-index="${skillIndex}">
                    Upload video
                </button>
                <input type="file" accept="video/*" class="va-file-input hidden" data-skill-result-id="${skillResultId}"/>
            </div>
            ${renderFilmingGuide()}
            <div class="va-result" id="va-result-${skillResultId}"></div>
        </div>
    `;
}

/**
 * Orientação de filmagem. A qualidade da análise depende muito do vídeo:
 * com o atleta pequeno no quadro, o ângulo do cotovelo fica impreciso
 * (ver src/video-analysis-service/README.md).
 */
export function renderFilmingGuide() {
    return `
        <details class="va-guide">
            <summary>📱 How to film for the best analysis</summary>
            <ul>
                <li>Camera fixed, to the side of the athlete (profile view), at waist height.</li>
                <li>Athlete filling at least half of the frame height (camera 3 to 4 m away).</li>
                <li>Ideally, only the evaluated athlete in the frame. If someone is feeding the ball, keep each person on one side of the frame.</li>
                <li>Phone in landscape, 1080p, with good lighting.</li>
            </ul>
        </details>
    `;
}

/** Checklist técnico de uma repetição (itens não confiáveis aparecem só como informação). */
function renderChecks(checks) {
    if (!Array.isArray(checks) || checks.length === 0) return "";
    return checks.map(c => {
        const icon = !c.reliable ? "ℹ️" : (c.passed ? "✅" : "❌");
        const note = !c.reliable ? " (informational only)" : "";
        return `<span class="va-check ${c.reliable ? "" : "info"}" title="${c.label}${note}">${icon} ${c.label}: ${c.value ?? "–"}</span>`;
    }).join("");
}

/**
 * Liga os eventos de clique/upload depois que o modal foi renderizado no DOM.
 */
export function bindVideoAnalysisEvents(container) {
    container.querySelectorAll(".va-upload-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = btn.dataset.skillResultId;
            const fileInput = container.querySelector(`.va-file-input[data-skill-result-id="${id}"]`);
            fileInput.click();
        });
    });

    container.querySelectorAll(".va-file-input").forEach(input => {
        input.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const skillResultId = input.dataset.skillResultId;
            await uploadAndAnalyze(skillResultId, file, container);
        });
    });

    // Se a habilidade já foi analisada antes, mostra a análise salva (com o vídeo anotado)
    container.querySelectorAll(".va-block[data-skill-result-id]").forEach(block => {
        const id = block.dataset.skillResultId;
        loadSavedAnalysis(id, block.querySelector(`#va-result-${id}`));
    });
}

async function loadSavedAnalysis(skillResultId, resultBox) {
    if (!resultBox) return;
    try {
        const data = await apiRequest(`/videoanalysis/test-skill-results/${skillResultId}`, { method: "GET" });
        if (data) renderAnalysisResult(resultBox, data, skillResultId);
    } catch {
        // 404 = ainda não analisada; o botão "Enviar vídeo" continua disponível
    }
}

// Endereço dos arquivos de /uploads (mesmo servidor da API, sem o "/api")
const FILES_ORIGIN = API_URL.replace(/\/api\/?$/, "");

/**
 * "Ver como a IA analisou": vídeo com o esqueleto rastreado, as repetições e o
 * checklist desenhados por cima, para o treinador conferir o trabalho da máquina.
 */
function renderAnnotatedVideo(data) {
    if (!data.annotatedVideoUrl && !data.videoUrl) return "";
    const annotated = data.annotatedVideoUrl ? `${FILES_ORIGIN}${data.annotatedVideoUrl}` : null;
    const original = data.videoUrl ? `${FILES_ORIGIN}${data.videoUrl}` : null;

    return `
        <details class="va-annotated">
            <summary>🔍 See how the AI analyzed the video</summary>
            ${annotated ? `
                <video class="va-annotated-video" src="${annotated}" controls playsinline preload="metadata"></video>
                <div class="va-speed">
                    <span>Speed:</span>
                    <button type="button" data-rate="0.25">0.25x</button>
                    <button type="button" data-rate="0.5">0.5x</button>
                    <button type="button" data-rate="1" class="active">1x</button>
                </div>
                <ul class="va-legend">
                    <li><b class="lg-arm">Yellow</b>: tracked arms · <b class="lg-body">blue</b>: body</li>
                    <li>Darkened side: ignored person (feeder)</li>
                    <li>Top card: each repetition at the moment of contact, with HIT/ERROR and the checklist</li>
                    <li>Bottom bar: live measurements (green within the limit, red outside)</li>
                </ul>
            ` : `<div class="va-disclaimer">The annotated video is not available for this analysis (it was made before this feature). Upload the video again to generate it.</div>`}
            ${original ? `<a class="va-original-link" href="${original}" target="_blank" rel="noopener">Open the original video</a>` : ""}
        </details>
    `;
}

function bindAnnotatedVideo(resultBox) {
    const video = resultBox.querySelector(".va-annotated-video");
    if (!video) return;
    resultBox.querySelectorAll(".va-speed button").forEach(btn => {
        btn.addEventListener("click", () => {
            video.playbackRate = parseFloat(btn.dataset.rate);
            resultBox.querySelectorAll(".va-speed button").forEach(b => b.classList.toggle("active", b === btn));
        });
    });
}

async function uploadAndAnalyze(skillResultId, file, container) {
    const resultBox = container.querySelector(`#va-result-${skillResultId}`);
    await analyzeVideoInto(resultBox, skillResultId, file);
}

/**
 * Envia o vídeo de uma habilidade já salva (TestSkillResult) e mostra o resultado
 * dentro de `resultBox`. Usado no modal da lista de testes e na página New Test.
 * Retorna true se a análise deu certo.
 */
export async function analyzeVideoInto(resultBox, skillResultId, file) {
    resultBox.innerHTML = `<div class="va-loading">⏳ Analyzing video... this takes about 3x the video length (1 to 3 minutes).</div>`;

    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("video", file);

    try {
        const response = await fetch(`${API_URL}/videoanalysis/test-skill-results/${skillResultId}/analyze`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` },
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            resultBox.innerHTML = `<div class="va-error">❌ ${data.message || "Error analyzing the video."}</div>`;
            return false;
        }

        renderAnalysisResult(resultBox, data, skillResultId);
        return true;

    } catch (err) {
        resultBox.innerHTML = `<div class="va-error">❌ Could not connect to the analysis service. Is it running?</div>`;
        return false;
    }
}

function renderAnalysisResult(resultBox, data, skillResultId) {
    const machineHits = data.machineHits ?? "–";
    const machineErrors = data.machineErrors ?? "–";

    resultBox.innerHTML = `
        <div class="va-comparison">
            <div class="va-compare-card manual">
                <span class="va-compare-label">Coach entered</span>
                <span class="va-compare-value">${data.manualHits}/10</span>
            </div>
            <div class="va-compare-vs">vs</div>
            <div class="va-compare-card machine">
                <span class="va-compare-label">Machine detected</span>
                <span class="va-compare-value">${machineHits}/10</span>
            </div>
        </div>

        <div class="va-disclaimer">ℹ️ ${data.disclaimer}</div>

        ${renderAnnotatedVideo(data)}

        <div class="va-reps-title">Repetition details (${data.repetitionsDetected} detected)</div>
        <div class="va-reps-list">
            ${data.repetitions.map(r => `
                <div class="va-rep-row ${r.provisionalValid ? 'valid' : 'invalid'}">
                    <span class="va-rep-index">#${r.index}</span>
                    <span class="va-rep-time">${r.timeSeconds}s</span>
                    ${r.checks && r.checks.length
                        ? renderChecks(r.checks)
                        : `<span class="va-rep-metric">Hands: ${r.handsDistanceRatio}</span>
                           <span class="va-rep-metric">Elbow L/R: ${r.leftElbowAngle}° / ${r.rightElbowAngle}°</span>`}
                    <span class="va-rep-status">${r.provisionalValid ? '✅ Valid' : '❌ Invalid'}</span>
                </div>
            `).join("")}
        </div>

        <div class="va-review">
            ${data.coachAgreesWithMachine === true || data.coachAgreesWithMachine === false ? `
            <div class="va-review-done">
                ✅ Review already recorded: ${data.coachAgreesWithMachine ? "agreed with the machine" : "corrected the value"}.
                Final value: <strong>${data.manualHits}/10</strong>${data.coachComment ? ` · “${data.coachComment}”` : ""}
            </div>` : ""}
            <div class="va-review-title">Your review as coach:</div>
            <div class="va-review-buttons">
                <button class="va-agree-btn" data-id="${skillResultId}">✅ I agree with the machine</button>
                <button class="va-disagree-btn" data-id="${skillResultId}">✏️ Correct the value</button>
            </div>
            <div class="va-correction hidden" id="va-correction-${skillResultId}">
                <input type="number" min="0" max="10" placeholder="Correct value (0-10)" class="va-correction-input"/>
                <textarea placeholder="Comment (optional): why do you disagree?" class="va-correction-comment"></textarea>
                <button class="va-submit-correction-btn" data-id="${skillResultId}">Save review</button>
            </div>
        </div>
    `;

    bindReviewEvents(resultBox, skillResultId);
    bindAnnotatedVideo(resultBox);
}

function bindReviewEvents(resultBox, skillResultId) {
    resultBox.querySelector(".va-agree-btn")?.addEventListener("click", async () => {
        await submitReview(skillResultId, true, null, null, resultBox);
    });

    resultBox.querySelector(".va-disagree-btn")?.addEventListener("click", () => {
        resultBox.querySelector(`#va-correction-${skillResultId}`).classList.remove("hidden");
    });

    resultBox.querySelector(".va-submit-correction-btn")?.addEventListener("click", async () => {
        const finalHits = resultBox.querySelector(".va-correction-input").value;
        const comment = resultBox.querySelector(".va-correction-comment").value;
        await submitReview(skillResultId, false, comment, finalHits ? parseInt(finalHits) : null, resultBox);
    });
}

async function submitReview(skillResultId, agreesWithMachine, comment, finalHits, resultBox) {
    try {
        const data = await apiRequest(`/videoanalysis/test-skill-results/${skillResultId}/review`, {
            method: "PUT",
            body: JSON.stringify({
                AgreesWithMachine: agreesWithMachine,
                Comment: comment,
                FinalHits: finalHits
            })
        });

        const reviewSection = resultBox.querySelector(".va-review");
        reviewSection.innerHTML = `
            <div class="va-review-done">
                ✅ Review saved! Final value: <strong>${data.finalHits}/10</strong>
            </div>
        `;
    } catch (err) {
        alert(err.message || "Error saving the review.");
    }
}
