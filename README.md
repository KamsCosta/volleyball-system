<h1 align="center">🏐 Volleyball System</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Em%20desenvolvimento-22c55e?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Vers%C3%A3o-1.0-A855F7?style=for-the-badge" />
  <img src="https://img.shields.io/github/last-commit/KamsCosta/volleyball-system?style=for-the-badge&color=blue" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/C%23-239120?style=for-the-badge&logo=c-sharp&logoColor=white" />
  <img src="https://img.shields.io/badge/.NET-512BD4?style=for-the-badge&logo=dotnet&logoColor=white" />
</p>

<p align="center">
  <a href="#-sobre-o-projeto">Sobre</a> •
  <a href="#-funcionalidades">Funcionalidades</a> •
  <a href="#%EF%B8%8F-tecnologias">Tecnologias</a> •
  <a href="#-como-executar">Como Executar</a> •
  <a href="#%EF%B8%8F-estrutura">Estrutura</a> •
  <a href="#-roadmap">Roadmap</a> •
  <a href="#-english-version">English</a>
</p>

---

## 📌 Sobre o Projeto

**Volleyball System** é uma aplicação fullstack em desenvolvimento que simula a arquitetura inicial de uma plataforma de gestão esportiva para times de vôlei.

O foco principal vai além de fazer um login funcionar: o objetivo foi construir uma **estrutura limpa, organizada e escalável**, capaz de evoluir para uma aplicação completa de gestão.

