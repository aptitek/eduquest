WITH clipped AS (
  SELECT
    "student_id",
    LEAST(GREATEST("strength", 0), 5) AS "strength",
    LEAST(GREATEST("dexterity", 0), 5) AS "dexterity",
    LEAST(GREATEST("constitution", 0), 5) AS "constitution",
    LEAST(GREATEST("intelligence", 0), 5) AS "intelligence",
    LEAST(GREATEST("wisdom", 0), 5) AS "wisdom",
    LEAST(GREATEST("charisma", 0), 5) AS "charisma"
  FROM "game_characters"
)
UPDATE "game_characters" AS gc
SET
  "strength" = repaired_strength."value",
  "dexterity" = repaired_dexterity."value",
  "constitution" = repaired_constitution."value",
  "intelligence" = repaired_intelligence."value",
  "wisdom" = repaired_wisdom."value",
  "charisma" = repaired_charisma."value"
FROM clipped
CROSS JOIN LATERAL (SELECT LEAST(clipped."strength", 6) AS "value") repaired_strength
CROSS JOIN LATERAL (SELECT LEAST(clipped."dexterity", GREATEST(0, 6 - repaired_strength."value")) AS "value") repaired_dexterity
CROSS JOIN LATERAL (SELECT LEAST(clipped."constitution", GREATEST(0, 6 - repaired_strength."value" - repaired_dexterity."value")) AS "value") repaired_constitution
CROSS JOIN LATERAL (SELECT LEAST(clipped."intelligence", GREATEST(0, 6 - repaired_strength."value" - repaired_dexterity."value" - repaired_constitution."value")) AS "value") repaired_intelligence
CROSS JOIN LATERAL (SELECT LEAST(clipped."wisdom", GREATEST(0, 6 - repaired_strength."value" - repaired_dexterity."value" - repaired_constitution."value" - repaired_intelligence."value")) AS "value") repaired_wisdom
CROSS JOIN LATERAL (SELECT LEAST(clipped."charisma", GREATEST(0, 6 - repaired_strength."value" - repaired_dexterity."value" - repaired_constitution."value" - repaired_intelligence."value" - repaired_wisdom."value")) AS "value") repaired_charisma
WHERE gc."student_id" = clipped."student_id";
--> statement-breakpoint
ALTER TABLE "game_characters" ADD CONSTRAINT "game_characters_manual_stat_range_check" CHECK (
  "strength" BETWEEN 0 AND 5
  AND "dexterity" BETWEEN 0 AND 5
  AND "constitution" BETWEEN 0 AND 5
  AND "intelligence" BETWEEN 0 AND 5
  AND "wisdom" BETWEEN 0 AND 5
  AND "charisma" BETWEEN 0 AND 5
);
--> statement-breakpoint
ALTER TABLE "game_characters" ADD CONSTRAINT "game_characters_manual_stat_budget_check" CHECK (
  "strength" + "dexterity" + "constitution" + "intelligence" + "wisdom" + "charisma" <= 6
);
