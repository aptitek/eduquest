DO $$ BEGIN
  CREATE TYPE "game_activity_type" AS ENUM (
    'onboarding',
    'character_creation',
    'tavern',
    'tutorial',
    'ice_breaker',
    'campfire',
    'quiz',
    'practical',
    'mini_boss',
    'boss'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'game_activities'
      AND column_name = 'type'
      AND udt_name <> 'game_activity_type'
  ) THEN
    ALTER TABLE "game_activities"
      ALTER COLUMN "type" TYPE "game_activity_type"
      USING (
        CASE "type"
          WHEN 'onboarding' THEN 'onboarding'
          WHEN 'character_creation' THEN 'character_creation'
          WHEN 'tavern' THEN 'tavern'
          WHEN 'tutorial' THEN 'tutorial'
          WHEN 'ice_breaker' THEN 'ice_breaker'
          WHEN 'campfire' THEN 'campfire'
          WHEN 'quiz' THEN 'quiz'
          WHEN 'practical' THEN 'practical'
          WHEN 'mini_boss' THEN 'mini_boss'
          WHEN 'boss' THEN 'boss'
          WHEN 'quest' THEN 'practical'
          ELSE 'practical'
        END
      )::"game_activity_type";
  END IF;
END $$;
