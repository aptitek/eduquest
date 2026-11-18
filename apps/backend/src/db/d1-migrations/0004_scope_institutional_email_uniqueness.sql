-- Scope institutional_email uniqueness per cohort rather than globally across all cohorts,
-- allowing a student enrolled in multiple cohorts of the same school to share their school email.

UPDATE `cohort_memberships`
SET `institutional_email` = NULL
WHERE `institutional_email` IS NOT NULL
  AND trim(`institutional_email`) = '';

--> statement-breakpoint
DROP INDEX IF EXISTS `cohort_memberships_institutional_email_unique`;

--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `cohort_memberships_cohort_institutional_email_unique`
ON `cohort_memberships` (`cohort_id`, `institutional_email`);

--> statement-breakpoint
UPDATE `cohort_memberships`
SET `institutional_email` = (
  SELECT prev.`institutional_email`
  FROM `cohort_memberships` prev
  JOIN `cohorts` prev_c ON prev_c.`id` = prev.`cohort_id`
  JOIN `cohorts` curr_c ON curr_c.`id` = `cohort_memberships`.`cohort_id`
  WHERE prev.`user_id` = `cohort_memberships`.`user_id`
    AND prev_c.`school_id` = curr_c.`school_id`
    AND prev.`institutional_email` IS NOT NULL
    AND trim(prev.`institutional_email`) <> ''
  ORDER BY prev.`created_at` DESC
  LIMIT 1
)
WHERE `institutional_email` IS NULL
  AND EXISTS (
    SELECT 1
    FROM `cohort_memberships` prev
    JOIN `cohorts` prev_c ON prev_c.`id` = prev.`cohort_id`
    JOIN `cohorts` curr_c ON curr_c.`id` = `cohort_memberships`.`cohort_id`
    WHERE prev.`user_id` = `cohort_memberships`.`user_id`
      AND prev_c.`school_id` = curr_c.`school_id`
      AND prev.`institutional_email` IS NOT NULL
      AND trim(prev.`institutional_email`) <> ''
  );
