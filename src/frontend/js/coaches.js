import { apiRequest } from "./auth.js";
import API_URL from "./config.js";

const token = localStorage.getItem("token");
if (!token) { window.location.href = "./login.html"; }

document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "./login.html";
});

// Refresh
document.getElementById("refreshBtn")?.addEventListener("click", loadCoaches);

// Fechar modais
document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => {
        document.getElementById(btn.dataset.close).classList.add("hidden");
    });
});

// Fechar clicando fora
document.querySelectorAll(".modal-overlay").forEach(modal => {
    modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.classList.add("hidden");
    });
});

// Abrir modal de adicionar
document.getElementById("addCoachBtn")?.addEventListener("click", () => {
    document.getElementById("addCoachForm").reset();
    document.getElementById("addModal").classList.remove("hidden");
});

// Submit — adicionar coach
document.getElementById("addCoachForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name            = document.getElementById("newName").value.trim();
    const email           = document.getElementById("newEmail").value.trim();
    const password        = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("newConfirmPassword").value;

    if (password.length < 6) {
        showMessage("Password must be at least 6 characters.", "error"); return;
    }

    if (password !== confirmPassword) {
        showMessage("Passwords do not match.", "error"); return;
    }

    const btn = document.getElementById("addCoachBtn2");
    btn.disabled = true;
    btn.textContent = "Adding...";

    try {
        const response = await fetch(`${API_URL}/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                Name:            name,
                Email:           email,
                Password:        password,
                ConfirmPassword: confirmPassword
            })
        });

        const data = await response.json();

        if (!response.ok) {
            showMessage(data.message || "Error adding coach.", "error");
            return;
        }

        showMessage("Coach added successfully!", "success");
        document.getElementById("addModal").classList.add("hidden");
        document.getElementById("addCoachForm").reset();
        await loadCoaches();

    } catch (err) {
        showMessage("Error connecting to server.", "error");
    } finally {
        btn.disabled = false;
        btn.textContent = "➕ Add Coach";
    }
});

// ─── CARREGAR COACHES ──────────────────────────────────────────────────────────
async function loadCoaches() {
    const tbody = document.getElementById("coachesTableBody");
    tbody.innerHTML = `<tr><td colspan="6" class="empty-row">Loading coaches...</td></tr>`;

    try {
        const coaches = await apiRequest("/auth/users", { method: "GET" });
        document.getElementById("totalBadge").textContent =
            `${coaches.length} Coach${coaches.length !== 1 ? "es" : ""}`;
        renderTable(coaches);
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-row">Failed to load coaches.</td></tr>`;
        showMessage(err.message || "Error loading coaches.", "error");
    }
}

function renderTable(coaches) {
    const tbody = document.getElementById("coachesTableBody");

    if (!coaches || coaches.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-row">No coaches found.</td></tr>`;
        return;
    }

    tbody.innerHTML = coaches.map(c => `
        <tr>
            <td>
                <div class="coach-avatar-row">
                    <div class="coach-avatar">${getInitials(c.name)}</div>
                    <span style="font-weight:600;">${c.name}</span>
                </div>
            </td>
            <td style="color:var(--text-muted);font-size:13px;">${c.email}</td>
            <td><strong>${c.testsApplied}</strong> tests</td>
            <td>${formatDate(c.createdAt)}</td>
            <td>
                <span class="status-badge ${c.isActive ? 'active' : 'inactive'}">
                    ${c.isActive ? '✅ Active' : '⛔ Inactive'}
                </span>
            </td>
            <td class="actions-cell">
                <button class="btn-edit" data-id="${c.id}" data-action="profile">👤 Profile</button>
                <button class="btn-edit btn-toggle ${c.isActive ? '' : 'btn-activate'}"
                    data-id="${c.id}" data-action="toggle">
                    ${c.isActive ? '⛔ Deactivate' : '✅ Activate'}
                </button>
                <button class="btn-delete" data-id="${c.id}" data-action="delete">🗑️ Delete</button>
            </td>
        </tr>
    `).join("");

    document.querySelectorAll("[data-action='profile']").forEach(btn => {
        btn.addEventListener("click", () => openProfile(Number(btn.dataset.id)));
    });

    document.querySelectorAll("[data-action='toggle']").forEach(btn => {
        btn.addEventListener("click", () => toggleCoach(Number(btn.dataset.id)));
    });

    document.querySelectorAll("[data-action='delete']").forEach(btn => {
        btn.addEventListener("click", () => deleteCoach(Number(btn.dataset.id)));
    });
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────
async function openProfile(id) {
    try {
        const data = await apiRequest(`/auth/users/${id}`, { method: "GET" });
        const { coach, tests } = data;

        document.getElementById("modalCoachName").textContent  = coach.name;
        document.getElementById("modalCoachEmail").textContent = coach.email;

        document.getElementById("modalStats").innerHTML = `
            <div class="modal-stat-card">
                <span class="modal-stat-label">Tests Applied</span>
                <span class="modal-stat-value" style="color:#4e8fff;">${tests.length}</span>
            </div>
            <div class="modal-stat-card">
                <span class="modal-stat-label">Status</span>
                <span class="modal-stat-value" style="color:${coach.isActive ? '#38c4b0' : '#f87171'};">
                    ${coach.isActive ? 'Active' : 'Inactive'}
                </span>
            </div>
            <div class="modal-stat-card">
                <span class="modal-stat-label">Member Since</span>
                <span class="modal-stat-value" style="font-size:14px;">${formatDate(coach.createdAt)}</span>
            </div>
        `;

        document.getElementById("modalTests").innerHTML = tests.length === 0
            ? `<div style="text-align:center;color:var(--text-muted);font-size:13px;padding:16px;">No tests applied yet.</div>`
            : tests.map(t => `
                <div class="modal-test-row">
                    <div>
                        <div style="font-weight:600;font-size:13px;">${t.playerName}</div>
                        <div style="font-size:11px;color:var(--text-muted);">${t.category} · ${formatDate(t.testDate)}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:13px;font-weight:700;color:${rateColor(t.hitRate)};">${t.hitRate}%</div>
                        <div style="font-size:11px;color:var(--text-muted);">${t.classification}</div>
                    </div>
                </div>
            `).join("");

        document.getElementById("profileModal").classList.remove("hidden");
    } catch (err) {
        showMessage("Error loading coach profile.", "error");
    }
}

// ─── TOGGLE ───────────────────────────────────────────────────────────────────
async function toggleCoach(id) {
    try {
        const data = await apiRequest(`/auth/users/${id}/toggle`, { method: "PATCH" });
        showMessage(data.message, "success");
        await loadCoaches();
    } catch (err) {
        showMessage(err.message || "Error updating coach status.", "error");
    }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
async function deleteCoach(id) {
    if (!confirm("Delete this coach? Tests applied by them will remain, but will no longer be linked to this coach.")) return;

    try {
        await apiRequest(`/auth/users/${id}`, { method: "DELETE" });
        showMessage("Coach deleted successfully.", "success");
        await loadCoaches();
    } catch (err) {
        showMessage(err.message || "Error deleting coach.", "error");
    }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getInitials(name) {
    return name.split(" ").slice(0, 2).map(n => n[0].toUpperCase()).join("");
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

function showMessage(msg, type) {
    const box = document.getElementById("messageBox");
    box.innerHTML = `<div class="msg-box ${type}">${msg}</div>`;
    setTimeout(() => { box.innerHTML = ""; }, 4000);
}

loadCoaches();
