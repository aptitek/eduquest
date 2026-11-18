CREATE TABLE `addresses` (
	`id` text PRIMARY KEY NOT NULL,
	`line_1` text NOT NULL,
	`line_2` text,
	`postal_code` text,
	`city` text NOT NULL,
	`country` text,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	`updated_at` integer DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`table_name` text NOT NULL,
	`record_id` text NOT NULL,
	`action` text NOT NULL,
	`old_data` text,
	`new_data` text,
	`user_id` text,
	`changed_at` integer DEFAULT (unixepoch() * 1000),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `campuses` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`address_id` text,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	`updated_at` integer DEFAULT (unixepoch() * 1000),
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`address_id`) REFERENCES `addresses`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `cohort_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`cohort_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	FOREIGN KEY (`cohort_id`) REFERENCES `cohorts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `cohort_memberships` (
	`user_id` text NOT NULL,
	`cohort_id` text NOT NULL,
	`guild_id` text,
	`institutional_email` text,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	PRIMARY KEY(`user_id`, `cohort_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`cohort_id`) REFERENCES `cohorts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cohort_memberships_institutional_email_unique` ON `cohort_memberships` (`institutional_email`);--> statement-breakpoint
CREATE TABLE `cohort_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`cohort_id` text NOT NULL,
	`label_i18n_key` text NOT NULL,
	`current_points` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	`updated_at` integer DEFAULT (unixepoch() * 1000),
	FOREIGN KEY (`cohort_id`) REFERENCES `cohorts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `cohorts` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`campus_id` text,
	`start_year` integer NOT NULL,
	`grade` text NOT NULL,
	`level` integer NOT NULL,
	`current_step` integer DEFAULT 1 NOT NULL,
	`registration_open` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`major_speciality` text,
	`minor_speciality` text,
	`description` text,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	`updated_at` integer DEFAULT (unixepoch() * 1000),
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`campus_id`) REFERENCES `campuses`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cohorts_registration_open_idx` ON `cohorts` (`registration_open`) WHERE "cohorts"."registration_open" = true;--> statement-breakpoint
CREATE TABLE `game_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`cohort_id` text,
	`template_activity_id` text,
	`map_run_id` text,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`start_date` integer,
	`end_date` integer,
	`url` text,
	`is_graded` integer DEFAULT false NOT NULL,
	`map_x` integer DEFAULT 0 NOT NULL,
	`map_y` integer DEFAULT 0 NOT NULL,
	`sector_depth` integer DEFAULT 0 NOT NULL,
	`required_level` integer DEFAULT 1 NOT NULL,
	`step_ranges` text DEFAULT '[]' NOT NULL,
	`card_color` text,
	`participation_mode` text DEFAULT 'solo' NOT NULL,
	`base_points` integer DEFAULT 0 NOT NULL,
	`target_attribute` text,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	FOREIGN KEY (`cohort_id`) REFERENCES `cohorts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_activity_id`) REFERENCES `game_activities`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`map_run_id`) REFERENCES `game_map_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `game_activity_completions` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`cohort_id` text NOT NULL,
	`activity_id` text NOT NULL,
	`completion_type` text DEFAULT 'read' NOT NULL,
	`grade` real,
	`work_url` text,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	`updated_at` integer DEFAULT (unixepoch() * 1000),
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`cohort_id`) REFERENCES `cohorts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`activity_id`) REFERENCES `game_activities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_activity_completions_student_cohort_activity_idx` ON `game_activity_completions` (`student_id`,`cohort_id`,`activity_id`);--> statement-breakpoint
CREATE TABLE `game_activity_edges` (
	`id` text PRIMARY KEY NOT NULL,
	`cohort_id` text,
	`map_run_id` text,
	`from_activity_id` text NOT NULL,
	`to_activity_id` text NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	FOREIGN KEY (`cohort_id`) REFERENCES `cohorts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`map_run_id`) REFERENCES `game_map_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_activity_id`) REFERENCES `game_activities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_activity_id`) REFERENCES `game_activities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_activity_edges_global_idx` ON `game_activity_edges` (`from_activity_id`,`to_activity_id`) WHERE "game_activity_edges"."cohort_id" IS NULL AND "game_activity_edges"."map_run_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `game_activity_edges_scope_idx` ON `game_activity_edges` (`from_activity_id`,`to_activity_id`,`cohort_id`,`map_run_id`);--> statement-breakpoint
CREATE TABLE `game_bonus_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`cohort_id` text NOT NULL,
	`title` text NOT NULL,
	`subtitle` text,
	`description` text,
	`cost` integer DEFAULT 0 NOT NULL,
	`accent_token` text DEFAULT 'quest' NOT NULL,
	`icon_key` text DEFAULT 'Gift' NOT NULL,
	`illustration_url` text,
	`color` text,
	`sort_order` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	`updated_at` integer DEFAULT (unixepoch() * 1000),
	FOREIGN KEY (`cohort_id`) REFERENCES `cohorts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `game_character_classes` (
	`slug` text PRIMARY KEY NOT NULL,
	`name_i18n_key` text NOT NULL,
	`name` text,
	`subtitle` text,
	`description` text,
	`icon_key` text,
	`color` text,
	`base_strength` integer DEFAULT 0 NOT NULL,
	`base_dexterity` integer DEFAULT 0 NOT NULL,
	`base_constitution` integer DEFAULT 0 NOT NULL,
	`base_intelligence` integer DEFAULT 0 NOT NULL,
	`base_wisdom` integer DEFAULT 0 NOT NULL,
	`base_charisma` integer DEFAULT 0 NOT NULL,
	`sort_order` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE TABLE `game_character_moves` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`cohort_id` text NOT NULL,
	`map_run_id` text NOT NULL,
	`from_activity_id` text,
	`to_activity_id` text NOT NULL,
	`move_type` text DEFAULT 'move' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`cohort_id`) REFERENCES `cohorts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`map_run_id`) REFERENCES `game_map_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_activity_id`) REFERENCES `game_activities`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`to_activity_id`) REFERENCES `game_activities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `game_character_moves_student_scope_created_idx` ON `game_character_moves` (`student_id`,`cohort_id`,`map_run_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `game_characters` (
	`student_id` text PRIMARY KEY NOT NULL,
	`character_class` text DEFAULT 'scholar' NOT NULL,
	`strength` integer DEFAULT 0 NOT NULL,
	`dexterity` integer DEFAULT 0 NOT NULL,
	`constitution` integer DEFAULT 0 NOT NULL,
	`intelligence` integer DEFAULT 0 NOT NULL,
	`wisdom` integer DEFAULT 0 NOT NULL,
	`charisma` integer DEFAULT 0 NOT NULL,
	`title` text,
	`illustration_url` text,
	`updated_at` integer DEFAULT (unixepoch() * 1000),
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`character_class`) REFERENCES `game_character_classes`(`slug`) ON UPDATE cascade ON DELETE restrict,
	CONSTRAINT "game_characters_manual_stat_range_check" CHECK("game_characters"."strength" BETWEEN 0 AND 5
        AND "game_characters"."dexterity" BETWEEN 0 AND 5
        AND "game_characters"."constitution" BETWEEN 0 AND 5
        AND "game_characters"."intelligence" BETWEEN 0 AND 5
        AND "game_characters"."wisdom" BETWEEN 0 AND 5
        AND "game_characters"."charisma" BETWEEN 0 AND 5),
	CONSTRAINT "game_characters_manual_stat_budget_check" CHECK("game_characters"."strength" + "game_characters"."dexterity" + "game_characters"."constitution" + "game_characters"."intelligence" + "game_characters"."wisdom" + "game_characters"."charisma" <= 6)
);
--> statement-breakpoint
CREATE TABLE `game_map_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`cohort_id` text NOT NULL,
	`current_sector_depth` integer DEFAULT 0 NOT NULL,
	`fog_reveal_depth` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	`updated_at` integer DEFAULT (unixepoch() * 1000),
	FOREIGN KEY (`cohort_id`) REFERENCES `cohorts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_map_runs_active_cohort_idx` ON `game_map_runs` (`cohort_id`) WHERE "game_map_runs"."status" = 'active';--> statement-breakpoint
CREATE TABLE `guild_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`cohort_id` text NOT NULL,
	`guild_id` text NOT NULL,
	`inviter_user_id` text NOT NULL,
	`invitee_user_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`message` text,
	`responded_at` integer,
	`expires_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	`updated_at` integer DEFAULT (unixepoch() * 1000),
	FOREIGN KEY (`cohort_id`) REFERENCES `cohorts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`inviter_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invitee_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `guild_invitations_pending_invitee_idx` ON `guild_invitations` (`guild_id`,`invitee_user_id`) WHERE "guild_invitations"."status" = 'pending';--> statement-breakpoint
