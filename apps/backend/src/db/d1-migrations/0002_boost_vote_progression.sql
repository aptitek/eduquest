ALTER TABLE `progress_milestones` ADD `vote_opened_at` integer;
--> statement-breakpoint
ALTER TABLE `progress_milestones` ADD `vote_closed_at` integer;
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
CREATE UNIQUE INDEX `guild_vote_balances_guild_cohort_idx` ON `guild_vote_balances` (`guild_id`,`cohort_id`);
