UPDATE "game_activities"
SET "card_color" = NULL
WHERE "id" = '80000000-0000-4000-8000-000000000006'
  AND "metadata"->>'kind' = 'profile-onboarding'
  AND "card_color" = 'var(--color-status-campfire)';
