import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import type {
  Address,
  Campus,
  Cohort,
  CohortGrade,
  GameActivityCompletion,
  GameCharacter,
  GameCharacterClass,
  GameCharacterClassDefinition,
  GameStats,
  Guild,
  School,
  Student,
  User,
  CohortMembership,
} from '@eduquest/shared';
import { GAME_CHARACTER_CLASSES, GAME_CHARACTER_CLASS_I18N_KEYS } from '@eduquest/shared';
import type { RewardBalanceConfigPayload } from '@eduquest/shared';
import { getDb } from '../db';
import {
  addresses,
  campuses,
  cohortInvites,
  cohortMemberships,
  gameActivityCompletions,
  gameCharacterClasses,
  cohorts,
  gameCharacters,
  guilds,
  schools,
  students,
  users,
} from '../db/schema';
import { authMiddleware, UserPayload } from '../middleware/auth';
import {
  isDebugAuthEnabled as runtimeDebugAuthEnabled,
  requireFrontendUrl,
  requireJwtSecret,
} from '../config/runtime';
import { RewardBalanceConfigService } from '../services/reward-balance-config';
import { RewardPreviewService } from '../services/reward-preview';
import {
  normalizeBaseStats,
  normalizeManualAllocation,
  repairManualAllocation,
  type CharacterStatAllocation,
} from '../services/character-class-reallocation';
import { apiError, missingDatabaseBinding, parseRequiredJsonBody } from './http';

type Bindings = {
  APP_ENV?: string;
  DB?: D1Database;
  JWT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GITHUB_REDIRECT_URI?: string;
  FRONTEND_URL?: string;
  ENABLE_DEBUG_AUTH?: string;
};

type Variables = {
  user?: UserPayload;
};

export const authRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const DEFAULT_CHARACTER_CLASS: GameCharacterClass = 'scholar';
const GAME_CHARACTER_CLASS_SET = new Set<string>(GAME_CHARACTER_CLASSES);
const AUTH_TOKEN_TTL_SECONDS = 60 * 60 * 8;
const DEFAULT_CHARACTER_CLASS_BASE_STATS: Record<GameCharacterClass, GameStats> = {
  scholar: {
    strength: 0,
    dexterity: 0,
    constitution: 0,
    intelligence: 2,
    wisdom: 1,
    charisma: 1,
  },
  champion: {
    strength: 2,
    dexterity: 0,
    constitution: 1,
    intelligence: 0,
    wisdom: 0,
    charisma: 1,
  },
  guide: {
    strength: 0,
    dexterity: 2,
    constitution: 0,
    intelligence: 0,
    wisdom: 1,
    charisma: 1,
  },
  specialist: {
    strength: 1,
    dexterity: 1,
    constitution: 1,
    intelligence: 1,
    wisdom: 0,
    charisma: 0,
  },
};

type AddressRecord = typeof addresses.$inferSelect;
type CampusRecord = typeof campuses.$inferSelect;
type CohortRecord = typeof cohorts.$inferSelect;
type GameActivityCompletionRecord = typeof gameActivityCompletions.$inferSelect;
type GameCharacterRecord = typeof gameCharacters.$inferSelect;
type GuildRecord = typeof guilds.$inferSelect;
type SchoolRecord = typeof schools.$inferSelect;
type CohortMembershipRecord = typeof cohortMemberships.$inferSelect;
type StudentRecord = typeof students.$inferSelect;
type UserRecord = typeof users.$inferSelect;
type ManagementBackup = {
  addresses: Address[];
  schools: School[];
  campuses: Campus[];
  cohorts: Cohort[];
  characterClasses: GameCharacterClassDefinition[];
  students: { user: User; student: Student; character?: GameCharacter }[];
};
type ManagementStudentUpdateBody = {
  user?: Partial<
    Pick<
      User,
      | 'displayName'
      | 'firstName'
      | 'lastName'
      | 'email'
      | 'avatarUrl'
      | 'birthDate'
      | 'bio'
      | 'pronouns'
    >
  >;
  cohortIds?: string[];
  institutionalEmail?: string;
  institutionalEmailCohortId?: string;
  institutionalSchoolId?: string;
  characterIllustrationUrl?: string;
  characterTitle?: string;
  characterClass?: string;
  characterStats?: Partial<GameStats>;
  gameId?: string | null;
};
type ManagementSchoolUpdateBody = Partial<Pick<School, 'name' | 'website' | 'emailDomain' | 'logoUrl'>> & {
  address?: string;
};
type ManagementSchoolCreateBody = Partial<Pick<School, 'name' | 'website' | 'emailDomain'>>;
type ManagementCohortUpdateBody = Partial<
  Pick<Cohort, 'schoolId' | 'startYear' | 'grade' | 'level' | 'registrationOpen' | 'name' | 'majorSpeciality' | 'minorSpeciality' | 'description'>
> & {
  campusName?: string;
};
type ManagementCohortCreateBody = Partial<
  Pick<Cohort, 'schoolId' | 'startYear' | 'grade' | 'level' | 'registrationOpen' | 'name' | 'majorSpeciality' | 'minorSpeciality' | 'description'>
> & {
  campusName?: string;
};
type ManagementCharacterClassUpdateBody = {
  baseStats?: Partial<GameStats>;
  name?: unknown;
  subtitle?: unknown;
  description?: unknown;
  iconKey?: unknown;
  color?: unknown;
};
type CohortInvitePayload = {
  purpose: 'cohort_invite';
  inviteId: string;
  cohortId: string;
  exp: number;
};
type ManagementCohortInvite = {
  id: string;
  cohortId: string;
  url: string;
  token: string;
  expiresAt: string;
  createdAt?: string;
};

function normalizeGameCharacterClass(value?: string | null): GameCharacterClass {
  return GAME_CHARACTER_CLASS_SET.has(value || '')
    ? (value as GameCharacterClass)
    : DEFAULT_CHARACTER_CLASS;
}
const COHORT_GRADE_SET = new Set<CohortGrade>([
  'licence',
  'bachelor',
  'engineer',
  'master',
  'doctorate',
]);
type CohortInviteRecord = typeof cohortInvites.$inferSelect;

function toIsoString(value?: Date | null) {
  return value?.toISOString?.();
}

function isPersistableImageUrl(value?: string | null) {
  if (!value) return true;
  if (value.startsWith('/assets/')) return true;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function parseManagementAddress(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '-') return null;

  const parts = trimmed
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const line1 = parts[0] || trimmed;
  const country = parts.length > 2 ? parts[parts.length - 1] : null;
  const middleParts = parts.slice(1, country ? -1 : undefined);
  const line2 = middleParts.length > 1 ? middleParts[0] : null;
  const postalCity = middleParts.length > 1 ? middleParts.slice(1).join(', ') : middleParts[0];
  const postalCityMatch = postalCity?.match(/^(\d[\dA-Za-z -]{1,12})\s+(.+)$/);

  return {
    line1,
    line2,
    postalCode: postalCityMatch ? postalCityMatch[1].trim() : null,
    city: postalCityMatch ? postalCityMatch[2].trim() : postalCity || '',
    country,
  };
}

function toAddress(record: AddressRecord): Address {
  return {
    id: record.id,
    line1: record.line1,
    line2: record.line2 || undefined,
    postalCode: record.postalCode || undefined,
    city: record.city,
    country: record.country || undefined,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
  };
}

function toSchool(record: SchoolRecord): School {
  return {
    id: record.id,
    name: record.name,
    logoUrl: record.logoUrl || undefined,
    website: record.website || undefined,
    emailDomain: record.emailDomain || undefined,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
  };
}

function toCampus(record: CampusRecord, school?: School, address?: Address): Campus {
  return {
    id: record.id,
    schoolId: record.schoolId,
    school,
    addressId: record.addressId || undefined,
    address,
    name: record.name,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
  };
}

function toCohort(record: CohortRecord, school?: School, campus?: Campus): Cohort {
  return {
    id: record.id,
    schoolId: record.schoolId,
    school,
    campusId: record.campusId || undefined,
    campus,
    startYear: record.startYear,
    grade: record.grade as CohortGrade,
    level: record.level,
    registrationOpen: record.registrationOpen,
    name: record.name,
    majorSpeciality: record.majorSpeciality || undefined,
    minorSpeciality: record.minorSpeciality || undefined,
    description: record.description || undefined,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
  };
}

function toGuild(record: GuildRecord, cohort?: Cohort): Guild {
  return {
    id: record.id,
    cohortId: record.cohortId,
    cohort,
    name: record.name,
    description: record.description || undefined,
    iconUrl: record.iconUrl || undefined,
    iconKey: record.iconKey || undefined,
    color: record.color || undefined,
    gold: record.gold,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
  };
}

function toUser(record: UserRecord): User {
  return {
    id: record.id,
    email: record.email,
    githubSsoToken: record.githubSsoToken || undefined,
    githubUsername: record.githubUsername || undefined,
    firstName: record.firstName || undefined,
    lastName: record.lastName || undefined,
    displayName: record.displayName || undefined,
    birthDate: record.birthDate || undefined,
    pronouns: record.pronouns || undefined,
    bio: record.bio || undefined,
    avatarUrl: record.avatarUrl || undefined,
    githubAvatarUrl: record.githubAvatarUrl || undefined,
    userStatus: record.userStatus || undefined,
    preferredLocale: record.preferredLocale || undefined,
    isAdmin: record.isAdmin,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
    lastLogin: toIsoString(record.lastLogin),
  };
}

function toGameCharacter(record: GameCharacterRecord): GameCharacter {
  return {
    studentId: record.studentId,
    characterClass: normalizeGameCharacterClass(record.characterClass),
    stats: toGameCharacterStats(record),
    title: record.title || undefined,
    illustrationUrl: record.illustrationUrl || undefined,
    updatedAt: toIsoString(record.updatedAt),
  };
}

function toGameActivityCompletion(record: GameActivityCompletionRecord): GameActivityCompletion {
  return {
    id: record.id,
    studentId: record.studentId,
    cohortId: record.cohortId,
    activityId: record.activityId,
    completionType: record.completionType,
    grade: record.grade || undefined,
    workUrl: record.workUrl || undefined,
    metadata: (record.metadata || {}) as Record<string, unknown>,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
  };
}

function toGameCharacterStats(record: GameCharacterRecord): GameCharacter['stats'] {
  return {
    strength: record.strength,
    dexterity: record.dexterity,
    constitution: record.constitution,
    intelligence: record.intelligence,
    wisdom: record.wisdom,
    charisma: record.charisma,
  };
}

function isSupportedLocale(value: unknown): value is 'fr' | 'en' {
  return value === 'fr' || value === 'en';
}

function toGameCharacterClassDefinition(
  record: typeof gameCharacterClasses.$inferSelect
): GameCharacterClassDefinition {
  return {
    slug: normalizeGameCharacterClass(record.slug),
    nameI18nKey: record.nameI18nKey,
    name: record.name || undefined,
    subtitle: record.subtitle || undefined,
    description: record.description || undefined,
    iconKey: record.iconKey || undefined,
    color: record.color || undefined,
    baseStats: {
      strength: record.baseStrength,
      dexterity: record.baseDexterity,
      constitution: record.baseConstitution,
      intelligence: record.baseIntelligence,
      wisdom: record.baseWisdom,
      charisma: record.baseCharisma,
    },
    sortOrder: record.sortOrder,
    createdAt: toIsoString(record.createdAt),
  };
}

