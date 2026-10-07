// Navegação compartilhada das páginas internas:
// marca o link ativo, abre/fecha o menu lateral e
// deixa a top bar sólida quando a página rola.
const topbar = document.querySelector(".topbar");
const page = location.pathname.split("/").pop() || "home.html";

document.querySelectorAll(".topbar-link, .nav-item").forEach(link => {
    if (link.getAttribute("href")?.endsWith(page)) link.classList.add("active");
});

const openDrawer  = () => document.body.classList.add("drawer-open");
const closeDrawer = () => document.body.classList.remove("drawer-open");

document.getElementById("menuBtn")?.addEventListener("click", openDrawer);
document.getElementById("drawerClose")?.addEventListener("click", closeDrawer);
document.getElementById("drawerBackdrop")?.addEventListener("click", closeDrawer);
document.addEventListener("keydown", e => { if (e.key === "Escape") closeDrawer(); });

const onScroll = () => topbar?.classList.toggle("scrolled", window.scrollY > 40);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();
