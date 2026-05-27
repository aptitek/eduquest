UPDATE "game_activities"
SET "metadata" = COALESCE("metadata", '{}'::jsonb)
  || jsonb_build_object(
    'answerFields',
    jsonb_build_array(
      jsonb_build_object(
        'id', 'workUrl',
        'label', 'Project URL',
        'kind', 'url',
        'placeholder', 'https://github.com/your-team/project'
      ),
      jsonb_build_object(
        'id', 'attachments',
        'label', 'Project files',
        'kind', 'file',
        'required', false,
        'accept', '.pdf,.zip,.txt,.md,.png,.jpg,.jpeg,.webp,.gif,.json',
        'maxFiles', 3,
        'maxBytes', 10485760
      )
    )
  )
WHERE "type" IN ('boss', 'mini_boss')
  AND NOT (COALESCE("metadata", '{}'::jsonb) ? 'answerFields');
