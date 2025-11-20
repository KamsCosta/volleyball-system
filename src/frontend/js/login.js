import { login } from "./api/auth.js"; 
import API_URL from "./api/config.js";

// Pega o formulário
const formLogin = document.getElementById("formLogin");

// Quando enviar o formulário
formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Pega os inputs do front
    const email = formLogin.querySelector("input[type='text']").value;
    const password = formLogin.querySelector("input[type='password']").value;

    // Monta o corpo para a API
    const data = { email, password };

    // Chama a API de login
    const response = await login(data);

    // Caso dê erro:
    if (response.message && response.token === undefined) {
        alert("Erro no login: " + response.message);
        return;
    }

    // Salva o token
    localStorage.setItem("token", response.token);

    alert("Login realizado com sucesso! Token salvo!");

    // Redirecionar para página protegida
    window.location.href = "./dashboard.html";
});