CREATE INDEX `guild_invitations_invitee_status_idx` ON `guild_invitations` (`invitee_user_id`,`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `guilds` (
	`id` text PRIMARY KEY NOT NULL,
	`cohort_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`icon_url` text,
	`icon_key` text,
	`color` text,
	`gold` integer DEFAULT 0 NOT NULL,
	`recruitment_status` text DEFAULT 'open' NOT NULL,
	`recruitment_message` text,
	`max_members` integer DEFAULT 3 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	`updated_at` integer DEFAULT (unixepoch() * 1000),
	FOREIGN KEY (`cohort_id`) REFERENCES `cohorts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `guild_vote_balances` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`cohort_id` text NOT NULL,
	`vote_balance` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	`updated_at` integer DEFAULT (unixepoch() * 1000),
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`cohort_id`) REFERENCES `cohorts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `guild_vote_balances_guild_cohort_idx` ON `guild_vote_balances` (`guild_id`,`cohort_id`);--> statement-breakpoint
CREATE TABLE `milestone_bonus_votes` (
	`id` text PRIMARY KEY NOT NULL,
	`milestone_id` text NOT NULL,
	`bonus_card_id` text NOT NULL,
	`guild_id` text NOT NULL,
	`vote_count` integer DEFAULT 1 NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	`updated_at` integer DEFAULT (unixepoch() * 1000),
	FOREIGN KEY (`milestone_id`) REFERENCES `progress_milestones`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bonus_card_id`) REFERENCES `game_bonus_cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `milestone_bonus_votes_guild_milestone_idx` ON `milestone_bonus_votes` (`guild_id`,`milestone_id`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`cohort_id` text,
	`guild_id` text,
	`title_i18n_key` text NOT NULL,
	`description_i18n_key` text,
	`icon` text DEFAULT 'info' NOT NULL,
	`tone` text DEFAULT 'neutral' NOT NULL,
	`action_label_i18n_key` text,
	`action_target` text,
	`context` text,
	`sort_order` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	`updated_at` integer DEFAULT (unixepoch() * 1000),
	FOREIGN KEY (`cohort_id`) REFERENCES `cohorts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `point_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`guild_id` text NOT NULL,
	`student_id` text,
	`activity_id` text,
	`amount` integer NOT NULL,
	`transaction_type` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`activity_id`) REFERENCES `game_activities`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `progress_milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`progress_id` text NOT NULL,
	`label_i18n_key` text NOT NULL,
	`description_i18n_key` text,
	`cost` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`vote_opened_at` integer,
	`vote_closed_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	`updated_at` integer DEFAULT (unixepoch() * 1000),
	FOREIGN KEY (`progress_id`) REFERENCES `cohort_progress`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `reward_balance_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`cohort_id` text,
	`version` integer NOT NULL,
	`label` text,
	`config` text NOT NULL,
	`is_active` integer DEFAULT false NOT NULL,
	`effective_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`cohort_id`) REFERENCES `cohorts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reward_balance_configs_active_global_idx` ON `reward_balance_configs` (`is_active`) WHERE "reward_balance_configs"."is_active" = true AND "reward_balance_configs"."cohort_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `reward_balance_configs_active_cohort_idx` ON `reward_balance_configs` (`cohort_id`,`is_active`) WHERE "reward_balance_configs"."is_active" = true AND "reward_balance_configs"."cohort_id" IS NOT NULL;--> statement-breakpoint
CREATE TABLE `schools` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`logo_url` text,
	`website` text,
	`email_domain` text,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	`updated_at` integer DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE TABLE `student_skills_history` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text,
	`skills` text NOT NULL,
	`evaluated_at` integer DEFAULT (unixepoch() * 1000),
	`evaluated_by` text,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`evaluated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	`updated_at` integer DEFAULT (unixepoch() * 1000),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `students_user_id_unique` ON `students` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`github_email` text NOT NULL,
	`email` text NOT NULL,
	`github_sso_token` text,
	`github_username` text,
	`first_name` text,
	`last_name` text,
	`display_name` text,
	`birth_date` text,
	`pronouns` text,
	`bio` text,
	`avatar_url` text,
	`github_avatar_url` text,
	`user_status` text DEFAULT 'offline',
	`is_admin` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	`updated_at` integer DEFAULT (unixepoch() * 1000),
	`last_login` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_github_email_unique` ON `users` (`github_email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_github_username_unique` ON `users` (`github_username`);