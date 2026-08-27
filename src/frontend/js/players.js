import { apiRequest } from "./auth.js";

const token = localStorage.getItem("token");
if (!token) { window.location.href = "./login.html"; }

document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "./login.html";
});

document.getElementById("refreshBtn")?.addEventListener("click", loadPlayers);

// Modal de edição
const modal       = document.getElementById("editModal");
const editForm    = document.getElementById("editForm");
const closeModal  = document.getElementById("closeModal");
const cancelModal = document.getElementById("cancelModal");

closeModal?.addEventListener("click", hideModal);
cancelModal?.addEventListener("click", hideModal);
modal?.addEventListener("click", (e) => { if (e.target === modal) hideModal(); });

editForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id   = document.getElementById("editId").value;
    const data = {
        Name:     document.getElementById("editName").value.trim(),
        Position: document.getElementById("editPosition").value.trim(),
        Number:   Number(document.getElementById("editNumber").value),
        Height:   Number(document.getElementById("editHeight").value)
    };

    const btn = document.getElementById("saveEditBtn");
    btn.disabled = true;
    btn.textContent = "Saving...";

    try {
        await apiRequest(`/players/${id}`, { method: "PUT", body: JSON.stringify(data) });
        showMessage("Athlete updated successfully.", "success");
        hideModal();
        await loadPlayers();
    } catch (err) {
        showMessage(err.message || "Error updating athlete.", "error");
    } finally {
        btn.disabled = false;
        btn.textContent = "💾 Save Changes";
    }
});

async function loadPlayers() {
    const tbody = document.getElementById("playersTableBody");
    tbody.innerHTML = `<tr><td colspan="7" class="empty-row">Loading athletes...</td></tr>`;

    try {
        const players = await apiRequest("/players", { method: "GET" });
        document.getElementById("totalBadge").textContent =
            `${players.length} Athlete${players.length !== 1 ? "s" : ""}`;
        renderTable(players);
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-row">Failed to load athletes.</td></tr>`;
        showMessage(err.message || "Error loading athletes.", "error");
    }
}

function renderTable(players) {
    const tbody = document.getElementById("playersTableBody");

    if (!players || players.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-row">No athletes found. <a href="./new-athlete.html" style="color:#4e8fff">Add one →</a></td></tr>`;
        return;
    }

    tbody.innerHTML = players.map(p => `
        <tr>
            <td>${p.id}</td>
            <td>${p.name}</td>
            <td>${p.position}</td>
            <td>#${p.number}</td>
            <td>${p.height} cm</td>
            <td class="actions-cell">
                <a href="./athlete-detail.html?id=${p.id}" class="btn-edit">📊 Detail</a>
                <button class="btn-edit" data-id="${p.id}" data-action="edit">✏️ Edit</button>
                <button class="btn-delete" data-id="${p.id}">🗑️ Delete</button>
            </td>
        </tr>
    `).join("");

    document.querySelectorAll("[data-action='edit']").forEach(btn => {
        btn.addEventListener("click", () => {
            const p = players.find(x => x.id === Number(btn.dataset.id));
            if (p) openModal(p);
        });
    });

    document.querySelectorAll(".btn-delete").forEach(btn => {
        btn.addEventListener("click", async () => {
            if (!confirm("Delete this athlete?")) return;
            try {
                await apiRequest(`/players/${btn.dataset.id}`, { method: "DELETE" });
                showMessage("Athlete deleted successfully.", "success");
                await loadPlayers();
            } catch (err) {
                showMessage(err.message || "Error deleting athlete.", "error");
            }
        });
    });
}

function openModal(player) {
    document.getElementById("editId").value       = player.id;
    document.getElementById("editName").value     = player.name;
    document.getElementById("editPosition").value = player.position;
    document.getElementById("editNumber").value   = player.number;
    document.getElementById("editHeight").value   = player.height;
    modal.classList.remove("hidden");
}

function hideModal() {
    modal.classList.add("hidden");
    editForm.reset();
}

function showMessage(msg, type) {
    const box = document.getElementById("messageBox");
    box.innerHTML = `<div class="msg-box ${type}">${msg}</div>`;
    setTimeout(() => { box.innerHTML = ""; }, 4000);
}

loadPlayers();
