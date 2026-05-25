ALTER TABLE "game_characters" ADD COLUMN IF NOT EXISTS "force" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "game_characters" ADD COLUMN IF NOT EXISTS "dexterity" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "game_characters" ADD COLUMN IF NOT EXISTS "constitution" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "game_characters" ADD COLUMN IF NOT EXISTS "intelligence" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "game_characters" ADD COLUMN IF NOT EXISTS "wisdom" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "game_characters" ADD COLUMN IF NOT EXISTS "charisma" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE "game_characters"
SET
  "force" = COALESCE(("stats"->>'str')::integer, "force"),
  "dexterity" = COALESCE(("stats"->>'dex')::integer, "dexterity"),
  "intelligence" = COALESCE(("stats"->>'int')::integer, "intelligence"),
  "charisma" = COALESCE(("stats"->>'cha')::integer, "charisma")
WHERE "stats" IS NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "point_transaction_type" AS ENUM ('EARNED', 'SPENT_VOTE', 'MANUAL_BONUS');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "point_transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "guild_id" uuid NOT NULL REFERENCES "guilds"("id") ON DELETE CASCADE,
  "student_id" uuid REFERENCES "students"("id") ON DELETE set null,
  "activity_id" uuid REFERENCES "game_activities"("id") ON DELETE set null,
  "amount" integer NOT NULL,
  "transaction_type" "point_transaction_type" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
INSERT INTO "addresses" ("id", "line_1", "postal_code", "city", "country", "created_at", "updated_at") VALUES
  ('20000000-0000-4000-8000-000000000001', '10 rue de la Tech', '75001', 'Paris', 'France', '2026-01-01', now()),
  ('20000000-0000-4000-8000-000000000002', '42 quai des Algorithmes', '69002', 'Lyon', 'France', '2026-01-01', now())
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "schools" ("id", "name", "website", "email_domain", "created_at", "updated_at") VALUES
  ('10000000-0000-4000-8000-000000000001', 'Aptitek', 'https://aptitek.io', 'aptitek.io', '2026-01-01', now()),
  ('10000000-0000-4000-8000-000000000002', 'Polyforge Institute', 'https://polyforge.example', 'polyforge.school', '2026-01-01', now())
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "website" = EXCLUDED."website",
  "email_domain" = EXCLUDED."email_domain",
  "updated_at" = now();
--> statement-breakpoint
INSERT INTO "campuses" ("id", "school_id", "address_id", "name", "created_at", "updated_at") VALUES
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Paris', '2026-01-01', now()),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Lyon', '2026-01-01', now())
ON CONFLICT ("id") DO UPDATE SET
  "school_id" = EXCLUDED."school_id",
  "address_id" = EXCLUDED."address_id",
  "name" = EXCLUDED."name",
  "updated_at" = now();
