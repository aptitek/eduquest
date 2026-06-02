-- Add map reveal columns separately from the initial schema so existing D1 databases
-- that already applied 0000 can be migrated forward.

ALTER TABLE cohorts ADD COLUMN current_step integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE game_activities ADD COLUMN step_ranges text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE game_activities ADD COLUMN card_color text;
--> statement-breakpoint
ALTER TABLE game_map_runs ADD COLUMN fog_reveal_depth integer DEFAULT 1 NOT NULL;
