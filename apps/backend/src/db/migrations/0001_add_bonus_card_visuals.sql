ALTER TABLE "progress_milestones" ADD COLUMN "reward_icon_key" text DEFAULT 'Gift' NOT NULL;--> statement-breakpoint
ALTER TABLE "progress_milestones" ADD COLUMN "reward_color" text;
