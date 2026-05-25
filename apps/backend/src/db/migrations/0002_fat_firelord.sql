ALTER TABLE "schools" ADD COLUMN "email_domain" text;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "school_id" uuid;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "user_status" AS ENUM ('online', 'offline', 'busy');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email" text;--> statement-breakpoint
UPDATE "users" SET "email" = "github_email" WHERE "email" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "users" ("email");--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "github_username" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "github_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "github_avatar" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "first_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "display_name" text;--> statement-breakpoint
UPDATE "users" SET "display_name" = "github_name" WHERE "display_name" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "birth_date" date;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pronouns" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" text;--> statement-breakpoint
UPDATE "users" SET "avatar_url" = "github_avatar" WHERE "avatar_url" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "github_avatar_url" text;--> statement-breakpoint
UPDATE "users" SET "github_avatar_url" = "github_avatar" WHERE "github_avatar_url" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "user_status" "user_status" DEFAULT 'offline';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status_override" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;