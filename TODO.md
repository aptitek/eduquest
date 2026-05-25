# TODO

This file tracks the remaining project backlog. Completed items are kept only when they describe important shipped capabilities.

## Completed

[x] GitHub/mock authentication flow works and skips the login page when an in-memory or persisted session is valid.
[x] Frontend uses Atomic Design folders with design-token and atomic-boundary enforcement via `npm run audit:design --workspace frontend` and `task lint`.
[x] DaisyUI semantic colors are mapped to the project CSS token system.
[x] Dashboard dock, bonus cards, milestones, buttons, and notifications are internationalized in English and French.
[x] Dashboard and map data are wired to authenticated backend APIs with database-backed routes and mock fallback.
[x] Database schema and migrations cover schools, campuses, cohorts, guilds, users, students, memberships, characters, activities, battles, dashboard gauges, reward cards, and notifications.
[x] Demo database seed data is included in migrations with stable UUIDs.
[x] Vite production chunks are split to avoid the large bundle warning.
[x] Reusable UI pieces exist for status indicators, editable text, badge dropdowns, editable avatars/logos, hold-to-confirm buttons, editable cards, management tables, profile cards, and school/cohort detail cards.
[x] Profile data supports first name, last name, display name, editable avatar reset, email, birth date, pronouns, bio, institutional email, school membership, and admin/student role display.

## Infrastructure

[ ] Add focused unit/integration tests for auth, management updates, dashboard API, map activity completion, and design-system audit rules.
[ ] Add a CI workflow that runs `task lint`, frontend build, backend type-check, and tests.
[ ] Add a deployment workflow for the backend Cloudflare Worker.
[ ] Add a deployment workflow for the frontend hosting target.
[ ] Document and automate database migration execution for local and deployed environments.

## Frontend And Design System

[ ] Add loading skeletons for every API-backed organism that still renders empty states directly.
[ ] Persist the selected locale per user and infer the initial locale from browser settings before falling back to French.
[ ] Render missing translation keys in a visible debug style during development.
[ ] Continue replacing decorative emoji text with Lucide icons or localized plain text in app UI.
[ ] Move remaining feature/store/API access out of presentational components where practical.

## Account And Profile

[ ] Add manual user status controls in the header for online, offline, and busy states.
[ ] Keep the profile card strictly institutional: no gamified visual elements inside the profile surface.
[ ] Replace the account header menu with the profile card when a user opens their profile.
[ ] Store uploaded avatar assets in a durable storage backend instead of only data URLs.

## Admin And Management

[ ] Add create/update/delete routes for schools, campuses, cohorts, guilds, activities, dashboard gauges, reward cards, and notifications.
[ ] Add dedicated Users and Schools admin pages if the current tabbed management page is not enough.
[ ] Support adding empty rows/cards for new users and schools with disabled confirmation until a valid change exists.
[ ] Add role-aware safeguards and tests for all management endpoints.
