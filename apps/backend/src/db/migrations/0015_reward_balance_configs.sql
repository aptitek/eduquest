CREATE TABLE IF NOT EXISTS "reward_balance_configs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "version" integer NOT NULL,
  "label" text,
  "config" jsonb NOT NULL,
  "is_active" boolean NOT NULL DEFAULT false,
  "effective_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid REFERENCES "users"("id"),
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "reward_balance_configs_active_idx"
  ON "reward_balance_configs" ("is_active")
  WHERE "is_active" = true;

INSERT INTO "reward_balance_configs" ("version", "label", "config", "is_active")
VALUES (
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
)
WHERE NOT EXISTS (
  SELECT 1 FROM "reward_balance_configs" WHERE "is_active" = true
);