--> statement-breakpoint
INSERT INTO "cohorts" ("id", "school_id", "campus_id", "school_year", "grade", "level", "name", "major_speciality", "minor_speciality", "description", "created_at", "updated_at") VALUES
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '2025-2026', 'bachelor', 3, 'Frontend Mages', 'Frontend', 'UX', 'Interface craft, accessibility, and client-side quests.', '2026-01-01', now()),
  ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '2026-2027', 'master', 1, 'Fullstack Rangers', 'Fullstack', 'DevOps', 'API design, deployment raids, and product-grade delivery.', '2026-01-01', now()),
  ('40000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '2024-2025', 'engineer', 5, 'Data Alchemists', 'Data', 'AI', 'Analytics, model evaluation, and data-heavy boss battles.', '2026-01-01', now())
ON CONFLICT ("id") DO UPDATE SET
  "school_id" = EXCLUDED."school_id",
  "campus_id" = EXCLUDED."campus_id",
  "school_year" = EXCLUDED."school_year",
  "grade" = EXCLUDED."grade",
  "level" = EXCLUDED."level",
  "name" = EXCLUDED."name",
  "major_speciality" = EXCLUDED."major_speciality",
  "minor_speciality" = EXCLUDED."minor_speciality",
  "description" = EXCLUDED."description",
  "updated_at" = now();
--> statement-breakpoint
INSERT INTO "guilds" ("id", "cohort_id", "name", "description", "color", "total_points", "created_at", "updated_at") VALUES
  ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Solarized Sentinels', 'Guardians of consistent UI systems.', 'quest', 180, '2026-01-01', now()),
  ('50000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', 'Crimson Compilers', 'Backend raiders who never leave failing checks behind.', 'danger', 168, '2026-01-01', now()),
  ('50000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', 'Violet Oracles', 'Data interpreters and probability mages.', 'specialist', 132, '2026-01-01', now())
ON CONFLICT ("id") DO UPDATE SET
  "cohort_id" = EXCLUDED."cohort_id",
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "color" = EXCLUDED."color",
  "total_points" = EXCLUDED."total_points",
  "updated_at" = now();
--> statement-breakpoint
INSERT INTO "users" ("id", "github_email", "email", "github_sso_token", "github_username", "first_name", "last_name", "display_name", "birth_date", "pronouns", "bio", "avatar_url", "github_avatar_url", "user_status", "is_admin", "created_at", "updated_at") VALUES
  ('60000000-0000-4000-8000-000000000001', 'lina.morel@github.test', 'lina.morel@github.test', 'debug-token-lina', 'lina-morel', 'Lina', 'MOREL', 'Lina MOREL', '2001-04-12', 'she, her', 'Frontend apprentice who likes polishing tiny UI states.', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80', 'online', false, '2026-01-01', now()),
  ('60000000-0000-4000-8000-000000000002', 'samir.benali@github.test', 'samir.benali@github.test', 'debug-token-samir', 'samir-benali', 'Samir', 'BENALI', 'Samir BENALI', '1999-11-03', 'he, him', 'Fullstack ranger focused on API contracts and deployment rituals.', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80', 'busy', false, '2026-01-01', now()),
  ('60000000-0000-4000-8000-000000000003', 'admin@aptitek.io', 'admin@aptitek.io', 'debug-token-admin', 'aptitek-admin', 'Aptitek', 'ADMIN', 'Aptitek ADMIN', null, null, null, null, null, 'online', true, '2026-01-01', now())
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "students" ("id", "user_id", "school_id", "created_at", "updated_at") VALUES
  ('70000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '2026-01-01', now()),
  ('70000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '2026-01-01', now())
ON CONFLICT ("id") DO UPDATE SET
  "school_id" = EXCLUDED."school_id",
  "updated_at" = now();
--> statement-breakpoint
INSERT INTO "student_cohorts" ("student_id", "cohort_id", "guild_id", "institutional_email", "created_at") VALUES
  ('70000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'lina.morel@aptitek.io', '2026-01-01'),
  ('70000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', 'lina.morel+master@aptitek.io', '2026-03-01'),
  ('70000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', 'samir.benali@aptitek.io', '2026-01-15')
ON CONFLICT ("student_id", "cohort_id") DO UPDATE SET
  "guild_id" = EXCLUDED."guild_id",
  "institutional_email" = EXCLUDED."institutional_email";
--> statement-breakpoint
INSERT INTO "user_school_memberships" ("user_id", "school_id", "institutional_email", "created_at", "updated_at") VALUES
  ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'lina.morel@aptitek.io', '2026-01-01', now()),
  ('60000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'samir.benali@aptitek.io', '2026-01-15', now()),
  ('60000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'admin@aptitek.io', '2026-01-01', now())
ON CONFLICT ("user_id", "school_id") DO UPDATE SET
  "institutional_email" = EXCLUDED."institutional_email",
  "updated_at" = now();
--> statement-breakpoint
INSERT INTO "game_characters" ("student_id", "character_class", "force", "dexterity", "constitution", "intelligence", "wisdom", "charisma", "current_level", "updated_at") VALUES
  ('70000000-0000-4000-8000-000000000001', 'guide', 7, 16, 0, 13, 0, 15, 2, '2026-02-12'),
  ('70000000-0000-4000-8000-000000000002', 'champion', 12, 11, 0, 17, 0, 10, 3, '2026-02-18')
ON CONFLICT ("student_id") DO UPDATE SET
  "character_class" = EXCLUDED."character_class",
  "force" = EXCLUDED."force",
  "dexterity" = EXCLUDED."dexterity",
  "constitution" = EXCLUDED."constitution",
  "intelligence" = EXCLUDED."intelligence",
  "wisdom" = EXCLUDED."wisdom",
  "charisma" = EXCLUDED."charisma",
  "current_level" = EXCLUDED."current_level",
  "updated_at" = EXCLUDED."updated_at";
--> statement-breakpoint
INSERT INTO "game_activities" ("id", "type", "title", "is_graded", "x", "y", "required_level", "base_points", "unlock_rule", "boss_metadata", "created_at") VALUES
  ('80000000-0000-4000-8000-000000000001', 'campfire', 'Le Feu de Camp de l''Onboarding Git', false, 130, 320, 1, 50, '{"requiredLevel":1}', '{}', '2026-01-08'),
  ('80000000-0000-4000-8000-000000000002', 'quest', 'La Forêt des Variables et Constantes', true, 330, 180, 1, 100, '{"requiredLevel":1,"requiredCompletedActivities":["80000000-0000-4000-8000-000000000001"]}', '{}', '2026-01-10'),
  ('80000000-0000-4000-8000-000000000003', 'quest', 'Le Pont des API et des Contrats Typés', true, 540, 410, 2, 100, '{"requiredLevel":2,"requiredCompletedActivities":["80000000-0000-4000-8000-000000000002"]}', '{}', '2026-01-17'),
  ('80000000-0000-4000-8000-000000000004', 'quest', 'Les Ruines de l''Accessibilité Perdue', true, 700, 190, 2, 100, '{"requiredLevel":2,"requiredCompletedActivities":["80000000-0000-4000-8000-000000000002"]}', '{}', '2026-01-24'),
  ('80000000-0000-4000-8000-000000000005', 'boss', 'Le Dragon de la Release Candidate', true, 880, 310, 3, 200, '{"requiredLevel":3,"requiredCompletedActivities":["80000000-0000-4000-8000-000000000003","80000000-0000-4000-8000-000000000004"]}', '{"projectUrl":"https://github.com/eduquest/debug-release-candidate","gradingUrl":"https://api.eduquest.test/grade/debug-release-candidate"}', '2026-02-01')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "game_battles" ("id", "student_id", "activity_id", "grade", "created_at") VALUES
  ('90000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001', null, '2026-01-09'),
  ('90000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000002', 0.92, '2026-01-13'),
  ('90000000-0000-4000-8000-000000000003', '70000000-0000-4000-8000-000000000002', '80000000-0000-4000-8000-000000000001', null, '2026-01-16'),
  ('90000000-0000-4000-8000-000000000004', '70000000-0000-4000-8000-000000000002', '80000000-0000-4000-8000-000000000002', 0.81, '2026-01-18'),
  ('90000000-0000-4000-8000-000000000005', '70000000-0000-4000-8000-000000000002', '80000000-0000-4000-8000-000000000003', 0.88, '2026-01-25')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "global_gauges" ("id", "cohort_id", "milestone_name", "current_points", "target_points", "created_at", "updated_at") VALUES
  ('a0000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'dashboard.dock.milestone', 460, 1000, '2026-01-01', now())
ON CONFLICT ("id") DO UPDATE SET
  "current_points" = EXCLUDED."current_points",
  "target_points" = EXCLUDED."target_points",
  "updated_at" = now();
--> statement-breakpoint
INSERT INTO "global_gauge_milestones" ("id", "gauge_id", "label_i18n_key", "description_i18n_key", "position_percent", "sort_order") VALUES
  ('a1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'dashboard.milestones.spark.label', 'dashboard.milestones.spark.description', 12, 10),
  ('a1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'dashboard.milestones.campfire.label', 'dashboard.milestones.campfire.description', 24, 20),
  ('a1000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'dashboard.milestones.quest.label', 'dashboard.milestones.quest.description', 38, 30),
  ('a1000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'dashboard.milestones.rally.label', 'dashboard.milestones.rally.description', 52, 40),
  ('a1000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'dashboard.milestones.treasure.label', 'dashboard.milestones.treasure.description', 66, 50),
  ('a1000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 'dashboard.milestones.boss.label', 'dashboard.milestones.boss.description', 78, 60),
  ('a1000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001', 'dashboard.milestones.legend.label', 'dashboard.milestones.legend.description', 90, 70),
  ('a1000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000001', 'dashboard.milestones.ascend.label', 'dashboard.milestones.ascend.description', 100, 80)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "cohort_reward_cards" ("id", "cohort_id", "title_i18n_key", "subtitle_i18n_key", "accent_token", "sort_order") VALUES
  ('b0000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'dashboard.rewards.deadline.title', 'dashboard.rewards.deadline.subtitle', 'campfire', 10),
  ('b0000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001', 'dashboard.rewards.miniGame.title', 'dashboard.rewards.miniGame.subtitle', 'completed', 20),
  ('b0000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000001', 'dashboard.rewards.techHelp.title', 'dashboard.rewards.techHelp.subtitle', 'quest', 30),
  ('b0000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000001', 'dashboard.rewards.reroll.title', 'dashboard.rewards.reroll.subtitle', 'specialist', 40)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "dashboard_notifications" ("id", "cohort_id", "title_i18n_key", "description_i18n_key", "meta_i18n_key", "icon", "tone", "action_label_i18n_key", "action_target", "sort_order") VALUES
  ('c0000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'dashboard.notifications.cohortQuest.title', 'dashboard.notifications.cohortQuest.description', 'dashboard.notifications.cohortQuest.meta', 'map', 'info', 'dashboard.notifications.cohortQuest.action', 'map', 10),
  ('c0000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001', 'dashboard.notifications.cohortCampfire.title', 'dashboard.notifications.cohortCampfire.description', 'dashboard.notifications.cohortCampfire.meta', 'sparkles', 'success', 'dashboard.notifications.cohortCampfire.action', 'acknowledge', 20),
  ('c0000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000001', 'dashboard.notifications.rewardGold.title', 'dashboard.notifications.rewardGold.description', 'dashboard.notifications.rewardGold.meta', 'coins', 'warning', 'dashboard.notifications.rewardGold.action', 'collect', 30),
  ('c0000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000001', 'dashboard.notifications.rewardSpend.title', 'dashboard.notifications.rewardSpend.description', 'dashboard.notifications.rewardSpend.meta', 'gift', 'neutral', 'dashboard.notifications.rewardSpend.action', 'review', 40)
ON CONFLICT ("id") DO NOTHING;
