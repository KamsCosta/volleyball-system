import API_URL from "./config.js";

const form      = document.getElementById("forgotForm");
const submitBtn = document.getElementById("submitBtn");

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessage();

    const email = document.getElementById("email").value.trim();
    if (!email) { showMessage("Please enter your email.", "error"); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";

    try {
        const response = await fetch(`${API_URL}/passwordreset/forgot`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ Email: email })
        });

        const data = await response.json();
        showMessage(data.message || "Reset link sent! Check your email.", "success");
        form.reset();

    } catch (err) {
        showMessage("Error connecting to server.", "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Send Reset Link";
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