async function ensureCharacterClassSeeds(db: Pick<ReturnType<typeof getDb>, 'select' | 'insert'>) {
  const existingRecords = await db.select({ slug: gameCharacterClasses.slug }).from(gameCharacterClasses);
  const existingSlugs = new Set(existingRecords.map((record) => record.slug));
  const missingClasses = GAME_CHARACTER_CLASSES.filter((slug) => !existingSlugs.has(slug));

  if (missingClasses.length === 0) return;

  await db.insert(gameCharacterClasses).values(
    missingClasses.map((slug, index) => ({
      slug,
      nameI18nKey: GAME_CHARACTER_CLASS_I18N_KEYS[slug],
      iconKey:
        slug === 'scholar'
          ? 'BookOpen'
          : slug === 'champion'
            ? 'Trophy'
            : slug === 'guide'
              ? 'Users'
              : 'Sparkles',
      baseStrength: DEFAULT_CHARACTER_CLASS_BASE_STATS[slug].strength,
      baseDexterity: DEFAULT_CHARACTER_CLASS_BASE_STATS[slug].dexterity,
      baseConstitution: DEFAULT_CHARACTER_CLASS_BASE_STATS[slug].constitution,
      baseIntelligence: DEFAULT_CHARACTER_CLASS_BASE_STATS[slug].intelligence,
      baseWisdom: DEFAULT_CHARACTER_CLASS_BASE_STATS[slug].wisdom,
      baseCharisma: DEFAULT_CHARACTER_CLASS_BASE_STATS[slug].charisma,
      sortOrder: GAME_CHARACTER_CLASSES.indexOf(slug) >= 0 ? GAME_CHARACTER_CLASSES.indexOf(slug) : index,
    }))
  );
}

function toStudent(
  record: StudentRecord,
  memberships: Student['cohortMemberships']
): Student {
  return {
    id: record.id,
    userId: record.userId,
    cohortMemberships: memberships,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
  };
}

function isDebugAuthEnabled(c: { env: Bindings }) {
  return runtimeDebugAuthEnabled(c.env);
}

function buildCohortInviteUrl(frontendUrl: string, token: string) {
  const url = new URL(frontendUrl);
  url.searchParams.set('cohortInvite', token);
  return url.toString();
}

function toManagementCohortInvite(
  invite: Pick<CohortInviteRecord, 'id' | 'cohortId' | 'token' | 'expiresAt' | 'createdAt'>,
  frontendUrl: string
): ManagementCohortInvite {
  return {
    id: invite.id,
    cohortId: invite.cohortId,
    token: invite.token,
    url: buildCohortInviteUrl(frontendUrl, invite.token),
    expiresAt: invite.expiresAt.toISOString(),
    createdAt: toIsoString(invite.createdAt),
  };
}

async function listActiveCohortInvites(
  databaseUrl: D1Database | undefined,
  cohortId: string,
  frontendUrl: string
): Promise<ManagementCohortInvite[]> {
  const now = Date.now();

  if (!databaseUrl) {
    throw new Error('D1 binding is required for cohort invites.');
  }

  const records = await getDb(databaseUrl)
    .select()
    .from(cohortInvites)
    .where(eq(cohortInvites.cohortId, cohortId))
    .orderBy(desc(cohortInvites.createdAt));

  return records
    .filter((invite) => !invite.revokedAt && invite.expiresAt && invite.expiresAt.getTime() > now)
    .map((invite) => toManagementCohortInvite(invite, frontendUrl));
}

async function resolveCohortInvite(
  inviteToken: string | undefined,
  jwtSecret: string
): Promise<CohortInvitePayload | null> {
  if (!inviteToken) return null;

  try {
    const payload = (await verify(inviteToken, jwtSecret, 'HS256')) as Partial<CohortInvitePayload>;
    if (
      payload.purpose !== 'cohort_invite' ||
      !payload.inviteId ||
      !payload.cohortId ||
      !payload.exp
    ) {
      return null;
    }
    return payload as CohortInvitePayload;
  } catch (error: any) {
    console.warn('Invalid cohort invite token:', error.message);
    return null;
  }
}

async function assignStudentToRegistrationCohort(
  databaseUrl: D1Database | undefined,
  invite: CohortInvitePayload | null,
  userId: string
) {
  if (!databaseUrl) return;

  const db = getDb(databaseUrl);
  let targetCohortId: string | undefined;

  if (invite) {
    const [inviteRecord] = await db
      .select()
      .from(cohortInvites)
      .where(eq(cohortInvites.id, invite.inviteId))
      .limit(1);

    if (
      inviteRecord &&
      inviteRecord.cohortId === invite.cohortId &&
      !inviteRecord.revokedAt &&
      inviteRecord.expiresAt.getTime() > Date.now()
    ) {
      targetCohortId = invite.cohortId;
    }
  }

  if (!targetCohortId) {
    const [openCohort] = await db
      .select({ id: cohorts.id })
      .from(cohorts)
      .where(eq(cohorts.registrationOpen, true))
      .limit(1);
    targetCohortId = openCohort?.id;
  }

  if (!targetCohortId) return;

  const [cohortRecord] = await db
    .select()
    .from(cohorts)
    .where(eq(cohorts.id, targetCohortId))
    .limit(1);

  if (!cohortRecord) return;

  const existingMembership = await db
    .select()
    .from(cohortMemberships)
    .where(
      and(eq(cohortMemberships.userId, userId), eq(cohortMemberships.cohortId, targetCohortId))
    )
    .limit(1);

  if (existingMembership.length === 0) {
    await db.insert(cohortMemberships).values({
      userId,
      cohortId: targetCohortId,
    });
  }
}

async function hasCohortRegistrationTarget(db: ReturnType<typeof getDb>, invite: CohortInvitePayload | null) {
  if (invite) return true;

  const [openCohort] = await db
    .select({ id: cohorts.id })
    .from(cohorts)
    .where(eq(cohorts.registrationOpen, true))
    .limit(1);
  return Boolean(openCohort);
}

async function getManagementBackup(databaseUrl: D1Database | undefined): Promise<ManagementBackup> {
  if (!databaseUrl) {
    throw new Error('D1 binding is required for management data.');
  }

  const db = getDb(databaseUrl);
  const [
    addressRecords,
    schoolRecords,
    campusRecords,
    cohortRecords,
    guildRecords,
    characterClassRecords,
    userRecords,
    studentRecords,
    cohortMembershipRecords,
    characterRecords,
  ] = await Promise.all([
    db.select().from(addresses),
    db.select().from(schools),
    db.select().from(campuses),
    db.select().from(cohorts),
    db.select().from(guilds),
    db.select().from(gameCharacterClasses),
    db.select().from(users),
    db.select().from(students),
    db.select().from(cohortMemberships),
    db.select().from(gameCharacters),
  ]);

  const addressMap = new Map(addressRecords.map((record) => [record.id, toAddress(record)]));
  const schoolMap = new Map(schoolRecords.map((record) => [record.id, toSchool(record)]));
  const campusMap = new Map(
    campusRecords.map((record) => [
      record.id,
      toCampus(
        record,
        schoolMap.get(record.schoolId),
        record.addressId ? addressMap.get(record.addressId) : undefined
      ),
    ])
  );
  const cohortMap = new Map(
    cohortRecords.map((record) => [
      record.id,
      toCohort(
        record,
        schoolMap.get(record.schoolId),
        record.campusId ? campusMap.get(record.campusId) : undefined
      ),
    ])
  );
  const guildMap = new Map(
    guildRecords.map((record) => [record.id, toGuild(record, cohortMap.get(record.cohortId))])
  );
  const userMap = new Map(
    userRecords.map((record) => [record.id, toUser(record)])
  );
  const characterMap = new Map(
    characterRecords.map((record) => [record.studentId, toGameCharacter(record)])
  );
  const membershipsByUser = cohortMembershipRecords.reduce<
    Map<string, NonNullable<Student['cohortMemberships']>>
  >((groups, membership: CohortMembershipRecord) => {
    const current = groups.get(membership.userId) || [];
    current.push({
      userId: membership.userId,
      cohortId: membership.cohortId,
      cohort: cohortMap.get(membership.cohortId),
      guildId: membership.guildId || undefined,
      guild: membership.guildId ? guildMap.get(membership.guildId) : undefined,
      institutionalEmail: membership.institutionalEmail || undefined,
      createdAt: toIsoString(membership.createdAt),
    });
    groups.set(membership.userId, current);
    return groups;
  }, new Map());

  const studentProfiles = studentRecords.flatMap((studentRecord) => {
    const user = userMap.get(studentRecord.userId);
    if (!user) return [];
    const character = characterMap.get(studentRecord.id);

    return [
      {
        user,
        student: toStudent(studentRecord, membershipsByUser.get(studentRecord.userId) || []),
        ...(character ? { character } : {}),
      },
    ];
  });

  return {
    addresses: Array.from(addressMap.values()),
    schools: Array.from(schoolMap.values()),
    campuses: Array.from(campusMap.values()),
    cohorts: Array.from(cohortMap.values()),
    characterClasses: characterClassRecords
      .map(toGameCharacterClassDefinition)
      .sort((a, b) => a.sortOrder - b.sortOrder),
    students: studentProfiles,
  };
}

type DevStudentOption = {
  id: string;
  username?: string;
  displayName: string;
  email: string;
  schoolName?: string;
  cohortNames: string[];
};

function toDevStudentOption(profile: ManagementBackup['students'][number]): DevStudentOption {
  const { user, student } = profile;
  return {
    id: user.id,
    username: user.githubUsername || user.id,
    displayName: user.displayName || user.email,
    email: user.email,
    schoolName: student.cohortMemberships?.[0]?.cohort?.school?.name,
    cohortNames:
      student.cohortMemberships
        ?.map((membership) => membership.cohort?.name)
        .filter((name): name is string => Boolean(name)) || [],
  };
}

async function getDevStudentOptions(databaseUrl: D1Database | undefined): Promise<DevStudentOption[]> {
  if (!databaseUrl) return [];

  const backup = await getManagementBackup(databaseUrl);
  return backup.students.filter((profile) => !profile.user.isAdmin).map(toDevStudentOption);
}

async function findDevDatabaseUser(databaseUrl: D1Database, identifier?: string | null) {
  const db = getDb(databaseUrl);
  const userRecords = await db.select().from(users).orderBy(desc(users.createdAt));
  const selectableUsers = userRecords.map(toUser);

  if (!identifier) return selectableUsers.find((user) => !user.isAdmin) || selectableUsers[0];

  return selectableUsers.find(
    (user) => user.id === identifier || user.githubUsername === identifier || user.email === identifier
  );
}

function toAuthPayload(user: User): UserPayload {
  return {
    id: user.id,
    email: user.email,
    githubUsername: user.githubUsername,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName,
    birthDate: user.birthDate,
    bio: user.bio,
    pronouns: user.pronouns,
    avatarUrl: user.avatarUrl,
    githubAvatarUrl: user.githubAvatarUrl,
    preferredLocale: user.preferredLocale,
    isAdmin: user.isAdmin,
  };
}

