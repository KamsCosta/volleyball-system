import API_URL from "./config.js";

const form = document.getElementById("playerForm");
const tableBody = document.getElementById("playersTableBody");
const logoutBtn = document.getElementById("logoutBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const formTitle = document.getElementById("formTitle");
const saveBtn = document.getElementById("saveBtn");

const playerIdInput = document.getElementById("playerId");
const nameInput = document.getElementById("name");
const positionInput = document.getElementById("position");
const numberInput = document.getElementById("number");
const heightInput = document.getElementById("height");

let isEditing = false;

document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  loadPlayers();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const playerData = {
    name: nameInput.value.trim(),
    position: positionInput.value.trim(),
    number: parseInt(numberInput.value),
    height: parseInt(heightInput.value)
  };

  if (!playerData.name || !playerData.position || !playerData.number || !playerData.height) {
    showMessage("Please fill in all fields.", "error");
    return;
  }

  try {
    if (isEditing) {
      await updatePlayer(playerIdInput.value, playerData);
      showMessage("Player updated successfully!", "success");
    } else {
      await createPlayer(playerData);
      showMessage("Player created successfully!", "success");
    }

    resetForm();
    loadPlayers();
  } catch (error) {
    showMessage(error.message || "Error saving player.", "error");
  }
});

cancelEditBtn.addEventListener("click", () => {
  resetForm();
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "./login.html";
});

function checkAuth() {
  const token = localStorage.getItem("token");

  // Se o backend estiver sem [Authorize], isso pode ficar só como proteção visual
  if (!token) {
    alert("You need to login first.");
    window.location.href = "./login.html";
  }
}

async function loadPlayers() {
  try {
    const response = await fetch(`${API_URL}/players`, {
      method: "GET",
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error("Failed to load players.");
    }

    const players = await response.json();
    renderPlayers(players);
  } catch (error) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">Error loading players.</td>
      </tr>
    `;
  }
}

function renderPlayers(players) {
  if (!players.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">No players registered yet.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = players.map(player => `
    <tr>
      <td>${player.id}</td>
      <td>${player.name}</td>
      <td>${player.position}</td>
      <td>#${player.number}</td>
      <td>${player.height} cm</td>
      <td class="table-actions">
        <button class="action-btn edit-btn" data-id="${player.id}">Edit</button>
        <button class="action-btn delete-btn" data-id="${player.id}">Delete</button>
      </td>
    </tr>
  `).join("");

  document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const player = players.find(p => p.id == id);
      startEdit(player);
    });
  });

  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;

      if (!confirm("Are you sure you want to delete this player?")) return;

      try {
        await deletePlayer(id);
        showMessage("Player deleted successfully!", "success");
        loadPlayers();
      } catch (error) {
        showMessage(error.message || "Error deleting player.", "error");
      }
    });
  });
}

function startEdit(player) {
  isEditing = true;

  playerIdInput.value = player.id;
  nameInput.value = player.name;
  positionInput.value = player.position;
  numberInput.value = player.number;
  heightInput.value = player.height;

  formTitle.textContent = "Edit Player";
  saveBtn.textContent = "Update Player";
  cancelEditBtn.style.display = "inline-block";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetForm() {
  isEditing = false;
  form.reset();
  playerIdInput.value = "";

  formTitle.textContent = "Add New Player";
  saveBtn.textContent = "Save Player";
  cancelEditBtn.style.display = "none";
}

async function createPlayer(data) {
  const response = await fetch(`${API_URL}/players`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      name: data.name,
      position: data.position,
      number: data.number,
      height: data.height
    })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Error creating player.");
  }

  return result;
}

async function updatePlayer(id, data) {
  const response = await fetch(`${API_URL}/players/${id}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({
      name: data.name,
      position: data.position,
      number: data.number,
      height: data.height
    })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Error updating player.");
  }

  return result;
}

async function deletePlayer(id) {
  const response = await fetch(`${API_URL}/players/${id}`, {
    method: "DELETE",
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Error deleting player.");
  }

  return result;
}

function getHeaders() {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json"
  };

  // Se o [Authorize] estiver ativo no backend
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

function showMessage(msg, type) {
  const msgBox = document.getElementById("formMsg");

  msgBox.innerHTML = `
    <div class="form-message ${type}">
      ${msg}
    </div>
  `;

  setTimeout(() => {
    msgBox.innerHTML = "";
  }, 3000);
}