import { signUp } from "./auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formSign");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const inputs = form.querySelectorAll("input");

    const data = {
      name: inputs[0].value,
      email: inputs[1].value,
      password: inputs[2].value,
      confirmPassword: inputs[3].value
    };

    const result = await signUp(data);

    if (result.message === "Conta criada com sucesso!") {
      alert("Conta criada! Agora faça login!");
      window.location.href = "./login.html";
    } else {
      alert(result.message || "Erro ao criar conta.");
    }
  });
});
