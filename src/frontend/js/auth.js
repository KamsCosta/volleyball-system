import API_URL from "./config.js";

export async function signUp(data) {
  const response = await fetch(`${API_URL}/auth/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      Name: data.name,
      Email: data.email,
      Password: data.password,
      ConfirmPassword: data.confirmPassword,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Error during sign up.");
  }

  return result;
}

export async function login(data) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      Email: data.email,
      Password: data.password,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Invalid e-mail or password.");
  }

  return result;
}
