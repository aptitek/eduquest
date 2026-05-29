CREATE TYPE "public"."guild_recruitment_status" AS ENUM('open', 'invite_only', 'closed');--> statement-breakpoint
CREATE TYPE "public"."guild_invitation_status" AS ENUM('pending', 'accepted', 'declined', 'cancelled');--> statement-breakpoint
ALTER TABLE "guilds" ADD COLUMN IF NOT EXISTS "recruitment_status" "guild_recruitment_status" DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "guilds" ADD COLUMN IF NOT EXISTS "recruitment_message" text;--> statement-breakpoint
ALTER TABLE "guilds" ADD COLUMN IF NOT EXISTS "max_members" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "guild_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cohort_id" uuid NOT NULL,
	"guild_id" uuid NOT NULL,
	"inviter_user_id" uuid NOT NULL,
	"invitee_user_id" uuid NOT NULL,
	"status" "guild_invitation_status" DEFAULT 'pending' NOT NULL,
	"message" text,
	"responded_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "guild_invitations" ADD CONSTRAINT "guild_invitations_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_invitations" ADD CONSTRAINT "guild_invitations_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_invitations" ADD CONSTRAINT "guild_invitations_inviter_user_id_users_id_fk" FOREIGN KEY ("inviter_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_invitations" ADD CONSTRAINT "guild_invitations_invitee_user_id_users_id_fk" FOREIGN KEY ("invitee_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "guild_invitations_pending_invitee_idx" ON "guild_invitations" USING btree ("guild_id","invitee_user_id") WHERE "guild_invitations"."status" = 'pending';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guild_invitations_invitee_status_idx" ON "guild_invitations" USING btree ("invitee_user_id","status","created_at");
