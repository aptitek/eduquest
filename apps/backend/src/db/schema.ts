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
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

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
  schoolYear: text('school_year').notNull(),
  grade: text('grade').notNull(),
  level: integer('level').notNull(),
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
  totalPoints: integer('total_points').default(0).notNull(),
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
  statusOverride: boolean('status_override').default(false),
  isAdmin: boolean('is_admin').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  lastLogin: timestamp('last_login', { withTimezone: true }),
});

export const userSchoolMemberships = pgTable(
  'user_school_memberships',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    schoolId: uuid('school_id')
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
    institutionalEmail: text('institutional_email').unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.schoolId] }),
  })
);

// Table des profils étudiants
export const students = pgTable('students', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .unique()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  schoolId: uuid('school_id').references(() => schools.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Association plusieurs-à-plusieurs entre étudiants et cohorts.
// Les admins ne sont pas membres de cohorts car l'association passe par `students`.
// Un étudiant ne peut avoir qu'une seule guilde par cohort car la PK est (student_id, cohort_id).
export const studentCohorts = pgTable(
  'student_cohorts',
  {
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    cohortId: uuid('cohort_id')
      .notNull()
      .references(() => cohorts.id, { onDelete: 'cascade' }),
    guildId: uuid('guild_id').references(() => guilds.id, { onDelete: 'set null' }),
    institutionalEmail: text('institutional_email').unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.studentId, table.cohortId] }),
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
  'force',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
]);

export const pointTransactionTypeEnum = pgEnum('point_transaction_type', [
  'EARNED',
  'SPENT_VOTE',
  'MANUAL_BONUS',
]);

// Table des classes de personnage. Les libellés affichés doivent être traduits côté UI depuis `name_i18n_key`.
export const gameCharacterClasses = pgTable('game_character_classes', {
  slug: text('slug').primaryKey(),
  nameI18nKey: text('name_i18n_key').notNull(),
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
  force: integer('force').default(0).notNull(),
  dexterity: integer('dexterity').default(0).notNull(),
  constitution: integer('constitution').default(0).notNull(),
  intelligence: integer('intelligence').default(0).notNull(),
  wisdom: integer('wisdom').default(0).notNull(),
  charisma: integer('charisma').default(0).notNull(),
  currentLevel: integer('current_level').default(1).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Table des decks / classes / promotions
export const gameDecks = pgTable('game_decks', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').references(() => schools.id),
  name: text('name').notNull(),
});

// Table des activités sur la carte de jeu
export const gameActivities = pgTable('game_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull(), // 'campfire', 'quest', 'boss'
  title: text('title').notNull(),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  url: text('url'),
  isGraded: boolean('is_graded').default(false).notNull(),
  x: integer('x').default(0).notNull(),
  y: integer('y').default(0).notNull(),
  requiredLevel: integer('required_level').default(1).notNull(),
  unlockRule: jsonb('unlock_rule').default('{}'),
  basePoints: integer('base_points').default(0).notNull(),
  targetAttribute: gameTargetAttributeEnum('target_attribute'),
  bossMetadata: jsonb('boss_metadata').default('{}'), // projectUrl, gradingUrl
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Table des rendus / combats
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

// Table des jauges de progression globales par cohort.
export const globalGauges = pgTable('global_gauges', {
  id: uuid('id').primaryKey().defaultRandom(),
  cohortId: uuid('cohort_id')
    .notNull()
    .references(() => cohorts.id, { onDelete: 'cascade' }),
  milestoneName: text('milestone_name').notNull(),
  currentPoints: integer('current_points').default(0).notNull(),
  targetPoints: integer('target_points').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const globalGaugeMilestones = pgTable('global_gauge_milestones', {
  id: uuid('id').primaryKey().defaultRandom(),
  gaugeId: uuid('gauge_id')
    .notNull()
    .references(() => globalGauges.id, { onDelete: 'cascade' }),
  labelI18nKey: text('label_i18n_key').notNull(),
  descriptionI18nKey: text('description_i18n_key'),
  positionPercent: integer('position_percent'),
  value: integer('value'),
  sortOrder: integer('sort_order').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const cohortRewardCards = pgTable('cohort_reward_cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  cohortId: uuid('cohort_id')
    .notNull()
    .references(() => cohorts.id, { onDelete: 'cascade' }),
  titleI18nKey: text('title_i18n_key').notNull(),
  subtitleI18nKey: text('subtitle_i18n_key'),
  accentToken: text('accent_token').default('quest').notNull(),
  faceDown: boolean('face_down').default(false).notNull(),
  sortOrder: integer('sort_order').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const dashboardNotifications = pgTable('dashboard_notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  cohortId: uuid('cohort_id').references(() => cohorts.id, { onDelete: 'cascade' }),
  titleI18nKey: text('title_i18n_key').notNull(),
  descriptionI18nKey: text('description_i18n_key'),
  metaI18nKey: text('meta_i18n_key'),
  icon: text('icon').default('info').notNull(),
  tone: text('tone').default('neutral').notNull(),
  actionLabelI18nKey: text('action_label_i18n_key'),
  actionTarget: text('action_target'),
  sortOrder: integer('sort_order').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
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

export const globalGaugesRelations = relations(globalGauges, ({ one }) => ({
  cohort: one(cohorts, {
    fields: [globalGauges.cohortId],
    references: [cohorts.id],
  }),
}));

export const globalGaugeMilestonesRelations = relations(globalGaugeMilestones, ({ one }) => ({
  gauge: one(globalGauges, {
    fields: [globalGaugeMilestones.gaugeId],
    references: [globalGauges.id],
  }),
}));

export const cohortRewardCardsRelations = relations(cohortRewardCards, ({ one }) => ({
  cohort: one(cohorts, {
    fields: [cohortRewardCards.cohortId],
    references: [cohorts.id],
  }),
}));

export const dashboardNotificationsRelations = relations(dashboardNotifications, ({ one }) => ({
  cohort: one(cohorts, {
    fields: [dashboardNotifications.cohortId],
    references: [cohorts.id],
  }),
}));
