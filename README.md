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
- `apps/backend`: Cloudflare Worker API built with Hono, Drizzle ORM, D1, R2, JWT authentication, and management/game routes.
- `packages/shared`: Shared TypeScript interfaces and game contracts used by the frontend and backend.
- `Taskfile.yml`: Common development tasks for running, compiling, cleaning, and enforcing design rules.

## Current State

- Authentication supports GitHub SSO and local debug login.
- The management UI can load and update school, cohort, student, profile, invite, and logo data through backend routes.
- The map loads activities through `/api/map`, and activity completion is persisted through `/api/map/activities/:activityId/complete`.
- The dashboard dock and header notifications load through `/api/dashboard`, with database-backed gauge milestones, reward cards, and notification records.
- Drizzle database initialization includes demo seed data for schools, campuses, cohorts, guilds, users, students, memberships, characters, activities, gauges, rewards, and notifications.
- English and French locales cover the dashboard dock, milestones, rewards, buttons, notifications, management UI, auth UI, profile UI, and map/detail panel strings.
- Frontend design-token and Atomic Design boundaries are enforced by `apps/frontend/scripts/audit-design-system.mjs`.

## Prerequisites

- Node.js 22.22.3 is declared in `package.json` through Volta. Node 18+ may work, but Node 22 is the expected version.
- npm 9+.
- Task, optional but recommended: [taskfile.dev](https://taskfile.dev).
- Wrangler, installed through the root dev dependencies, for local Worker, D1, R2, and deployment commands.

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

## Docker Local Stack

Run the full local stack with PostgreSQL, automatic Drizzle migrations, the backend Worker, and the frontend:

```bash
docker compose up --build
```

Compose exposes the frontend at `http://localhost:5173`, the backend at `http://localhost:8787`, and PostgreSQL at `localhost:5432`. The database uses `eduquest` as database name, user, and password, and persists data in the `postgres_data` Docker volume.

The backend dev process applies pending Drizzle migrations before Wrangler starts, then watches `apps/backend/src/db/migrations` and applies new migration files automatically while Docker hot reload is running. To recreate the local database from scratch:

```bash
docker compose down -v
docker compose up --build
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

Create the backend local env file before starting Wrangler:

```bash
cp apps/backend/.dev.vars.example apps/backend/.dev.vars
```

Wrangler loads this file when the backend runs from `apps/backend`. Local development uses Wrangler's local D1 and R2 simulations by default.

Frontend values:

```bash
VITE_APP_ENV=development
VITE_BACKEND_BASE_URL=http://localhost:8787
VITE_ENABLE_DEV_TOOLS=true
```

For production frontend builds, set:

```bash
VITE_APP_ENV=production
VITE_BACKEND_BASE_URL=https://apti.space
VITE_ENABLE_DEV_TOOLS=false
```

Backend Worker values:

```bash
APP_ENV=development
JWT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_REDIRECT_URI=http://localhost:8787/api/auth/github/callback
FRONTEND_URL=http://localhost:5173
ENABLE_DEBUG_AUTH=true
```

Asset uploads use the Worker `ASSETS` R2 binding declared in `apps/backend/wrangler.toml`.
Wrangler dev uses a local R2 simulation by default, so profile pictures and school
logos can be uploaded locally without creating a real Cloudflare bucket. Uploaded
objects are served by the Worker at `/assets/<object-key>` locally unless
`ASSET_PUBLIC_BASE_URL` is set to a custom public bucket/CDN URL.

When `APP_ENV=production`, production API routes require real Cloudflare bindings and secrets such as `DB`, `ASSETS`, `JWT_SECRET`, and `FRONTEND_URL`; debug auth is disabled even if its flag is set.

Use `apps/frontend/.env.example` and `apps/backend/.dev.vars.example` as local starting points. Do not commit real `.env` or `.dev.vars` files.

## Cloudflare Deployment

GitHub Actions deploys the application with `.github/workflows/deploy-cloudflare.yml`. Pull requests run build and test validation. Pushes to `main` apply remote D1 migrations, deploy the backend Worker, build the production frontend, and upload `apps/frontend/dist` to Cloudflare Pages.

The production hostname is `https://apti.space`. Cloudflare Pages serves the frontend and owns Vite's `/assets/*` bundle paths. The Worker in `apps/backend/wrangler.toml` handles `apti.space/api/*`, including uploaded R2 assets under `/api/public-assets/*`.

Before the first CI deployment, create or verify the Cloudflare resources:

```bash
npm exec --workspace backend wrangler d1 create eduquest-db
npm exec --workspace backend wrangler r2 bucket create eduquest-assets
npm exec --workspace frontend wrangler pages project create eduquest --production-branch main
```

Copy the D1 database UUID returned by `wrangler d1 create` into `apps/backend/wrangler.toml` as `database_id`.

Set the Worker secrets:

```bash
npm exec --workspace backend wrangler secret put JWT_SECRET
npm exec --workspace backend wrangler secret put GITHUB_CLIENT_ID
npm exec --workspace backend wrangler secret put GITHUB_CLIENT_SECRET
npm exec --workspace backend wrangler secret put GITHUB_WEBHOOK_SECRET
```

`GITHUB_WEBHOOK_SECRET` is optional unless GitHub webhooks are enabled. Configure the GitHub OAuth callback URL as `https://apti.space/api/auth/github/callback`.

Add these GitHub repository secrets for Actions:

```bash
CLOUDFLARE_ACCOUNT_ID=<your-account-id>
CLOUDFLARE_API_TOKEN=<workers-pages-d1-r2-deploy-token>
```

The Cloudflare API token needs permissions to deploy Workers, deploy Pages, apply D1 migrations, and access the R2 bucket binding used by the Worker.

## Database

The backend schema lives in `apps/backend/src/db/schema.ts`.

Database initialization lives in `apps/backend/src/db/d1-migrations`. Because the app is not in production yet, this folder keeps a single current-schema initialization for D1.

The current schema cleanup and pre-production architecture notes are documented in `docs/database-architecture-audit.md`.

Generate new migrations after schema changes:

```bash
npm run db:generate --workspace backend
```

In development, `npm run dev --workspace backend` applies pending local D1 migrations on startup and watches `apps/backend/src/db/d1-migrations` for changes.

Backend production deploys run `npm run db:migrate:remote --workspace backend` before `wrangler deploy` through GitHub Actions. Keep `schema.ts`, D1 migrations, and shared types in sync.

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
