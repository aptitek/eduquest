DROP INDEX IF EXISTS "reward_balance_configs_active_idx";
ALTER TABLE "reward_balance_configs" ADD COLUMN IF NOT EXISTS "cohort_id" uuid;
ALTER TABLE "reward_balance_configs" ADD CONSTRAINT "reward_balance_configs_cohort_id_cohorts_id_fk" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE cascade ON UPDATE no action;
CREATE UNIQUE INDEX IF NOT EXISTS "reward_balance_configs_active_global_idx" ON "reward_balance_configs" USING btree ("is_active") WHERE "reward_balance_configs"."is_active" = true AND "reward_balance_configs"."cohort_id" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "reward_balance_configs_active_cohort_idx" ON "reward_balance_configs" USING btree ("cohort_id","is_active") WHERE "reward_balance_configs"."is_active" = true AND "reward_balance_configs"."cohort_id" IS NOT NULL;
