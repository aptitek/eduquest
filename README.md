<p align="center">
  <img src="./branding/aptipiou.svg" alt="Aptipiou Mascot" width="150" />
  <br />
  <img src="./branding/aptitek.svg" alt="Aptitek Logo" width="220" />
</p>

🌐 _[Version française](./README.fr.md)_

# EduQuest 🎮📚

EduQuest is a gamified learning management system (LMS) designed as a pedagogical role-playing game.

This repository is structured as a monorepo using **npm Workspaces**.

## 📂 Monorepo Structure

- **`packages/shared`** : 📦 Shared TypeScript types and game constants used across both the frontend and backend (e.g., user structures, XP calculations, quests).
- **`apps/backend`** : ⚙️ Backend API implemented as a Cloudflare Worker using **Hono** and **Drizzle ORM** (connecting to a PostgreSQL database).
- **`apps/frontend`** : 🎮 Client-side React application (SPA) built with **Vite**, **TypeScript**, **Tailwind CSS v4** for the interface, **Zustand** for game state, and **Framer Motion** for animations.

---

## 🛠️ Getting Started & Development

Dependencies are installed and automatically linked at the root level.

### Prerequisites

- **Node.js** (v18+)
- **npm** (v9+)

### Installation

Install all project dependencies from the root:

```bash
npm install
```

### Global Commands

- **Start in development mode (Frontend & Backend)**:
  ```bash
  npm run dev
  ```

* **Build all applications and packages**:
  ```bash
  npm run build
  ```

---

## 🏗️ Architecture & Design System (Frontend)

The frontend application follows **Atomic Design** principles inside `apps/frontend/src/components`:

1.  **Atoms** : Basic UI components with no internal logic (e.g., button, XP badge, avatar).
2.  **Molecules** : Combinations of atoms (e.g., quest progress bar, icon row).
3.  **Organisms** : Complex, interactive blocks (e.g., interactive game map, inventory sidebar).
4.  **Templates** : Reusable page skeleton layouts (e.g., game layout with status bar).

Business logic is decoupled and managed inside the `features/` directory:

- `auth/` : User session and role management (Player vs. Game Master).
- `game/` : Progression map rendering engine, movement, and game loop.
- `activities/` : Validation logic for lessons, boss fights, and XP rewards.
- `gamemaster/` : Teacher tools to modify the map or view statistics.

---

## 🎨 Attribution

This project is proudly developed and maintained by **[Aptitek](https://aptitek.io)** (founded by **Antoine GRÉA**).

For more information or to collaborate on AI, development, and no-code training, visit **[aptitek.io](https://aptitek.io)**! 🐣💻
