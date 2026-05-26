DO $$ BEGIN
  CREATE TYPE "game_map_run_status" AS ENUM ('active', 'completed', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "game_activity_completion_type" AS ENUM ('read', 'submission', 'battle', 'system');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "game_map_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "cohort_id" uuid NOT NULL REFERENCES "cohorts"("id") ON DELETE CASCADE,
  "current_sector_depth" integer DEFAULT 0 NOT NULL,
  "fog_reveal_depth" integer DEFAULT 1 NOT NULL,
  "status" "game_map_run_status" DEFAULT 'active' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "game_map_runs_active_cohort_idx"
  ON "game_map_runs" ("cohort_id")
  WHERE "status" = 'active';
--> statement-breakpoint
ALTER TABLE "game_activities" ADD COLUMN IF NOT EXISTS "cohort_id" uuid REFERENCES "cohorts"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "game_activities" ADD COLUMN IF NOT EXISTS "template_activity_id" uuid REFERENCES "game_activities"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "game_activities" ADD COLUMN IF NOT EXISTS "map_run_id" uuid REFERENCES "game_map_runs"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "game_activities" ADD COLUMN IF NOT EXISTS "map_x" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "game_activities" ADD COLUMN IF NOT EXISTS "map_y" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "game_activities" ADD COLUMN IF NOT EXISTS "sector_depth" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "game_activities" ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_activities' AND column_name = 'x'
  ) THEN
    UPDATE "game_activities" SET "map_x" = "x";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_activities' AND column_name = 'y'
  ) THEN
    UPDATE "game_activities" SET "map_y" = "y";
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_activities' AND column_name = 'unlock_rule'
  ) THEN
    UPDATE "game_activities"
    SET "metadata" = COALESCE("metadata", '{}'::jsonb)
      || jsonb_strip_nulls(jsonb_build_object(
        'unlockRule',
        CASE WHEN COALESCE("unlock_rule", '{}'::jsonb) = '{}'::jsonb THEN NULL ELSE "unlock_rule" END
      ));
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_activities' AND column_name = 'boss_metadata'
  ) THEN
    UPDATE "game_activities"
    SET "metadata" = COALESCE("metadata", '{}'::jsonb)
      || jsonb_strip_nulls(jsonb_build_object(
        'boss',
        CASE WHEN COALESCE("boss_metadata", '{}'::jsonb) = '{}'::jsonb THEN NULL ELSE "boss_metadata" END
      ));
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "game_activity_edges" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "cohort_id" uuid REFERENCES "cohorts"("id") ON DELETE CASCADE,
  "map_run_id" uuid REFERENCES "game_map_runs"("id") ON DELETE CASCADE,
  "from_activity_id" uuid NOT NULL REFERENCES "game_activities"("id") ON DELETE CASCADE,
  "to_activity_id" uuid NOT NULL REFERENCES "game_activities"("id") ON DELETE CASCADE,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "game_activity_edges_global_idx"
  ON "game_activity_edges" ("from_activity_id", "to_activity_id")
  WHERE "cohort_id" IS NULL AND "map_run_id" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "game_activity_edges_scope_idx"
  ON "game_activity_edges" ("from_activity_id", "to_activity_id", "cohort_id", "map_run_id");
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_activities' AND column_name = 'unlock_rule'
  ) THEN
    INSERT INTO "game_activity_edges" ("from_activity_id", "to_activity_id", "metadata")
    SELECT DISTINCT prereq."id", activity."id", '{"source":"unlockRule"}'::jsonb
    FROM "game_activities" activity
    CROSS JOIN LATERAL jsonb_array_elements_text(
      COALESCE(activity."unlock_rule"->'requiredCompletedActivities', '[]'::jsonb)
    ) AS prereq_text("value")
    INNER JOIN "game_activities" prereq
      ON prereq."id" = CASE
        WHEN prereq_text."value" ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN prereq_text."value"::uuid
        ELSE NULL
      END
    WHERE prereq_text."value" ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "game_activity_completions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "student_id" uuid NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
  "cohort_id" uuid NOT NULL REFERENCES "cohorts"("id") ON DELETE CASCADE,
  "activity_id" uuid NOT NULL REFERENCES "game_activities"("id") ON DELETE CASCADE,
  "completion_type" "game_activity_completion_type" DEFAULT 'read' NOT NULL,
  "grade" double precision,
  "work_url" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "game_activity_completions_student_cohort_activity_idx"
  ON "game_activity_completions" ("student_id", "cohort_id", "activity_id");
--> statement-breakpoint
INSERT INTO "game_activity_completions" (
  "id",
  "student_id",
  "cohort_id",
  "activity_id",
  "completion_type",
  "grade",
  "work_url",
  "created_at",
  "updated_at"
)
SELECT DISTINCT ON (battle."student_id", membership."cohort_id", battle."activity_id")
  battle."id",
  battle."student_id",
  membership."cohort_id",
  battle."activity_id",
  CASE WHEN activity."is_graded" THEN 'battle'::"game_activity_completion_type" ELSE 'read'::"game_activity_completion_type" END,
  battle."grade",
  battle."work_url",
  battle."created_at",
  battle."created_at"
FROM "game_battles" battle
INNER JOIN "students" student ON student."id" = battle."student_id"
INNER JOIN "cohort_memberships" membership ON membership."user_id" = student."user_id"
INNER JOIN "game_activities" activity ON activity."id" = battle."activity_id"
WHERE battle."student_id" IS NOT NULL
  AND battle."activity_id" IS NOT NULL
ORDER BY battle."student_id", membership."cohort_id", battle."activity_id", membership."created_at" DESC
ON CONFLICT DO NOTHING;
