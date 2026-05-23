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
} from 'drizzle-orm/pg-core';

// ==========================================
// 1. SCHÉMAS ADMINISTRATIFS & UTILISATEURS
// ==========================================

// Table des écoles
export const schools = pgTable('schools', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  logoUrl: text('logo_url'),
  emailDomain: text('email_domain'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Table des guildes (groupes d'étudiants / de jeu)
export const guilds = pgTable('guilds', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').references(() => schools.id),
  name: text('name').notNull(),
  description: text('description'),
  iconUrl: text('icon_url'),
  color: text('color'), // Code Hexa
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Table centrale des utilisateurs
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  githubEmail: text('github_email').unique().notNull(),
  githubSsoToken: text('github_sso_token'),
  githubUsername: text('github_username'),
  githubName: text('github_name'),
  githubAvatar: text('github_avatar'),
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
  guildId: uuid('guild_id').references(() => guilds.id),
  schoolId: uuid('school_id').references(() => schools.id),
  institutionalEmail: text('institutional_email').unique(),
  birthDate: date('birth_date'),
  internalDescription: text('internal_description'), //TODO: delete
  photoUrl: text('photo_url'), //TODO delete (replaced by avatar in user table)
  pronouns: jsonb('pronouns').default('[]'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

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

// Table des fiches personnages (le "verso" de l'étudiant)
export const gameCharacters = pgTable('game_characters', {
  studentId: uuid('student_id')
    .primaryKey()
    .references(() => students.id),
  characterClass: text('character_class'),
  stats: jsonb('stats').default('{"str": 0, "dex": 0, "int": 0, "cha": 0}'),
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
