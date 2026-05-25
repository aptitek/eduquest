DO $$ BEGIN
  CREATE TYPE "game_target_attribute" AS ENUM ('force', 'dexterity', 'constitution', 'intelligence', 'wisdom');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "game_activities"
  ADD COLUMN IF NOT EXISTS "base_points" integer DEFAULT 0 NOT NULL;

ALTER TABLE "game_activities"
  ADD COLUMN IF NOT EXISTS "target_attribute" "game_target_attribute";

ALTER TABLE "game_activities"
  ADD COLUMN IF NOT EXISTS "unlock_rule" jsonb DEFAULT '{}';

CREATE TABLE IF NOT EXISTS "global_gauges" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "cohort_id" uuid NOT NULL REFERENCES "cohorts"("id") ON DELETE CASCADE,
  "milestone_name" text NOT NULL,
  "current_points" integer DEFAULT 0 NOT NULL,
  "target_points" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "global_gauge_milestones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "gauge_id" uuid NOT NULL REFERENCES "global_gauges"("id") ON DELETE CASCADE,
  "label_i18n_key" text NOT NULL,
  "description_i18n_key" text,
  "position_percent" integer,
  "value" integer,
  "sort_order" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "cohort_reward_cards" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "cohort_id" uuid NOT NULL REFERENCES "cohorts"("id") ON DELETE CASCADE,
  "title_i18n_key" text NOT NULL,
  "subtitle_i18n_key" text,
  "accent_token" text DEFAULT 'quest' NOT NULL,
  "face_down" boolean DEFAULT false NOT NULL,
  "sort_order" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "dashboard_notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "cohort_id" uuid REFERENCES "cohorts"("id") ON DELETE CASCADE,
  "title_i18n_key" text NOT NULL,
  "description_i18n_key" text,
  "meta_i18n_key" text,
  "icon" text DEFAULT 'info' NOT NULL,
  "tone" text DEFAULT 'neutral' NOT NULL,
  "action_label_i18n_key" text,
  "action_target" text,
  "sort_order" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
