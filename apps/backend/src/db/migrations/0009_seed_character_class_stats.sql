INSERT INTO "game_character_classes" (
  "slug",
  "name_i18n_key",
  "base_strength",
  "base_dexterity",
  "base_constitution",
  "base_intelligence",
  "base_wisdom",
  "base_charisma",
  "sort_order"
)
VALUES
  ('scholar', 'game.characterClasses.scholar', 0, 0, 0, 2, 1, 1, 0),
  ('champion', 'game.characterClasses.champion', 2, 0, 1, 0, 0, 1, 1),
  ('guide', 'game.characterClasses.guide', 0, 2, 0, 0, 1, 1, 2),
  ('specialist', 'game.characterClasses.specialist', 1, 1, 1, 1, 0, 0, 3)
ON CONFLICT ("slug") DO UPDATE SET
  "name_i18n_key" = EXCLUDED."name_i18n_key",
  "base_strength" = CASE WHEN "game_character_classes"."base_strength" = 0
    AND "game_character_classes"."base_dexterity" = 0
    AND "game_character_classes"."base_constitution" = 0
    AND "game_character_classes"."base_intelligence" = 0
    AND "game_character_classes"."base_wisdom" = 0
    AND "game_character_classes"."base_charisma" = 0
    THEN EXCLUDED."base_strength" ELSE "game_character_classes"."base_strength" END,
  "base_dexterity" = CASE WHEN "game_character_classes"."base_strength" = 0
    AND "game_character_classes"."base_dexterity" = 0
    AND "game_character_classes"."base_constitution" = 0
    AND "game_character_classes"."base_intelligence" = 0
    AND "game_character_classes"."base_wisdom" = 0
    AND "game_character_classes"."base_charisma" = 0
    THEN EXCLUDED."base_dexterity" ELSE "game_character_classes"."base_dexterity" END,
  "base_constitution" = CASE WHEN "game_character_classes"."base_strength" = 0
    AND "game_character_classes"."base_dexterity" = 0
    AND "game_character_classes"."base_constitution" = 0
    AND "game_character_classes"."base_intelligence" = 0
    AND "game_character_classes"."base_wisdom" = 0
    AND "game_character_classes"."base_charisma" = 0
    THEN EXCLUDED."base_constitution" ELSE "game_character_classes"."base_constitution" END,
  "base_intelligence" = CASE WHEN "game_character_classes"."base_strength" = 0
    AND "game_character_classes"."base_dexterity" = 0
    AND "game_character_classes"."base_constitution" = 0
    AND "game_character_classes"."base_intelligence" = 0
    AND "game_character_classes"."base_wisdom" = 0
    AND "game_character_classes"."base_charisma" = 0
    THEN EXCLUDED."base_intelligence" ELSE "game_character_classes"."base_intelligence" END,
  "base_wisdom" = CASE WHEN "game_character_classes"."base_strength" = 0
    AND "game_character_classes"."base_dexterity" = 0
    AND "game_character_classes"."base_constitution" = 0
    AND "game_character_classes"."base_intelligence" = 0
    AND "game_character_classes"."base_wisdom" = 0
    AND "game_character_classes"."base_charisma" = 0
    THEN EXCLUDED."base_wisdom" ELSE "game_character_classes"."base_wisdom" END,
  "base_charisma" = CASE WHEN "game_character_classes"."base_strength" = 0
    AND "game_character_classes"."base_dexterity" = 0
    AND "game_character_classes"."base_constitution" = 0
    AND "game_character_classes"."base_intelligence" = 0
    AND "game_character_classes"."base_wisdom" = 0
    AND "game_character_classes"."base_charisma" = 0
    THEN EXCLUDED."base_charisma" ELSE "game_character_classes"."base_charisma" END,
  "sort_order" = EXCLUDED."sort_order";
