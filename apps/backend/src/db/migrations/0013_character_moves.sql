DO $$ BEGIN
  CREATE TYPE "game_character_move_type" AS ENUM ('enter', 'move');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "game_character_moves" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "student_id" uuid NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
  "cohort_id" uuid NOT NULL REFERENCES "cohorts"("id") ON DELETE CASCADE,
  "map_run_id" uuid NOT NULL REFERENCES "game_map_runs"("id") ON DELETE CASCADE,
  "from_activity_id" uuid REFERENCES "game_activities"("id") ON DELETE SET NULL,
  "to_activity_id" uuid NOT NULL REFERENCES "game_activities"("id") ON DELETE CASCADE,
  "move_type" "game_character_move_type" DEFAULT 'move' NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "game_character_moves_student_scope_created_idx"
  ON "game_character_moves" ("student_id", "cohort_id", "map_run_id", "created_at" DESC);
