ALTER TABLE "cohorts" ADD COLUMN IF NOT EXISTS "registration_open" boolean DEFAULT false NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "cohorts_registration_open_idx" ON "cohorts" ("registration_open") WHERE "cohorts"."registration_open" = true;
