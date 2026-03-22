import API_URL from "./config.js";

// Função genérica para chamadas autenticadas à API
export async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem("token");

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
            ...options.headers
        }
    });

    if (response.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "./login.html";
        return;
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "API request failed.");
    }

    // DELETE retorna 200 com body, GET/POST/PUT retornam JSON
    const text = await response.text();
    return text ? JSON.parse(text) : null;
}

export async function signUp(data) {
    const response = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            Name:            data.name,
            Email:           data.email,
            Password:        data.password,
            ConfirmPassword: data.confirmPassword
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro no cadastro");
    }

    return response.json();
}

export async function login(data) {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            Email:    data.email,
            Password: data.password
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Usuário ou senha inválidos");
    }

    return response.json();
}
