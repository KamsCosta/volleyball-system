import { signUp } from "./auth.js";

const form = document.getElementById("formSignup");
const btn = form.querySelector(".btn");

const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  removeMessage();

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const confirmPassword = confirmPasswordInput.value.trim();

  if (!name || !email || !password || !confirmPassword) {
    showMessage("Please fill in all fields.", "error");
    return;
  }

  if (password !== confirmPassword) {
    showMessage("Passwords do not match.", "error");
    return;
  }

  setLoading(true, "Creating account...");

  try {
    const response = await signUp({
      name,
      email,
      password,
      confirmPassword,
    });

    showMessage(
      response.message || "Account created successfully! Redirecting...",
      "success"
    );

    setTimeout(() => {
      window.location.href = "./login.html";
    }, 1500);
  } catch (error) {
    showMessage(error.message || "Error creating account.", "error");
  } finally {
    setLoading(false, "Create Account");
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
