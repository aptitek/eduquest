<p align="center">
  <img src="./branding/aptipiou.svg" alt="Aptipiou Mascot" width="150" />
  <br />
  <img src="./branding/aptitek.svg" alt="Aptitek Logo" width="220" />
</p>

_French version: [README.fr.md](./README.fr.md)_

# EduQuest

EduQuest is a gamified learning management system built as a pedagogical role-playing game. Students progress through an activity map, join cohorts and guilds, complete quests and boss activities, and earn guild progress through a database-backed game state.

The repository is a TypeScript monorepo using npm workspaces.

## Project Structure

- `apps/frontend`: React SPA built with Vite, TypeScript, Tailwind CSS 3, DaisyUI 5, Zustand, Framer Motion, TanStack Table, and Lucide icons.
- `apps/backend`: Cloudflare Worker API built with Hono, Drizzle ORM, PostgreSQL, JWT authentication, and management/game routes.
- `packages/shared`: Shared TypeScript interfaces and game contracts used by the frontend and backend.
- `Taskfile.yml`: Common development tasks for running, compiling, cleaning, and enforcing design rules.

## Current State

- Authentication supports GitHub SSO and local debug login.
- The management UI can load and update school, cohort, student, profile, invite, and logo data through backend routes.
- The map loads activities through `/api/map`, and activity completion is persisted through `/api/map/activities/:activityId/complete`.
- The dashboard dock and header notifications load through `/api/dashboard`, with database-backed gauge milestones, reward cards, and notification records.
- Drizzle migrations include demo seed data for schools, campuses, cohorts, guilds, users, students, memberships, characters, activities, battles, gauges, rewards, and notifications.
- English and French locales cover the dashboard dock, milestones, rewards, buttons, notifications, management UI, auth UI, profile UI, and map/detail panel strings.
- Frontend design-token and Atomic Design boundaries are enforced by `apps/frontend/scripts/audit-design-system.mjs`.

## Prerequisites

- Node.js 22.22.3 is declared in `package.json` through Volta. Node 18+ may work, but Node 22 is the expected version.
- npm 9+.
- Task, optional but recommended: [taskfile.dev](https://taskfile.dev).
- Wrangler, installed through the root dev dependencies.
- PostgreSQL if you want to run against a real database. Without `DATABASE_URL`, the backend uses debug/mock fallback behavior.

## Installation

Install dependencies from the repository root:

```bash
npm install
```

## Development

Run both frontend and backend:

```bash
task run
```

Equivalent npm command:

```bash
npm run dev
```

Run only the backend Worker:

```bash
task run-backend
```

Run only the frontend:

```bash
task run-frontend
```

Open the frontend automatically:

```bash
task run-frontend-open
```

## Build And Checks

Build all workspaces that expose a build script:

```bash
npm run build
```

Build and type-check through the Taskfile:

```bash
task compile
```

Run the design-system and Atomic Design audit:

```bash
task lint
```

Backend type-check:

```bash
npx tsc --noEmit -p apps/backend/tsconfig.json
```

Frontend production build uses manual Vite chunks for React, Framer Motion, TanStack, and app code to avoid large bundle warnings.

## Environment

The app has explicit development and production deployment modes. Mock data and debug auth are only available when `APP_ENV`/`VITE_APP_ENV` are not `production`.

Frontend values:

```bash
VITE_APP_ENV=development
VITE_BACKEND_BASE_URL=http://localhost:8787
VITE_ENABLE_DEV_TOOLS=true
VITE_ENABLE_MOCK_DATA=true
```

For production frontend builds, set:

```bash
VITE_APP_ENV=production
VITE_BACKEND_BASE_URL=https://your-api.example.com
VITE_ENABLE_DEV_TOOLS=false
VITE_ENABLE_MOCK_DATA=false
```

Backend Worker values:

```bash
APP_ENV=development
DATABASE_URL=postgresql://...
JWT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_REDIRECT_URI=http://localhost:8787/api/auth/github/callback
FRONTEND_URL=http://localhost:5173
ENABLE_MOCK_DATA=true
ENABLE_DEBUG_AUTH=true
```

`DATABASE_URL` is optional only for development/mock deployments. When `APP_ENV=production`, production API routes require real bindings such as `DATABASE_URL`, `JWT_SECRET`, and `FRONTEND_URL`; mock data, mock auth, and debug backup endpoints are disabled even if their flags are set.

Use `apps/frontend/.env.example` and `apps/backend/.dev.vars.example` as local starting points. Do not commit real `.env` or `.dev.vars` files.

## Database

The backend schema lives in `apps/backend/src/db/schema.ts`.

Migrations live in `apps/backend/src/db/migrations`. They currently reconcile the project schema and seed deterministic demo data for local/dev environments.

Generate new migrations after schema changes:

```bash
npm run db:generate --workspace backend
```

Apply migrations using your deployment/local database workflow. Keep `schema.ts`, migrations, and shared types in sync.

## Code Guidelines

- Use shared types from `@eduquest/shared` for cross-app contracts.
- Keep business logic in `features`, `pages`, backend routes, or backend services. Reusable UI in `components` should stay as presentational as practical.
- Respect Atomic Design import direction: atoms must not import molecules/organisms/templates, molecules must not import organisms/templates, and organisms must not import templates.
- Use DaisyUI semantic components first, Tailwind utilities second, and custom components only when the local design requires them.
- Use semantic design tokens such as `gaming`, `text`, `status`, and `accent` classes. Do not add hardcoded hex or raw RGB values in TSX.
- Add new colors in `apps/frontend/src/styles/index.css` and expose them through `apps/frontend/tailwind.config.js`.
- Put all user-facing strings in `apps/frontend/src/locales/en.ts` and `apps/frontend/src/locales/fr.ts`.
- Run `task lint` before opening a PR or committing UI changes.

## Attribution

EduQuest is developed and maintained by [Aptitek](https://aptitek.io), founded by Antoine GREA.
