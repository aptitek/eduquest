ALTER TABLE "users" DROP COLUMN IF EXISTS "status_override";
--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN IF NOT EXISTS "start_year" integer;
--> statement-breakpoint
UPDATE "cohorts"
SET "start_year" = COALESCE(
  "start_year",
  NULLIF(substring("school_year" from '^[0-9]{4}'), '')::integer
)
WHERE "start_year" IS NULL;
--> statement-breakpoint
ALTER TABLE "cohorts" ALTER COLUMN "start_year" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "cohorts" DROP COLUMN IF EXISTS "school_year";
--> statement-breakpoint
ALTER TABLE "guilds" ADD COLUMN IF NOT EXISTS "gold" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE "guilds" SET "gold" = COALESCE("total_points", 0);
--> statement-breakpoint
ALTER TABLE "guilds" DROP COLUMN IF EXISTS "total_points";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cohort_memberships" (
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "cohort_id" uuid NOT NULL REFERENCES "cohorts"("id") ON DELETE CASCADE,
  "guild_id" uuid REFERENCES "guilds"("id") ON DELETE set null,
  "institutional_email" text UNIQUE,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "cohort_memberships_user_id_cohort_id_pk" PRIMARY KEY("user_id","cohort_id")
);
--> statement-breakpoint
INSERT INTO "cohort_memberships" ("user_id", "cohort_id", "guild_id", "institutional_email", "created_at")
SELECT "students"."user_id", "student_cohorts"."cohort_id", "student_cohorts"."guild_id", "student_cohorts"."institutional_email", "student_cohorts"."created_at"
FROM "student_cohorts"
INNER JOIN "students" ON "students"."id" = "student_cohorts"."student_id"
ON CONFLICT ("user_id", "cohort_id") DO UPDATE SET
  "guild_id" = EXCLUDED."guild_id",
  "institutional_email" = EXCLUDED."institutional_email";
--> statement-breakpoint
ALTER TABLE "students" DROP COLUMN IF EXISTS "school_id";
--> statement-breakpoint
DROP TABLE IF EXISTS "user_school_memberships";
--> statement-breakpoint
DROP TABLE IF EXISTS "student_cohorts";
--> statement-breakpoint
DO $$ BEGIN
  ALTER TYPE "game_target_attribute" ADD VALUE IF NOT EXISTS 'strength';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TYPE "game_target_attribute" ADD VALUE IF NOT EXISTS 'charisma';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "game_character_classes" ADD COLUMN IF NOT EXISTS "base_strength" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "game_character_classes" ADD COLUMN IF NOT EXISTS "base_dexterity" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "game_character_classes" ADD COLUMN IF NOT EXISTS "base_constitution" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "game_character_classes" ADD COLUMN IF NOT EXISTS "base_intelligence" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "game_character_classes" ADD COLUMN IF NOT EXISTS "base_wisdom" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "game_character_classes" ADD COLUMN IF NOT EXISTS "base_charisma" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE "game_character_classes" SET
  "base_strength" = CASE "slug" WHEN 'champion' THEN 3 WHEN 'specialist' THEN 1 ELSE 0 END,
  "base_dexterity" = CASE "slug" WHEN 'guide' THEN 3 WHEN 'specialist' THEN 1 ELSE 0 END,
  "base_constitution" = CASE "slug" WHEN 'champion' THEN 2 ELSE 0 END,
  "base_intelligence" = CASE "slug" WHEN 'scholar' THEN 3 WHEN 'specialist' THEN 2 ELSE 0 END,
  "base_wisdom" = CASE "slug" WHEN 'guide' THEN 2 WHEN 'scholar' THEN 1 ELSE 0 END,
  "base_charisma" = CASE "slug" WHEN 'guide' THEN 1 WHEN 'champion' THEN 1 ELSE 0 END;
--> statement-breakpoint
ALTER TABLE "game_characters" ADD COLUMN IF NOT EXISTS "strength" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_characters' AND column_name = 'force'
  ) THEN
    UPDATE "game_characters" SET "strength" = "force";
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "game_characters" DROP COLUMN IF EXISTS "force";
--> statement-breakpoint
ALTER TABLE "game_characters" DROP COLUMN IF EXISTS "current_level";
--> statement-breakpoint
DROP TABLE IF EXISTS "game_decks";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cohort_progress" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "cohort_id" uuid NOT NULL REFERENCES "cohorts"("id") ON DELETE CASCADE,
  "label_i18n_key" text NOT NULL,
  "current_points" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