function signAuthToken(payload: UserPayload, jwtSecret: string) {
  return sign(
    {
      ...payload,
      exp: Math.floor(Date.now() / 1000) + AUTH_TOKEN_TTL_SECONDS,
    },
    jwtSecret
  );
}

// 1. GET /api/auth/github : Redirige vers GitHub OAuth
authRouter.get('/github', (c) => {
  const clientId = c.env.GITHUB_CLIENT_ID;
  const redirectUri = c.env.GITHUB_REDIRECT_URI || 'http://localhost:8787/api/auth/github/callback';
  const inviteToken = c.req.query('invite');

  if (!clientId) {
    return apiError(c, 'GitHub sign-in is not configured. Please contact an administrator.', 500, { errorCode: 'server_configuration' });
  }

  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=user:email${inviteToken ? `&state=${encodeURIComponent(inviteToken)}` : ''}`;

  return c.redirect(githubAuthUrl);
});

// 2. GET /api/auth/github/callback : Callback GitHub OAuth
authRouter.get('/github/callback', async (c) => {
  const code = c.req.query('code');
  const inviteToken = c.req.query('state');
  const jwtSecret = requireJwtSecret(c.env);
  const frontendUrl = requireFrontendUrl(c.env);

  if (!code) {
    return c.redirect(`${frontendUrl}/?error=missing_code`);
  }

  const clientId = c.env.GITHUB_CLIENT_ID;
  const clientSecret = c.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('GitHub Client credentials missing in environment.');
    return c.redirect(`${frontendUrl}/?error=config_error`);
  }

  const databaseUrl = c.env.DB;
  if (!databaseUrl) {
    console.error('D1 binding is missing; database-backed OAuth sessions cannot be created.');
    return c.redirect(`${frontendUrl}/?error=missing_database_url`);
  }

  try {
    // A. Échange du code contre un Access Token GitHub
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = (await tokenResponse.json()) as { access_token?: string; error?: string };

    if (!tokenData.access_token) {
      console.error('GitHub token exchange failed:', tokenData.error || 'No token returned');
      return c.redirect(`${frontendUrl}/?error=token_exchange_failed`);
    }

    const accessToken = tokenData.access_token;

    // B. Récupération des informations de l'utilisateur sur GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'EduQuest-Backend',
      },
    });
    const githubUser = (await userResponse.json()) as {
      login: string;
      id: number;
      name?: string;
      email?: string;
      avatar_url?: string;
    };

    // C. Récupération de l'e-mail primaire (nécessaire si privé sur GitHub)
    const emailsResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'EduQuest-Backend',
      },
    });
    const emails = (await emailsResponse.json()) as {
      email: string;
      primary: boolean;
      verified: boolean;
    }[];

    const primaryEmail =
      emails.find((e) => e.primary)?.email ||
      emails[0]?.email ||
      githubUser.email ||
      `${githubUser.login}@github-user.com`;

    const avatarUrl =
      githubUser.avatar_url ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';

    // D. Gestion de l'utilisateur en Base de Données
    let userId = `user_${githubUser.id}`;
    let authenticatedStudentId: string | undefined;
    const isAptitek = githubUser.login.toLowerCase() === 'aptitek';
    let isAdmin: boolean = isAptitek;
    const cohortInvite = await resolveCohortInvite(inviteToken, jwtSecret);

    if (databaseUrl) {
      try {
        const db = getDb(databaseUrl);

        // Self-healing: Ensure a default school exists in the database
        const existingSchools = await db.select().from(schools).limit(1);
        if (existingSchools.length === 0) {
          await db.insert(schools).values({
            name: 'Aptitek',
            emailDomain: 'school.edu',
          });
        }
        await ensureCharacterClassSeeds(db);

        // Recherche de l'utilisateur existant
        const existingUsers = await db
          .select()
          .from(users)
          .where(eq(users.email, primaryEmail))
          .limit(1);

        if (existingUsers.length > 0) {
          const userRecord = existingUsers[0];
          userId = userRecord.id;
          isAdmin = userRecord.isAdmin || isAptitek;

          // Mettre à jour lastLogin
          await db
            .update(users)
            .set({
              lastLogin: new Date(),
              githubEmail: primaryEmail,
              githubSsoToken: accessToken,
              githubUsername: githubUser.login,
              displayName: githubUser.name || githubUser.login,
              githubAvatarUrl: avatarUrl,
              avatarUrl: avatarUrl,
              isAdmin: isAptitek ? true : userRecord.isAdmin,
              updatedAt: new Date(),
            })
            .where(eq(users.id, userId));

          if (!isAdmin) {
            const existingStudents = await db
              .select()
              .from(students)
              .where(eq(students.userId, userId))
              .limit(1);

            if (existingStudents[0]) {
              authenticatedStudentId = existingStudents[0].id;
            } else if (await hasCohortRegistrationTarget(db, cohortInvite)) {
              const [newStudent] = await db
                .insert(students)
                .values({
                  userId,
                })
                .returning();

              authenticatedStudentId = newStudent.id;
            }
          }
        } else {
          // Création d'un nouvel utilisateur (Auto-registration)
          const [newUser] = await db
            .insert(users)
            .values({
              githubEmail: primaryEmail,
              email: primaryEmail,
              githubSsoToken: accessToken,
              githubUsername: githubUser.login,
              displayName: githubUser.name || githubUser.login,
              githubAvatarUrl: avatarUrl,
              avatarUrl: avatarUrl,
              isAdmin: isAptitek,
            })
            .returning();

          userId = newUser.id;
          isAdmin = newUser.isAdmin;

          if (!isAdmin) {
            // Création du profil étudiant associé (RPG Persona)
            const [newStudent] = await db
              .insert(students)
              .values({
                userId: newUser.id,
              })
              .returning();

            authenticatedStudentId = newStudent.id;
          }
        }

        if (!isAdmin && authenticatedStudentId) {
          await assignStudentToRegistrationCohort(databaseUrl, cohortInvite, userId);
        }
      } catch (dbError: any) {
        console.error('Database registration error:', dbError.message);
        throw dbError;
      }
    }

    // E. Signature du JWT Token
    const payload: UserPayload = {
      id: userId,
      email: primaryEmail,
      githubUsername: githubUser.login,
      displayName: githubUser.name || githubUser.login,
      githubAvatarUrl: avatarUrl,
      avatarUrl: avatarUrl,
      isAdmin,
    };
    const token = await signAuthToken(payload, jwtSecret);

    // F. Redirection vers le frontend
    return c.redirect(`${frontendUrl}/?token=${token}`);
  } catch (error: any) {
    console.error('OAuth callback execution error:', error.message);
    return c.redirect(`${frontendUrl}/?error=auth_internal_error`);
  }
});

authRouter.get('/dev/students', async (c) => {
  if (!isDebugAuthEnabled(c)) return c.notFound();
  if (!c.env.DB) return missingDatabaseBinding(c);

  return c.json({
    success: true,
    students: await getDevStudentOptions(c.env.DB),
  });
});

authRouter.get('/dev/mock-github', async (c) => {
  if (!isDebugAuthEnabled(c)) return c.notFound();
  if (!c.env.DB) return missingDatabaseBinding(c);

  const jwtSecret = requireJwtSecret(c.env);
  const frontendUrl = requireFrontendUrl(c.env);
  const cohortInvite = await resolveCohortInvite(c.req.query('invite'), jwtSecret);
  const uniqueId = crypto.randomUUID();
  const shortId = uniqueId.slice(0, 8);
  const githubUsername = `mock-github-${shortId}`;
  const email = `${githubUsername}@github-user.test`;
  const displayName = `Mock GitHub ${shortId}`;
  const avatarUrl = `https://avatars.githubusercontent.com/u/${Math.floor(Math.random() * 1000000)}?v=4`;

  try {
    const db = getDb(c.env.DB);
    await ensureCharacterClassSeeds(db);

    const [newUser] = await db
      .insert(users)
      .values({
        githubEmail: email,
        email,
        githubSsoToken: `mock-dev-token-${uniqueId}`,
        githubUsername,
        displayName,
        githubAvatarUrl: avatarUrl,
        avatarUrl,
        isAdmin: false,
      })
      .returning();

    const [newStudent] = await db
      .insert(students)
      .values({
        userId: newUser.id,
      })
      .returning();

    if (newStudent) {
      await assignStudentToRegistrationCohort(c.env.DB, cohortInvite, newUser.id);
    }

    const token = await signAuthToken(
      toAuthPayload({
        ...toUser(newUser),
        githubUsername,
        githubAvatarUrl: avatarUrl,
        avatarUrl,
      }),
      jwtSecret
    );

    return c.redirect(`${frontendUrl}/?token=${token}`);
  } catch (dbError: any) {
    console.error('DB mock GitHub account creation failed:', dbError.message);
    return c.redirect(`${frontendUrl}/?error=debug_login_failed`);
  }
});

authRouter.get('/character-classes', async (c) => {
  if (!c.env.DB) {
    return missingDatabaseBinding(c);
  }

  const db = getDb(c.env.DB);
  await ensureCharacterClassSeeds(db);
  const balanceConfig = await RewardBalanceConfigService.getActiveConfig(db, c.req.query('gameId'));

  const characterClasses = await db
    .select()
    .from(gameCharacterClasses)
    .orderBy(gameCharacterClasses.sortOrder);

  return c.json({
    success: true,
    characterClasses: characterClasses.map(toGameCharacterClassDefinition),
    statConfig: {
      maxValue: balanceConfig.rewardSystem.attributes.levelOneMaxValue,
      allocationBudget: balanceConfig.rewardSystem.attributes.statAllocationBudget,
    },
  });
});

authRouter.use('/management/*', authMiddleware);
authRouter.get('/management', async (c) => {
  const currentUser = c.get('user');
  if (!currentUser?.isAdmin) {
    return apiError(c, 'Access denied. You do not have permission to do this.', 403, { errorCode: 'access_denied' });
  }

  if (!c.env.DB) {
    return missingDatabaseBinding(c);
  }

  return c.json({
    success: true,
    backup: await getManagementBackup(c.env.DB),
  });
});

authRouter.post('/management/schools', async (c) => {
  const currentUser = c.get('user');
  if (!currentUser?.isAdmin) {
    return apiError(c, 'Access denied. You do not have permission to do this.', 403, { errorCode: 'access_denied' });
  }

  let body: ManagementSchoolCreateBody = {};
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }

  if (!c.env.DB) {
    return missingDatabaseBinding(c);
  }

  await getDb(c.env.DB).insert(schools).values({
    name: body.name?.trim() || 'Nouvelle école',
    website: body.website?.trim() || null,
    emailDomain: body.emailDomain?.trim() || null,
  });

  return c.json({
    success: true,
    backup: await getManagementBackup(c.env.DB),
  });
});

