-- Split guilds that are bigger than 3 players in several guilds, and enforce max_members = 3.

INSERT INTO guilds (
  id,
  cohort_id,
  name,
  description,
  icon_url,
  icon_key,
  color,
  gold,
  recruitment_status,
  recruitment_message,
  max_members,
  created_at,
  updated_at
)
WITH members_to_split AS (
  SELECT
    user_id,
    cohort_id,
    guild_id as old_guild_id,
    ((row_number() over (partition by guild_id order by user_id)) - 1) / 3 as group_index
  FROM cohort_memberships
  WHERE guild_id IS NOT NULL
),
groups_to_create AS (
  SELECT DISTINCT old_guild_id, group_index
  FROM members_to_split
  WHERE group_index > 0
)
SELECT
  substr(g.id, 1, 19) || printf('%04x', 32768 + gc.group_index) || '-' || substr(g.id, 25),
  g.cohort_id,
  g.name || ' (' || (gc.group_index + 1) || ')',
  g.description,
  g.icon_url,
  g.icon_key,
  g.color,
  0,
  g.recruitment_status,
  g.recruitment_message,
  3,
  g.created_at,
  g.updated_at
FROM groups_to_create gc
JOIN guilds g ON g.id = gc.old_guild_id;

--> statement-breakpoint
INSERT INTO guild_vote_balances (
  id,
  guild_id,
  cohort_id,
  vote_balance,
  created_at,
  updated_at
)
WITH members_to_split AS (
  SELECT
    user_id,
    cohort_id,
    guild_id as old_guild_id,
    ((row_number() over (partition by guild_id order by user_id)) - 1) / 3 as group_index
  FROM cohort_memberships
  WHERE guild_id IS NOT NULL
),
groups_to_create AS (
  SELECT DISTINCT old_guild_id, group_index
  FROM members_to_split
  WHERE group_index > 0
)
SELECT
  (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  substr(g.id, 1, 19) || printf('%04x', 32768 + gc.group_index) || '-' || substr(g.id, 25),
  g.cohort_id,
  0,
  g.created_at,
  g.updated_at
FROM groups_to_create gc
JOIN guilds g ON g.id = gc.old_guild_id;

--> statement-breakpoint
UPDATE cohort_memberships
SET guild_id = (
  WITH members_to_split AS (
    SELECT
      user_id,
      cohort_id,
      guild_id as old_guild_id,
      ((row_number() over (partition by guild_id order by user_id)) - 1) / 3 as group_index
    FROM cohort_memberships
    WHERE guild_id IS NOT NULL
  )
  SELECT substr(m.old_guild_id, 1, 19) || printf('%04x', 32768 + m.group_index) || '-' || substr(m.old_guild_id, 25)
  FROM members_to_split m
  WHERE m.user_id = cohort_memberships.user_id
    AND m.cohort_id = cohort_memberships.cohort_id
)
WHERE (user_id, cohort_id) IN (
  WITH members_to_split AS (
    SELECT
      user_id,
      cohort_id,
      guild_id as old_guild_id,
      ((row_number() over (partition by guild_id order by user_id)) - 1) / 3 as group_index
    FROM cohort_memberships
    WHERE guild_id IS NOT NULL
  )
  SELECT user_id, cohort_id
  FROM members_to_split
  WHERE group_index > 0
);

--> statement-breakpoint
UPDATE guilds
SET max_members = 3
WHERE max_members > 3;
