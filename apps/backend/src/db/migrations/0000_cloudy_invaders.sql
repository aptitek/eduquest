CREATE TYPE "public"."game_activity_completion_type" AS ENUM('read', 'submission', 'battle', 'system');--> statement-breakpoint
CREATE TYPE "public"."game_activity_participation_mode" AS ENUM('solo', 'guild');--> statement-breakpoint
CREATE TYPE "public"."game_activity_type" AS ENUM('onboarding', 'character_creation', 'tavern', 'tutorial', 'ice_breaker', 'campfire', 'quiz', 'practical', 'mini_boss', 'boss');--> statement-breakpoint
CREATE TYPE "public"."game_character_move_type" AS ENUM('enter', 'move');--> statement-breakpoint
CREATE TYPE "public"."game_map_run_status" AS ENUM('active', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."game_target_attribute" AS ENUM('strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma');--> statement-breakpoint
CREATE TYPE "public"."point_transaction_type" AS ENUM('EARNED', 'SPENT_VOTE', 'MANUAL_BONUS');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('online', 'offline', 'busy');--> statement-breakpoint
CREATE TABLE "addresses" (
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
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_name" text NOT NULL,
	"record_id" uuid NOT NULL,
	"action" text NOT NULL,
	"old_data" jsonb,
	"new_data" jsonb,
	"user_id" uuid,
	"changed_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "campuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"address_id" uuid,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
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
CREATE TABLE "cohort_memberships" (
	"user_id" uuid NOT NULL,
	"cohort_id" uuid NOT NULL,
	"guild_id" uuid,
	"institutional_email" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "cohort_memberships_user_id_cohort_id_pk" PRIMARY KEY("user_id","cohort_id"),
	CONSTRAINT "cohort_memberships_institutional_email_unique" UNIQUE("institutional_email")
);
--> statement-breakpoint
CREATE TABLE "cohort_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cohort_id" uuid NOT NULL,
	"label_i18n_key" text NOT NULL,
	"current_points" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cohorts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"campus_id" uuid,
	"start_year" integer NOT NULL,
	"grade" text NOT NULL,
	"level" integer NOT NULL,
	"current_step" integer DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"major_speciality" text,
	"minor_speciality" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "game_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cohort_id" uuid,
	"template_activity_id" uuid,
	"map_run_id" uuid,
	"type" "game_activity_type" NOT NULL,
	"title" text NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"url" text,
	"is_graded" boolean DEFAULT false NOT NULL,
	"map_x" integer DEFAULT 0 NOT NULL,
	"map_y" integer DEFAULT 0 NOT NULL,
	"sector_depth" integer DEFAULT 0 NOT NULL,
	"required_level" integer DEFAULT 1 NOT NULL,
	"step_ranges" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"card_color" text,
	"participation_mode" "game_activity_participation_mode" DEFAULT 'solo' NOT NULL,
	"base_points" integer DEFAULT 0 NOT NULL,
	"target_attribute" "game_target_attribute",
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "game_activity_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"cohort_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"completion_type" "game_activity_completion_type" DEFAULT 'read' NOT NULL,
	"grade" double precision,
	"work_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "game_activity_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cohort_id" uuid,
	"map_run_id" uuid,
	"from_activity_id" uuid NOT NULL,
	"to_activity_id" uuid NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "game_character_classes" (
	"slug" text PRIMARY KEY NOT NULL,
	"name_i18n_key" text NOT NULL,
	"base_strength" integer DEFAULT 0 NOT NULL,
	"base_dexterity" integer DEFAULT 0 NOT NULL,
	"base_constitution" integer DEFAULT 0 NOT NULL,
	"base_intelligence" integer DEFAULT 0 NOT NULL,
	"base_wisdom" integer DEFAULT 0 NOT NULL,
	"base_charisma" integer DEFAULT 0 NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "game_character_moves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"cohort_id" uuid NOT NULL,
	"map_run_id" uuid NOT NULL,
	"from_activity_id" uuid,
	"to_activity_id" uuid NOT NULL,
	"move_type" "game_character_move_type" DEFAULT 'move' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "game_characters" (
	"student_id" uuid PRIMARY KEY NOT NULL,
	"character_class" text DEFAULT 'scholar' NOT NULL,
	"strength" integer DEFAULT 0 NOT NULL,
	"dexterity" integer DEFAULT 0 NOT NULL,
	"constitution" integer DEFAULT 0 NOT NULL,
	"intelligence" integer DEFAULT 0 NOT NULL,
	"wisdom" integer DEFAULT 0 NOT NULL,
	"charisma" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "game_map_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cohort_id" uuid NOT NULL,
	"current_sector_depth" integer DEFAULT 0 NOT NULL,
	"fog_reveal_depth" integer DEFAULT 1 NOT NULL,
	"status" "game_map_run_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "guilds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cohort_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon_url" text,
	"icon_key" text,
	"color" text,
	"gold" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cohort_id" uuid,
	"guild_id" uuid,
	"title_i18n_key" text NOT NULL,
	"description_i18n_key" text,
	"icon" text DEFAULT 'info' NOT NULL,
	"tone" text DEFAULT 'neutral' NOT NULL,
	"action_label_i18n_key" text,
	"action_target" text,
	"context" jsonb,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "point_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guild_id" uuid NOT NULL,
	"student_id" uuid,
	"activity_id" uuid,
	"amount" integer NOT NULL,
	"transaction_type" "point_transaction_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "progress_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"progress_id" uuid NOT NULL,
	"label_i18n_key" text NOT NULL,
	"description_i18n_key" text,
	"cost" integer NOT NULL,
	"reward_title_i18n_key" text NOT NULL,
	"reward_subtitle_i18n_key" text,
	"reward_accent_token" text DEFAULT 'quest' NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reward_balance_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer NOT NULL,
	"label" text,
	"config" jsonb NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"effective_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"website" text,
	"email_domain" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "student_skills_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid,
	"skills" jsonb NOT NULL,
	"evaluated_at" timestamp with time zone DEFAULT now(),
	"evaluated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "students_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"github_email" text NOT NULL,
	"email" text NOT NULL,
	"github_sso_token" text,
	"github_username" text,
	"first_name" text,
	"last_name" text,
	"display_name" text,
	"birth_date" date,
	"pronouns" text,
	"bio" text,
	"avatar_url" text,
	"github_avatar_url" text,
	"user_status" "user_status" DEFAULT 'offline',
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"last_login" timestamp with time zone,
	CONSTRAINT "users_github_email_unique" UNIQUE("github_email"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_github_username_unique" UNIQUE("github_username")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campuses" ADD CONSTRAINT "campuses_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campuses" ADD CONSTRAINT "campuses_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cohort_invites" ADD CONSTRAINT "cohort_invites_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cohort_memberships" ADD CONSTRAINT "cohort_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cohort_memberships" ADD CONSTRAINT "cohort_memberships_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cohort_memberships" ADD CONSTRAINT "cohort_memberships_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cohort_progress" ADD CONSTRAINT "cohort_progress_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_campus_id_campuses_id_fk" FOREIGN KEY ("campus_id") REFERENCES "public"."campuses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_activities" ADD CONSTRAINT "game_activities_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_activities" ADD CONSTRAINT "game_activities_template_activity_id_game_activities_id_fk" FOREIGN KEY ("template_activity_id") REFERENCES "public"."game_activities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_activities" ADD CONSTRAINT "game_activities_map_run_id_game_map_runs_id_fk" FOREIGN KEY ("map_run_id") REFERENCES "public"."game_map_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_activity_completions" ADD CONSTRAINT "game_activity_completions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_activity_completions" ADD CONSTRAINT "game_activity_completions_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_activity_completions" ADD CONSTRAINT "game_activity_completions_activity_id_game_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."game_activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_activity_edges" ADD CONSTRAINT "game_activity_edges_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_activity_edges" ADD CONSTRAINT "game_activity_edges_map_run_id_game_map_runs_id_fk" FOREIGN KEY ("map_run_id") REFERENCES "public"."game_map_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_activity_edges" ADD CONSTRAINT "game_activity_edges_from_activity_id_game_activities_id_fk" FOREIGN KEY ("from_activity_id") REFERENCES "public"."game_activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_activity_edges" ADD CONSTRAINT "game_activity_edges_to_activity_id_game_activities_id_fk" FOREIGN KEY ("to_activity_id") REFERENCES "public"."game_activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_character_moves" ADD CONSTRAINT "game_character_moves_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_character_moves" ADD CONSTRAINT "game_character_moves_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_character_moves" ADD CONSTRAINT "game_character_moves_map_run_id_game_map_runs_id_fk" FOREIGN KEY ("map_run_id") REFERENCES "public"."game_map_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_character_moves" ADD CONSTRAINT "game_character_moves_from_activity_id_game_activities_id_fk" FOREIGN KEY ("from_activity_id") REFERENCES "public"."game_activities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_character_moves" ADD CONSTRAINT "game_character_moves_to_activity_id_game_activities_id_fk" FOREIGN KEY ("to_activity_id") REFERENCES "public"."game_activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_characters" ADD CONSTRAINT "game_characters_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_characters" ADD CONSTRAINT "game_characters_character_class_game_character_classes_slug_fk" FOREIGN KEY ("character_class") REFERENCES "public"."game_character_classes"("slug") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "game_map_runs" ADD CONSTRAINT "game_map_runs_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guilds" ADD CONSTRAINT "guilds_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_activity_id_game_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."game_activities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_milestones" ADD CONSTRAINT "progress_milestones_progress_id_cohort_progress_id_fk" FOREIGN KEY ("progress_id") REFERENCES "public"."cohort_progress"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_balance_configs" ADD CONSTRAINT "reward_balance_configs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_skills_history" ADD CONSTRAINT "student_skills_history_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_skills_history" ADD CONSTRAINT "student_skills_history_evaluated_by_users_id_fk" FOREIGN KEY ("evaluated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "game_activity_completions_student_cohort_activity_idx" ON "game_activity_completions" USING btree ("student_id","cohort_id","activity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "game_activity_edges_global_idx" ON "game_activity_edges" USING btree ("from_activity_id","to_activity_id") WHERE "game_activity_edges"."cohort_id" IS NULL AND "game_activity_edges"."map_run_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "game_activity_edges_scope_idx" ON "game_activity_edges" USING btree ("from_activity_id","to_activity_id","cohort_id","map_run_id");--> statement-breakpoint
CREATE INDEX "game_character_moves_student_scope_created_idx" ON "game_character_moves" USING btree ("student_id","cohort_id","map_run_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "game_map_runs_active_cohort_idx" ON "game_map_runs" USING btree ("cohort_id") WHERE "game_map_runs"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "reward_balance_configs_active_idx" ON "reward_balance_configs" USING btree ("is_active") WHERE "reward_balance_configs"."is_active" = true;--> statement-breakpoint
CREATE OR REPLACE FUNCTION uppercase_user_last_name()
RETURNS trigger AS $$
BEGIN
  IF NEW."last_name" IS NOT NULL THEN
    NEW."last_name" := upper(NEW."last_name");
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER users_uppercase_last_name
BEFORE INSERT OR UPDATE OF "last_name" ON "users"
FOR EACH ROW
EXECUTE FUNCTION uppercase_user_last_name();--> statement-breakpoint
INSERT INTO "game_character_classes" ("slug", "name_i18n_key", "base_strength", "base_dexterity", "base_constitution", "base_intelligence", "base_wisdom", "base_charisma", "sort_order", "created_at") VALUES
  ('scholar', 'game.characterClasses.scholar', 0, 0, 0, 3, 1, 0, 10, '2026-01-01'),
  ('champion', 'game.characterClasses.champion', 3, 0, 2, 0, 0, 1, 20, '2026-01-01'),
  ('guide', 'game.characterClasses.guide', 0, 3, 0, 0, 2, 1, 30, '2026-01-01'),
  ('specialist', 'game.characterClasses.specialist', 1, 1, 0, 2, 0, 0, 40, '2026-01-01');--> statement-breakpoint
INSERT INTO "addresses" ("id", "line_1", "postal_code", "city", "country", "created_at", "updated_at") VALUES
  ('20000000-0000-4000-8000-000000000001', '10 rue de la Tech', '75001', 'Paris', 'France', '2026-01-01', now()),
  ('20000000-0000-4000-8000-000000000002', '42 quai des Algorithmes', '69002', 'Lyon', 'France', '2026-01-01', now());--> statement-breakpoint
INSERT INTO "schools" ("id", "name", "website", "email_domain", "created_at", "updated_at") VALUES
  ('10000000-0000-4000-8000-000000000001', 'Aptitek', 'https://aptitek.io', 'aptitek.io', '2026-01-01', now()),
  ('10000000-0000-4000-8000-000000000002', 'Polyforge Institute', 'https://polyforge.example', 'polyforge.school', '2026-01-01', now());--> statement-breakpoint
INSERT INTO "campuses" ("id", "school_id", "address_id", "name", "created_at", "updated_at") VALUES
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Paris', '2026-01-01', now()),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Lyon', '2026-01-01', now());--> statement-breakpoint
INSERT INTO "cohorts" ("id", "school_id", "campus_id", "start_year", "grade", "level", "current_step", "name", "major_speciality", "minor_speciality", "description", "created_at", "updated_at") VALUES
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 2025, 'bachelor', 3, 3, 'Frontend Mages', 'Frontend', 'UX', 'Interface craft, accessibility, and client-side quests.', '2026-01-01', now()),
  ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 2026, 'master', 1, 1, 'Fullstack Rangers', 'Fullstack', 'DevOps', 'API design, deployment raids, and product-grade delivery.', '2026-01-01', now()),
  ('40000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 2024, 'engineer', 5, 9, 'Data Alchemists', 'Data', 'AI', 'Analytics, model evaluation, and data-heavy boss battles.', '2026-01-01', now()),
  ('40000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 2027, 'bachelor', 1, 0, 'Cloud Apprentices', 'Cloud', 'Foundations', 'A newly invited cohort that has not started profile cards or character creation yet.', '2026-09-01', now());--> statement-breakpoint
INSERT INTO "guilds" ("id", "cohort_id", "name", "description", "color", "icon_key", "gold", "created_at", "updated_at") VALUES
  ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Solarized Sentinels', 'Guardians of consistent UI systems.', 'quest', 'Shield', 180, '2026-01-01', now()),
  ('50000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', 'Crimson Compilers', 'Backend raiders who never leave failing checks behind.', 'danger', 'Code2', 168, '2026-01-01', now()),
  ('50000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', 'Violet Oracles', 'Data interpreters and probability mages.', 'specialist', 'Brain', 132, '2026-01-01', now()),
  ('50000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000001', 'Azure Artificers', 'Component crafters who specialize in accessibility and polish.', '#2aa198', 'Sparkles', 124, '2026-01-03', now()),
  ('50000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000001', 'Amber Animators', 'Motion-minded UI raiders focused on careful interaction details.', '#b58900', 'WandSparkles', 96, '2026-01-03', now()),
  ('50000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000003', 'Obsidian Oracles', 'Advanced analytics guild forecasting every boss mechanic.', '#586e75', 'BrainCircuit', 420, '2026-01-03', now()),
  ('50000000-0000-4000-8000-000000000007', '40000000-0000-4000-8000-000000000003', 'Golden Gradients', 'Visualization specialists turning findings into guild momentum.', '#b58900', 'LineChart', 365, '2026-01-03', now()),
  ('50000000-0000-4000-8000-000000000008', '40000000-0000-4000-8000-000000000003', 'Neon Nulls', 'Data quality sentinels who catch edge cases before release.', '#2aa198', 'Bug', 310, '2026-01-03', now()),
  ('50000000-0000-4000-8000-000000000009', '40000000-0000-4000-8000-000000000003', 'Crimson Clusters', 'Modeling party optimized for difficult collaborative battles.', '#dc322f', 'Network', 288, '2026-01-03', now());--> statement-breakpoint
INSERT INTO "users" ("id", "github_email", "email", "github_sso_token", "github_username", "first_name", "last_name", "display_name", "birth_date", "pronouns", "bio", "avatar_url", "github_avatar_url", "user_status", "is_admin", "created_at", "updated_at") VALUES
  ('60000000-0000-4000-8000-000000000001', 'lina.morel@github.test', 'lina.morel@github.test', 'debug-token-lina', 'lina-morel', 'Lina', 'MOREL', 'Lina MOREL', '2001-04-12', 'she, her', 'Frontend apprentice who likes polishing tiny UI states.', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80', 'online', false, '2026-01-01', now()),
  ('60000000-0000-4000-8000-000000000002', 'samir.benali@github.test', 'samir.benali@github.test', 'debug-token-samir', 'samir-benali', 'Samir', 'BENALI', 'Samir BENALI', '1999-11-03', 'he, him', 'Fullstack ranger focused on API contracts and deployment rituals.', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80', 'busy', false, '2026-01-01', now()),
  ('60000000-0000-4000-8000-000000000003', 'admin@aptitek.io', 'admin@aptitek.io', 'debug-token-admin', 'aptitek-admin', 'Aptitek', 'ADMIN', 'Aptitek ADMIN', null, null, null, null, null, 'online', true, '2026-01-01', now());--> statement-breakpoint
INSERT INTO "users" ("id", "github_email", "email", "github_sso_token", "github_username", "first_name", "last_name", "display_name", "birth_date", "pronouns", "bio", "avatar_url", "github_avatar_url", "user_status", "is_admin", "created_at", "updated_at")
SELECT
  ('61000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  lower(first_name || '.' || last_name || '@github.test'),
  lower(first_name || '.' || last_name || '@github.test'),
  'debug-token-frontend-' || i,
  lower(first_name || '-' || last_name),
  first_name,
  upper(last_name),
  first_name || ' ' || upper(last_name),
  ('2000-01-01'::date + (i || ' months')::interval)::date,
  CASE WHEN i % 3 = 0 THEN 'they, them' WHEN i % 3 = 1 THEN 'she, her' ELSE 'he, him' END,
  'Frontend Mages generated profile focused on UI quests and collaborative review.',
  'https://api.dicebear.com/9.x/personas/svg?seed=frontend-' || i,
  'https://api.dicebear.com/9.x/personas/svg?seed=frontend-' || i,
  CASE WHEN i % 4 = 0 THEN 'busy' ELSE 'online' END::"user_status",
  false,
  '2026-01-04',
  now()
FROM generate_series(1, 16) AS series(i)
CROSS JOIN LATERAL (
  SELECT
    (ARRAY['Maya','Noe','Iris','Theo','Lea','Adam','Nina','Eli','Zoe','Hugo','Mila','Yanis','Sara','Nolan','Jade','Omar'])[i] AS first_name,
    (ARRAY['Durand','Petit','Roux','Lambert','Garcia','Robert','Moreau','Simon','Fournier','Girard','Lefevre','Mercier','Bonnet','Dupont','Renaud','Garnier'])[i] AS last_name
) names;--> statement-breakpoint
INSERT INTO "users" ("id", "github_email", "email", "github_sso_token", "github_username", "user_status", "is_admin", "created_at", "updated_at")
SELECT
  ('62000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  'cloud.apprentice.' || lpad(i::text, 2, '0') || '@github.test',
  'cloud.apprentice.' || lpad(i::text, 2, '0') || '@github.test',
  'debug-token-cloud-' || i,
  'cloud-apprentice-' || lpad(i::text, 2, '0'),
  'offline'::"user_status",
  false,
  '2026-09-01',
  now()
FROM generate_series(1, 12) AS series(i);--> statement-breakpoint
INSERT INTO "users" ("id", "github_email", "email", "github_sso_token", "github_username", "first_name", "last_name", "display_name", "birth_date", "pronouns", "bio", "avatar_url", "github_avatar_url", "user_status", "is_admin", "created_at", "updated_at")
SELECT
  ('63000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  lower(first_name || '.' || last_name || '@github.test'),
  lower(first_name || '.' || last_name || '@github.test'),
  'debug-token-data-' || i,
  lower(first_name || '-' || last_name),
  first_name,
  upper(last_name),
  first_name || ' ' || upper(last_name),
  ('1999-01-01'::date + (i || ' months')::interval)::date,
  CASE WHEN i % 4 = 0 THEN 'they, them' WHEN i % 4 = 1 THEN 'she, her' ELSE 'he, him' END,
  'Advanced Data Alchemists profile with boss battles, guild strategy, and analytics delivery.',
  'https://api.dicebear.com/9.x/personas/svg?seed=data-' || i,
  'https://api.dicebear.com/9.x/personas/svg?seed=data-' || i,
  CASE WHEN i % 5 = 0 THEN 'busy' ELSE 'online' END::"user_status",
  false,
  '2026-01-04',
  now()
FROM generate_series(1, 28) AS series(i)
CROSS JOIN LATERAL (
  SELECT
    (ARRAY['Ana','Basile','Camille','Dario','Elise','Farah','Gabin','Hana','Ismael','Julia','Karim','Lise','Martin','Nora','Oscar','Paula','Quentin','Romy','Sacha','Tara','Ulysse','Vera','Wassim','Xenia','Yara','Zack','Adele','Brice'])[i] AS first_name,
    (ARRAY['Nguyen','Martin','Bernard','Lopez','Dubois','Andre','Leroy','Rousseau','Vincent','Muller','Faure','David','Bertrand','Morel','Laurent','Michel','Garcia','Perrin','Robin','Clement','Masson','Henry','Gauthier','Baron','Noel','Colin','Boyer','Roy'])[i] AS last_name
) names;--> statement-breakpoint
INSERT INTO "students" ("id", "user_id", "created_at", "updated_at") VALUES
  ('70000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '2026-01-01', now()),
  ('70000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000002', '2026-01-01', now());--> statement-breakpoint
INSERT INTO "students" ("id", "user_id", "created_at", "updated_at")
SELECT ('71000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, ('61000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, '2026-01-04', now()
FROM generate_series(1, 16) AS series(i);--> statement-breakpoint
INSERT INTO "students" ("id", "user_id", "created_at", "updated_at")
SELECT ('72000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, ('62000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, '2026-09-01', now()
FROM generate_series(1, 12) AS series(i);--> statement-breakpoint
INSERT INTO "students" ("id", "user_id", "created_at", "updated_at")
SELECT ('73000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, ('63000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, '2026-01-04', now()
FROM generate_series(1, 28) AS series(i);--> statement-breakpoint
INSERT INTO "cohort_memberships" ("user_id", "cohort_id", "guild_id", "institutional_email", "created_at") VALUES
  ('60000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'lina.morel@aptitek.io', '2026-01-01'),
  ('60000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', 'lina.morel+master@aptitek.io', '2026-03-01'),
  ('60000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', 'samir.benali@aptitek.io', '2026-01-15');--> statement-breakpoint
INSERT INTO "cohort_memberships" ("user_id", "cohort_id", "guild_id", "institutional_email", "created_at")
SELECT
  ('61000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  '40000000-0000-4000-8000-000000000001',
  (ARRAY['50000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000004','50000000-0000-4000-8000-000000000005'])[((i - 1) % 3) + 1]::uuid,
  'frontend.mage.' || lpad(i::text, 2, '0') || '@aptitek.io',
  '2026-01-04'
FROM generate_series(1, 16) AS series(i);--> statement-breakpoint
INSERT INTO "cohort_memberships" ("user_id", "cohort_id", "guild_id", "institutional_email", "created_at")
SELECT ('62000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, '40000000-0000-4000-8000-000000000004', null, null, '2026-09-01'
FROM generate_series(1, 12) AS series(i);--> statement-breakpoint
INSERT INTO "cohort_memberships" ("user_id", "cohort_id", "guild_id", "institutional_email", "created_at")
SELECT
  ('63000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  '40000000-0000-4000-8000-000000000003',
  (ARRAY['50000000-0000-4000-8000-000000000006','50000000-0000-4000-8000-000000000007','50000000-0000-4000-8000-000000000008','50000000-0000-4000-8000-000000000009'])[((i - 1) % 4) + 1]::uuid,
  'data.alchemist.' || lpad(i::text, 2, '0') || '@polyforge.school',
  '2026-01-04'
FROM generate_series(1, 28) AS series(i);--> statement-breakpoint
INSERT INTO "game_characters" ("student_id", "character_class", "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma", "updated_at") VALUES
  ('70000000-0000-4000-8000-000000000001', 'guide', 7, 16, 0, 13, 0, 15, '2026-02-12'),
  ('70000000-0000-4000-8000-000000000002', 'champion', 12, 11, 0, 17, 0, 10, '2026-02-18');--> statement-breakpoint
INSERT INTO "game_characters" ("student_id", "character_class", "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma", "updated_at")
SELECT ('71000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, (ARRAY['scholar','champion','guide','specialist'])[((i - 1) % 4) + 1], 2 + (i % 5), 3 + (i % 6), 1 + (i % 4), 4 + (i % 7), 2 + (i % 5), 1 + (i % 6), '2026-02-01'
FROM generate_series(1, 16) AS series(i);--> statement-breakpoint
INSERT INTO "game_characters" ("student_id", "character_class", "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma", "updated_at")
SELECT ('73000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, (ARRAY['scholar','champion','guide','specialist'])[((i - 1) % 4) + 1], 8 + (i % 7), 7 + (i % 8), 6 + (i % 6), 10 + (i % 9), 7 + (i % 7), 6 + (i % 8), '2026-04-20'
FROM generate_series(1, 28) AS series(i);--> statement-breakpoint
INSERT INTO "game_activities" ("id", "type", "title", "is_graded", "map_x", "map_y", "sector_depth", "required_level", "step_ranges", "card_color", "participation_mode", "base_points", "metadata", "created_at") VALUES
  ('80000000-0000-4000-8000-000000000006', 'character_creation', 'Le Cercle de Creation du Personnage', false, 72, 300, 0, 1, '[{"startStep":0,"endStep":2}]', null, 'solo', 25, '{"kind":"profile-onboarding"}', '2026-01-07'),
  ('80000000-0000-4000-8000-000000000001', 'campfire', 'Le Feu de Camp de l''Onboarding Git', false, 130, 320, 0, 1, '[{"startStep":0}]', null, 'solo', 50, '{"unlockRule":{"requiredLevel":1}}', '2026-01-08'),
  ('80000000-0000-4000-8000-000000000002', 'practical', 'La Foret des Variables et Constantes', true, 330, 180, 0, 1, '[{"startStep":0}]', null, 'solo', 100, '{"unlockRule":{"requiredLevel":1,"requiredCompletedActivities":["80000000-0000-4000-8000-000000000001"]}}', '2026-01-10'),
  ('80000000-0000-4000-8000-000000000003', 'practical', 'Le Pont des API et des Contrats Types', true, 540, 410, 1, 2, '[{"startStep":1}]', null, 'solo', 100, '{"unlockRule":{"requiredLevel":2,"requiredCompletedActivities":["80000000-0000-4000-8000-000000000002"]}}', '2026-01-17'),
  ('80000000-0000-4000-8000-000000000004', 'practical', 'Les Ruines de l''Accessibilite Perdue', true, 700, 190, 1, 2, '[{"startStep":1}]', null, 'solo', 100, '{"unlockRule":{"requiredLevel":2,"requiredCompletedActivities":["80000000-0000-4000-8000-000000000002"]}}', '2026-01-24'),
  ('80000000-0000-4000-8000-000000000005', 'boss', 'Le Dragon de la Release Candidate', true, 880, 310, 2, 3, '[{"startStep":2}]', null, 'guild', 200, '{"boss":{"projectUrl":"https://github.com/eduquest/debug-release-candidate","gradingUrl":"https://api.eduquest.test/grade/debug-release-candidate"},"unlockRule":{"requiredLevel":3,"requiredCompletedActivities":["80000000-0000-4000-8000-000000000003","80000000-0000-4000-8000-000000000004"]},"answerFields":[{"id":"workUrl","label":"Project URL","kind":"url","placeholder":"https://github.com/your-team/project"},{"id":"attachments","label":"Project files","kind":"file","required":false,"accept":".pdf,.zip,.txt,.md,.png,.jpg,.jpeg,.webp,.gif,.json","maxFiles":3,"maxBytes":10485760}]}', '2026-02-01');--> statement-breakpoint
INSERT INTO "game_activity_edges" ("id", "from_activity_id", "to_activity_id", "metadata", "created_at") VALUES
  ('82000000-0000-4000-8000-000000000006', '80000000-0000-4000-8000-000000000006', '80000000-0000-4000-8000-000000000001', '{"source":"mockSeed"}', '2026-01-07'),
  ('82000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000002', '{"source":"mockSeed"}', '2026-01-10'),
  ('82000000-0000-4000-8000-000000000002', '80000000-0000-4000-8000-000000000002', '80000000-0000-4000-8000-000000000003', '{"source":"mockSeed"}', '2026-01-17'),
  ('82000000-0000-4000-8000-000000000003', '80000000-0000-4000-8000-000000000002', '80000000-0000-4000-8000-000000000004', '{"source":"mockSeed"}', '2026-01-24'),
  ('82000000-0000-4000-8000-000000000004', '80000000-0000-4000-8000-000000000003', '80000000-0000-4000-8000-000000000005', '{"source":"mockSeed"}', '2026-02-01'),
  ('82000000-0000-4000-8000-000000000005', '80000000-0000-4000-8000-000000000004', '80000000-0000-4000-8000-000000000005', '{"source":"mockSeed"}', '2026-02-01');--> statement-breakpoint
INSERT INTO "game_map_runs" ("id", "cohort_id", "current_sector_depth", "fog_reveal_depth", "status", "created_at", "updated_at") VALUES
  ('81000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 2, 2, 'active', '2026-01-10', now()),
  ('81000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', 4, 4, 'active', '2026-01-10', now()),
  ('81000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000004', 0, 1, 'active', '2026-09-01', now());--> statement-breakpoint
INSERT INTO "game_activity_completions" ("id", "student_id", "cohort_id", "activity_id", "completion_type", "grade", "work_url", "metadata", "created_at", "updated_at")
SELECT
  ('91000000-0000-4000-8000-' || lpad(((i - 1) * 3 + activity_ord)::text, 12, '0'))::uuid,
  ('71000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  '40000000-0000-4000-8000-000000000001',
  activity_id::uuid,
  completion_type::"game_activity_completion_type",
  grade,
  null,
  '{"source":"mockSeed"}'::jsonb,
  '2026-02-01'::timestamp with time zone + (i || ' hours')::interval,
  '2026-02-01'::timestamp with time zone + (i || ' hours')::interval
FROM generate_series(1, 16) AS series(i)
CROSS JOIN LATERAL (
  VALUES
    (1, '80000000-0000-4000-8000-000000000006', 'system', null::double precision),
    (2, '80000000-0000-4000-8000-000000000001', 'read', null::double precision),
    (3, '80000000-0000-4000-8000-000000000002', 'submission', 0.72::double precision + ((i % 5)::double precision / 100))
) AS activities(activity_ord, activity_id, completion_type, grade);--> statement-breakpoint
INSERT INTO "game_activity_completions" ("id", "student_id", "cohort_id", "activity_id", "completion_type", "grade", "work_url", "metadata", "created_at", "updated_at")
SELECT
  ('92000000-0000-4000-8000-' || lpad(((i - 1) * 5 + activity_ord)::text, 12, '0'))::uuid,
  ('73000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  '40000000-0000-4000-8000-000000000003',
  activity_id::uuid,
  completion_type::"game_activity_completion_type",
  grade,
  CASE WHEN activity_ord = 5 THEN 'https://github.com/eduquest/data-alchemists-boss-' || i ELSE null END,
  '{"source":"mockSeed"}'::jsonb,
  '2026-04-01'::timestamp with time zone + (i || ' hours')::interval + (activity_ord || ' days')::interval,
  '2026-04-01'::timestamp with time zone + (i || ' hours')::interval + (activity_ord || ' days')::interval
FROM generate_series(1, 28) AS series(i)
CROSS JOIN LATERAL (
  VALUES
    (1, '80000000-0000-4000-8000-000000000006', 'system', null::double precision),
    (2, '80000000-0000-4000-8000-000000000001', 'read', null::double precision),
    (3, '80000000-0000-4000-8000-000000000002', 'submission', 0.82::double precision + ((i % 8)::double precision / 100)),
    (4, '80000000-0000-4000-8000-000000000003', 'submission', 0.80::double precision + ((i % 10)::double precision / 100)),
    (5, '80000000-0000-4000-8000-000000000005', 'battle', 0.78::double precision + ((i % 12)::double precision / 100))
) AS activities(activity_ord, activity_id, completion_type, grade)
WHERE activity_ord < 5 OR i % 3 = 0;--> statement-breakpoint
INSERT INTO "game_character_moves" ("id", "student_id", "cohort_id", "map_run_id", "from_activity_id", "to_activity_id", "move_type", "metadata", "created_at")
SELECT ('93000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, ('73000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, '40000000-0000-4000-8000-000000000003', '81000000-0000-4000-8000-000000000003', CASE WHEN i % 3 = 0 THEN '80000000-0000-4000-8000-000000000003' ELSE '80000000-0000-4000-8000-000000000002' END::uuid, CASE WHEN i % 3 = 0 THEN '80000000-0000-4000-8000-000000000005' ELSE '80000000-0000-4000-8000-000000000003' END::uuid, 'move', '{"source":"mockSeed"}'::jsonb, '2026-04-18'::timestamp with time zone + (i || ' hours')::interval
FROM generate_series(1, 28) AS series(i);--> statement-breakpoint
INSERT INTO "game_character_moves" ("id", "student_id", "cohort_id", "map_run_id", "from_activity_id", "to_activity_id", "move_type", "metadata", "created_at")
SELECT ('94000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, ('71000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, '40000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001', CASE WHEN i % 4 = 0 THEN '80000000-0000-4000-8000-000000000003' ELSE '80000000-0000-4000-8000-000000000002' END::uuid, 'move', '{"source":"mockSeed"}'::jsonb, '2026-02-12'::timestamp with time zone + (i || ' hours')::interval
FROM generate_series(1, 16) AS series(i);--> statement-breakpoint
INSERT INTO "cohort_progress" ("id", "cohort_id", "label_i18n_key", "current_points", "created_at", "updated_at") VALUES
  ('a0000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'dashboard.dock.milestone', 540, '2026-01-01', now()),
  ('a0000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', 'dashboard.dock.milestone', 368, '2026-01-01', now()),
  ('a0000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', 'dashboard.dock.milestone', 920, '2026-01-01', now()),
  ('d0000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000004', 'dashboard.dock.milestone', 0, '2026-09-01', now());--> statement-breakpoint
WITH progress_seed AS (
  SELECT * FROM (VALUES
    ('a0000000-0000-4000-8000-000000000001'::uuid, 'a1000000'),
    ('a0000000-0000-4000-8000-000000000002'::uuid, 'a2000000'),
    ('a0000000-0000-4000-8000-000000000003'::uuid, 'a3000000'),
    ('d0000000-0000-4000-8000-000000000004'::uuid, 'd1000000')
  ) AS rows(progress_id, id_prefix)
),
milestone_seed AS (
  SELECT * FROM (VALUES
    (1, 'dashboard.milestones.spark.label', 'dashboard.milestones.spark.description', 12, 'dashboard.rewards.deadline.title', 'dashboard.rewards.deadline.subtitle', 'campfire', 10),
    (2, 'dashboard.milestones.campfire.label', 'dashboard.milestones.campfire.description', 24, 'dashboard.rewards.miniGame.title', 'dashboard.rewards.miniGame.subtitle', 'completed', 20),
    (3, 'dashboard.milestones.quest.label', 'dashboard.milestones.quest.description', 38, 'dashboard.rewards.techHelp.title', 'dashboard.rewards.techHelp.subtitle', 'quest', 30),
    (4, 'dashboard.milestones.rally.label', 'dashboard.milestones.rally.description', 52, 'dashboard.rewards.reroll.title', 'dashboard.rewards.reroll.subtitle', 'specialist', 40),
    (5, 'dashboard.milestones.treasure.label', 'dashboard.milestones.treasure.description', 66, 'dashboard.milestones.treasure.label', null, 'quest', 50),
    (6, 'dashboard.milestones.boss.label', 'dashboard.milestones.boss.description', 78, 'dashboard.milestones.boss.label', null, 'danger', 60),
    (7, 'dashboard.milestones.legend.label', 'dashboard.milestones.legend.description', 90, 'dashboard.milestones.legend.label', null, 'specialist', 70),
    (8, 'dashboard.milestones.ascend.label', 'dashboard.milestones.ascend.description', 100, 'dashboard.milestones.ascend.label', null, 'completed', 80)
  ) AS rows(ordinal, label_i18n_key, description_i18n_key, cost, reward_title_i18n_key, reward_subtitle_i18n_key, reward_accent_token, sort_order)
)
INSERT INTO "progress_milestones" ("id", "progress_id", "label_i18n_key", "description_i18n_key", "cost", "reward_title_i18n_key", "reward_subtitle_i18n_key", "reward_accent_token", "sort_order", "created_at")
SELECT
  (progress_seed.id_prefix || '-0000-4000-8000-' || lpad(milestone_seed.ordinal::text, 12, '0'))::uuid,
  progress_seed.progress_id,
  milestone_seed.label_i18n_key,
  milestone_seed.description_i18n_key,
  milestone_seed.cost,
  milestone_seed.reward_title_i18n_key,
  milestone_seed.reward_subtitle_i18n_key,
  milestone_seed.reward_accent_token,
  milestone_seed.sort_order,
  '2026-01-01'
FROM progress_seed
CROSS JOIN milestone_seed;--> statement-breakpoint
INSERT INTO "notifications" ("id", "cohort_id", "title_i18n_key", "description_i18n_key", "icon", "tone", "action_label_i18n_key", "action_target", "sort_order", "created_at", "updated_at") VALUES
  ('c0000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'dashboard.notifications.cohortQuest.title', 'dashboard.notifications.cohortQuest.description', 'map', 'info', 'dashboard.notifications.cohortQuest.action', 'map', 10, '2026-01-01', now()),
  ('c0000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001', 'dashboard.notifications.cohortCampfire.title', 'dashboard.notifications.cohortCampfire.description', 'sparkles', 'success', 'dashboard.notifications.cohortCampfire.action', 'acknowledge', 20, '2026-01-01', now()),
  ('c0000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000001', 'dashboard.notifications.rewardGold.title', 'dashboard.notifications.rewardGold.description', 'coins', 'warning', 'dashboard.notifications.rewardGold.action', 'collect', 30, '2026-01-01', now()),
  ('c0000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000001', 'dashboard.notifications.rewardSpend.title', 'dashboard.notifications.rewardSpend.description', 'gift', 'neutral', 'dashboard.notifications.rewardSpend.action', 'review', 40, '2026-01-01', now()),
  ('c1000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', 'dashboard.notifications.cohortQuest.title', 'dashboard.notifications.cohortQuest.description', 'map', 'info', 'dashboard.notifications.cohortQuest.action', 'map', 10, '2026-01-01', now()),
  ('c2000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000003', 'dashboard.notifications.cohortQuest.title', 'dashboard.notifications.cohortQuest.description', 'map', 'success', 'dashboard.notifications.cohortQuest.action', 'map', 10, '2026-04-20', now()),
  ('d2000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000004', 'dashboard.notifications.cohortCampfire.title', 'dashboard.notifications.cohortCampfire.description', 'sparkles', 'info', 'dashboard.notifications.cohortCampfire.action', 'map', 10, '2026-09-01', now());--> statement-breakpoint
INSERT INTO "reward_balance_configs" ("version", "label", "config", "is_active") VALUES (
  1,
  'Default v1 seed',
  '{
    "rewardSystem": {
      "guild": {
        "sizeModifierPerMissingStudent": 0.35,
        "statCapPerAttribute": 12
      },
      "attributes": {
        "earningMultiplier": 0.13,
        "guildEarningMultiplier": 0.06
      },
      "modifiers": {
        "charismaPassiveMultiplier": 0.028
      },
      "strategies": {
        "dexterityHoursEarlyMultiplier": 0.2,
        "constitutionActiveDaysMultiplier": 0.04,
        "constitutionActiveDaysCap": 5
      },
      "voting": {
        "quadraticExponent": 1,
        "charismaDiscountMultiplier": 0.045
      },
      "caps": {
        "maxGoldPerEvent": 500,
        "maxDexterityGoldPerEvent": 100
      },
      "difficultyMultipliers": {
        "1": 1,
        "2": 1.25,
        "3": 1.5
      }
    }
  }'::jsonb,
  true
);--> statement-breakpoint
INSERT INTO "guilds" ("id", "cohort_id", "name", "description", "color", "icon_key", "gold", "created_at", "updated_at") VALUES
  ('50000000-0000-4000-8000-000000000010', '40000000-0000-4000-8000-000000000002', 'Emerald Endpoints', 'API explorers who keep contracts clear and dependable.', '#859900', 'Route', 142, '2026-03-04', now()),
  ('50000000-0000-4000-8000-000000000011', '40000000-0000-4000-8000-000000000002', 'Indigo Integrators', 'Fullstack bridge builders connecting every service and screen.', '#6c71c4', 'GitBranch', 118, '2026-03-04', now()),
  ('50000000-0000-4000-8000-000000000012', '40000000-0000-4000-8000-000000000004', 'Nimbus Navigators', 'Cloud apprentices mapping their first deployment routes.', '#268bd2', 'Cloud', 92, '2026-09-02', now()),
  ('50000000-0000-4000-8000-000000000013', '40000000-0000-4000-8000-000000000004', 'Kinetic Keepers', 'Infrastructure caretakers practicing reliable service habits.', '#859900', 'ShieldCheck', 76, '2026-09-02', now()),
  ('50000000-0000-4000-8000-000000000014', '40000000-0000-4000-8000-000000000004', 'Copper Consoles', 'Terminal-minded learners who turn setup notes into shared wins.', '#cb4b16', 'TerminalSquare', 61, '2026-09-02', now());--> statement-breakpoint
INSERT INTO "users" ("id", "github_email", "email", "github_sso_token", "github_username", "first_name", "last_name", "display_name", "birth_date", "pronouns", "bio", "avatar_url", "github_avatar_url", "user_status", "is_admin", "created_at", "updated_at")
SELECT
  ('64000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  lower(first_name || '.' || last_name || '@github.test'),
  lower(first_name || '.' || last_name || '@github.test'),
  'debug-token-fullstack-' || i,
  lower(first_name || '-' || last_name),
  first_name,
  upper(last_name),
  first_name || ' ' || upper(last_name),
  ('2000-05-01'::date + (i || ' months')::interval)::date,
  CASE WHEN i % 3 = 0 THEN 'they, them' WHEN i % 3 = 1 THEN 'she, her' ELSE 'he, him' END,
  'Fullstack Rangers profile focused on APIs, delivery, and collaborative debugging.',
  'https://api.dicebear.com/9.x/personas/svg?seed=fullstack-' || i,
  'https://api.dicebear.com/9.x/personas/svg?seed=fullstack-' || i,
  CASE WHEN i % 4 = 0 THEN 'busy' ELSE 'online' END::"user_status",
  false,
  '2026-03-04',
  now()
FROM generate_series(1, 12) AS series(i)
CROSS JOIN LATERAL (
  SELECT
    (ARRAY['Alice','Baptiste','Chloe','Dylan','Eva','Fares','Gaelle','Idris','Jeanne','Kylian','Lou','Mehdi'])[i] AS first_name,
    (ARRAY['Arnaud','Blanc','Chevalier','Denis','Etienne','Fontaine','Gillet','Haddad','Ibrahim','Joly','Klein','Lemoine'])[i] AS last_name
) names;--> statement-breakpoint
UPDATE "users" AS u
SET
  "first_name" = names.first_name,
  "last_name" = upper(names.last_name),
  "display_name" = names.first_name || ' ' || upper(names.last_name),
  "avatar_url" = 'https://api.dicebear.com/9.x/personas/svg?seed=cloud-' || names.i,
  "github_avatar_url" = 'https://api.dicebear.com/9.x/personas/svg?seed=cloud-' || names.i,
  "bio" = 'Cloud Apprentices profile ready for guild assignment and onboarding quests.',
  "updated_at" = now()
FROM (
  SELECT i, first_name, last_name
  FROM generate_series(1, 12) AS series(i)
  CROSS JOIN LATERAL (
    SELECT
      (ARRAY['Aline','Bilal','Celia','Damien','Elsa','Florian','Ines','Jules','Lina','Malik','Nadia','Pavel'])[i] AS first_name,
      (ARRAY['Morel','Renaud','Santos','Tessier','Vidal','Walter','Besson','Carre','Dufour','Gomes','Hubert','Leclerc'])[i] AS last_name
  ) picked
) names
WHERE u."id" = ('62000000-0000-4000-8000-' || lpad(names.i::text, 12, '0'))::uuid;--> statement-breakpoint
INSERT INTO "students" ("id", "user_id", "created_at", "updated_at")
SELECT ('74000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, ('64000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, '2026-03-04', now()
FROM generate_series(1, 12) AS series(i);--> statement-breakpoint
INSERT INTO "cohort_memberships" ("user_id", "cohort_id", "guild_id", "institutional_email", "created_at")
SELECT
  ('64000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  '40000000-0000-4000-8000-000000000002',
  (ARRAY['50000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000010','50000000-0000-4000-8000-000000000011'])[((i - 1) % 3) + 1]::uuid,
  'fullstack.ranger.' || lpad(i::text, 2, '0') || '@aptitek.io',
  '2026-03-04'
FROM generate_series(1, 12) AS series(i);--> statement-breakpoint
UPDATE "cohort_memberships"
SET
  "guild_id" = (ARRAY['50000000-0000-4000-8000-000000000012','50000000-0000-4000-8000-000000000013','50000000-0000-4000-8000-000000000014'])[((member_index - 1) % 3) + 1]::uuid,
  "institutional_email" = 'cloud.apprentice.' || lpad(member_index::text, 2, '0') || '@aptitek.io'
FROM (
  SELECT
    ('62000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid AS user_id,
    i AS member_index
  FROM generate_series(1, 9) AS series(i)
) assigned
WHERE "cohort_memberships"."user_id" = assigned.user_id
  AND "cohort_memberships"."cohort_id" = '40000000-0000-4000-8000-000000000004';--> statement-breakpoint
INSERT INTO "game_characters" ("student_id", "character_class", "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma", "updated_at")
SELECT ('74000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, (ARRAY['scholar','champion','guide','specialist'])[((i - 1) % 4) + 1], 5 + (i % 6), 4 + (i % 7), 3 + (i % 5), 6 + (i % 8), 4 + (i % 6), 3 + (i % 7), '2026-03-04'
FROM generate_series(1, 12) AS series(i);--> statement-breakpoint
INSERT INTO "game_characters" ("student_id", "character_class", "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma", "updated_at")
SELECT ('72000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, (ARRAY['scholar','champion','guide','specialist'])[((i - 1) % 4) + 1], 3 + (i % 5), 4 + (i % 6), 2 + (i % 4), 5 + (i % 7), 3 + (i % 5), 2 + (i % 6), '2026-09-02'
FROM generate_series(1, 12) AS series(i);