import { apiRequest } from "./auth.js";

const token = localStorage.getItem("token");
if (!token) { window.location.href = "./login.html"; }

document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "./login.html";
});

const form      = document.getElementById("newAthleteForm");
const submitBtn = document.getElementById("submitBtn");

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessage();

    const data = {
        Name:     document.getElementById("name").value.trim(),
        Position: document.getElementById("position").value.trim(),
        Number:   Number(document.getElementById("number").value),
        Height:   Number(document.getElementById("height").value)
    };

    if (!data.Name || !data.Position || !data.Number || !data.Height) {
        showMessage("Please fill in all fields.", "error");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Saving...";

    try {
        await apiRequest("/players", { method: "POST", body: JSON.stringify(data) });
        showMessage("Athlete created successfully! Redirecting...", "success");
        setTimeout(() => { window.location.href = "./players.html"; }, 1500);
    } catch (err) {
        showMessage(err.message || "Error creating athlete.", "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "➕ Save Athlete";
    }
});

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