authRouter.post('/management/cohorts', async (c) => {
  const currentUser = c.get('user');
  if (!currentUser?.isAdmin) {
    return apiError(c, 'Access denied. You do not have permission to do this.', 403, { errorCode: 'access_denied' });
  }

  let body: ManagementCohortCreateBody = {};
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }

  if (body.grade && !COHORT_GRADE_SET.has(body.grade)) {
    return apiError(c, 'Invalid cohort grade', 400, { errorCode: 'validation_failed' });
  }

  if (!c.env.DB) {
    return missingDatabaseBinding(c);
  }

  const db = getDb(c.env.DB);
  const [schoolRecord] = body.schoolId
    ? await db.select().from(schools).where(eq(schools.id, body.schoolId)).limit(1)
    : await db.select().from(schools).limit(1);
  if (!schoolRecord) {
    return apiError(c, 'Create a school before creating a cohort.', 400, { errorCode: 'validation_failed' });
  }

  const schoolId = schoolRecord.id;
  const campusId =
    (await db.select().from(campuses).where(eq(campuses.schoolId, schoolId)).limit(1))[0]?.id ||
    null;

  try {
    if (body.registrationOpen) {
      await db.update(cohorts).set({ registrationOpen: false, updatedAt: new Date() });
    }

    await db.insert(cohorts).values({
      schoolId,
      campusId,
      startYear: body.startYear || new Date().getFullYear(),
      grade: body.grade || 'bachelor',
      level: body.level || 1,
      registrationOpen: Boolean(body.registrationOpen),
      name: body.name?.trim() || 'Nouvelle cohorte',
      majorSpeciality: body.majorSpeciality?.trim() || null,
      minorSpeciality: body.minorSpeciality?.trim() || null,
      description: body.description?.trim() || null,
    });
  } catch (error: any) {
    console.error('Management cohort create SQL error:', error.message);
    return apiError(c, 'Cohort could not be created.', 500);
  }

  return c.json({
    success: true,
    backup: await getManagementBackup(c.env.DB),
  });
});

authRouter.post('/management/students', async (c) => {
  const currentUser = c.get('user');
  if (!currentUser?.isAdmin) {
    return apiError(c, 'Access denied. You do not have permission to do this.', 403, { errorCode: 'access_denied' });
  }

  return apiError(c, 'Student creation from management is disabled. Invite students with GitHub instead.', 409, {
    errorCode: 'conflict',
  });
});

authRouter.post('/management/students/:studentId/impersonate', async (c) => {
  const currentUser = c.get('user');
  if (!currentUser?.isAdmin) {
    return apiError(c, 'Access denied. You do not have permission to do this.', 403, { errorCode: 'access_denied' });
  }
  if (!c.env.DB) return missingDatabaseBinding(c);

  const studentId = c.req.param('studentId');
  const db = getDb(c.env.DB);
  const [studentRecord] = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
  if (!studentRecord) {
    return apiError(c, 'Student profile not found.', 404, { errorCode: 'not_found' });
  }

  const [targetUserRecord] = await db
    .select()
    .from(users)
    .where(eq(users.id, studentRecord.userId))
    .limit(1);
  if (!targetUserRecord) {
    return apiError(c, 'User profile not found.', 404, { errorCode: 'not_found' });
  }
  if (targetUserRecord.isAdmin) {
    return apiError(c, 'Admin users cannot be impersonated.', 403, { errorCode: 'access_denied' });
  }

  await db
    .update(users)
    .set({ lastLogin: new Date(), updatedAt: new Date() })
    .where(eq(users.id, targetUserRecord.id));

  const token = await signAuthToken(toAuthPayload(toUser(targetUserRecord)), requireJwtSecret(c.env));
  return c.json({
    success: true,
    token,
    user: toUser(targetUserRecord),
  });
});

authRouter.get('/management/cohorts/:cohortId/invites', async (c) => {
  const currentUser = c.get('user');
  if (!currentUser?.isAdmin) {
    return apiError(c, 'Access denied. You do not have permission to do this.', 403, { errorCode: 'access_denied' });
  }

  const cohortId = c.req.param('cohortId');
  const frontendUrl = requireFrontendUrl(c.env);
  if (!c.env.DB) return missingDatabaseBinding(c);

  return c.json({
    success: true,
    invites: await listActiveCohortInvites(c.env.DB, cohortId, frontendUrl),
  });
});

authRouter.post('/management/cohorts/:cohortId/invite', async (c) => {
  const currentUser = c.get('user');
  if (!currentUser?.isAdmin) {
    return apiError(c, 'Access denied. You do not have permission to do this.', 403, { errorCode: 'access_denied' });
  }

  const cohortId = c.req.param('cohortId');
  if (!c.env.DB) return missingDatabaseBinding(c);

  const cohortExists =
    (
      await getDb(c.env.DB)
        .select()
        .from(cohorts)
        .where(eq(cohorts.id, cohortId))
        .limit(1)
    ).length > 0;

  if (!cohortExists) {
    return c.json(
      {
        success: false,
        error: 'Cohort not found',
      },
      404
    );
  }

  const jwtSecret = requireJwtSecret(c.env);
  const frontendUrl = requireFrontendUrl(c.env);
  const inviteId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token = await sign(
    {
      purpose: 'cohort_invite',
      inviteId,
      cohortId,
      exp: Math.floor(expiresAt.getTime() / 1000),
    },
    jwtSecret
  );
  const createdAt = new Date();

  await getDb(c.env.DB).insert(cohortInvites).values({
    id: inviteId,
    cohortId,
    token,
    expiresAt,
    createdAt,
  });

  return c.json({
    success: true,
    invite: {
      id: inviteId,
      cohortId,
      url: buildCohortInviteUrl(frontendUrl, token),
      token,
      expiresAt: expiresAt.toISOString(),
      createdAt: createdAt.toISOString(),
    },
  });
});

authRouter.delete('/management/cohorts/:cohortId/invites/:inviteId', async (c) => {
  const currentUser = c.get('user');
  if (!currentUser?.isAdmin) {
    return apiError(c, 'Access denied. You do not have permission to do this.', 403, { errorCode: 'access_denied' });
  }

  const cohortId = c.req.param('cohortId');
  const inviteId = c.req.param('inviteId');
  const revokedAt = new Date();
  if (!c.env.DB) return missingDatabaseBinding(c);

  await getDb(c.env.DB)
    .update(cohortInvites)
    .set({ revokedAt })
    .where(and(eq(cohortInvites.id, inviteId), eq(cohortInvites.cohortId, cohortId)));

  return c.json({
    success: true,
    invites: await listActiveCohortInvites(
      c.env.DB,
      cohortId,
      requireFrontendUrl(c.env)
    ),
  });
});

authRouter.put('/management/character-classes/:classSlug', async (c) => {
  const currentUser = c.get('user');
  if (!currentUser?.isAdmin) {
    return apiError(c, 'Access denied. You do not have permission to do this.', 403, { errorCode: 'access_denied' });
  }

  let body: ManagementCharacterClassUpdateBody;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const rawClassSlug = c.req.param('classSlug');
  if (!GAME_CHARACTER_CLASS_SET.has(rawClassSlug)) {
    return apiError(c, 'Character class not found', 404);
  }
  if (!c.env.DB) return missingDatabaseBinding(c);

  const classSlug = rawClassSlug as GameCharacterClass;
  const db = getDb(c.env.DB);
  const balanceConfig = await RewardBalanceConfigService.getActiveConfig(db);
  const baseStats = normalizeBaseStats(
    body.baseStats || {},
    balanceConfig.rewardSystem.attributes.levelOneMaxValue
  );
  if (!baseStats) {
    return apiError(c, 'Invalid base stats', 400);
  }

  const textField = (value: unknown, maxLength: number) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.slice(0, maxLength) || null;
  };
  const name = textField(body.name, 80);
  const subtitle = textField(body.subtitle, 120);
  const description = textField(body.description, 500);
  const iconKey = textField(body.iconKey, 80);
  const color = textField(body.color, 80);

  try {
    const [classRecord] = await db
      .select()
      .from(gameCharacterClasses)
      .where(eq(gameCharacterClasses.slug, classSlug))
      .limit(1);
    if (!classRecord) {
      return apiError(c, 'Character class not found', 404);
    }

    await db
      .update(gameCharacterClasses)
      .set({
        ...(name !== undefined ? { name } : {}),
        ...(subtitle !== undefined ? { subtitle } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(iconKey !== undefined ? { iconKey } : {}),
        ...(color !== undefined ? { color } : {}),
        baseStrength: baseStats.strength,
        baseDexterity: baseStats.dexterity,
        baseConstitution: baseStats.constitution,
        baseIntelligence: baseStats.intelligence,
        baseWisdom: baseStats.wisdom,
        baseCharisma: baseStats.charisma,
      })
      .where(eq(gameCharacterClasses.slug, classSlug));

    const affectedCharacters = await db
      .select({
        studentId: gameCharacters.studentId,
        strength: gameCharacters.strength,
        dexterity: gameCharacters.dexterity,
        constitution: gameCharacters.constitution,
        intelligence: gameCharacters.intelligence,
        wisdom: gameCharacters.wisdom,
        charisma: gameCharacters.charisma,
      })
      .from(gameCharacters)
      .where(eq(gameCharacters.characterClass, classSlug));

    for (const character of affectedCharacters) {
      const repair = repairManualAllocation(
        {
          strength: character.strength,
          dexterity: character.dexterity,
          constitution: character.constitution,
          intelligence: character.intelligence,
          wisdom: character.wisdom,
          charisma: character.charisma,
        },
        baseStats,
        balanceConfig.rewardSystem.attributes.levelOneMaxValue,
        balanceConfig.rewardSystem.attributes.statAllocationBudget
      );

      if (!repair.changed) continue;

      await db
        .update(gameCharacters)
        .set({
          strength: repair.nextManual.strength,
          dexterity: repair.nextManual.dexterity,
          constitution: repair.nextManual.constitution,
          intelligence: repair.nextManual.intelligence,
          wisdom: repair.nextManual.wisdom,
          charisma: repair.nextManual.charisma,
          updatedAt: new Date(),
        })
        .where(eq(gameCharacters.studentId, character.studentId));
    }

    return c.json({ success: true, backup: await getManagementBackup(c.env.DB) });
  } catch (error: any) {
    console.error('Character class management SQL error:', error.message);
    return apiError(c, 'Character class could not be updated.', 500);
  }
});