INSERT INTO "cohort_progress" ("id", "cohort_id", "label_i18n_key", "current_points", "created_at", "updated_at")
SELECT "id", "cohort_id", "milestone_name", "current_points", "created_at", "updated_at"
FROM "global_gauges"
ON CONFLICT ("id") DO UPDATE SET
  "label_i18n_key" = EXCLUDED."label_i18n_key",
  "current_points" = EXCLUDED."current_points",
  "updated_at" = EXCLUDED."updated_at";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "progress_milestones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "progress_id" uuid NOT NULL REFERENCES "cohort_progress"("id") ON DELETE CASCADE,
  "label_i18n_key" text NOT NULL,
  "description_i18n_key" text,
  "cost" integer NOT NULL,
  "reward_title_i18n_key" text NOT NULL,
  "reward_subtitle_i18n_key" text,
  "reward_accent_token" text DEFAULT 'quest' NOT NULL,
  "sort_order" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
WITH milestone_rows AS (
  SELECT
    "global_gauge_milestones".*,
    "global_gauges"."cohort_id",
    row_number() OVER (PARTITION BY "global_gauges"."cohort_id" ORDER BY "global_gauge_milestones"."sort_order") AS rn
  FROM "global_gauge_milestones"
  INNER JOIN "global_gauges" ON "global_gauges"."id" = "global_gauge_milestones"."gauge_id"
),
reward_rows AS (
  SELECT
    "cohort_reward_cards".*,
    row_number() OVER (PARTITION BY "cohort_reward_cards"."cohort_id" ORDER BY "cohort_reward_cards"."sort_order") AS rn
  FROM "cohort_reward_cards"
)
INSERT INTO "progress_milestones" (
  "id",
  "progress_id",
  "label_i18n_key",
  "description_i18n_key",
  "cost",
  "reward_title_i18n_key",
  "reward_subtitle_i18n_key",
  "reward_accent_token",
  "sort_order",
  "created_at"
)
SELECT
  milestone_rows."id",
  milestone_rows."gauge_id",
  milestone_rows."label_i18n_key",
  milestone_rows."description_i18n_key",
  COALESCE(milestone_rows."value", milestone_rows."position_percent", 0),
  COALESCE(reward_rows."title_i18n_key", milestone_rows."label_i18n_key"),
  reward_rows."subtitle_i18n_key",
  COALESCE(reward_rows."accent_token", 'quest'),
  milestone_rows."sort_order",
  milestone_rows."created_at"
FROM milestone_rows
LEFT JOIN reward_rows
  ON reward_rows."cohort_id" = milestone_rows."cohort_id"
  AND reward_rows.rn = milestone_rows.rn
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "cohort_id" uuid REFERENCES "cohorts"("id") ON DELETE CASCADE,
  "guild_id" uuid REFERENCES "guilds"("id") ON DELETE CASCADE,
  "title_i18n_key" text NOT NULL,
  "description_i18n_key" text,
  "icon" text DEFAULT 'info' NOT NULL,
  "tone" text DEFAULT 'neutral' NOT NULL,
  "action_label_i18n_key" text,
  "action_target" text,
  "sort_order" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
INSERT INTO "notifications" ("id", "cohort_id", "title_i18n_key", "description_i18n_key", "icon", "tone", "action_label_i18n_key", "action_target", "sort_order", "created_at", "updated_at")
SELECT "id", "cohort_id", "title_i18n_key", "description_i18n_key", "icon", "tone", "action_label_i18n_key", "action_target", "sort_order", "created_at", "updated_at"
FROM "dashboard_notifications"
ON CONFLICT ("id") DO UPDATE SET
  "title_i18n_key" = EXCLUDED."title_i18n_key",
  "description_i18n_key" = EXCLUDED."description_i18n_key",
  "icon" = EXCLUDED."icon",
  "tone" = EXCLUDED."tone",
  "action_label_i18n_key" = EXCLUDED."action_label_i18n_key",
  "action_target" = EXCLUDED."action_target",
  "sort_order" = EXCLUDED."sort_order",
  "updated_at" = EXCLUDED."updated_at";
--> statement-breakpoint
DROP TABLE IF EXISTS "dashboard_notifications";
--> statement-breakpoint
DROP TABLE IF EXISTS "cohort_reward_cards";
--> statement-breakpoint
DROP TABLE IF EXISTS "global_gauge_milestones";
--> statement-breakpoint
DROP TABLE IF EXISTS "global_gauges";
