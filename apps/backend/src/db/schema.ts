import {
  text,
  integer,
  real,
  sqliteTable,
  primaryKey,
  index,
  uniqueIndex,
  check,
  type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

const dbTable = sqliteTable;
type AnyDbColumn = AnySQLiteColumn;

function uuid(name: string) {
  return text(name);
}

function timestamp(name: string, _config?: { withTimezone?: boolean }) {
  return integer(name, { mode: 'timestamp_ms' });
}

function boolean(name: string) {
  return integer(name, { mode: 'boolean' });
}

function jsonColumn(name: string) {
  return text(name, { mode: 'json' }).$type<unknown>();
}

function date(name: string) {
  return text(name);
}

function doublePrecision(name: string) {
  return real(name);
}

function enumText<const TValues extends readonly [string, ...string[]]>(_name: string, values: TValues) {
  return (columnName: string) => text(columnName, { enum: values });
}

// ==========================================
// 1. SCHÉMAS ADMINISTRATIFS & UTILISATEURS
// ==========================================

// Table des écoles
export const schools = dbTable('schools', {
  id: uuid('id').notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  logoUrl: text('logo_url'),
  website: text('website'),
  emailDomain: text('email_domain'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
});

// Table des adresses postales
export const addresses = dbTable('addresses', {
  id: uuid('id').notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
  line1: text('line_1').notNull(),
  line2: text('line_2'),
  postalCode: text('postal_code'),
  city: text('city').notNull(),
  country: text('country'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
});

// Table des campus/sites rattachés à une école
export const campuses = dbTable('campuses', {
  id: uuid('id').notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
  schoolId: uuid('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  addressId: uuid('address_id').references(() => addresses.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
});

// Table des cohorts/classes d'étudiants. Chaque cohort appartient à une seule école.
export const cohorts = dbTable('cohorts', {
  id: uuid('id').notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
  schoolId: uuid('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  campusId: uuid('campus_id').references(() => campuses.id, { onDelete: 'set null' }),
  startYear: integer('start_year').notNull(),
  grade: text('grade').notNull(),
  level: integer('level').notNull(),
  currentStep: integer('current_step').default(1).notNull(),
  registrationOpen: boolean('registration_open').default(false).notNull(),
  name: text('name').notNull(),
  majorSpeciality: text('major_speciality'),
  minorSpeciality: text('minor_speciality'),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
}, (table) => ({
  registrationOpenIdx: uniqueIndex('cohorts_registration_open_idx')
    .on(table.registrationOpen)
    .where(sql`${table.registrationOpen} = true`),
}));

export const cohortInvites = dbTable('cohort_invites', {
  id: uuid('id').notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
  cohortId: uuid('cohort_id')
    .notNull()
    .references(() => cohorts.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
});

export const guildRecruitmentStatusEnum = enumText('guild_recruitment_status', [
  'open',
  'invite_only',
  'closed',
]);

export const guildInvitationStatusEnum = enumText('guild_invitation_status', [
  'pending',
  'accepted',
  'declined',
  'cancelled',
]);

// Table des guildes (groupes d'étudiants / de jeu). Chaque guilde appartient à une seule cohort.
export const guilds = dbTable('guilds', {
  id: uuid('id').notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
  cohortId: uuid('cohort_id')
    .notNull()
    .references(() => cohorts.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  iconUrl: text('icon_url'),
  iconKey: text('icon_key'),
  color: text('color'), // Code Hexa
  gold: integer('gold').default(0).notNull(),
  recruitmentStatus: guildRecruitmentStatusEnum('recruitment_status').default('open').notNull(),
  recruitmentMessage: text('recruitment_message'),
  maxMembers: integer('max_members').default(3).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
});

// Table centrale des utilisateurs
export const userStatusEnum = enumText('user_status', ['online', 'offline', 'busy']);

export const users = dbTable('users', {
  id: uuid('id').notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
  githubEmail: text('github_email').unique().notNull(),
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
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
  lastLogin: timestamp('last_login', { withTimezone: true }),
});

// Table des profils étudiants
export const students = dbTable('students', {
  id: uuid('id').notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: uuid('user_id')
    .unique()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
});

// Association plusieurs-à-plusieurs entre utilisateurs étudiants et cohorts.
// Les admins restent universels et ne passent pas par cette table.
export const cohortMemberships = dbTable(
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
    createdAt: timestamp('created_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.cohortId] }),
  })
);

export const guildInvitations = dbTable(
  'guild_invitations',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
    cohortId: uuid('cohort_id')
      .notNull()
      .references(() => cohorts.id, { onDelete: 'cascade' }),
    guildId: uuid('guild_id')
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    inviterUserId: uuid('inviter_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    inviteeUserId: uuid('invitee_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: guildInvitationStatusEnum('status').default('pending').notNull(),
    message: text('message'),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    pendingInviteIdx: uniqueIndex('guild_invitations_pending_invitee_idx')
      .on(table.guildId, table.inviteeUserId)
      .where(sql`${table.status} = 'pending'`),
    inviteeStatusIdx: index('guild_invitations_invitee_status_idx').on(
      table.inviteeUserId,
      table.status,
      table.createdAt
    ),
  })
);

// Table de l'historique des compétences élève (Radar)
export const studentSkillsHistory = dbTable('student_skills_history', {
  id: uuid('id').notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
  studentId: uuid('student_id').references(() => students.id),
  skills: jsonColumn('skills').notNull(), // ex: {"tech": 0.8, "soft": 0.5, "design": 0.2}
  evaluatedAt: timestamp('evaluated_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
  evaluatedBy: uuid('evaluated_by').references(() => users.id),
});

// ==========================================
// 2. SCHÉMAS LUDIQUES (game_)
// ==========================================

export const gameTargetAttributeEnum = enumText('game_target_attribute', [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
]);

export const gameActivityTypeEnum = enumText('game_activity_type', [
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

export const pointTransactionTypeEnum = enumText('point_transaction_type', [
  'EARNED',
  'SPENT_VOTE',
  'MANUAL_BONUS',
]);

export const gameMapRunStatusEnum = enumText('game_map_run_status', [
  'active',
  'completed',
  'archived',
]);

export const gameActivityCompletionTypeEnum = enumText('game_activity_completion_type', [
  'read',
  'submission',
  'battle',
  'system',
]);

export const gameCharacterMoveTypeEnum = enumText('game_character_move_type', ['enter', 'move']);

export const gameActivityParticipationModeEnum = enumText('game_activity_participation_mode', [
  'solo',
  'guild',
]);

// Table des classes de personnage. Les libellés affichés doivent être traduits côté UI depuis `name_i18n_key`.
export const gameCharacterClasses = dbTable('game_character_classes', {
  slug: text('slug').notNull().primaryKey(),
  nameI18nKey: text('name_i18n_key').notNull(),
  baseStrength: integer('base_strength').default(0).notNull(),
  baseDexterity: integer('base_dexterity').default(0).notNull(),
  baseConstitution: integer('base_constitution').default(0).notNull(),
  baseIntelligence: integer('base_intelligence').default(0).notNull(),
  baseWisdom: integer('base_wisdom').default(0).notNull(),
  baseCharisma: integer('base_charisma').default(0).notNull(),
  sortOrder: integer('sort_order').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
});

// Table des fiches personnages (le "verso" de l'étudiant)
export const gameCharacters = dbTable(
  'game_characters',
  {
    studentId: uuid('student_id')
      .notNull()
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
    illustrationUrl: text('illustration_url'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    manualStatRangeCheck: check(
      'game_characters_manual_stat_range_check',
      sql`${table.strength} BETWEEN 0 AND 5
        AND ${table.dexterity} BETWEEN 0 AND 5
        AND ${table.constitution} BETWEEN 0 AND 5
        AND ${table.intelligence} BETWEEN 0 AND 5
        AND ${table.wisdom} BETWEEN 0 AND 5
        AND ${table.charisma} BETWEEN 0 AND 5`
    ),
    manualStatBudgetCheck: check(
      'game_characters_manual_stat_budget_check',
      sql`${table.strength} + ${table.dexterity} + ${table.constitution} + ${table.intelligence} + ${table.wisdom} + ${table.charisma} <= 6`
    ),
  })
);

export const gameMapRuns = dbTable(
  'game_map_runs',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
    cohortId: uuid('cohort_id')
      .notNull()
      .references(() => cohorts.id, { onDelete: 'cascade' }),
    currentSectorDepth: integer('current_sector_depth').default(0).notNull(),
    fogRevealDepth: integer('fog_reveal_depth').default(1).notNull(),
    status: gameMapRunStatusEnum('status').default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    activeCohortIdx: uniqueIndex('game_map_runs_active_cohort_idx')
      .on(table.cohortId)
      .where(sql`${table.status} = 'active'`),
  })
);

// Table des activités sur la carte de jeu. Les lignes sans cohort_id sont des modèles réutilisables.
export const gameActivities = dbTable('game_activities', {
  id: uuid('id').notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
  cohortId: uuid('cohort_id').references(() => cohorts.id, { onDelete: 'cascade' }),
  templateActivityId: uuid('template_activity_id').references(
    (): AnyDbColumn => gameActivities.id,
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
  stepRanges: jsonColumn('step_ranges').default(sql`'[]'`).notNull(),
  cardColor: text('card_color'),
  participationMode: gameActivityParticipationModeEnum('participation_mode').default('solo').notNull(),
  basePoints: integer('base_points').default(0).notNull(),
  targetAttribute: gameTargetAttributeEnum('target_attribute'),
  metadata: jsonColumn('metadata').default(sql`'{}'`).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
});

export const gameActivityEdges = dbTable(
  'game_activity_edges',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
    cohortId: uuid('cohort_id').references(() => cohorts.id, { onDelete: 'cascade' }),
    mapRunId: uuid('map_run_id').references(() => gameMapRuns.id, { onDelete: 'cascade' }),
    fromActivityId: uuid('from_activity_id')
      .notNull()
      .references(() => gameActivities.id, { onDelete: 'cascade' }),
    toActivityId: uuid('to_activity_id')
      .notNull()
      .references(() => gameActivities.id, { onDelete: 'cascade' }),
    metadata: jsonColumn('metadata').default(sql`'{}'`).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    globalEdgeIdx: uniqueIndex('game_activity_edges_global_idx')
      .on(table.fromActivityId, table.toActivityId)
      .where(sql`${table.cohortId} IS NULL AND ${table.mapRunId} IS NULL`),
    edgeScopeIdx: uniqueIndex('game_activity_edges_scope_idx').on(
      table.fromActivityId,
      table.toActivityId,
      table.cohortId,
      table.mapRunId
    ),
  })
);

// Ledger unifié des interactions avec les activités.
export const gameActivityCompletions = dbTable(
  'game_activity_completions',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
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
    metadata: jsonColumn('metadata').default(sql`'{}'`).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    studentCohortActivityIdx: uniqueIndex('game_activity_completions_student_cohort_activity_idx').on(
      table.studentId,
      table.cohortId,
      table.activityId
    ),
  })
);

export const gameCharacterMoves = dbTable(
  'game_character_moves',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
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
    metadata: jsonColumn('metadata').default(sql`'{}'`).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    studentScopeCreatedIdx: index('game_character_moves_student_scope_created_idx').on(
      table.studentId,
      table.cohortId,
      table.mapRunId,
      table.createdAt
    ),
  })
);

// Table d'audit déterministe des gains et dépenses de points.
export const pointTransactions = dbTable('point_transactions', {
  id: uuid('id').notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
  guildId: uuid('guild_id')
    .notNull()
    .references(() => guilds.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').references(() => students.id, { onDelete: 'set null' }),
  activityId: uuid('activity_id').references(() => gameActivities.id, { onDelete: 'set null' }),
  amount: integer('amount').notNull(),
  transactionType: pointTransactionTypeEnum('transaction_type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
});

// Table de progression globale par cohort.
export const cohortProgress = dbTable('cohort_progress', {
  id: uuid('id').notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
  cohortId: uuid('cohort_id')
    .notNull()
    .references(() => cohorts.id, { onDelete: 'cascade' }),
  labelI18nKey: text('label_i18n_key').notNull(),
  currentPoints: integer('current_points').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
});

export const progressMilestones = dbTable('progress_milestones', {
  id: uuid('id').notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
  progressId: uuid('progress_id')
    .notNull()
    .references(() => cohortProgress.id, { onDelete: 'cascade' }),
  labelI18nKey: text('label_i18n_key').notNull(),
  descriptionI18nKey: text('description_i18n_key'),
  cost: integer('cost').notNull(),
  sortOrder: integer('sort_order').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
});

export const gameBonusCards = dbTable('game_bonus_cards', {
  id: uuid('id').notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
  cohortId: uuid('cohort_id')
    .notNull()
    .references(() => cohorts.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  description: text('description'),
  cost: integer('cost').default(0).notNull(),
  accentToken: text('accent_token').default('quest').notNull(),
  iconKey: text('icon_key').default('Gift').notNull(),
  illustrationUrl: text('illustration_url'),
  color: text('color'),
  sortOrder: integer('sort_order').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
});

export const milestoneBonusVotes = dbTable(
  'milestone_bonus_votes',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
    milestoneId: uuid('milestone_id')
      .notNull()
      .references(() => progressMilestones.id, { onDelete: 'cascade' }),
    bonusCardId: uuid('bonus_card_id')
      .notNull()
      .references(() => gameBonusCards.id, { onDelete: 'cascade' }),
    guildId: uuid('guild_id')
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    voteCount: integer('vote_count').default(1).notNull(),
    metadata: jsonColumn('metadata').default(sql`'{}'`).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    guildMilestoneIdx: uniqueIndex('milestone_bonus_votes_guild_milestone_idx').on(
      table.guildId,
      table.milestoneId
    ),
  })
);

export const notifications = dbTable('notifications', {
  id: uuid('id').notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
  cohortId: uuid('cohort_id').references(() => cohorts.id, { onDelete: 'cascade' }),
  guildId: uuid('guild_id').references(() => guilds.id, { onDelete: 'cascade' }),
  titleI18nKey: text('title_i18n_key').notNull(),
  descriptionI18nKey: text('description_i18n_key'),
  icon: text('icon').default('info').notNull(),
  tone: text('tone').default('neutral').notNull(),
  actionLabelI18nKey: text('action_label_i18n_key'),
  actionTarget: text('action_target'),
  context: jsonColumn('context'),
  sortOrder: integer('sort_order').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
});

export const rewardBalanceConfigs = dbTable(
  'reward_balance_configs',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
    cohortId: uuid('cohort_id').references(() => cohorts.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    label: text('label'),
    config: jsonColumn('config').notNull(),
    isActive: boolean('is_active').default(false).notNull(),
    effectiveAt: timestamp('effective_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`).notNull(),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`).notNull(),
  },
  (table) => ({
    activeGlobalIdx: uniqueIndex('reward_balance_configs_active_global_idx')
      .on(table.isActive)
      .where(sql`${table.isActive} = true AND ${table.cohortId} IS NULL`),
    activeCohortIdx: uniqueIndex('reward_balance_configs_active_cohort_idx')
      .on(table.cohortId, table.isActive)
      .where(sql`${table.isActive} = true AND ${table.cohortId} IS NOT NULL`),
  })
);

// ==========================================
// 3. LOGS D'AUDIT
// ==========================================

export const auditLogs = dbTable('audit_logs', {
  id: uuid('id').notNull().primaryKey().$defaultFn(() => crypto.randomUUID()),
  tableName: text('table_name').notNull(),
  recordId: uuid('record_id').notNull(),
  action: text('action').notNull(), // INSERT, UPDATE, DELETE
  oldData: jsonColumn('old_data'),
  newData: jsonColumn('new_data'),
  userId: uuid('user_id').references(() => users.id),
  changedAt: timestamp('changed_at', { withTimezone: true }).default(sql`(unixepoch() * 1000)`),
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

export const gameBonusCardsRelations = relations(gameBonusCards, ({ one }) => ({
  cohort: one(cohorts, {
    fields: [gameBonusCards.cohortId],
    references: [cohorts.id],
  }),
}));

export const milestoneBonusVotesRelations = relations(milestoneBonusVotes, ({ one }) => ({
  milestone: one(progressMilestones, {
    fields: [milestoneBonusVotes.milestoneId],
    references: [progressMilestones.id],
  }),
  bonusCard: one(gameBonusCards, {
    fields: [milestoneBonusVotes.bonusCardId],
    references: [gameBonusCards.id],
  }),
  guild: one(guilds, {
    fields: [milestoneBonusVotes.guildId],
    references: [guilds.id],
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

export const guildInvitationsRelations = relations(guildInvitations, ({ one }) => ({
  cohort: one(cohorts, {
    fields: [guildInvitations.cohortId],
    references: [cohorts.id],
  }),
  guild: one(guilds, {
    fields: [guildInvitations.guildId],
    references: [guilds.id],
  }),
  inviter: one(users, {
    fields: [guildInvitations.inviterUserId],
    references: [users.id],
  }),
  invitee: one(users, {
    fields: [guildInvitations.inviteeUserId],
    references: [users.id],
  }),
}));