authRouter.put('/management/cohorts/:cohortId/character-classes/:classSlug', async (c) => {
  const currentUser = c.get('user');
  if (!currentUser?.isAdmin) {
    return apiError(c, 'Access denied. You do not have permission to do this.', 403, { errorCode: 'access_denied' });
  }

  let body: ManagementCharacterClassUpdateBody;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        success: false,
        error: 'Invalid JSON body',
      },
      400
    );
  }

  const rawClassSlug = c.req.param('classSlug');
  if (!GAME_CHARACTER_CLASS_SET.has(rawClassSlug)) {
    return apiError(c, 'Character class not found', 404);
  }

  const classSlug = rawClassSlug as GameCharacterClass;
  const cohortId = c.req.param('cohortId');

  if (!c.env.DB) {
    return missingDatabaseBinding(c);
  }

  const db = getDb(c.env.DB);
  const balanceConfig = await RewardBalanceConfigService.getActiveConfig(db);
  const baseStats = normalizeBaseStats(
    body.baseStats || {},
    balanceConfig.rewardSystem.attributes.levelOneMaxValue
  );

  if (!baseStats) {
    return apiError(c, 'Invalid base stats', 400);
  }

  try {
    const [cohortRecord] = await db
      .select()
      .from(cohorts)
      .where(eq(cohorts.id, cohortId))
      .limit(1);

    if (!cohortRecord) {
      return apiError(c, 'Cohort not found', 404);
    }

    const [classRecord] = await db
      .select()
      .from(gameCharacterClasses)
      .where(eq(gameCharacterClasses.slug, classSlug))
      .limit(1);

    if (!classRecord) {
      return apiError(c, 'Character class not found', 404);
    }

    await db
      .update(gameCharacterClasses)
      .set({
        baseStrength: baseStats.strength,
        baseDexterity: baseStats.dexterity,
        baseConstitution: baseStats.constitution,
        baseIntelligence: baseStats.intelligence,
        baseWisdom: baseStats.wisdom,
        baseCharisma: baseStats.charisma,
      })
      .where(eq(gameCharacterClasses.slug, classSlug));

    const affectedCharacters = await db
      .select({
        studentId: gameCharacters.studentId,
        strength: gameCharacters.strength,
        dexterity: gameCharacters.dexterity,
        constitution: gameCharacters.constitution,
        intelligence: gameCharacters.intelligence,
        wisdom: gameCharacters.wisdom,
        charisma: gameCharacters.charisma,
      })
      .from(cohortMemberships)
      .innerJoin(students, eq(students.userId, cohortMemberships.userId))
      .innerJoin(gameCharacters, eq(gameCharacters.studentId, students.id))
      .where(
        and(
          eq(cohortMemberships.cohortId, cohortId),
          eq(gameCharacters.characterClass, classSlug)
        )
      );

    for (const character of affectedCharacters) {
      const repair = repairManualAllocation(
        {
          strength: character.strength,
          dexterity: character.dexterity,
          constitution: character.constitution,
          intelligence: character.intelligence,
          wisdom: character.wisdom,
          charisma: character.charisma,
        },
        baseStats,
        balanceConfig.rewardSystem.attributes.levelOneMaxValue,
        balanceConfig.rewardSystem.attributes.statAllocationBudget
      );

      if (!repair.changed) continue;

      await db
        .update(gameCharacters)
        .set({
          strength: repair.nextManual.strength,
          dexterity: repair.nextManual.dexterity,
          constitution: repair.nextManual.constitution,
          intelligence: repair.nextManual.intelligence,
          wisdom: repair.nextManual.wisdom,
          charisma: repair.nextManual.charisma,
          updatedAt: new Date(),
        })
        .where(eq(gameCharacters.studentId, character.studentId));
    }

    return c.json({
      success: true,
      backup: await getManagementBackup(c.env.DB),
    });
  } catch (error: any) {
    console.error('Character class management SQL error:', error.message);
    return apiError(c, 'Character class could not be updated.', 500);
  }
});

authRouter.put('/management/students/:studentId', async (c) => {
  const currentUser = c.get('user');
  if (!currentUser?.isAdmin) {
    return apiError(c, 'Access denied. You do not have permission to do this.', 403, { errorCode: 'access_denied' });
  }

  let body: ManagementStudentUpdateBody;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        success: false,
        error: 'Invalid JSON body',
      },
      400
    );
  }

  if (body.user?.avatarUrl !== undefined && !isPersistableImageUrl(body.user.avatarUrl)) {
    return apiError(c, 'Avatar URL must reference an uploaded asset or external image.', 400, {
      errorCode: 'validation_failed',
    });
  }
  if (body.characterIllustrationUrl !== undefined && !isPersistableImageUrl(body.characterIllustrationUrl)) {
    return apiError(c, 'Character illustration URL must reference an uploaded asset or external image.', 400, {
      errorCode: 'validation_failed',
    });
  }

  const studentId = c.req.param('studentId');

  if (!c.env.DB) {
    return missingDatabaseBinding(c);
  }

  const db = getDb(c.env.DB);
  const [studentRecord] = await db
    .select()
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);

  if (!studentRecord) {
    return c.json(
      {
        success: false,
        error: 'Student not found',
      },
      404
    );
  }

  if (body.user && Object.keys(body.user).length > 0) {
    const userUpdate: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (body.user.displayName !== undefined) userUpdate.displayName = body.user.displayName;
    if (body.user.firstName !== undefined) userUpdate.firstName = body.user.firstName;
    if (body.user.lastName !== undefined) userUpdate.lastName = body.user.lastName;
    if (body.user.email !== undefined) userUpdate.email = body.user.email;
    if (body.user.avatarUrl !== undefined) userUpdate.avatarUrl = body.user.avatarUrl;
    if (body.user.birthDate !== undefined) userUpdate.birthDate = body.user.birthDate || null;
    if (body.user.bio !== undefined) userUpdate.bio = body.user.bio;
    if (body.user.pronouns !== undefined) userUpdate.pronouns = body.user.pronouns;

    await db.update(users).set(userUpdate).where(eq(users.id, studentRecord.userId));
  }

  if (
    body.characterClass !== undefined ||
    body.characterIllustrationUrl !== undefined ||
    body.characterTitle !== undefined ||
    body.characterStats !== undefined
  ) {
    if (body.characterClass !== undefined && !GAME_CHARACTER_CLASS_SET.has(body.characterClass)) {
      return apiError(c, 'Character class not found', 404);
    }

    await ensureCharacterClassSeeds(db);
    const [existingChar] = await db
      .select()
      .from(gameCharacters)
      .where(eq(gameCharacters.studentId, studentId))
      .limit(1);
    const nextClassSlug = (body.characterClass ||
      existingChar?.characterClass ||
      DEFAULT_CHARACTER_CLASS) as GameCharacterClass;
    const [classRecord] = await db
      .select()
      .from(gameCharacterClasses)
      .where(eq(gameCharacterClasses.slug, nextClassSlug))
      .limit(1);

    if (!classRecord) {
      return apiError(c, 'Character class not found', 404);
    }

    let characterStatsUpdate: CharacterStatAllocation | undefined;
    const baseStats = toGameCharacterClassDefinition(classRecord).baseStats;
    const balanceConfig = await RewardBalanceConfigService.getActiveConfig(
      db,
      typeof body.gameId === 'string' && body.gameId ? body.gameId : undefined
    );
    const statCap = balanceConfig.rewardSystem.attributes.levelOneMaxValue;
    const statBudget = balanceConfig.rewardSystem.attributes.statAllocationBudget;

    if (body.characterStats !== undefined) {
      characterStatsUpdate = normalizeManualAllocation(body.characterStats, {
        cap: statCap,
        budget: statBudget,
        baseStats,
      });
      if (!characterStatsUpdate) {
        return apiError(c, 'Character stats must respect the configured budget and cap.', 400, {
          errorCode: 'validation_failed',
        });
      }
    } else if (body.characterClass !== undefined && existingChar) {
      characterStatsUpdate = repairManualAllocation(
        toGameCharacterStats(existingChar),
        baseStats,
        statCap,
        statBudget
      ).nextManual;
    }

    if (existingChar) {
      await db
        .update(gameCharacters)
        .set({
          ...(body.characterClass !== undefined ? { characterClass: nextClassSlug } : {}),
          ...(body.characterIllustrationUrl !== undefined
            ? { illustrationUrl: body.characterIllustrationUrl || null }
            : {}),
          ...(body.characterTitle !== undefined ? { title: body.characterTitle.trim() || null } : {}),
          ...(characterStatsUpdate
            ? {
                strength: characterStatsUpdate.strength,
                dexterity: characterStatsUpdate.dexterity,
                constitution: characterStatsUpdate.constitution,
                intelligence: characterStatsUpdate.intelligence,
                wisdom: characterStatsUpdate.wisdom,
                charisma: characterStatsUpdate.charisma,
              }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(gameCharacters.studentId, studentId));
    } else {
      await db.insert(gameCharacters).values({
        studentId,
        characterClass: nextClassSlug,
        ...(body.characterIllustrationUrl !== undefined
          ? { illustrationUrl: body.characterIllustrationUrl || null }
          : {}),
        ...(body.characterTitle !== undefined ? { title: body.characterTitle.trim() || null } : {}),
        ...(characterStatsUpdate
          ? {
              strength: characterStatsUpdate.strength,
              dexterity: characterStatsUpdate.dexterity,
              constitution: characterStatsUpdate.constitution,
              intelligence: characterStatsUpdate.intelligence,
              wisdom: characterStatsUpdate.wisdom,
              charisma: characterStatsUpdate.charisma,
            }
          : {}),
      });
    }
  }

  let currentMemberships = await db
    .select()
    .from(cohortMemberships)
    .where(eq(cohortMemberships.userId, studentRecord.userId));

  if (body.cohortIds) {
    const nextCohortIds = Array.from(new Set(body.cohortIds.filter(Boolean)));
    const existingCohortIds = currentMemberships.map((membership) => membership.cohortId);
    const addedCohortIds = nextCohortIds.filter(
      (cohortId) => !existingCohortIds.includes(cohortId)
    );
    const removedCohortIds = existingCohortIds.filter(
      (cohortId) => !nextCohortIds.includes(cohortId)
    );

    if (nextCohortIds.length > 0) {
      const validCohorts = await db
        .select()
        .from(cohorts)
        .where(inArray(cohorts.id, nextCohortIds));
      if (validCohorts.length !== nextCohortIds.length) {
        return c.json(
          {
            success: false,
            error: 'One or more cohorts do not exist',
          },
          400
        );
      }
    }

    if (removedCohortIds.length > 0) {
      await db
        .delete(cohortMemberships)
        .where(
          and(
            eq(cohortMemberships.userId, studentRecord.userId),
            inArray(cohortMemberships.cohortId, removedCohortIds)
          )
        );
    }

    if (addedCohortIds.length > 0) {
      await db.insert(cohortMemberships).values(
        addedCohortIds.map((cohortId) => ({
          userId: studentRecord.userId,
          cohortId,
        }))
      );
    }

    currentMemberships = await db
      .select()
      .from(cohortMemberships)
      .where(eq(cohortMemberships.userId, studentRecord.userId));
  }

  if (body.institutionalEmail !== undefined) {
    const targetCohortId =
      body.institutionalEmailCohortId || body.cohortIds?.[0] || currentMemberships[0]?.cohortId;

    if (targetCohortId) {
      const [targetCohort] = await db
        .select()
        .from(cohorts)
        .where(eq(cohorts.id, targetCohortId))
        .limit(1);
      const [targetSchool] = targetCohort
        ? await db.select().from(schools).where(eq(schools.id, targetCohort.schoolId)).limit(1)
        : [];

      if (body.institutionalEmail && targetSchool?.emailDomain) {
        const domain = targetSchool.emailDomain.toLowerCase();
        if (!body.institutionalEmail.toLowerCase().endsWith('@' + domain)) {
          return c.json(
            {
              success: false,
              error: `Institutional email must end with @${domain}`,
              errorKey: 'profile.errors.institutionalEmailDomain',
            },
            400
          );
        }
      }

      await db
        .update(cohortMemberships)
        .set({
          institutionalEmail: body.institutionalEmail || null,
        })
        .where(
          and(
            eq(cohortMemberships.userId, studentRecord.userId),
            eq(cohortMemberships.cohortId, targetCohortId)
          )
        );
    }
  }

  return c.json({
    success: true,
    backup: await getManagementBackup(c.env.DB),
  });
});

