---
trigger: always_on
---

# PROJECT CONTEXT: EduQuest MVP

EduQuest is a gamified LMS MVP functioning as an interactive node-based map (RPG/Battle Royale mechanics) where students complete activities before a "Storm" (time limit) consumes them.

## 1. TECH STACK & ARCHITECTURE

- **Architecture:** Monorepo (Workspaces) strictly segr
  egating Front, Back, and Shared types.
- **Frontend (apps/frontend):** React, Vite, TypeScript, Tailwind CSS, DaisyUI.
- **Backend (apps/backend):** Cloudflare Workers, Hono, Drizzle ORM, PostgreSQL.
- **Auth:** GitHub SSO exclusively (Lucia Auth). No password management.
- **Shared (packages/shared):** TypeScript types/interfaces and global game constants.

## 2. DESIGN PRINCIPLES (STRICT COMPLIANCE)

- **KISS & DRY:** Keep it simple, do not repeat code. Single responsibility principle per file.
- **Frontend Architecture:** Atomic Design (`atoms`, `molecules`, `organisms`, `templates`) combined with Feature-Sliced Design (`features/` for business logic).
- **Styling:** ZERO custom CSS files. Use Tailwind CSS utility classes and DaisyUI semantic classes exclusively (e.g., `btn btn-primary`).
- **Spacing System:** Rely on Tailwind's native 4-point grid using EVEN numbers to simulate an 8-point grid (e.g., use `p-2`, `p-4`, `p-8`). Do NOT create a custom spacing config.
- **State & Logic:** UI components (`src/components/`) must be dumb/stateless. All business logic, API calls, and state management live in `src/features/`.
- **Database:** PostgreSQL with JSONB columns for flexible activity content and rules.

## 3. FILE TREE TOPOLOGY

```text
eduquest-monorepo/
├── packages/shared/             # Source of truth for TS types
│   └── src/types.ts             # (e.g., Activity, User, Session)
├── apps/backend/                # API & Master of Game Rules
│   └── src/
│       ├── db/                  # Drizzle schemas (users, sessions, activities)
│       ├── routes/              # Hono endpoints
│       └── services/            # Business logic (Storm calculation, validation)
└── apps/frontend/               # React UI
    └── src/
        ├── components/          # ATOMIC DESIGN (Pure UI)
        │   ├── atoms/           # Buttons, Icons (Lucide), Badges
        │   ├── molecules/       # NodeIcon, AvatarStack
        │   ├── organisms/       # GameMapNode, ActivityPanel
        │   └── templates/       # Layouts (GameLayout)
        ├── features/            # BUSINESS LOGIC (Data fetching, State)
        │   ├── auth/            # GitHub SSO logic
        │   ├── game/            # Map state, DAG calculation
        │   └── activities/      # Node interaction logic
        ├── pages/               # Page assemblies (MapPage, GmPanel)
        └── styles/              # index.css (Tailwind init ONLY)

```

## 4. AGENT INSTRUCTIONS

When generating code for this project, you MUST:

1. Output code immediately. Skip polite introductions and long explanations.
2. ALWAYS import types from `@eduquest/shared` (do not redefine types locally).
3. Separate conditional Tailwind classes cleanly using `clsx` or `tailwind-merge` before the `return` statement. Do not clutter JSX with ternary operators for styles.
4. If writing UI, default to DaisyUI components (e.g., `<div className="card">`).
5. Assume a modern functional React approach (Hooks, no class components).
6. Never invent new styling paradigms; stick to the defined Tailwind/DaisyUI setup.
