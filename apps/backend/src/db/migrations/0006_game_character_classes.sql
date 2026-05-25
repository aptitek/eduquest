CREATE TABLE IF NOT EXISTS "game_character_classes" (
  "slug" text PRIMARY KEY NOT NULL,
  "name_i18n_key" text NOT NULL,
  "sort_order" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_character_classes' AND column_name = 'dnd_name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_character_classes' AND column_name = 'name_i18n_key'
  ) THEN
    ALTER TABLE "game_character_classes" RENAME COLUMN "dnd_name" TO "name_i18n_key";
  END IF;
END $$;

INSERT INTO "game_character_classes" ("slug", "name_i18n_key", "sort_order") VALUES
  ('scholar', 'game.characterClasses.scholar', 10),
  ('champion', 'game.characterClasses.champion', 20),
  ('guide', 'game.characterClasses.guide', 30),
  ('specialist', 'game.characterClasses.specialist', 40)
ON CONFLICT ("slug") DO UPDATE SET
  "name_i18n_key" = EXCLUDED."name_i18n_key",
  "sort_order" = EXCLUDED."sort_order";

UPDATE "game_characters"
SET "character_class" = CASE
  WHEN "character_class" IN ('scholar', 'champion', 'guide', 'specialist') THEN "character_class"
  WHEN lower(coalesce("character_class", '')) LIKE '%champion%' THEN 'champion'
  WHEN lower(coalesce("character_class", '')) LIKE '%guide%' THEN 'guide'
  WHEN lower(coalesce("character_class", '')) LIKE '%specialist%' THEN 'specialist'
  WHEN lower(coalesce("character_class", '')) LIKE '%ranger%' THEN 'guide'
  WHEN lower(coalesce("character_class", '')) LIKE '%bard%' THEN 'guide'
  WHEN lower(coalesce("character_class", '')) LIKE '%paladin%' THEN 'champion'
  WHEN lower(coalesce("character_class", '')) LIKE '%fighter%' THEN 'champion'
  WHEN lower(coalesce("character_class", '')) LIKE '%mage%' THEN 'specialist'
  WHEN lower(coalesce("character_class", '')) LIKE '%wizard%' THEN 'specialist'
  WHEN lower(coalesce("character_class", '')) LIKE '%oracle%' THEN 'specialist'
  WHEN "character_class" IN (
    'barbarian',
    'bard',
    'cleric',
    'druid',
    'fighter',
    'monk',
    'paladin',
    'ranger',
    'rogue',
    'sorcerer',
    'warlock',
    'wizard',
    'artificer'
  ) THEN 'specialist'
  ELSE 'scholar'
END;

ALTER TABLE "game_characters"
  ALTER COLUMN "character_class" SET DEFAULT 'scholar',
  ALTER COLUMN "character_class" SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE "game_characters"
    ADD CONSTRAINT "game_characters_character_class_game_character_classes_slug_fk"
    FOREIGN KEY ("character_class") REFERENCES "game_character_classes"("slug")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DELETE FROM "game_character_classes"
WHERE "slug" NOT IN ('scholar', 'champion', 'guide', 'specialist');