authRouter.delete('/management/students/:studentId', async (c) => {
  const currentUser = c.get('user');
  if (!currentUser?.isAdmin) {
    return apiError(c, 'Access denied. You do not have permission to do this.', 403, { errorCode: 'access_denied' });
  }

  if (!c.env.DB) {
    return missingDatabaseBinding(c);
  }

  const studentId = c.req.param('studentId');
  const db = getDb(c.env.DB);
  const [studentRecord] = await db
    .select()
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);

  if (!studentRecord) {
    return apiError(c, 'Student not found', 404);
  }

  await db.delete(gameCharacters).where(eq(gameCharacters.studentId, studentId));
  await db.delete(users).where(eq(users.id, studentRecord.userId));

  return c.json({
    success: true,
    backup: await getManagementBackup(c.env.DB),
  });
});

authRouter.put('/management/cohorts/:cohortId', async (c) => {
  const currentUser = c.get('user');
  if (!currentUser?.isAdmin) {
    return apiError(c, 'Access denied. You do not have permission to do this.', 403, { errorCode: 'access_denied' });
  }

  let body: ManagementCohortUpdateBody;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        success: false,
        error: 'Invalid JSON body',
      },
      400
    );
  }

  if (body.grade && !COHORT_GRADE_SET.has(body.grade)) {
    return apiError(c, 'Invalid cohort grade', 400, { errorCode: 'validation_failed' });
  }

  if (!c.env.DB) {
    return missingDatabaseBinding(c);
  }

  const cohortId = c.req.param('cohortId');
  const db = getDb(c.env.DB);
  const [cohortRecord] = await db
    .select()
    .from(cohorts)
    .where(eq(cohorts.id, cohortId))
    .limit(1);

  if (!cohortRecord) {
    return apiError(c, 'Cohort not found', 404);
  }

  const targetSchoolId = body.schoolId ?? cohortRecord.schoolId;
  const isChangingSchool = targetSchoolId !== cohortRecord.schoolId;
  if (body.schoolId !== undefined) {
    const [schoolRecord] = await db.select().from(schools).where(eq(schools.id, body.schoolId)).limit(1);
    if (!schoolRecord) {
      return apiError(c, 'School not found', 400, { errorCode: 'validation_failed' });
    }
  }

  const cohortUpdate: Partial<typeof cohorts.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (body.schoolId !== undefined) cohortUpdate.schoolId = targetSchoolId;
  if (body.startYear !== undefined) cohortUpdate.startYear = body.startYear;
  if (body.grade !== undefined) cohortUpdate.grade = body.grade;
  if (body.level !== undefined) cohortUpdate.level = body.level;
  if (body.name !== undefined) cohortUpdate.name = body.name.trim() || cohortRecord.name;
  if (body.majorSpeciality !== undefined) cohortUpdate.majorSpeciality = body.majorSpeciality.trim() || null;
  if (body.minorSpeciality !== undefined) cohortUpdate.minorSpeciality = body.minorSpeciality.trim() || null;
  if (body.description !== undefined) cohortUpdate.description = body.description.trim() || null;
  if (body.registrationOpen !== undefined) cohortUpdate.registrationOpen = body.registrationOpen;

  try {
    if (body.campusName !== undefined) {
      const campusName = body.campusName.trim();
      if (cohortRecord.campusId && !isChangingSchool) {
        await db
          .update(campuses)
          .set({ name: campusName || 'Campus principal', updatedAt: new Date() })
          .where(eq(campuses.id, cohortRecord.campusId));
      } else if (campusName) {
        const [newCampus] = await db
          .insert(campuses)
          .values({
            schoolId: targetSchoolId,
            name: campusName,
          })
          .returning();
        cohortUpdate.campusId = newCampus.id;
      } else {
        cohortUpdate.campusId = null;
      }
    } else if (isChangingSchool) {
      const [campusRecord] = await db
        .select()
        .from(campuses)
        .where(eq(campuses.schoolId, targetSchoolId))
        .limit(1);
      cohortUpdate.campusId = campusRecord?.id || null;
    }

    if (body.registrationOpen === true) {
      await db
        .update(cohorts)
        .set({ registrationOpen: false, updatedAt: new Date() })
        .where(sql`${cohorts.id} <> ${cohortId}`);
    }

    await db.update(cohorts).set(cohortUpdate).where(eq(cohorts.id, cohortId));
  } catch (error: any) {
    console.error('Management cohort update SQL error:', error.message);
    return apiError(c, 'Cohort could not be updated.', 500);
  }

  return c.json({
    success: true,
    backup: await getManagementBackup(c.env.DB),
  });
});

authRouter.delete('/management/cohorts/:cohortId', async (c) => {
  const currentUser = c.get('user');
  if (!currentUser?.isAdmin) {
    return apiError(c, 'Access denied. You do not have permission to do this.', 403, { errorCode: 'access_denied' });
  }

  if (!c.env.DB) {
    return missingDatabaseBinding(c);
  }

  const cohortId = c.req.param('cohortId');
  await getDb(c.env.DB).delete(cohorts).where(eq(cohorts.id, cohortId));

  return c.json({
    success: true,
    backup: await getManagementBackup(c.env.DB),
  });
});

authRouter.put('/management/schools/:schoolId', async (c) => {
  const currentUser = c.get('user');
  if (!currentUser?.isAdmin) {
    return apiError(c, 'Access denied. You do not have permission to do this.', 403, { errorCode: 'access_denied' });
  }

  let body: ManagementSchoolUpdateBody;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        success: false,
        error: 'Invalid JSON body',
      },
      400
    );
  }

  const schoolId = c.req.param('schoolId');

  if (body.logoUrl !== undefined && !isPersistableImageUrl(body.logoUrl)) {
    return apiError(c, 'Logo URL must reference an uploaded asset or external image.', 400, {
      errorCode: 'validation_failed',
    });
  }

  if (!c.env.DB) {
    return missingDatabaseBinding(c);
  }

  const db = getDb(c.env.DB);
  const [schoolRecord] = await db.select().from(schools).where(eq(schools.id, schoolId)).limit(1);

  if (!schoolRecord) {
    return c.json(
      {
        success: false,
        error: 'School not found',
      },
      404
    );
  }

  const schoolUpdate: Partial<typeof schools.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (body.name !== undefined) schoolUpdate.name = body.name.trim() || schoolRecord.name;
  if (body.website !== undefined) schoolUpdate.website = body.website.trim() || null;
  if (body.emailDomain !== undefined) schoolUpdate.emailDomain = body.emailDomain.trim() || null;
  if (body.logoUrl !== undefined) schoolUpdate.logoUrl = body.logoUrl || null;

  await db.update(schools).set(schoolUpdate).where(eq(schools.id, schoolId));

  if (body.address !== undefined) {
    const parsedAddress = parseManagementAddress(body.address);
    const [campusRecord] = await db
      .select()
      .from(campuses)
      .where(eq(campuses.schoolId, schoolId))
      .limit(1);

    if (!parsedAddress) {
      if (campusRecord?.addressId) {
        await db
          .update(campuses)
          .set({ addressId: null, updatedAt: new Date() })
          .where(eq(campuses.id, campusRecord.id));
      }
    } else if (campusRecord?.addressId) {
      await db
        .update(addresses)
        .set({ ...parsedAddress, updatedAt: new Date() })
        .where(eq(addresses.id, campusRecord.addressId));
    } else {
      const [addressRecord] = await db
        .insert(addresses)
        .values(parsedAddress)
        .returning();

      if (campusRecord) {
        await db
          .update(campuses)
          .set({ addressId: addressRecord.id, updatedAt: new Date() })
          .where(eq(campuses.id, campusRecord.id));
      } else {
        await db.insert(campuses).values({
          schoolId,
          addressId: addressRecord.id,
          name: 'Campus principal',
        });
      }
    }
  }

  return c.json({
    success: true,
    backup: await getManagementBackup(c.env.DB),
  });
});

authRouter.delete('/management/schools/:schoolId', async (c) => {
  const currentUser = c.get('user');
  if (!currentUser?.isAdmin) {
    return apiError(c, 'Access denied. You do not have permission to do this.', 403, { errorCode: 'access_denied' });
  }

  if (!c.env.DB) {
    return missingDatabaseBinding(c);
  }

  const schoolId = c.req.param('schoolId');
  await getDb(c.env.DB).delete(schools).where(eq(schools.id, schoolId));

  return c.json({
    success: true,
    backup: await getManagementBackup(c.env.DB),
  });
});

function requireAdmin(c: { get: (key: 'user') => UserPayload | undefined }) {
  const currentUser = c.get('user');
  if (!currentUser?.isAdmin) {
    return null;
  }
  return currentUser;
}

authRouter.get('/management/reward-balance', async (c) => {
  if (!requireAdmin(c)) {
    return apiError(c, 'Access denied. You do not have permission to do this.', 403, { errorCode: 'access_denied' });
  }

  const cohortId = c.req.query('cohortId') || c.req.query('gameId') || undefined;
  if (!c.env.DB) {
    const config = await RewardBalanceConfigService.getActiveConfig();
    return c.json({ success: true, config });
  }

  const db = getDb(c.env.DB);
  const config = await RewardBalanceConfigService.getActiveConfig(db, cohortId);
  return c.json({ success: true, config });
});

authRouter.get('/management/reward-balance/versions', async (c) => {
  if (!requireAdmin(c)) {
    return apiError(c, 'Access denied. You do not have permission to do this.', 403, { errorCode: 'access_denied' });
  }

  if (!c.env.DB) {
    return c.json({ success: true, versions: [] });
  }

  const db = getDb(c.env.DB);
  const cohortId = c.req.query('cohortId') || c.req.query('gameId') || undefined;
  const versions = await RewardBalanceConfigService.listVersions(db, cohortId);
  return c.json({ success: true, versions });
});

authRouter.put('/management/reward-balance', async (c) => {
  const currentUser = requireAdmin(c);
  if (!currentUser) {
    return apiError(c, 'Access denied. You do not have permission to do this.', 403, { errorCode: 'access_denied' });
  }

  if (!c.env.DB) {
    return missingDatabaseBinding(c);
  }

  const body = await parseRequiredJsonBody<RewardBalanceConfigPayload>(c);
  if (body instanceof Response) return body;

  const cohortId = c.req.query('cohortId') || c.req.query('gameId') || undefined;
  const db = getDb(c.env.DB);
  const created = await RewardBalanceConfigService.publish(db, body, currentUser.id, cohortId);
  const config = await RewardBalanceConfigService.getActiveConfig(db, cohortId);

  return c.json({ success: true, version: created, config });
});

authRouter.post('/management/reward-balance/preview', async (c) => {
  if (!requireAdmin(c)) {
    return apiError(c, 'Access denied. You do not have permission to do this.', 403, { errorCode: 'access_denied' });
  }

  if (!c.env.DB) {
    return missingDatabaseBinding(c);
  }

  const body = await parseRequiredJsonBody<RewardBalanceConfigPayload & {
    activityId?: string;
    studentId?: string;
    guildId?: string;
    cohortId?: string;
  }>(c);
  if (body instanceof Response) return body;

  if (!body.activityId || !body.studentId || !body.guildId) {
    return apiError(c, 'activityId, studentId, and guildId are required.', 400);
  }

  const db = getDb(c.env.DB);
  const { activityId, studentId, guildId, cohortId, ...configPayload } = body;
  const breakdown = await new RewardPreviewService(db).preview({
    activityId,
    studentId,
    guildId,
    cohortId,
    configOverride: configPayload,
  });

  if (!breakdown) {
    return apiError(c, 'Activity not found.', 404);
  }

  return c.json({ success: true, breakdown });
});

