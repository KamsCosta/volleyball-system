import { apiRequest } from "./auth.js";

const token = localStorage.getItem("token");
if (!token) { window.location.href = "./login.html"; }

document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "./login.html";
});

// ─── LANGUAGE ─────────────────────────────────────────────────────────────────
const savedLang = localStorage.getItem("vps_lang") || "en";
setLanguage(savedLang);

document.getElementById("langEn")?.addEventListener("click", () => setLanguage("en"));
document.getElementById("langPt")?.addEventListener("click", () => setLanguage("pt"));

function setLanguage(lang) {
    localStorage.setItem("vps_lang", lang);

    const isEn = lang === "en";

    document.getElementById("langEn")?.classList.toggle("active", isEn);
    document.getElementById("langPt")?.classList.toggle("active", !isEn);
    document.getElementById("checkEn")?.classList.toggle("hidden", !isEn);
    document.getElementById("checkPt")?.classList.toggle("hidden", isEn);
    document.getElementById("currentLangBadge").textContent = isEn ? "English" : "Português";
}

// ─── SYSTEM INFO ──────────────────────────────────────────────────────────────
async function loadSystemInfo() {
    try {
        const [players, users, testStats] = await Promise.all([
            apiRequest("/players", { method: "GET" }),
            apiRequest("/auth/users", { method: "GET" }),
            apiRequest("/tests/stats", { method: "GET" })
        ]);

        document.getElementById("infoAthletes").textContent = players.length;
        document.getElementById("infoCoaches").textContent  = users.length;
        document.getElementById("infoTests").textContent    = testStats.total ?? 0;

        document.getElementById("apiStatus").innerHTML =
            `<span style="color:#38c4b0;font-weight:600;">● Online</span>`;

    } catch (err) {
        document.getElementById("apiStatus").innerHTML =
            `<span style="color:#f87171;font-weight:600;">● Offline</span>`;
    }
}

loadSystemInfo();
