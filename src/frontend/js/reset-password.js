import API_URL from "./config.js";

const form      = document.getElementById("resetForm");
const submitBtn = document.getElementById("submitBtn");

// Pega o token da URL
const token = new URLSearchParams(window.location.search).get("token");

if (!token) {
    showMessage("Invalid or missing token. Request a new reset link.", "error");
    submitBtn.disabled = true;
}

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessage();

    const newPassword     = document.getElementById("newPassword").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();

    if (!newPassword || !confirmPassword) {
        showMessage("Please fill in all fields.", "error"); return;
    }

    if (newPassword.length < 6) {
        showMessage("Password must be at least 6 characters.", "error"); return;
    }

    if (newPassword !== confirmPassword) {
        showMessage("Passwords do not match.", "error"); return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Resetting...";

    try {
        const response = await fetch(`${API_URL}/passwordreset/reset`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                Token:           token,
                NewPassword:     newPassword,
                ConfirmPassword: confirmPassword
            })
        });

        const data = await response.json();

        if (!response.ok) {
            showMessage(data.message || "Error resetting password.", "error");
            return;
        }

        showMessage("Password reset successfully! Redirecting to login...", "success");
        setTimeout(() => { window.location.href = "./login.html"; }, 2000);

    } catch (err) {
        showMessage("Error connecting to server.", "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Reset Password";
    }
});

function showMessage(msg, type) {
    clearMessage();
    const box = document.getElementById("messageBox");
    const div = document.createElement("div");
    div.style.cssText = `
        margin-top:1rem; padding:0.7rem 1rem; border-radius:8px; font-size:0.88rem; text-align:center;
        background:${type === "error" ? "rgba(220,50,50,0.2)" : "rgba(40,180,100,0.2)"};
        border:1px solid ${type === "error" ? "rgba(220,50,50,0.5)" : "rgba(40,180,100,0.5)"};
        color:${type === "error" ? "#ffaaaa" : "#88ffbb"};
    `;
    div.textContent = msg;
    box.appendChild(div);
}

function clearMessage() {
    document.getElementById("messageBox").innerHTML = "";
}
