ALTER TABLE "cohorts" ADD COLUMN IF NOT EXISTS "current_step" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "cohorts" DROP COLUMN IF EXISTS "current_level";
--> statement-breakpoint
ALTER TABLE "cohorts" DROP COLUMN IF EXISTS "storm_level";
--> statement-breakpoint
ALTER TABLE "game_activities" ADD COLUMN IF NOT EXISTS "step_ranges" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
UPDATE "game_activities"
SET "step_ranges" = jsonb_build_array(
  jsonb_build_object('startStep', GREATEST(COALESCE("required_level", 1) - 1, 0))
)
WHERE "step_ranges" = '[]'::jsonb;
