CREATE TABLE "game_bonus_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cohort_id" uuid NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"description" text,
	"cost" integer DEFAULT 0 NOT NULL,
	"accent_token" text DEFAULT 'quest' NOT NULL,
	"icon_key" text DEFAULT 'Gift' NOT NULL,
	"illustration_url" text,
	"color" text,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
INSERT INTO "game_bonus_cards" (
	"id",
	"cohort_id",
	"title",
	"subtitle",
	"description",
	"cost",
	"accent_token",
	"icon_key",
	"illustration_url",
	"color",
	"sort_order",
	"created_at",
	"updated_at"
)
SELECT
	pm."id",
	cp."cohort_id",
	pm."reward_title_i18n_key",
	pm."reward_subtitle_i18n_key",
	pm."description_i18n_key",
	pm."cost",
	pm."reward_accent_token",
	coalesce(pm."reward_icon_key", 'Gift'),
	pm."reward_illustration_url",
	pm."reward_color",
	pm."sort_order",
	pm."created_at",
	now()
FROM "progress_milestones" pm
INNER JOIN "cohort_progress" cp ON cp."id" = pm."progress_id";
--> statement-breakpoint
CREATE TABLE "milestone_bonus_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"milestone_id" uuid NOT NULL,
	"bonus_card_id" uuid NOT NULL,
	"guild_id" uuid NOT NULL,
	"vote_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "progress_milestones" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now();
--> statement-breakpoint
ALTER TABLE "progress_milestones" DROP COLUMN IF EXISTS "reward_title_i18n_key";
--> statement-breakpoint
ALTER TABLE "progress_milestones" DROP COLUMN IF EXISTS "reward_subtitle_i18n_key";
--> statement-breakpoint
ALTER TABLE "progress_milestones" DROP COLUMN IF EXISTS "reward_accent_token";
--> statement-breakpoint
ALTER TABLE "progress_milestones" DROP COLUMN IF EXISTS "reward_icon_key";
--> statement-breakpoint
ALTER TABLE "progress_milestones" DROP COLUMN IF EXISTS "reward_illustration_url";
--> statement-breakpoint
ALTER TABLE "progress_milestones" DROP COLUMN IF EXISTS "reward_color";
--> statement-breakpoint
ALTER TABLE "game_bonus_cards" ADD CONSTRAINT "game_bonus_cards_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "milestone_bonus_votes" ADD CONSTRAINT "milestone_bonus_votes_milestone_id_progress_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."progress_milestones"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "milestone_bonus_votes" ADD CONSTRAINT "milestone_bonus_votes_bonus_card_id_game_bonus_cards_id_fk" FOREIGN KEY ("bonus_card_id") REFERENCES "public"."game_bonus_cards"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "milestone_bonus_votes" ADD CONSTRAINT "milestone_bonus_votes_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "milestone_bonus_votes_guild_milestone_idx" ON "milestone_bonus_votes" USING btree ("guild_id","milestone_id");
