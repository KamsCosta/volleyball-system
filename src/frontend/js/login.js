import { login } from "./auth.js";

const form = document.getElementById("formLogin");
const btn = form.querySelector(".btn");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  removeMessage();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    showMessage("Please fill in all fields.", "error");
    return;
  }

  setLoading(true, "Signing in...");

  try {
    const response = await login({ email, password });

    if (!response.token) {
      showMessage(response.message || "Invalid credentials.", "error");
      return;
    }

    localStorage.setItem("token", response.token);
    showMessage("Login successful! Redirecting...", "success");

    setTimeout(() => {
      window.location.href = "./dashboard.html";
    }, 1200);
  } catch (error) {
    showMessage(error.message || "Error connecting to the server.", "error");
  } finally {
    setLoading(false, "Login");
  }
});

function setLoading(loading, text) {
  btn.disabled = loading;
  btn.textContent = text;
}

function showMessage(message, type) {
  removeMessage();

  const div = document.createElement("div");
  div.id = "formMsg";
  div.className = `form-message ${type}`;
  div.textContent = message;

  form.insertBefore(div, form.firstChild);
}

function removeMessage() {
  const oldMessage = document.getElementById("formMsg");
  if (oldMessage) oldMessage.remove();
}
