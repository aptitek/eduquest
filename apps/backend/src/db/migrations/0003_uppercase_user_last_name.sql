UPDATE "users"
SET "last_name" = upper("last_name")
WHERE "last_name" IS NOT NULL
  AND "last_name" <> upper("last_name");--> statement-breakpoint
CREATE OR REPLACE FUNCTION uppercase_user_last_name()
RETURNS trigger AS $$
BEGIN
  IF NEW."last_name" IS NOT NULL THEN
    NEW."last_name" := upper(NEW."last_name");
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER users_uppercase_last_name
BEFORE INSERT OR UPDATE OF "last_name" ON "users"
FOR EACH ROW
EXECUTE FUNCTION uppercase_user_last_name();
