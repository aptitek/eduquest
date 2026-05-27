CREATE TYPE "game_activity_participation_mode" AS ENUM ('solo', 'guild');
--> statement-breakpoint
ALTER TABLE "game_activities" ADD COLUMN IF NOT EXISTS "card_color" text;
--> statement-breakpoint
ALTER TABLE "game_activities" ADD COLUMN IF NOT EXISTS "participation_mode" "game_activity_participation_mode" DEFAULT 'solo' NOT NULL;
