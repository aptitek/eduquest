-- No-op marker migration.
--
-- The remote database already has the map reveal columns from the historical 0000
-- schema, but did not have this migration recorded. Keep this file non-empty so
-- Wrangler can mark 0002 as applied without attempting duplicate ALTER TABLEs.

SELECT 1;
