# 🏐 Volleyball System

<p align="center">
  <img alt="HTML5" src="https://img.shields.io/badge/Frontend-HTML5%20%7C%20CSS3%20%7C%20JavaScript-blue?style=for-the-badge">
  <img alt="ASP.NET Core" src="https://img.shields.io/badge/Backend-ASP.NET%20Core%20Web%20API-purple?style=for-the-badge">
  <img alt="Status" src="https://img.shields.io/badge/Status-In%20Progress-22c55e?style=for-the-badge">
  <img alt="Focus" src="https://img.shields.io/badge/Focus-Authentication%20%2B%20CRUD-orange?style=for-the-badge">
</p>

<p align="center">
  A full stack web project built to practice <strong>authentication flow</strong>, <strong>frontend-backend integration</strong>, and a scalable foundation for future <strong>CRUD modules</strong>.
</p>

---

## 📌 About the Project

**Volleyball System** is a full stack practice project created to simulate the initial architecture of a sports management platform.

The main goal of this project was not only to make a login system work, but to build a **clean, organized, and scalable structure** that can evolve into a complete management application.

At this stage, the project already includes:

- ✅ Home page
- ✅ Sign Up flow
- ✅ Login flow
- ✅ Token storage with `localStorage`
- ✅ Protected Dashboard
- ✅ Logout functionality
- ✅ Frontend and backend separation
- ✅ Modular code structure for future expansion

The next milestone is implementing a complete **CRUD system** for:

- Players
- Teams
- Matches

---

## 🧱 Tech Stack

### Frontend
- **HTML5**
- **CSS3**
- **JavaScript (ES6 Modules)**

### Backend
- **ASP.NET Core Web API**
- **C#**
- **REST API principles**

### Concepts Practiced
- Frontend and backend separation
- Authentication flow
- API integration with `fetch`
- DTO-based request handling
- Route protection (client-side)
- CORS configuration
- Token persistence with `localStorage`
- Project modularization for scalability

---

## 🗂️ Project Structure

```bash
volleyball-system/
│
├── src/
│   ├── backend/
│   │   ├── Controllers/
│   │   │   └── AuthController.cs
│   │   ├── Data/
│   │   │   └── ApplicationDbContext.cs
│   │   ├── Dtos/
│   │   │   ├── LoginDto.cs
│   │   │   └── RegisterDto.cs
│   │   ├── Models/
│   │   │   └── User.cs
│   │   ├── Services/
│   │   │   └── TokenService.cs
│   │   ├── Program.cs
│   │   ├── appsettings.json
│   │   └── Properties/
│   │       └── launchSettings.json
│   │
│   └── frontend/
│       ├── assets/
│       │   └── images/
│       │       ├── login-bg.png
│       │       └── signup-bg.png
│       │
│       ├── css/
│       │   ├── styles.css
│       │   ├── login.css
│       │   ├── signup.css
│       │   └── dashboard.css
│       │
│       ├── js/
│       │   ├── config.js
│       │   ├── auth.js
│       │   ├── login.js
│       │   ├── signup.js
│       │   └── dashboard.js
│       │
│       ├── pages/
│       │   ├── login.html
│       │   ├── sign.html
│       │   └── dashboard.html
│       │
│       └── index.html
│
├── .gitignore
└── README.md
