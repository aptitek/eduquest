ALTER TABLE "milestone_bonus_votes" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;