// Dev-only login: explicit opt-in, database-backed, and disabled in production.
authRouter.get('/dev/login', async (c) => {
  if (!isDebugAuthEnabled(c)) return c.notFound();
  if (!c.env.DB) return missingDatabaseBinding(c);

  const jwtSecret = requireJwtSecret(c.env);
  const frontendUrl = requireFrontendUrl(c.env);
  const cohortInvite = await resolveCohortInvite(c.req.query('invite'), jwtSecret);
  const requestedUser = c.req.query('studentId') || c.req.query('username');

  try {
    const user = await findDevDatabaseUser(c.env.DB, requestedUser);
    if (!user) {
      return c.redirect(`${frontendUrl}/?error=debug_user_not_found`);
    }

    if (!user.isAdmin) {
      await assignStudentToRegistrationCohort(c.env.DB, cohortInvite, user.id);
    }

    await getDb(c.env.DB)
      .update(users)
      .set({ lastLogin: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id));

    const token = await signAuthToken(toAuthPayload(user), jwtSecret);
    return c.redirect(`${frontendUrl}/?token=${token}`);
  } catch (dbError: any) {
    console.error('DB dev login failed:', dbError.message);
    return c.redirect(`${frontendUrl}/?error=debug_login_failed`);
  }
});

// 4. GET /api/auth/me : Récupère la session courante (Sécurisé)
authRouter.get('/me', authMiddleware, async (c) => {
  const userPayload = c.get('user') as UserPayload;

  if (!userPayload) {
    return apiError(c, 'Your session expired. Please sign in again.', 401, {
      errorCode: 'session_expired',
      errorKey: 'profile.errors.unauthorized',
    });
  }

  const databaseUrl = c.env.DB;
  if (!databaseUrl) {
    return missingDatabaseBinding(c);
  }
  const jwtSecret = requireJwtSecret(c.env);

  let loadedDbProfile = false;

  // Données utilisateur réelles ou fallback JWT
  let userObj: User = {
    id: userPayload.id,
    email: userPayload.email,
    githubUsername: userPayload.githubUsername,
    firstName: userPayload.firstName,
    lastName: userPayload.lastName,
    displayName: userPayload.displayName,
    birthDate: userPayload.birthDate,
    bio: userPayload.bio,
    pronouns: userPayload.pronouns,
    avatarUrl: userPayload.avatarUrl,
    githubAvatarUrl: userPayload.githubAvatarUrl,
    preferredLocale: userPayload.preferredLocale,
    isAdmin: userPayload.isAdmin,
  };

  let studentObj: Student | null = null;
  let characterObj: GameCharacter | null = null;
  let activityCompletionObj: GameActivityCompletion[] = [];

  // Si DB est configurée, charger les données réelles
  if (databaseUrl) {
    try {
      const db = getDb(databaseUrl);

      // Charger le profil utilisateur réel pour récupérer les métadonnées (ex: avatar) en temps réel
      const loadedUsers = await db
        .select()
        .from(users)
        .where(eq(users.id, userPayload.id))
        .limit(1);
      if (loadedUsers.length > 0) {
        userObj = toUser(loadedUsers[0]);
      } else {
        return apiError(c, 'User profile not found.', 404);
      }

      if (userObj.isAdmin) {
        const refreshedToken = await signAuthToken(toAuthPayload(userObj), jwtSecret);
        return c.json({
          success: true,
          token: refreshedToken,
          user: userObj,
          student: null,
          character: null,
          activityCompletions: [],
        });
      }

      const loadedStudents = await db
        .select()
        .from(students)
        .where(eq(students.userId, userPayload.id))
        .limit(1);

      if (loadedStudents.length > 0) {
        const studentRecord = loadedStudents[0];

        const latestMemberships = await db
          .select()
          .from(cohortMemberships)
          .where(eq(cohortMemberships.userId, studentRecord.userId))
          .orderBy(desc(cohortMemberships.createdAt));

        const membershipItems: CohortMembership[] = [];
        for (const membership of latestMemberships) {
          const loadedCohorts = await db
            .select()
            .from(cohorts)
            .where(eq(cohorts.id, membership.cohortId))
            .limit(1);
          const [loadedGuild] = membership.guildId
            ? await db.select().from(guilds).where(eq(guilds.id, membership.guildId)).limit(1)
            : [];

          if (loadedCohorts.length > 0) {
            const cohortRecord = loadedCohorts[0];
            let cohortSchoolObj: any = undefined;
            if (cohortRecord.schoolId) {
              const loadedCohortSchools = await db
                .select()
                .from(schools)
                .where(eq(schools.id, cohortRecord.schoolId))
                .limit(1);
              if (loadedCohortSchools.length > 0) {
                cohortSchoolObj = {
                  id: loadedCohortSchools[0].id,
                  name: loadedCohortSchools[0].name,
                  logoUrl: loadedCohortSchools[0].logoUrl || undefined,
                  emailDomain: loadedCohortSchools[0].emailDomain || undefined,
                };
              }
            }

            membershipItems.push({
              userId: membership.userId,
              cohortId: membership.cohortId,
              guildId: membership.guildId || undefined,
              guild: loadedGuild
                ? toGuild(loadedGuild, {
                    id: cohortRecord.id,
                    schoolId: cohortRecord.schoolId,
                    school: cohortSchoolObj,
                    campusId: cohortRecord.campusId || undefined,
                    startYear: cohortRecord.startYear,
                    grade: cohortRecord.grade as CohortGrade,
                    level: cohortRecord.level,
                    name: cohortRecord.name,
                    majorSpeciality: cohortRecord.majorSpeciality || undefined,
                    minorSpeciality: cohortRecord.minorSpeciality || undefined,
                    description: cohortRecord.description || undefined,
                  })
                : undefined,
              institutionalEmail: membership.institutionalEmail || undefined,
              createdAt: membership.createdAt?.toISOString?.() || undefined,
              cohort: {
                id: cohortRecord.id,
                schoolId: cohortRecord.schoolId,
                school: cohortSchoolObj,
                campusId: cohortRecord.campusId || undefined,
                startYear: cohortRecord.startYear,
                grade: cohortRecord.grade as CohortGrade,
                level: cohortRecord.level,
                name: cohortRecord.name,
                majorSpeciality: cohortRecord.majorSpeciality || undefined,
                minorSpeciality: cohortRecord.minorSpeciality || undefined,
                description: cohortRecord.description || undefined,
              },
            });
          }
        }

        studentObj = {
          id: studentRecord.id,
          userId: studentRecord.userId,
          cohortMemberships: membershipItems,
        };
        loadedDbProfile = true;

        const loadedCharacters = await db
          .select()
          .from(gameCharacters)
          .where(eq(gameCharacters.studentId, studentRecord.id))
          .limit(1);

        if (loadedCharacters.length > 0) {
          characterObj = toGameCharacter(loadedCharacters[0]);
        }

        activityCompletionObj = (
          await db
            .select()
            .from(gameActivityCompletions)
            .where(eq(gameActivityCompletions.studentId, studentRecord.id))
            .orderBy(desc(gameActivityCompletions.createdAt))
        ).map(toGameActivityCompletion);
      }
    } catch (dbError: any) {
      console.warn('Database error loading user profile:', dbError.message);
      return apiError(c, 'Profile could not be loaded.', 500);
    }
  }

  if (!userObj.isAdmin && !loadedDbProfile) {
    return apiError(c, 'Student profile not found.', 404);
  }

  const refreshedToken = await signAuthToken(toAuthPayload(userObj), jwtSecret);
  return c.json({
    success: true,
    token: refreshedToken,
    user: userObj,
    student: studentObj,
    character: characterObj,
    activityCompletions: activityCompletionObj,
  });
});

