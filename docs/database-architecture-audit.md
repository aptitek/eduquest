# Database Architecture Audit

Date: 2026-05-28

## Scope

This audit covers the Drizzle schema in `apps/backend/src/db/schema.ts` and the consolidated database initialization in `apps/backend/src/db/migrations/0000_cloudy_invaders.sql`.

The application is not in production, so the migration history has been intentionally collapsed into a single current-schema initialization with deterministic mock data.

## Current State

The database now initializes from one Drizzle migration entry:

- `apps/backend/src/db/migrations/0000_cloudy_invaders.sql`
- `apps/backend/src/db/migrations/meta/0000_snapshot.json`
- `apps/backend/src/db/migrations/meta/_journal.json`

The schema currently contains 23 tables after cleanup:

- Identity and school domain: `users`, `students`, `schools`, `addresses`, `campuses`, `cohorts`, `cohort_memberships`, `cohort_invites`
- Game domain: `guilds`, `game_character_classes`, `game_characters`, `game_map_runs`, `game_activities`, `game_activity_edges`, `game_activity_completions`, `game_character_moves`
- Rewards and progress: `point_transactions`, `cohort_progress`, `progress_milestones`, `reward_balance_configs`
- Notifications and audit: `notifications`, `audit_logs`, `student_skills_history`

## Verification Summary

No duplicate table definitions were found in the consolidated initialization. The old transitional tables from previous migration paths are not present:

- `student_cohorts`
- `user_school_memberships`
- `global_gauges`
- `global_gauge_milestones`
- `cohort_reward_cards`
- `dashboard_notifications`

The legacy `game_battles` table was redundant with `game_activity_completions`. It was removed from `schema.ts`, the initialization SQL, the Drizzle snapshot, and the only remaining cleanup reference in `routes/map.ts`.

The following integrity and performance indexes were restored into the schema so the consolidated initialization keeps behavior that used to exist in historical migrations:

- `game_activity_edges_global_idx`: prevents duplicate reusable/global map edges where `cohort_id` and `map_run_id` are both null.
- `game_character_moves_student_scope_created_idx`: supports latest-position lookups by student, cohort, map run, and creation time.
- `reward_balance_configs_active_idx`: enforces only one active reward-balance configuration at a time.

Drizzle metadata was verified after these changes with `drizzle-kit check`.

## Clean Architecture Assessment

The database is clean enough for a pre-production baseline: the current schema is coherent, the migration path is collapsed, and the largest duplicate table has been removed.

There are still several areas worth improving before production.

### Identity And Student Modeling

`users` contains application profile fields and GitHub identity fields in the same table. This is fine while GitHub is the only identity provider, but it will become rigid if the app later supports email/password, Google, school SSO, or multiple linked GitHub accounts.

Recommended production shape:

- Keep `users` as the application account/profile root.
- Move provider-specific fields such as `github_email`, `github_username`, `github_sso_token`, and `github_avatar_url` into a `user_auth_accounts` table.
- Store provider tokens encrypted or avoid persisting them if they are only used during login.

`students` is currently a role/profile table with only `id`, `user_id`, and timestamps. That is not wrong, because it gives game tables a stable `student_id`, but the split should stay intentional. If no student-only fields are planned, `cohort_memberships.user_id` plus role flags may be simpler. If student profile data is planned, keep `students` and move student-only profile fields there.

### Progression Model

Progress state currently appears in several related concepts:

- `cohorts.current_step`
- `game_map_runs.current_sector_depth`
- `game_map_runs.fog_reveal_depth`
- `game_activities.required_level`
- `game_activities.sector_depth`
- `game_activities.step_ranges`

These fields are not exact duplicates, but they overlap. Before production, define one canonical progression axis and document how the others derive from it. A cleaner model would treat `game_map_runs` as the runtime state and `game_activities` as map content, with cohort-level fields limited to administrative cohort metadata.

### Activity Metadata

`game_activities.metadata` currently stores structured concepts such as boss configuration, unlock rules, answer fields, and seed/source data. JSONB is useful while the product is changing, but it makes validation, indexing, and querying harder.

Recommended next step:

- Keep `metadata` for low-value display hints and experimental fields.
- Promote stable concepts into typed columns or child tables once they become product contracts.
- Add application-level schema validation for the JSON that remains.

Likely candidates for typed modeling are `answerFields`, `unlockRule`, and boss submission settings.

### Rewards And Balances

`guilds.gold` is a cached balance, while `point_transactions` is the ledger. This is a common pattern, but it must be protected from drift.

Recommended production safeguards:

- Treat `point_transactions` as the source of truth.
- Update `guilds.gold` only inside the same transaction that inserts ledger rows.
- Add periodic reconciliation or a database view that can compare cached balance to ledger sum.
- Consider a `balance_snapshots` table if history or rollback matters.

### Constraints And Indexes

The most important uniqueness constraints are now present, but several query patterns would benefit from additional indexes before larger datasets:

- `game_activities(cohort_id, map_run_id)` for map loading and activity admin operations.
- `game_activity_edges(cohort_id, map_run_id)` for scoped edge loading.
- `game_activity_completions(activity_id)` for activity deletion and cleanup.
- `game_character_moves(to_activity_id)` and `game_character_moves(from_activity_id)` for activity deletion and movement cleanup.
- `cohort_invites(cohort_id, created_at)` for invite listing.
- `cohort_memberships(user_id, created_at)` for current-membership selection.
- `point_transactions(guild_id, created_at)` and possibly `(activity_id, student_id, transaction_type)` for reward ledger queries.

These should be added based on measured query plans once realistic data volumes are seeded.

### Notifications And Audit

`notifications` allows either a cohort scope, a guild scope, both, or neither. That may be useful for global notifications, but the scope should be explicit before production.

Recommended options:

- Add a `scope_type` enum such as `global`, `cohort`, `guild`.
- Add database check constraints that ensure valid combinations of `scope_type`, `cohort_id`, and `guild_id`.

`audit_logs` stores table name and record ID as generic fields. This is flexible, but it cannot enforce referential integrity to the changed record. That is acceptable for an audit trail, but action names should become an enum once the audit model stabilizes.

### Naming And Domain Consistency

The schema mostly follows clear domain boundaries. A few names should be standardized before production:

- Use either `cohort` everywhere or introduce a user-facing `class` term only at the API/UI boundary.
- Standardize progression wording: `step`, `level`, `sector_depth`, and `required_level` currently carry related but different meanings.
- Standardize guild visual fields: `icon_url`, `icon_key`, and `color` mix uploaded assets, icon library keys, semantic tokens, and raw hex values.

## Recommended Priority

1. Keep the current single initialization while the app is pre-production.
2. Add additional high-value indexes once query plans or realistic seed volumes confirm them.
3. Decide whether `students` is a durable domain entity or just a role marker.
4. Split provider authentication from `users` before adding another identity provider.
5. Promote stable `game_activities.metadata` fields into typed tables or validated JSON schemas.
6. Add explicit notification scope constraints.
7. Define a single canonical progression model and derive UI-specific fields from it.

## Verification Commands

Run these after database-schema changes:

```bash
npm exec --workspace backend -- drizzle-kit check --config drizzle.config.ts
npx tsc --noEmit -p apps/backend/tsconfig.json
git diff --check -- apps/backend/src/db apps/backend/src/routes docs
```
