ALTER TABLE "game_activities" ADD COLUMN "x" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "game_activities" ADD COLUMN "y" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "game_activities" ADD COLUMN "required_level" integer DEFAULT 1 NOT NULL;