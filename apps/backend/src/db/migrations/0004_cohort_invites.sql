CREATE TABLE IF NOT EXISTS "addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"line_1" text NOT NULL,
	"line_2" text,
	"postal_code" text,
	"city" text NOT NULL,
	"country" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"address_id" uuid,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cohorts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"campus_id" uuid,
	"school_year" text NOT NULL,
	"grade" text NOT NULL,
	"level" integer NOT NULL,
	"name" text NOT NULL,
	"major_speciality" text,
	"minor_speciality" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "campuses" ADD CONSTRAINT "campuses_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "campuses" ADD CONSTRAINT "campuses_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "guilds" ADD COLUMN IF NOT EXISTS "cohort_id" uuid;
--> statement-breakpoint
ALTER TABLE "guilds" ADD COLUMN IF NOT EXISTS "total_points" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "guilds" ADD CONSTRAINT "guilds_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "student_cohorts" (
	"student_id" uuid NOT NULL,
	"cohort_id" uuid NOT NULL,
	"guild_id" uuid,
	"institutional_email" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "student_cohorts_student_id_cohort_id_pk" PRIMARY KEY("student_id","cohort_id"),
	CONSTRAINT "student_cohorts_institutional_email_unique" UNIQUE("institutional_email")
);
--> statement-breakpoint
ALTER TABLE "student_cohorts" ADD CONSTRAINT "student_cohorts_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "student_cohorts" ADD CONSTRAINT "student_cohorts_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "student_cohorts" ADD CONSTRAINT "student_cohorts_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "cohort_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cohort_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "cohort_invites" ADD CONSTRAINT "cohort_invites_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;