// 5. PUT /api/auth/profile : Met à jour le profil de l'utilisateur connecté (Sécurisé)
authRouter.put('/profile', authMiddleware, async (c) => {
  const userPayload = c.get('user') as UserPayload;

  if (!userPayload) {
    return apiError(c, 'Your session expired. Please sign in again.', 401, {
      errorCode: 'session_expired',
      errorKey: 'profile.errors.unauthorized',
    });
  }

  const databaseUrl = c.env.DB;
  const jwtSecret = requireJwtSecret(c.env);

  let body: {
    displayName?: string;
    firstName?: string;
    lastName?: string;
    githubUsername?: string;
    email?: string;
    avatarUrl?: string;
    institutionalEmail?: string;
    institutionalSchoolId?: string;
    birthDate?: string | null;
    bio?: string;
    pronouns?: string;
    internalDescription?: string;
    photoUrl?: string;
    characterClass?: string;
    characterIllustrationUrl?: string;
    characterTitle?: string;
    characterStats?: Partial<GameStats>;
    gameId?: string;
    preferredLocale?: string;
  };

  try {
    body = await c.req.json();
  } catch (e) {
    return apiError(c, 'Invalid JSON body', 400, {
      errorCode: 'validation_failed',
      errorKey: 'profile.errors.invalidPayload',
    });
  }

  if (body.avatarUrl !== undefined && !isPersistableImageUrl(body.avatarUrl)) {
    return c.json(
      {
        success: false,
        error: 'Avatar URL must reference an uploaded asset or external image.',
        errorKey: 'profile.errors.avatarProcessingFailed',
      },
      400
    );
  }

  if (body.characterIllustrationUrl !== undefined && !isPersistableImageUrl(body.characterIllustrationUrl)) {
    return c.json(
      {
        success: false,
        error: 'Character illustration URL must reference an uploaded asset or external image.',
        errorKey: 'profile.errors.avatarProcessingFailed',
      },
      400
    );
  }

  let characterStatsUpdate: CharacterStatAllocation | undefined;

  if (!databaseUrl) {
    return missingDatabaseBinding(c);
  }

  // Objets mis à jour pour la réponse
  let userObj: User = {
    id: userPayload.id,
    email: userPayload.email,
    githubUsername: userPayload.githubUsername,
    firstName: body.firstName ?? userPayload.firstName,
    lastName: body.lastName ?? userPayload.lastName,
    displayName: body.displayName ?? userPayload.displayName,
    birthDate: body.birthDate === null ? undefined : (body.birthDate ?? userPayload.birthDate),
    bio: body.bio ?? userPayload.bio,
    pronouns: body.pronouns ?? userPayload.pronouns,
    avatarUrl: body.avatarUrl ?? userPayload.avatarUrl,
    githubAvatarUrl: userPayload.githubAvatarUrl,
    preferredLocale: isSupportedLocale(body.preferredLocale) ? body.preferredLocale : userPayload.preferredLocale,
    isAdmin: userPayload.isAdmin,
  };

  let studentObj: Student | null = null;
  let characterObj: GameCharacter | null = null;

  if (databaseUrl) {
    try {
      const db = getDb(databaseUrl);

      // 1. Mise à jour de la table `users`
      const userUpdate: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
      if (body.displayName !== undefined) userUpdate.displayName = body.displayName;
      if (body.firstName !== undefined) userUpdate.firstName = body.firstName;
      if (body.lastName !== undefined) userUpdate.lastName = body.lastName;
      if (body.email !== undefined) userUpdate.email = body.email;
      if (body.avatarUrl !== undefined) userUpdate.avatarUrl = body.avatarUrl;
      if (body.birthDate !== undefined) userUpdate.birthDate = body.birthDate === null ? null : body.birthDate;
      if (body.bio !== undefined) userUpdate.bio = body.bio;
      if (body.pronouns !== undefined) userUpdate.pronouns = body.pronouns;
      if (body.preferredLocale !== undefined) {
        if (!isSupportedLocale(body.preferredLocale)) {
          return apiError(c, 'preferredLocale must be "fr" or "en".', 400, {
            errorCode: 'validation_failed',
            errorKey: 'profile.errors.invalidPayload',
          });
        }
        userUpdate.preferredLocale = body.preferredLocale;
      }

      const [updatedUser] = await db
        .update(users)
        .set(userUpdate)
        .where(eq(users.id, userPayload.id))
        .returning();

      if (updatedUser) {
        userObj = toUser(updatedUser);
      } else {
        return apiError(c, 'User profile not found.', 404);
      }

      if (userObj.isAdmin) {
        studentObj = null;
        characterObj = null;
      } else {

        // 2. Mise à jour de la table `students`
        const existingStudents = await db
          .select()
          .from(students)
          .where(eq(students.userId, userPayload.id))
          .limit(1);

        const studentRecord = existingStudents[0];
        if (!studentRecord) {
          return apiError(c, 'Student profile not found.', 404);
        }
        const studentId = studentRecord.id;

        const latestMemberships = await db
          .select()
          .from(cohortMemberships)
          .where(eq(cohortMemberships.userId, userPayload.id))
          .orderBy(desc(cohortMemberships.createdAt))
          .limit(1);

        const latestMembership = latestMemberships[0];
        let latestCohort: any = undefined;
        let latestCohortSchool: any = undefined;
        let latestGuild: GuildRecord | undefined = undefined;
        if (latestMembership) {
          const loadedCohorts = await db
            .select()
            .from(cohorts)
            .where(eq(cohorts.id, latestMembership.cohortId))
            .limit(1);
          latestCohort = loadedCohorts[0];

          if (latestCohort?.schoolId) {
            const loadedSchools = await db
              .select()
              .from(schools)
              .where(eq(schools.id, latestCohort.schoolId))
              .limit(1);
            latestCohortSchool = loadedSchools[0];
          }

          if (latestMembership.guildId) {
            const loadedGuilds = await db
              .select()
              .from(guilds)
              .where(eq(guilds.id, latestMembership.guildId))
              .limit(1);
            latestGuild = loadedGuilds[0];
          }
        }

        if (body.institutionalEmail && latestCohortSchool?.emailDomain) {
          const domain = latestCohortSchool.emailDomain.toLowerCase();
          if (!body.institutionalEmail.toLowerCase().endsWith('@' + domain)) {
            return c.json(
              {
                success: false,
                error: `Institutional email must end with @${domain}`,
                errorKey: 'profile.errors.institutionalEmailDomain',
              },
              400
            );
          }
        }

        let updatedMembership = latestMembership;
        if (body.institutionalEmail !== undefined && latestMembership) {
          const [savedMembership] = await db
            .update(cohortMemberships)
            .set({
              institutionalEmail: body.institutionalEmail,
            })
            .where(
              and(
                eq(cohortMemberships.userId, userPayload.id),
                eq(cohortMemberships.cohortId, latestMembership.cohortId)
              )
            )
            .returning();
          updatedMembership = savedMembership || latestMembership;
        }

        const [updatedStudent] = await db
          .update(students)
          .set({
            updatedAt: new Date(),
          })
          .where(eq(students.id, studentId))
          .returning();

        if (updatedStudent) {
          const latestSchoolObj = latestCohortSchool
            ? {
                id: latestCohortSchool.id,
                name: latestCohortSchool.name,
                logoUrl: latestCohortSchool.logoUrl || undefined,
                emailDomain: latestCohortSchool.emailDomain || undefined,
              }
            : undefined;

          const cohortMemberships =
            updatedMembership && latestCohort
              ? [
                  {
                    userId: updatedMembership.userId,
                    cohortId: updatedMembership.cohortId,
                    guildId: updatedMembership.guildId || undefined,
                    guild: latestGuild
                      ? toGuild(latestGuild, {
                          id: latestCohort.id,
                          schoolId: latestCohort.schoolId,
                          school: latestSchoolObj,
                          campusId: latestCohort.campusId || undefined,
                          startYear: latestCohort.startYear,
                          grade: latestCohort.grade,
                          level: latestCohort.level,
                          name: latestCohort.name,
                          majorSpeciality: latestCohort.majorSpeciality || undefined,
                          minorSpeciality: latestCohort.minorSpeciality || undefined,
                          description: latestCohort.description || undefined,
                        })
                      : undefined,
                    institutionalEmail: updatedMembership.institutionalEmail || undefined,
                    createdAt: updatedMembership.createdAt?.toISOString?.() || undefined,
                    cohort: {
                      id: latestCohort.id,
                      schoolId: latestCohort.schoolId,
                      school: latestSchoolObj,
                      campusId: latestCohort.campusId || undefined,
                      startYear: latestCohort.startYear,
                      grade: latestCohort.grade,
                      level: latestCohort.level,
                      name: latestCohort.name,
                      majorSpeciality: latestCohort.majorSpeciality || undefined,
                      minorSpeciality: latestCohort.minorSpeciality || undefined,
                      description: latestCohort.description || undefined,
                    },
                  },
                ]
              : [];

          studentObj = {
            id: updatedStudent.id,
            userId: updatedStudent.userId,
            cohortMemberships,
          } as any;
        }

        if (
          body.characterClass !== undefined ||
          body.characterIllustrationUrl !== undefined ||
          body.characterTitle !== undefined ||
          body.characterStats !== undefined
        ) {
          if (body.characterClass !== undefined && !GAME_CHARACTER_CLASS_SET.has(body.characterClass)) {
            return apiError(c, 'Character class not found', 404);
          }

          await ensureCharacterClassSeeds(db);
          const [existingChar] = await db
            .select()
            .from(gameCharacters)
            .where(eq(gameCharacters.studentId, studentId))
            .limit(1);

          const nextClassSlug = (body.characterClass ||
            existingChar?.characterClass ||
            DEFAULT_CHARACTER_CLASS) as GameCharacterClass;
          const [classRecord] = await db
            .select()
            .from(gameCharacterClasses)
            .where(eq(gameCharacterClasses.slug, nextClassSlug))
            .limit(1);

          if (!classRecord) {
            return apiError(c, 'Character class not found', 404);
          }

          const baseStats = toGameCharacterClassDefinition(classRecord).baseStats;
          const balanceConfig = await RewardBalanceConfigService.getActiveConfig(
            db,
            typeof body.gameId === 'string' && body.gameId ? body.gameId : latestMembership?.cohortId
          );
          const statCap = balanceConfig.rewardSystem.attributes.levelOneMaxValue;
          const statBudget = balanceConfig.rewardSystem.attributes.statAllocationBudget;

          if (body.characterStats !== undefined) {
            characterStatsUpdate = normalizeManualAllocation(body.characterStats, {
              cap: statCap,
              budget: statBudget,
              baseStats,
            });
            if (!characterStatsUpdate) {
              return apiError(c, 'Character stats must respect the configured budget and cap.', 400, {
                errorCode: 'validation_failed',
                errorKey: 'profile.errors.invalidPayload',
              });
            }
          } else if (body.characterClass !== undefined && existingChar) {
            characterStatsUpdate = repairManualAllocation(
              toGameCharacterStats(existingChar),
              baseStats,
              statCap,
              statBudget
            ).nextManual;
          }

          const [updatedChar] = existingChar
            ? await db
                .update(gameCharacters)
                .set({
                  ...(body.characterClass !== undefined
                    ? { characterClass: body.characterClass as GameCharacterClass }
                    : {}),
                  ...(body.characterIllustrationUrl !== undefined
                    ? { illustrationUrl: body.characterIllustrationUrl || null }
                    : {}),
                  ...(body.characterTitle !== undefined ? { title: body.characterTitle.trim() || null } : {}),
                  ...(characterStatsUpdate
                    ? {
                        strength: characterStatsUpdate.strength,
                        dexterity: characterStatsUpdate.dexterity,
                        constitution: characterStatsUpdate.constitution,
                        intelligence: characterStatsUpdate.intelligence,
                        wisdom: characterStatsUpdate.wisdom,
                        charisma: characterStatsUpdate.charisma,
                      }
                    : {}),
                  updatedAt: new Date(),
                })
                .where(eq(gameCharacters.studentId, studentId))
                .returning()
            : await db
                .insert(gameCharacters)
                .values({
                  studentId,
                  characterClass: (body.characterClass || DEFAULT_CHARACTER_CLASS) as GameCharacterClass,
                  ...(body.characterIllustrationUrl !== undefined
                    ? { illustrationUrl: body.characterIllustrationUrl || null }
                    : {}),
                  ...(body.characterTitle !== undefined ? { title: body.characterTitle.trim() || null } : {}),
                  ...(characterStatsUpdate
                    ? {
                        strength: characterStatsUpdate.strength,
                        dexterity: characterStatsUpdate.dexterity,
                        constitution: characterStatsUpdate.constitution,
                        intelligence: characterStatsUpdate.intelligence,
                        wisdom: characterStatsUpdate.wisdom,
                        charisma: characterStatsUpdate.charisma,
                      }
                    : {}),
                })
                .returning();

          if (updatedChar) {
            characterObj = toGameCharacter(updatedChar);
          }
        } else {
          const [existingChar] = await db
            .select()
            .from(gameCharacters)
            .where(eq(gameCharacters.studentId, studentId))
            .limit(1);

          if (existingChar) {
            characterObj = toGameCharacter(existingChar);
          }
        }
      }
    } catch (dbError: any) {
      console.warn('Database error saving user profile:', dbError.message);
      return apiError(c, 'Profile could not be saved.', 500);
    }
  }

  // 4. Génération d'un NOUVEAU Token JWT mis à jour
  const newPayload: UserPayload = {
    id: userObj.id,
    email: userObj.email,
    githubUsername: userObj.githubUsername,
    firstName: userObj.firstName,
    lastName: userObj.lastName,
    displayName: userObj.displayName,
    birthDate: userObj.birthDate,
    bio: userObj.bio,
    pronouns: userObj.pronouns,
    avatarUrl: userObj.avatarUrl,
    githubAvatarUrl: userObj.githubAvatarUrl,
    preferredLocale: userObj.preferredLocale,
    isAdmin: userObj.isAdmin,
  };

  const newToken = await signAuthToken(newPayload, jwtSecret);

  return c.json({
    success: true,
    token: newToken,
    user: userObj,
    student: studentObj,
    character: characterObj,
  });
});