> 💡 Este projeto começou como [`volleyball-login`](https://github.com/KamsCosta/volleyball-login) (apenas a tela de login) e evoluiu para um sistema fullstack completo.

---

## ✨ Funcionalidades

### Implementadas
- ✅ Página inicial (Home)
- ✅ Cadastro de usuários (Sign Up)
- ✅ Autenticação com login
- ✅ Armazenamento de token via `localStorage`
- ✅ Dashboard protegido por autenticação
- ✅ Logout funcional
- ✅ Separação clara entre frontend e backend
- ✅ Estrutura modular preparada para expansão

### Em desenvolvimento (CRUD)
- 🔜 Gerenciamento de **Jogadores**
- 🔜 Gerenciamento de **Times**
- 🔜 Gerenciamento de **Partidas**

---

## 🖼️ Preview

<p align="center">
  <em>📸 Em breve: prints das telas serão adicionados aqui</em>
</p>

<!-- 
Quando tiver os prints, substitua por:
<p align="center">
  <img src="docs/images/login.png" alt="Tela de Login" width="600"/>
  <br/>
  <em>Tela de Login</em>
</p>

<p align="center">
  <img src="docs/images/dashboard.png" alt="Dashboard" width="600"/>
  <br/>
  <em>Dashboard</em>
</p>
-->

---

## 🛠️ Tecnologias

### Frontend
- **HTML5** — estrutura semântica
- **CSS3** — estilização e responsividade
- **JavaScript (ES6 Modules)** — lógica e integração com API

### Backend
- **ASP.NET Core Web API** — framework do backend
- **C#** — linguagem principal
- **Princípios REST** — arquitetura da API

### Conceitos Aplicados
- Separação de responsabilidades entre frontend e backend
- Fluxo de autenticação com tokens
- Integração com API via `fetch`
- Tratamento de requisições com **DTOs**
- Proteção de rotas no client-side
- Configuração de **CORS**
- Persistência de token com `localStorage`
- Modularização do projeto para escalabilidade

---

## 🚀 Como Executar

### Pré-requisitos
- [.NET SDK 6.0+](https://dotnet.microsoft.com/download)
- Navegador moderno (Chrome, Firefox, Edge)
- [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) (extensão do VS Code, recomendado)

### Passo a passo

```bash
# 1. Clone o repositório
git clone https://github.com/KamsCosta/volleyball-system.git

# 2. Entre na pasta do projeto
cd volleyball-system

# 3. Execute o backend
cd src/backend
dotnet restore
dotnet run

# 4. Em outro terminal, abra o frontend
# Recomendado: usar a extensão Live Server no VS Code
# em src/frontend/index.html
```

O backend ficará disponível em `http://localhost:5000` (ou a porta configurada).

---

## 🗂️ Estrutura

```
volleyball-system/
│
├── src/
│   ├── backend/
│   │   ├── Controllers/        # Endpoints da API
│   │   │   └── AuthController.cs
│   │   ├── Data/               # Contexto do banco
│   │   │   └── ApplicationDbContext.cs
│   │   ├── Dtos/               # Objetos de transferência
│   │   │   ├── LoginDto.cs
│   │   │   └── RegisterDto.cs
│   │   ├── Models/             # Modelos de domínio
│   │   │   └── User.cs
│   │   ├── Services/           # Regras de negócio
│   │   │   └── TokenService.cs
│   │   └── Program.cs
│   │
│   └── frontend/
│       ├── assets/             # Imagens e recursos
│       ├── css/                # Estilos por página
│       ├── js/                 # Scripts modulares
│       ├── pages/              # HTMLs internos
│       └── index.html
│
├── .gitignore
└── README.md
```

---

## 🗺️ Roadmap

- [x] Estrutura base do projeto
- [x] Sistema de autenticação completo
- [x] Dashboard protegido
- [ ] CRUD de Jogadores
- [ ] CRUD de Times
- [ ] CRUD de Partidas
- [ ] Sistema de pontuação automática
- [ ] Dashboard com estatísticas

---

## 📚 Aprendizados

Este projeto foi fundamental para consolidar conhecimentos em:
- Arquitetura fullstack
- Comunicação entre frontend e backend via API REST
- Boas práticas de organização de código
- Fluxos de autenticação modernos

---

## 👩‍💻 Autora

<p>
  <a href="https://github.com/KamsCosta">
    <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" />
  </a>
  <a href="https://www.linkedin.com/in/SEU-USUARIO-AQUI/">
    <img src="https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" />
  </a>
</p>

Feito com 💜 por **Kamila Costa**

---

<br>

# 🇺🇸 English Version

## 📌 About the Project

**Volleyball System** is a fullstack application in development that simulates the initial architecture of a sports management platform for volleyball teams.

The main goal goes beyond making a login work: the focus was on building a **clean, organized, and scalable structure** capable of evolving into a complete management application.

> 💡 This project started as [`volleyball-login`](https://github.com/KamsCosta/volleyball-login) (just the login screen) and evolved into a full fullstack system.

## ✨ Features

### Implemented
- ✅ Home page
- ✅ User registration (Sign Up)
- ✅ Login authentication
- ✅ Token storage with `localStorage`
- ✅ Protected Dashboard
- ✅ Logout functionality
- ✅ Frontend and backend separation
- ✅ Modular structure for scalability

### In progress (CRUD)
- 🔜 **Players** management
- 🔜 **Teams** management
- 🔜 **Matches** management

## 🛠️ Tech Stack

**Frontend:** HTML5, CSS3, JavaScript (ES6 Modules)
**Backend:** ASP.NET Core Web API, C#, REST API principles

## 🚀 How to Run

```bash
# Clone the repository
git clone https://github.com/KamsCosta/volleyball-system.git

# Enter the project folder
cd volleyball-system

# Run the backend
cd src/backend
dotnet restore
dotnet run

# Open the frontend with Live Server in VS Code
# pointing to src/frontend/index.html
```

## 🗺️ Roadmap

- [x] Base project structure
- [x] Full authentication system
- [x] Protected dashboard
- [ ] Players CRUD
- [ ] Teams CRUD
- [ ] Matches CRUD
- [ ] Automatic scoring system
- [ ] Statistics dashboard

---

<p align="center">Made with 💜 by <a href="https://github.com/KamsCosta">Kamila Costa</a></p>
