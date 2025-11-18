import { login } from "./auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formLogin");
  const emailInput = form.querySelector("input[type='text']");
  const passInput = form.querySelector("input[type='password']");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      email: emailInput.value,
      password: passInput.value
    };

    const result = await login(data);

    if (result.token) {
      alert("Login realizado com sucesso!");

      localStorage.setItem("token", result.token);
      window.location.href = "../pages/home.html";
    } else {
      alert(result.message || "Usuário ou senha incorretos.");
    }
  });
});
