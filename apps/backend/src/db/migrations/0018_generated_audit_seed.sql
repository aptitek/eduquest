INSERT INTO "cohorts" ("id", "school_id", "campus_id", "start_year", "grade", "level", "current_step", "name", "major_speciality", "minor_speciality", "description", "created_at", "updated_at") VALUES
  ('40000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 2027, 'bachelor', 1, 0, 'Cloud Apprentices', 'Cloud', 'Foundations', 'A newly invited cohort that has not started profile cards or character creation yet.', '2026-09-01', now())
ON CONFLICT ("id") DO UPDATE SET
  "start_year" = EXCLUDED."start_year",
  "current_step" = EXCLUDED."current_step",
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "updated_at" = now();
--> statement-breakpoint
UPDATE "cohorts" SET "current_step" = 3, "updated_at" = now()
WHERE "id" = '40000000-0000-4000-8000-000000000001';
--> statement-breakpoint
UPDATE "cohorts" SET "current_step" = 9, "updated_at" = now()
WHERE "id" = '40000000-0000-4000-8000-000000000003';
--> statement-breakpoint
INSERT INTO "guilds" ("id", "cohort_id", "name", "description", "color", "icon_key", "gold", "created_at", "updated_at") VALUES
  ('50000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000001', 'Azure Artificers', 'Component crafters who specialize in accessibility and polish.', '#2aa198', 'Sparkles', 124, '2026-01-03', now()),
  ('50000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000001', 'Amber Animators', 'Motion-minded UI raiders focused on careful interaction details.', '#b58900', 'WandSparkles', 96, '2026-01-03', now()),
  ('50000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000003', 'Obsidian Oracles', 'Advanced analytics guild forecasting every boss mechanic.', '#586e75', 'BrainCircuit', 420, '2026-01-03', now()),
  ('50000000-0000-4000-8000-000000000007', '40000000-0000-4000-8000-000000000003', 'Golden Gradients', 'Visualization specialists turning findings into guild momentum.', '#b58900', 'LineChart', 365, '2026-01-03', now()),
  ('50000000-0000-4000-8000-000000000008', '40000000-0000-4000-8000-000000000003', 'Neon Nulls', 'Data quality sentinels who catch edge cases before release.', '#2aa198', 'Bug', 310, '2026-01-03', now()),
  ('50000000-0000-4000-8000-000000000009', '40000000-0000-4000-8000-000000000003', 'Crimson Clusters', 'Modeling party optimized for difficult collaborative battles.', '#dc322f', 'Network', 288, '2026-01-03', now())
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "color" = EXCLUDED."color",
  "icon_key" = EXCLUDED."icon_key",
  "gold" = EXCLUDED."gold",
  "updated_at" = now();
--> statement-breakpoint
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
) names
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "users" ("id", "github_email", "email", "github_sso_token", "github_username", "first_name", "last_name", "display_name", "birth_date", "pronouns", "bio", "avatar_url", "github_avatar_url", "user_status", "is_admin", "created_at", "updated_at")
SELECT
  ('62000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  'cloud.apprentice.' || lpad(i::text, 2, '0') || '@github.test',
  'cloud.apprentice.' || lpad(i::text, 2, '0') || '@github.test',
  'debug-token-cloud-' || i,
  'cloud-apprentice-' || lpad(i::text, 2, '0'),
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  'offline'::"user_status",
  false,
  '2026-09-01',
  now()
FROM generate_series(1, 12) AS series(i)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
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
) names
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "students" ("id", "user_id", "created_at", "updated_at")
SELECT ('71000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, ('61000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, '2026-01-04', now()
FROM generate_series(1, 16) AS series(i)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "students" ("id", "user_id", "created_at", "updated_at")
SELECT ('72000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, ('62000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, '2026-09-01', now()
FROM generate_series(1, 12) AS series(i)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "students" ("id", "user_id", "created_at", "updated_at")
SELECT ('73000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, ('63000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, '2026-01-04', now()
FROM generate_series(1, 28) AS series(i)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "cohort_memberships" ("user_id", "cohort_id", "guild_id", "institutional_email", "created_at")
SELECT
  ('61000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  '40000000-0000-4000-8000-000000000001',
  (ARRAY['50000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000004','50000000-0000-4000-8000-000000000005'])[((i - 1) % 3) + 1]::uuid,
  'frontend.mage.' || lpad(i::text, 2, '0') || '@aptitek.io',
  '2026-01-04'
FROM generate_series(1, 16) AS series(i)
ON CONFLICT ("user_id", "cohort_id") DO UPDATE SET
  "guild_id" = EXCLUDED."guild_id",
  "institutional_email" = EXCLUDED."institutional_email";
--> statement-breakpoint
INSERT INTO "cohort_memberships" ("user_id", "cohort_id", "guild_id", "institutional_email", "created_at")
SELECT
  ('62000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  '40000000-0000-4000-8000-000000000004',
  null,
  null,
  '2026-09-01'
FROM generate_series(1, 12) AS series(i)
ON CONFLICT ("user_id", "cohort_id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "cohort_memberships" ("user_id", "cohort_id", "guild_id", "institutional_email", "created_at")
SELECT
  ('63000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  '40000000-0000-4000-8000-000000000003',
  (ARRAY['50000000-0000-4000-8000-000000000006','50000000-0000-4000-8000-000000000007','50000000-0000-4000-8000-000000000008','50000000-0000-4000-8000-000000000009'])[((i - 1) % 4) + 1]::uuid,
  'data.alchemist.' || lpad(i::text, 2, '0') || '@polyforge.school',
  '2026-01-04'
FROM generate_series(1, 28) AS series(i)
ON CONFLICT ("user_id", "cohort_id") DO UPDATE SET
  "guild_id" = EXCLUDED."guild_id",
  "institutional_email" = EXCLUDED."institutional_email";
--> statement-breakpoint
INSERT INTO "game_characters" ("student_id", "character_class", "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma", "updated_at")
SELECT
  ('71000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  (ARRAY['scholar','champion','guide','specialist'])[((i - 1) % 4) + 1],
  2 + (i % 5),
  3 + (i % 6),
  1 + (i % 4),
  4 + (i % 7),
  2 + (i % 5),
  1 + (i % 6),
  '2026-02-01'
FROM generate_series(1, 16) AS series(i)
ON CONFLICT ("student_id") DO UPDATE SET
  "character_class" = EXCLUDED."character_class",
  "strength" = EXCLUDED."strength",
  "dexterity" = EXCLUDED."dexterity",
  "constitution" = EXCLUDED."constitution",
  "intelligence" = EXCLUDED."intelligence",
  "wisdom" = EXCLUDED."wisdom",
  "charisma" = EXCLUDED."charisma",
  "updated_at" = EXCLUDED."updated_at";
--> statement-breakpoint
INSERT INTO "game_characters" ("student_id", "character_class", "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma", "updated_at")
SELECT
  ('73000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  (ARRAY['scholar','champion','guide','specialist'])[((i - 1) % 4) + 1],
  8 + (i % 7),
  7 + (i % 8),
  6 + (i % 6),
  10 + (i % 9),
  7 + (i % 7),
  6 + (i % 8),
  '2026-04-20'
FROM generate_series(1, 28) AS series(i)
ON CONFLICT ("student_id") DO UPDATE SET
  "character_class" = EXCLUDED."character_class",
  "strength" = EXCLUDED."strength",
  "dexterity" = EXCLUDED."dexterity",
  "constitution" = EXCLUDED."constitution",
  "intelligence" = EXCLUDED."intelligence",
  "wisdom" = EXCLUDED."wisdom",
  "charisma" = EXCLUDED."charisma",
  "updated_at" = EXCLUDED."updated_at";
--> statement-breakpoint
INSERT INTO "game_activities" ("id", "type", "title", "is_graded", "map_x", "map_y", "sector_depth", "required_level", "step_ranges", "card_color", "participation_mode", "base_points", "metadata", "created_at") VALUES
  ('80000000-0000-4000-8000-000000000006', 'character_creation', 'Le Cercle de Création du Personnage', false, 72, 300, 0, 1, '[{"startStep":0,"endStep":2}]', null, 'solo', 25, '{"kind":"profile-onboarding"}', '2026-01-07')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "game_activity_edges" ("id", "from_activity_id", "to_activity_id", "metadata", "created_at") VALUES
  ('82000000-0000-4000-8000-000000000006', '80000000-0000-4000-8000-000000000006', '80000000-0000-4000-8000-000000000001', '{"source":"auditSeed"}', '2026-01-07')
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "game_map_runs" ("id", "cohort_id", "current_sector_depth", "fog_reveal_depth", "status", "created_at", "updated_at") VALUES
  ('81000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 2, 2, 'active', '2026-01-10', now()),
  ('81000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', 4, 4, 'active', '2026-01-10', now()),
  ('81000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000004', 0, 1, 'active', '2026-09-01', now())
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "game_activity_completions" ("id", "student_id", "cohort_id", "activity_id", "completion_type", "grade", "work_url", "metadata", "created_at", "updated_at")
SELECT
  ('91000000-0000-4000-8000-' || lpad(((i - 1) * 3 + activity_ord)::text, 12, '0'))::uuid,
  ('71000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  '40000000-0000-4000-8000-000000000001',
  activity_id::uuid,
  completion_type::"game_activity_completion_type",
  grade,
  null,
  '{"source":"generated-audit-seed"}'::jsonb,
  '2026-02-01'::timestamp with time zone + (i || ' hours')::interval,
  '2026-02-01'::timestamp with time zone + (i || ' hours')::interval
FROM generate_series(1, 16) AS series(i)
CROSS JOIN LATERAL (
  VALUES
    (1, '80000000-0000-4000-8000-000000000006', 'system', null::double precision),
    (2, '80000000-0000-4000-8000-000000000001', 'read', null::double precision),
    (3, '80000000-0000-4000-8000-000000000002', 'submission', 0.72::double precision + ((i % 5)::double precision / 100))
) AS activities(activity_ord, activity_id, completion_type, grade)
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "game_activity_completions" ("id", "student_id", "cohort_id", "activity_id", "completion_type", "grade", "work_url", "metadata", "created_at", "updated_at")
SELECT
  ('92000000-0000-4000-8000-' || lpad(((i - 1) * 5 + activity_ord)::text, 12, '0'))::uuid,
  ('73000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  '40000000-0000-4000-8000-000000000003',
  activity_id::uuid,
  completion_type::"game_activity_completion_type",
  grade,
  CASE WHEN activity_ord = 5 THEN 'https://github.com/eduquest/data-alchemists-boss-' || i ELSE null END,
  '{"source":"generated-audit-seed"}'::jsonb,
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
WHERE activity_ord < 5 OR i % 3 = 0
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "game_character_moves" ("id", "student_id", "cohort_id", "map_run_id", "from_activity_id", "to_activity_id", "move_type", "metadata", "created_at")
SELECT
  ('93000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  ('73000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  '40000000-0000-4000-8000-000000000003',
  '81000000-0000-4000-8000-000000000003',
  CASE WHEN i % 3 = 0 THEN '80000000-0000-4000-8000-000000000003' ELSE '80000000-0000-4000-8000-000000000002' END::uuid,
  CASE WHEN i % 3 = 0 THEN '80000000-0000-4000-8000-000000000005' ELSE '80000000-0000-4000-8000-000000000003' END::uuid,
  'move',
  '{"source":"generated-audit-seed"}'::jsonb,
  '2026-04-18'::timestamp with time zone + (i || ' hours')::interval
FROM generate_series(1, 28) AS series(i)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "game_character_moves" ("id", "student_id", "cohort_id", "map_run_id", "from_activity_id", "to_activity_id", "move_type", "metadata", "created_at")
SELECT
  ('94000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  ('71000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
  '40000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001',
  '80000000-0000-4000-8000-000000000001',
  CASE WHEN i % 4 = 0 THEN '80000000-0000-4000-8000-000000000003' ELSE '80000000-0000-4000-8000-000000000002' END::uuid,
  'move',
  '{"source":"generated-audit-seed"}'::jsonb,
  '2026-02-12'::timestamp with time zone + (i || ' hours')::interval
FROM generate_series(1, 16) AS series(i)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "cohort_progress" ("id", "cohort_id", "label_i18n_key", "current_points", "created_at", "updated_at") VALUES
  ('d0000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000004', 'dashboard.dock.milestone', 0, '2026-09-01', now())
ON CONFLICT ("id") DO UPDATE SET
  "current_points" = EXCLUDED."current_points",
  "updated_at" = now();
--> statement-breakpoint
UPDATE "cohort_progress" SET "current_points" = 540, "updated_at" = now()
WHERE "cohort_id" = '40000000-0000-4000-8000-000000000001';
--> statement-breakpoint
UPDATE "cohort_progress" SET "current_points" = 920, "updated_at" = now()
WHERE "cohort_id" = '40000000-0000-4000-8000-000000000003';
--> statement-breakpoint
INSERT INTO "progress_milestones" ("id", "progress_id", "label_i18n_key", "description_i18n_key", "cost", "reward_title_i18n_key", "reward_subtitle_i18n_key", "reward_accent_token", "sort_order", "created_at") VALUES
  ('d1000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000004', 'dashboard.milestones.spark.label', 'dashboard.milestones.spark.description', 12, 'dashboard.rewards.deadline.title', 'dashboard.rewards.deadline.subtitle', 'campfire', 10, '2026-09-01'),
  ('d1000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000004', 'dashboard.milestones.campfire.label', 'dashboard.milestones.campfire.description', 24, 'dashboard.rewards.miniGame.title', 'dashboard.rewards.miniGame.subtitle', 'completed', 20, '2026-09-01'),
  ('d1000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000004', 'dashboard.milestones.quest.label', 'dashboard.milestones.quest.description', 38, 'dashboard.rewards.techHelp.title', 'dashboard.rewards.techHelp.subtitle', 'quest', 30, '2026-09-01'),
  ('d1000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000004', 'dashboard.milestones.rally.label', 'dashboard.milestones.rally.description', 52, 'dashboard.rewards.reroll.title', 'dashboard.rewards.reroll.subtitle', 'specialist', 40, '2026-09-01'),
  ('d1000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000004', 'dashboard.milestones.treasure.label', 'dashboard.milestones.treasure.description', 66, 'dashboard.milestones.treasure.label', null, 'quest', 50, '2026-09-01'),
  ('d1000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000004', 'dashboard.milestones.boss.label', 'dashboard.milestones.boss.description', 78, 'dashboard.milestones.boss.label', null, 'danger', 60, '2026-09-01'),
  ('d1000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000004', 'dashboard.milestones.legend.label', 'dashboard.milestones.legend.description', 90, 'dashboard.milestones.legend.label', null, 'specialist', 70, '2026-09-01'),
  ('d1000000-0000-4000-8000-000000000008', 'd0000000-0000-4000-8000-000000000004', 'dashboard.milestones.ascend.label', 'dashboard.milestones.ascend.description', 100, 'dashboard.milestones.ascend.label', null, 'completed', 80, '2026-09-01')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "notifications" ("id", "cohort_id", "title_i18n_key", "description_i18n_key", "icon", "tone", "action_label_i18n_key", "action_target", "sort_order", "created_at", "updated_at") VALUES
  ('d2000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000004', 'dashboard.notifications.cohortCampfire.title', 'dashboard.notifications.cohortCampfire.description', 'sparkles', 'info', 'dashboard.notifications.cohortCampfire.action', 'map', 10, '2026-09-01', now()),
  ('d2000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000003', 'dashboard.notifications.cohortQuest.title', 'dashboard.notifications.cohortQuest.description', 'map', 'success', 'dashboard.notifications.cohortQuest.action', 'map', 10, '2026-04-20', now())
ON CONFLICT ("id") DO NOTHING;
