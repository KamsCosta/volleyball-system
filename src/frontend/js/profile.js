import { apiRequest } from "./auth.js";

const token = localStorage.getItem("token");
if (!token) { window.location.href = "./login.html"; }

document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "./login.html";
});

// Carrega dados do usuário logado
async function loadProfile() {
    try {
        const user = await apiRequest("/auth/me", { method: "GET" });

        const initials = user.name.split(" ").slice(0, 2).map(n => n[0].toUpperCase()).join("");
        document.getElementById("profileAvatar").textContent = initials;
        document.getElementById("profileName").textContent   = user.name;
        document.getElementById("profileEmail").textContent  = user.email;
        document.getElementById("profileMeta").textContent   =
            `Member since ${formatDate(user.createdAt)} · ${user.testsApplied} test${user.testsApplied !== 1 ? "s" : ""} applied`;

        // Preenche o formulário
        document.getElementById("editName").value  = user.name;
        document.getElementById("editEmail").value = user.email;

    } catch (err) {
        showMessage("Error loading profile.", "error");
    }
}

// Salva nome e email
document.getElementById("profileForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessage();

    const name  = document.getElementById("editName").value.trim();
    const email = document.getElementById("editEmail").value.trim();

    if (!name || !email) { showMessage("Please fill in all fields.", "error"); return; }

    const btn = document.getElementById("saveProfileBtn");
    btn.disabled = true;
    btn.textContent = "Saving...";

    try {
        const data = await apiRequest("/auth/me", {
            method: "PUT",
            body: JSON.stringify({ Name: name, Email: email })
        });

        showMessage(data.message || "Profile updated successfully.", "success");
        await loadProfile();

    } catch (err) {
        showMessage(err.message || "Error updating profile.", "error");
    } finally {
        btn.disabled = false;
        btn.textContent = "💾 Save Changes";
    }
});

// Atualiza senha
document.getElementById("passwordForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessage();

    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword     = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (newPassword.length < 6) { showMessage("New password must be at least 6 characters.", "error"); return; }
    if (newPassword !== confirmPassword) { showMessage("Passwords do not match.", "error"); return; }

    const btn = document.getElementById("savePasswordBtn");
    btn.disabled = true;
    btn.textContent = "Updating...";

    try {
        const data = await apiRequest("/auth/me/password", {
            method: "PUT",
            body: JSON.stringify({
                CurrentPassword: currentPassword,
                NewPassword:     newPassword,
                ConfirmPassword: confirmPassword
            })
        });

        showMessage(data.message || "Password updated successfully.", "success");
        document.getElementById("passwordForm").reset();

    } catch (err) {
        showMessage(err.message || "Error updating password.", "error");
    } finally {
        btn.disabled = false;
        btn.textContent = "🔒 Update Password";
    }
});

function formatDate(d) {
    if (!d) return "–";
    return new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
}

function showMessage(msg, type) {
    clearMessage();
    const box = document.getElementById("messageBox");
    const div = document.createElement("div");
    div.className = `msg-box ${type}`;
    div.textContent = msg;
    box.appendChild(div);
    setTimeout(() => clearMessage(), 5000);
}

function clearMessage() {
    document.getElementById("messageBox").innerHTML = "";
}

loadProfile();
