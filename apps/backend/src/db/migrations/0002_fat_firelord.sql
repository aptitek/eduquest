ALTER TABLE "schools" ADD COLUMN "email_domain" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "school_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "github_username" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "github_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "github_avatar" text;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;