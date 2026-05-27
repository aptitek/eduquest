import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  date,
  doublePrecision,
  pgEnum,
  primaryKey,
  uniqueIndex,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// ==========================================
// 1. SCHÉMAS ADMINISTRATIFS & UTILISATEURS
// ==========================================

// Table des écoles
export const schools = pgTable('schools', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  logoUrl: text('logo_url'),
  website: text('website'),
  emailDomain: text('email_domain'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Table des adresses postales
export const addresses = pgTable('addresses', {
  id: uuid('id').primaryKey().defaultRandom(),
  line1: text('line_1').notNull(),
  line2: text('line_2'),
  postalCode: text('postal_code'),
  city: text('city').notNull(),
  country: text('country'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Table des campus/sites rattachés à une école
export const campuses = pgTable('campuses', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  addressId: uuid('address_id').references(() => addresses.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Table des cohorts/classes d'étudiants. Chaque cohort appartient à une seule école.
export const cohorts = pgTable('cohorts', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  campusId: uuid('campus_id').references(() => campuses.id, { onDelete: 'set null' }),
  startYear: integer('start_year').notNull(),
  grade: text('grade').notNull(),
  level: integer('level').notNull(),
  currentStep: integer('current_step').default(1).notNull(),
  name: text('name').notNull(),
  majorSpeciality: text('major_speciality'),
  minorSpeciality: text('minor_speciality'),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const cohortInvites = pgTable('cohort_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  cohortId: uuid('cohort_id')
    .notNull()
    .references(() => cohorts.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Table des guildes (groupes d'étudiants / de jeu). Chaque guilde appartient à une seule cohort.
export const guilds = pgTable('guilds', {
  id: uuid('id').primaryKey().defaultRandom(),
  cohortId: uuid('cohort_id')
    .notNull()
    .references(() => cohorts.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  iconUrl: text('icon_url'),
  color: text('color'), // Code Hexa
  gold: integer('gold').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Table centrale des utilisateurs
export const userStatusEnum = pgEnum('user_status', ['online', 'offline', 'busy']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  githubSsoToken: text('github_sso_token'),
  githubUsername: text('github_username').unique(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  displayName: text('display_name'),
  birthDate: date('birth_date'),
  pronouns: text('pronouns'),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  githubAvatarUrl: text('github_avatar_url'),
  userStatus: userStatusEnum('user_status').default('offline'),
  isAdmin: boolean('is_admin').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  lastLogin: timestamp('last_login', { withTimezone: true }),
});

// Table des profils étudiants
export const students = pgTable('students', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .unique()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Association plusieurs-à-plusieurs entre utilisateurs étudiants et cohorts.
// Les admins restent universels et ne passent pas par cette table.
export const cohortMemberships = pgTable(
  'cohort_memberships',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    cohortId: uuid('cohort_id')
      .notNull()
      .references(() => cohorts.id, { onDelete: 'cascade' }),
    guildId: uuid('guild_id').references(() => guilds.id, { onDelete: 'set null' }),
    institutionalEmail: text('institutional_email').unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.cohortId] }),
  })
);

// Table de l'historique des compétences élève (Radar)
export const studentSkillsHistory = pgTable('student_skills_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').references(() => students.id),
  skills: jsonb('skills').notNull(), // ex: {"tech": 0.8, "soft": 0.5, "design": 0.2}
  evaluatedAt: timestamp('evaluated_at', { withTimezone: true }).defaultNow(),
  evaluatedBy: uuid('evaluated_by').references(() => users.id),
});

// ==========================================
// 2. SCHÉMAS LUDIQUES (game_)
// ==========================================

export const gameTargetAttributeEnum = pgEnum('game_target_attribute', [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
]);

export const gameActivityTypeEnum = pgEnum('game_activity_type', [
  'onboarding',
  'character_creation',
  'tavern',
  'tutorial',
  'ice_breaker',
  'campfire',
  'quiz',
  'practical',
  'mini_boss',
  'boss',
]);

export const pointTransactionTypeEnum = pgEnum('point_transaction_type', [
  'EARNED',
  'SPENT_VOTE',
  'MANUAL_BONUS',
]);

export const gameMapRunStatusEnum = pgEnum('game_map_run_status', [
  'active',
  'completed',
  'archived',
]);

export const gameActivityCompletionTypeEnum = pgEnum('game_activity_completion_type', [
  'read',
  'submission',
  'battle',
  'system',
]);

export const gameCharacterMoveTypeEnum = pgEnum('game_character_move_type', ['enter', 'move']);

export const gameActivityParticipationModeEnum = pgEnum('game_activity_participation_mode', [
  'solo',
  'guild',
]);

// Table des classes de personnage. Les libellés affichés doivent être traduits côté UI depuis `name_i18n_key`.
export const gameCharacterClasses = pgTable('game_character_classes', {
  slug: text('slug').primaryKey(),
  nameI18nKey: text('name_i18n_key').notNull(),
  baseStrength: integer('base_strength').default(0).notNull(),
  baseDexterity: integer('base_dexterity').default(0).notNull(),
  baseConstitution: integer('base_constitution').default(0).notNull(),
  baseIntelligence: integer('base_intelligence').default(0).notNull(),
  baseWisdom: integer('base_wisdom').default(0).notNull(),
  baseCharisma: integer('base_charisma').default(0).notNull(),
  sortOrder: integer('sort_order').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Table des fiches personnages (le "verso" de l'étudiant)
export const gameCharacters = pgTable('game_characters', {
  studentId: uuid('student_id')
    .primaryKey()
    .references(() => students.id),
  characterClass: text('character_class')
    .notNull()
    .default('scholar')
    .references(() => gameCharacterClasses.slug, { onDelete: 'restrict', onUpdate: 'cascade' }),
  strength: integer('strength').default(0).notNull(),
  dexterity: integer('dexterity').default(0).notNull(),
  constitution: integer('constitution').default(0).notNull(),
  intelligence: integer('intelligence').default(0).notNull(),
  wisdom: integer('wisdom').default(0).notNull(),
  charisma: integer('charisma').default(0).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const gameMapRuns = pgTable(
  'game_map_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cohortId: uuid('cohort_id')
      .notNull()
      .references(() => cohorts.id, { onDelete: 'cascade' }),
    currentSectorDepth: integer('current_sector_depth').default(0).notNull(),
    fogRevealDepth: integer('fog_reveal_depth').default(1).notNull(),
    status: gameMapRunStatusEnum('status').default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    activeCohortIdx: uniqueIndex('game_map_runs_active_cohort_idx')
      .on(table.cohortId)
      .where(sql`${table.status} = 'active'`),
  })
);

// Table des activités sur la carte de jeu. Les lignes sans cohort_id sont des modèles réutilisables.
export const gameActivities = pgTable('game_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  cohortId: uuid('cohort_id').references(() => cohorts.id, { onDelete: 'cascade' }),
  templateActivityId: uuid('template_activity_id').references(
    (): AnyPgColumn => gameActivities.id,
    { onDelete: 'set null' }
  ),
  mapRunId: uuid('map_run_id').references(() => gameMapRuns.id, { onDelete: 'cascade' }),
  type: gameActivityTypeEnum('type').notNull(),
  title: text('title').notNull(),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  url: text('url'),
  isGraded: boolean('is_graded').default(false).notNull(),
  mapX: integer('map_x').default(0).notNull(),
  mapY: integer('map_y').default(0).notNull(),
  sectorDepth: integer('sector_depth').default(0).notNull(),
  requiredLevel: integer('required_level').default(1).notNull(),
  stepRanges: jsonb('step_ranges').default([]).notNull(),
  cardColor: text('card_color'),
  participationMode: gameActivityParticipationModeEnum('participation_mode').default('solo').notNull(),
  basePoints: integer('base_points').default(0).notNull(),
  targetAttribute: gameTargetAttributeEnum('target_attribute'),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const gameActivityEdges = pgTable(
  'game_activity_edges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cohortId: uuid('cohort_id').references(() => cohorts.id, { onDelete: 'cascade' }),
    mapRunId: uuid('map_run_id').references(() => gameMapRuns.id, { onDelete: 'cascade' }),
    fromActivityId: uuid('from_activity_id')
      .notNull()
      .references(() => gameActivities.id, { onDelete: 'cascade' }),
    toActivityId: uuid('to_activity_id')
      .notNull()
      .references(() => gameActivities.id, { onDelete: 'cascade' }),
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    edgeScopeIdx: uniqueIndex('game_activity_edges_scope_idx').on(
      table.fromActivityId,
      table.toActivityId,
      table.cohortId,
      table.mapRunId
    ),
  })
);

// Ledger unifié des interactions avec les activités.
export const gameActivityCompletions = pgTable(
  'game_activity_completions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    cohortId: uuid('cohort_id')
      .notNull()
      .references(() => cohorts.id, { onDelete: 'cascade' }),
    activityId: uuid('activity_id')
      .notNull()
      .references(() => gameActivities.id, { onDelete: 'cascade' }),
    completionType: gameActivityCompletionTypeEnum('completion_type').default('read').notNull(),
    grade: doublePrecision('grade'),
    workUrl: text('work_url'),
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    studentCohortActivityIdx: uniqueIndex('game_activity_completions_student_cohort_activity_idx').on(
      table.studentId,
      table.cohortId,
      table.activityId
    ),
  })
);

export const gameCharacterMoves = pgTable('game_character_moves', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id')
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  cohortId: uuid('cohort_id')
    .notNull()
    .references(() => cohorts.id, { onDelete: 'cascade' }),
  mapRunId: uuid('map_run_id')
    .notNull()
    .references(() => gameMapRuns.id, { onDelete: 'cascade' }),
  fromActivityId: uuid('from_activity_id').references(() => gameActivities.id, { onDelete: 'set null' }),
  toActivityId: uuid('to_activity_id')
    .notNull()
    .references(() => gameActivities.id, { onDelete: 'cascade' }),
  moveType: gameCharacterMoveTypeEnum('move_type').default('move').notNull(),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Ancienne table conservée uniquement pour les migrations historiques.
export const gameBattles = pgTable('game_battles', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').references(() => students.id),
  activityId: uuid('activity_id').references(() => gameActivities.id),
  grade: doublePrecision('grade'), // note normalisée entre 0 et 1 (1 = 20/20)
  workUrl: text('work_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Table d'audit déterministe des gains et dépenses de points.
export const pointTransactions = pgTable('point_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  guildId: uuid('guild_id')
    .notNull()
    .references(() => guilds.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').references(() => students.id, { onDelete: 'set null' }),
  activityId: uuid('activity_id').references(() => gameActivities.id, { onDelete: 'set null' }),
  amount: integer('amount').notNull(),
  transactionType: pointTransactionTypeEnum('transaction_type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Table de progression globale par cohort.
export const cohortProgress = pgTable('cohort_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  cohortId: uuid('cohort_id')
    .notNull()
    .references(() => cohorts.id, { onDelete: 'cascade' }),
  labelI18nKey: text('label_i18n_key').notNull(),
  currentPoints: integer('current_points').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const progressMilestones = pgTable('progress_milestones', {
  id: uuid('id').primaryKey().defaultRandom(),
  progressId: uuid('progress_id')
    .notNull()
    .references(() => cohortProgress.id, { onDelete: 'cascade' }),
  labelI18nKey: text('label_i18n_key').notNull(),
  descriptionI18nKey: text('description_i18n_key'),
  cost: integer('cost').notNull(),
  rewardTitleI18nKey: text('reward_title_i18n_key').notNull(),
  rewardSubtitleI18nKey: text('reward_subtitle_i18n_key'),
  rewardAccentToken: text('reward_accent_token').default('quest').notNull(),
  sortOrder: integer('sort_order').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  cohortId: uuid('cohort_id').references(() => cohorts.id, { onDelete: 'cascade' }),
  guildId: uuid('guild_id').references(() => guilds.id, { onDelete: 'cascade' }),
  titleI18nKey: text('title_i18n_key').notNull(),
  descriptionI18nKey: text('description_i18n_key'),
  icon: text('icon').default('info').notNull(),
  tone: text('tone').default('neutral').notNull(),
  actionLabelI18nKey: text('action_label_i18n_key'),
  actionTarget: text('action_target'),
  context: jsonb('context'),
  sortOrder: integer('sort_order').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const rewardBalanceConfigs = pgTable('reward_balance_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  version: integer('version').notNull(),
  label: text('label'),
  config: jsonb('config').notNull(),
  isActive: boolean('is_active').default(false).notNull(),
  effectiveAt: timestamp('effective_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// 3. LOGS D'AUDIT
// ==========================================

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tableName: text('table_name').notNull(),
  recordId: uuid('record_id').notNull(),
  action: text('action').notNull(), // INSERT, UPDATE, DELETE
  oldData: jsonb('old_data'),
  newData: jsonb('new_data'),
  userId: uuid('user_id').references(() => users.id),
  changedAt: timestamp('changed_at', { withTimezone: true }).defaultNow(),
});

// ==========================================
// 4. RELATIONS
// ==========================================

export const pointTransactionsRelations = relations(pointTransactions, ({ one }) => ({
  guild: one(guilds, {
    fields: [pointTransactions.guildId],
    references: [guilds.id],
  }),
  student: one(students, {
    fields: [pointTransactions.studentId],
    references: [students.id],
  }),
  activity: one(gameActivities, {
    fields: [pointTransactions.activityId],
    references: [gameActivities.id],
  }),
}));

export const cohortProgressRelations = relations(cohortProgress, ({ one }) => ({
  cohort: one(cohorts, {
    fields: [cohortProgress.cohortId],
    references: [cohorts.id],
  }),
}));

export const progressMilestonesRelations = relations(progressMilestones, ({ one }) => ({
  progress: one(cohortProgress, {
    fields: [progressMilestones.progressId],
    references: [cohortProgress.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  cohort: one(cohorts, {
    fields: [notifications.cohortId],
    references: [cohorts.id],
  }),
  guild: one(guilds, {
    fields: [notifications.guildId],
    references: [guilds.id],
  }),
}));
