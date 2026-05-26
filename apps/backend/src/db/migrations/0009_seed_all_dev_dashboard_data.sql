INSERT INTO "global_gauges" ("id", "cohort_id", "milestone_name", "current_points", "target_points", "created_at", "updated_at") VALUES
  ('a0000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', 'dashboard.dock.milestone', 368, 1000, '2026-01-01', now()),
  ('a0000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', 'dashboard.dock.milestone', 290, 1000, '2026-01-01', now())
ON CONFLICT ("id") DO UPDATE SET
  "current_points" = EXCLUDED."current_points",
  "target_points" = EXCLUDED."target_points",
  "updated_at" = now();
--> statement-breakpoint
INSERT INTO "global_gauge_milestones" ("id", "gauge_id", "label_i18n_key", "description_i18n_key", "position_percent", "sort_order") VALUES
  ('a2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'dashboard.milestones.spark.label', 'dashboard.milestones.spark.description', 12, 10),
  ('a2000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'dashboard.milestones.campfire.label', 'dashboard.milestones.campfire.description', 24, 20),
  ('a2000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 'dashboard.milestones.quest.label', 'dashboard.milestones.quest.description', 38, 30),
  ('a2000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000002', 'dashboard.milestones.rally.label', 'dashboard.milestones.rally.description', 52, 40),
  ('a2000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000002', 'dashboard.milestones.treasure.label', 'dashboard.milestones.treasure.description', 66, 50),
  ('a2000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000002', 'dashboard.milestones.boss.label', 'dashboard.milestones.boss.description', 78, 60),
  ('a2000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000002', 'dashboard.milestones.legend.label', 'dashboard.milestones.legend.description', 90, 70),
  ('a2000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000002', 'dashboard.milestones.ascend.label', 'dashboard.milestones.ascend.description', 100, 80),
  ('a3000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003', 'dashboard.milestones.spark.label', 'dashboard.milestones.spark.description', 12, 10),
  ('a3000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', 'dashboard.milestones.campfire.label', 'dashboard.milestones.campfire.description', 24, 20),
  ('a3000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', 'dashboard.milestones.quest.label', 'dashboard.milestones.quest.description', 38, 30),
  ('a3000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000003', 'dashboard.milestones.rally.label', 'dashboard.milestones.rally.description', 52, 40),
  ('a3000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000003', 'dashboard.milestones.treasure.label', 'dashboard.milestones.treasure.description', 66, 50),
  ('a3000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000003', 'dashboard.milestones.boss.label', 'dashboard.milestones.boss.description', 78, 60),
  ('a3000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000003', 'dashboard.milestones.legend.label', 'dashboard.milestones.legend.description', 90, 70),
  ('a3000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000003', 'dashboard.milestones.ascend.label', 'dashboard.milestones.ascend.description', 100, 80)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "cohort_reward_cards" ("id", "cohort_id", "title_i18n_key", "subtitle_i18n_key", "accent_token", "sort_order") VALUES
  ('b1000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', 'dashboard.rewards.deadline.title', 'dashboard.rewards.deadline.subtitle', 'campfire', 10),
  ('b1000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', 'dashboard.rewards.miniGame.title', 'dashboard.rewards.miniGame.subtitle', 'completed', 20),
  ('b1000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000002', 'dashboard.rewards.techHelp.title', 'dashboard.rewards.techHelp.subtitle', 'quest', 30),
  ('b1000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000002', 'dashboard.rewards.reroll.title', 'dashboard.rewards.reroll.subtitle', 'specialist', 40),
  ('b2000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000003', 'dashboard.rewards.deadline.title', 'dashboard.rewards.deadline.subtitle', 'campfire', 10),
  ('b2000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000003', 'dashboard.rewards.miniGame.title', 'dashboard.rewards.miniGame.subtitle', 'completed', 20),
  ('b2000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', 'dashboard.rewards.techHelp.title', 'dashboard.rewards.techHelp.subtitle', 'quest', 30),
  ('b2000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000003', 'dashboard.rewards.reroll.title', 'dashboard.rewards.reroll.subtitle', 'specialist', 40)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "dashboard_notifications" ("id", "cohort_id", "title_i18n_key", "description_i18n_key", "meta_i18n_key", "icon", "tone", "action_label_i18n_key", "action_target", "sort_order") VALUES
  ('c1000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', 'dashboard.notifications.cohortQuest.title', 'dashboard.notifications.cohortQuest.description', 'dashboard.notifications.cohortQuest.meta', 'map', 'info', 'dashboard.notifications.cohortQuest.action', 'map', 10),
  ('c1000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', 'dashboard.notifications.cohortCampfire.title', 'dashboard.notifications.cohortCampfire.description', 'dashboard.notifications.cohortCampfire.meta', 'sparkles', 'success', 'dashboard.notifications.cohortCampfire.action', 'acknowledge', 20),
  ('c1000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000002', 'dashboard.notifications.rewardGold.title', 'dashboard.notifications.rewardGold.description', 'dashboard.notifications.rewardGold.meta', 'coins', 'warning', 'dashboard.notifications.rewardGold.action', 'collect', 30),
  ('c1000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000002', 'dashboard.notifications.rewardSpend.title', 'dashboard.notifications.rewardSpend.description', 'dashboard.notifications.rewardSpend.meta', 'gift', 'neutral', 'dashboard.notifications.rewardSpend.action', 'review', 40),
  ('c2000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000003', 'dashboard.notifications.cohortQuest.title', 'dashboard.notifications.cohortQuest.description', 'dashboard.notifications.cohortQuest.meta', 'map', 'info', 'dashboard.notifications.cohortQuest.action', 'map', 10),
  ('c2000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000003', 'dashboard.notifications.cohortCampfire.title', 'dashboard.notifications.cohortCampfire.description', 'dashboard.notifications.cohortCampfire.meta', 'sparkles', 'success', 'dashboard.notifications.cohortCampfire.action', 'acknowledge', 20),
  ('c2000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', 'dashboard.notifications.rewardGold.title', 'dashboard.notifications.rewardGold.description', 'dashboard.notifications.rewardGold.meta', 'coins', 'warning', 'dashboard.notifications.rewardGold.action', 'collect', 30),
  ('c2000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000003', 'dashboard.notifications.rewardSpend.title', 'dashboard.notifications.rewardSpend.description', 'dashboard.notifications.rewardSpend.meta', 'gift', 'neutral', 'dashboard.notifications.rewardSpend.action', 'review', 40)
ON CONFLICT ("id") DO NOTHING;
