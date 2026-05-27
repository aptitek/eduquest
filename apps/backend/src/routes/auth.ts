import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import { and, desc, eq, inArray } from 'drizzle-orm';
import type {
  Address,
  Campus,
  Cohort,
  CohortGrade,
  GameActivityCompletion,
  GameCharacter,
  GameCharacterClass,
  Guild,
  School,
  Student,
  User,
  CohortMembership,
} from '@eduquest/shared';
import { GAME_CHARACTER_CLASSES } from '@eduquest/shared';
import type { RewardBalanceConfigPayload } from '@eduquest/shared';
import { getDb } from '../db';
import {
  addresses,
  campuses,
  cohortInvites,
  cohortMemberships,
  gameActivityCompletions,
  cohorts,
  gameCharacters,
  guilds,
  schools,
  students,
  users,
} from '../db/schema';
import { authMiddleware, UserPayload } from '../middleware/auth';
import {
  findDebugProfile,
  getDebugBackup,
  getDebugProfile,
  getDebugStudentOptions,
} from '../dev/debugBackup';
import {
  isMockDataEnabled,
  isDebugAuthEnabled as runtimeDebugAuthEnabled,
  requireFrontendUrl,
  requireJwtSecret,
} from '../config/runtime';
import { RewardBalanceConfigService } from '../services/reward-balance-config';
import { RewardPreviewService } from '../services/reward-preview';

type Bindings = {
  APP_ENV?: string;
  ENABLE_MOCK_DATA?: string;
  DATABASE_URL?: string;
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
const debugCohortInvites: Array<{
  id: string;
  cohortId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  revokedAt?: string;
}> = [];

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
  students: { user: User; student: Student; character: GameCharacter }[];
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
};
type ManagementSchoolUpdateBody = Partial<Pick<School, 'logoUrl'>>;
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

function getDefaultCharacterValues(studentId: string, characterClass: GameCharacterClass) {
  return {
    studentId,
    characterClass,
  };
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

function toDebugManagementCohortInvite(
  invite: (typeof debugCohortInvites)[number],
  frontendUrl: string
): ManagementCohortInvite {
  return {
    id: invite.id,
    cohortId: invite.cohortId,
    token: invite.token,
    url: buildCohortInviteUrl(frontendUrl, invite.token),
    expiresAt: invite.expiresAt,
    createdAt: invite.createdAt,
  };
}

async function listActiveCohortInvites(
  databaseUrl: string | undefined,
  cohortId: string,
  frontendUrl: string
): Promise<ManagementCohortInvite[]> {
  const now = Date.now();

  if (!databaseUrl) {
    return debugCohortInvites
      .filter(
        (invite) =>
          invite.cohortId === cohortId &&
          !invite.revokedAt &&
          new Date(invite.expiresAt).getTime() > now
      )
      .map((invite) => toDebugManagementCohortInvite(invite, frontendUrl));
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

async function assignStudentToInvitedCohort(
  databaseUrl: string | undefined,
  invite: CohortInvitePayload | null,
  userId: string
) {
  if (!databaseUrl || !invite) return;

  const db = getDb(databaseUrl);
  const [inviteRecord] = await db
    .select()
    .from(cohortInvites)
    .where(eq(cohortInvites.id, invite.inviteId))
    .limit(1);

  if (
    !inviteRecord ||
    inviteRecord.cohortId !== invite.cohortId ||
    inviteRecord.revokedAt ||
    inviteRecord.expiresAt.getTime() <= Date.now()
  ) {
    return;
  }

  const [cohortRecord] = await db
    .select()
    .from(cohorts)
    .where(eq(cohorts.id, invite.cohortId))
    .limit(1);

  if (!cohortRecord) return;

  const existingMembership = await db
    .select()
    .from(cohortMemberships)
    .where(
      and(eq(cohortMemberships.userId, userId), eq(cohortMemberships.cohortId, invite.cohortId))
    )
    .limit(1);

  if (existingMembership.length === 0) {
    await db.insert(cohortMemberships).values({
      userId,
      cohortId: invite.cohortId,
    });
  }
}

function assignDebugProfileToInvitedCohort(
  invite: CohortInvitePayload | null,
  identifier?: string | null
) {
  if (!invite) return;

  const backup = getDebugBackup();
  const inviteRecord = debugCohortInvites.find((item) => item.id === invite.inviteId);
  if (
    !inviteRecord ||
    inviteRecord.revokedAt ||
    inviteRecord.cohortId !== invite.cohortId ||
    new Date(inviteRecord.expiresAt).getTime() <= Date.now()
  ) {
    return;
  }

  const profile = getDebugProfile(identifier);
  const cohort = backup.cohorts.find((item) => item.id === invite.cohortId);
  if (!cohort) return;

  const memberships = profile.student.cohortMemberships || [];
  if (!memberships.some((membership) => membership.cohortId === invite.cohortId)) {
    memberships.push({
      userId: profile.user.id,
      cohortId: cohort.id,
      cohort,
      createdAt: new Date().toISOString(),
    });
  }

  profile.student.cohortMemberships = memberships;
}

async function getManagementBackup(
  databaseUrl: string | undefined,
  allowMockData: boolean
): Promise<ManagementBackup> {
  if (!databaseUrl) {
    if (allowMockData) return getDebugBackup();
    throw new Error('DATABASE_URL is required for management data.');
  }

  const db = getDb(databaseUrl);
  const [
    addressRecords,
    schoolRecords,
    campusRecords,
    cohortRecords,
    guildRecords,
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
    const character = characterMap.get(studentRecord.id);
    if (!user || !character) return [];

    return [
      {
        user,
        student: toStudent(studentRecord, membershipsByUser.get(studentRecord.userId) || []),
        character,
      },
    ];
  });

  return {
    addresses: Array.from(addressMap.values()),
    schools: Array.from(schoolMap.values()),
    campuses: Array.from(campusMap.values()),
    cohorts: Array.from(cohortMap.values()),
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

async function getDevStudentOptions(databaseUrl: string | undefined): Promise<DevStudentOption[]> {
  if (!databaseUrl) return getDebugStudentOptions();

  const backup = await getManagementBackup(databaseUrl, false);
  return backup.students.filter((profile) => !profile.user.isAdmin).map(toDevStudentOption);
}

async function findDevDatabaseProfile(databaseUrl: string, identifier?: string | null) {
  const backup = await getManagementBackup(databaseUrl, false);
  const studentProfiles = backup.students.filter((profile) => !profile.user.isAdmin);

  if (!identifier) return studentProfiles[0];

  return studentProfiles.find(
    ({ user, student }) =>
      user.id === identifier ||
      student.id === identifier ||
      user.githubUsername === identifier ||
      user.email === identifier
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
    isAdmin: user.isAdmin,
  };
}

// 1. GET /api/auth/github : Redirige vers GitHub OAuth
authRouter.get('/github', (c) => {
  const clientId = c.env.GITHUB_CLIENT_ID;
  const redirectUri = c.env.GITHUB_REDIRECT_URI || 'http://localhost:8787/api/auth/github/callback';
  const inviteToken = c.req.query('invite');

  if (!clientId) {
    return c.json(
      {
        success: false,
        error: 'Configuration Error',
        message: 'GITHUB_CLIENT_ID is not configured in Wrangler environment variables.',
      },
      500
    );
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

    // D. Gestion de l'utilisateur en Base de Données (si connectée)
    const databaseUrl = c.env.DATABASE_URL;
    let userId = `user_${githubUser.id}`;
    let authenticatedStudentId: string | undefined;
    const isAptitek = githubUser.login.toLowerCase() === 'aptitek';
    let isAdmin: boolean = isAptitek;
    const cohortInvite = await resolveCohortInvite(inviteToken, jwtSecret);

    if (!databaseUrl && !isMockDataEnabled(c.env)) {
      throw new Error('DATABASE_URL must be configured for production OAuth sessions.');
    }

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
            } else if (cohortInvite) {
              const [newStudent] = await db
                .insert(students)
                .values({
                  userId,
                })
                .returning();

              authenticatedStudentId = newStudent.id;

              await db
                .insert(gameCharacters)
                .values(getDefaultCharacterValues(newStudent.id, DEFAULT_CHARACTER_CLASS));
            }
          }
        } else {
          // Création d'un nouvel utilisateur (Auto-registration)
          const [newUser] = await db
            .insert(users)
            .values({
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

            // Création du personnage JDR avec stats de départ
            await db
              .insert(gameCharacters)
              .values(getDefaultCharacterValues(newStudent.id, DEFAULT_CHARACTER_CLASS));
          }
        }

        if (!isAdmin && authenticatedStudentId) {
          await assignStudentToInvitedCohort(databaseUrl, cohortInvite, userId);
        }
      } catch (dbError: any) {
        console.error('Database registration error:', dbError.message);
        if (!isMockDataEnabled(c.env)) {
          throw dbError;
        }
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
    const token = await sign(payload, jwtSecret);

    // F. Redirection vers le frontend
    return c.redirect(`${frontendUrl}/?token=${token}`);
  } catch (error: any) {
    console.error('OAuth callback execution error:', error.message);
    return c.redirect(`${frontendUrl}/?error=auth_internal_error`);
  }
});

authRouter.get('/mock-students', async (c) => {
  if (!isDebugAuthEnabled(c)) return c.notFound();

  return c.json({
    success: true,
    students: await getDevStudentOptions(c.env.DATABASE_URL),
  });
});

authRouter.get('/debug-backup', (c) => {
  if (!isDebugAuthEnabled(c)) return c.notFound();

  return c.json({
    success: true,
    backup: getDebugBackup(),
  });
});

authRouter.use('/management/*', authMiddleware);
authRouter.get('/management', async (c) => {
  const currentUser = c.get('user');
  if (!currentUser?.isAdmin) {
    return c.json(
      {
        success: false,
        error: 'Forbidden',
      },
      403
    );
  }

  return c.json({
    success: true,
    backup: await getManagementBackup(c.env.DATABASE_URL, isMockDataEnabled(c.env)),
  });
});

authRouter.get('/management/cohorts/:cohortId/invites', async (c) => {
  const currentUser = c.get('user');
  if (!currentUser?.isAdmin) {
    return c.json(
      {
        success: false,
        error: 'Forbidden',
      },
      403
    );
  }

  const cohortId = c.req.param('cohortId');
  const frontendUrl = requireFrontendUrl(c.env);

  return c.json({
    success: true,
    invites: await listActiveCohortInvites(c.env.DATABASE_URL, cohortId, frontendUrl),
  });
});

authRouter.post('/management/cohorts/:cohortId/invite', async (c) => {
  const currentUser = c.get('user');
  if (!currentUser?.isAdmin) {
    return c.json(
      {
        success: false,
        error: 'Forbidden',
      },
      403
    );
  }

  const cohortId = c.req.param('cohortId');
  const backup = !c.env.DATABASE_URL ? getDebugBackup() : undefined;
  const cohortExists = c.env.DATABASE_URL
    ? (
        await getDb(c.env.DATABASE_URL)
          .select()
          .from(cohorts)
          .where(eq(cohorts.id, cohortId))
          .limit(1)
      ).length > 0
    : backup?.cohorts.some((cohort) => cohort.id === cohortId);

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

  if (c.env.DATABASE_URL) {
    await getDb(c.env.DATABASE_URL).insert(cohortInvites).values({
      id: inviteId,
      cohortId,
      token,
      expiresAt,
      createdAt,
    });
  } else {
    debugCohortInvites.push({
      id: inviteId,
      cohortId,
      token,
      expiresAt: expiresAt.toISOString(),
      createdAt: createdAt.toISOString(),
    });
  }

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
    return c.json(
      {
        success: false,
        error: 'Forbidden',
      },
      403
    );
  }

  const cohortId = c.req.param('cohortId');
  const inviteId = c.req.param('inviteId');
  const revokedAt = new Date();

  if (c.env.DATABASE_URL) {
    await getDb(c.env.DATABASE_URL)
      .update(cohortInvites)
      .set({ revokedAt })
      .where(and(eq(cohortInvites.id, inviteId), eq(cohortInvites.cohortId, cohortId)));
  } else {
    const invite = debugCohortInvites.find(
      (item) => item.id === inviteId && item.cohortId === cohortId
    );
    if (invite) invite.revokedAt = revokedAt.toISOString();
  }

  return c.json({
    success: true,
    invites: await listActiveCohortInvites(
      c.env.DATABASE_URL,
      cohortId,
      requireFrontendUrl(c.env)
    ),
  });
});

authRouter.put('/management/students/:studentId', async (c) => {
  const currentUser = c.get('user');
  if (!currentUser?.isAdmin) {
    return c.json(
      {
        success: false,
        error: 'Forbidden',
      },
      403
    );
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
    return c.json(
      { success: false, error: 'Avatar URL must reference an uploaded asset or external image.' },
      400
    );
  }

  const studentId = c.req.param('studentId');

  if (!c.env.DATABASE_URL) {
    const backup = getDebugBackup();
    const profile = backup.students.find((item) => item.student.id === studentId);
    if (!profile) {
      return c.json(
        {
          success: false,
          error: 'Student not found',
        },
        404
      );
    }

    profile.user = {
      ...profile.user,
      ...body.user,
    };

    if (body.cohortIds) {
      profile.student.cohortMemberships = body.cohortIds.map((cohortId) => {
        const existing = profile.student.cohortMemberships?.find(
          (membership) => membership.cohortId === cohortId
        );
        return {
          userId: profile.user.id,
          cohortId,
          cohort: backup.cohorts.find((cohort) => cohort.id === cohortId),
          institutionalEmail: existing?.institutionalEmail,
          createdAt: existing?.createdAt,
        };
      });
    }

    if (body.institutionalEmail !== undefined) {
      const targetMembership =
        profile.student.cohortMemberships?.find(
          (membership) => membership.cohortId === body.institutionalEmailCohortId
        ) || profile.student.cohortMemberships?.[0];
      if (targetMembership) {
        targetMembership.institutionalEmail = body.institutionalEmail || undefined;
      }
    }

    return c.json({
      success: true,
      backup,
    });
  }

  const db = getDb(c.env.DATABASE_URL);
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
    backup: await getManagementBackup(c.env.DATABASE_URL, isMockDataEnabled(c.env)),
  });
});

authRouter.put('/management/schools/:schoolId', async (c) => {
  const currentUser = c.get('user');
  if (!currentUser?.isAdmin) {
    return c.json(
      {
        success: false,
        error: 'Forbidden',
      },
      403
    );
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
    return c.json(
      { success: false, error: 'Logo URL must reference an uploaded asset or external image.' },
      400
    );
  }

  if (!c.env.DATABASE_URL) {
    const backup = getDebugBackup();
    const school = backup.schools.find((item) => item.id === schoolId);
    if (!school) {
      return c.json(
        {
          success: false,
          error: 'School not found',
        },
        404
      );
    }

    if (body.logoUrl !== undefined) {
      school.logoUrl = body.logoUrl || undefined;
    }

    return c.json({
      success: true,
      backup,
    });
  }

  const db = getDb(c.env.DATABASE_URL);
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
  if (body.logoUrl !== undefined) schoolUpdate.logoUrl = body.logoUrl || null;

  await db.update(schools).set(schoolUpdate).where(eq(schools.id, schoolId));

  return c.json({
    success: true,
    backup: await getManagementBackup(c.env.DATABASE_URL, isMockDataEnabled(c.env)),
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
    return c.json({ success: false, error: 'Forbidden' }, 403);
  }

  if (!c.env.DATABASE_URL) {
    const config = await RewardBalanceConfigService.getActiveConfig();
    return c.json({ success: true, config });
  }

  const db = getDb(c.env.DATABASE_URL);
  const config = await RewardBalanceConfigService.getActiveConfig(db);
  return c.json({ success: true, config });
});

authRouter.get('/management/reward-balance/versions', async (c) => {
  if (!requireAdmin(c)) {
    return c.json({ success: false, error: 'Forbidden' }, 403);
  }

  if (!c.env.DATABASE_URL) {
    return c.json({ success: true, versions: [] });
  }

  const db = getDb(c.env.DATABASE_URL);
  const versions = await RewardBalanceConfigService.listVersions(db);
  return c.json({ success: true, versions });
});

authRouter.put('/management/reward-balance', async (c) => {
  const currentUser = requireAdmin(c);
  if (!currentUser) {
    return c.json({ success: false, error: 'Forbidden' }, 403);
  }

  if (!c.env.DATABASE_URL) {
    return c.json({ success: false, error: 'DATABASE_URL is required.' }, 503);
  }

  let body: RewardBalanceConfigPayload;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const db = getDb(c.env.DATABASE_URL);
  const created = await RewardBalanceConfigService.publish(db, body, currentUser.id);
  const config = await RewardBalanceConfigService.getActiveConfig(db);

  return c.json({ success: true, version: created, config });
});

authRouter.post('/management/reward-balance/preview', async (c) => {
  if (!requireAdmin(c)) {
    return c.json({ success: false, error: 'Forbidden' }, 403);
  }

  if (!c.env.DATABASE_URL) {
    return c.json({ success: false, error: 'DATABASE_URL is required.' }, 503);
  }

  let body: RewardBalanceConfigPayload & {
    activityId?: string;
    studentId?: string;
    guildId?: string;
    cohortId?: string;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  if (!body.activityId || !body.studentId || !body.guildId) {
    return c.json(
      { success: false, error: 'activityId, studentId, and guildId are required.' },
      400
    );
  }

  const db = getDb(c.env.DATABASE_URL);
  const { activityId, studentId, guildId, cohortId, ...configPayload } = body;
  const breakdown = await new RewardPreviewService(db).preview({
    activityId,
    studentId,
    guildId,
    cohortId,
    configOverride: configPayload,
  });

  if (!breakdown) {
    return c.json({ success: false, error: 'Activity not found.' }, 404);
  }

  return c.json({ success: true, breakdown });
});

// 3. GET /api/auth/mock : Bypass développeur pour environnement local
authRouter.get('/mock', async (c) => {
  if (!isDebugAuthEnabled(c)) return c.notFound();

  const jwtSecret = requireJwtSecret(c.env);
  const frontendUrl = requireFrontendUrl(c.env);
  const cohortInvite = await resolveCohortInvite(c.req.query('invite'), jwtSecret);

  const requestedMockStudent = c.req.query('studentId') || c.req.query('username');
  const mockUsername =
    c.req.query('username') ||
    getDebugProfile(requestedMockStudent).user.githubUsername ||
    'wizard1337';
  const isAptitek = mockUsername.toLowerCase() === 'aptitek';
  const databaseUrl = c.env.DATABASE_URL;

  if (databaseUrl && !isAptitek) {
    try {
      const profile = await findDevDatabaseProfile(databaseUrl, requestedMockStudent);
      if (profile) {
        await assignStudentToInvitedCohort(databaseUrl, cohortInvite, profile.user.id);
        await getDb(databaseUrl)
          .update(users)
          .set({ lastLogin: new Date(), updatedAt: new Date() })
          .where(eq(users.id, profile.user.id));

        const token = await sign(toAuthPayload(profile.user), jwtSecret);
        return c.redirect(`${frontendUrl}/?token=${token}`);
      }
    } catch (dbError: any) {
      console.error('DB dev login failed, trying offline debug data:', dbError.message);
    }
  }

  if (!isAptitek) {
    assignDebugProfileToInvitedCohort(cohortInvite, requestedMockStudent);
    const { user } = getDebugProfile(requestedMockStudent);
    const token = await sign(toAuthPayload({ ...user, isAdmin: false }), jwtSecret);
    return c.redirect(`${frontendUrl}/?token=${token}`);
  }

  const mockEmail = isAptitek ? 'aptitek@github.com' : 'wizard@github.com';
  const mockAvatar =
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';
  const mockName = isAptitek ? 'Aptitek Master' : 'Archmage Coder';
  let userId = isAptitek ? 'user_mock_aptitek' : 'user_mock_1337';
  let authenticatedStudentId: string | undefined;
  let isAdmin: boolean = isAptitek;

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

      const existingUsers = await db
        .select()
        .from(users)
        .where(eq(users.email, mockEmail))
        .limit(1);

      if (existingUsers.length > 0) {
        const userRecord = existingUsers[0];
        userId = userRecord.id;
        isAdmin = userRecord.isAdmin || isAptitek;

        await db
          .update(users)
          .set({
            lastLogin: new Date(),
            githubUsername: mockUsername,
            displayName: mockName,
            githubAvatarUrl: mockAvatar,
            avatarUrl: mockAvatar,
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
          authenticatedStudentId = existingStudents[0]?.id;
        }
      } else {
        const [newUser] = await db
          .insert(users)
          .values({
            email: mockEmail,
            githubSsoToken: 'mock-sso-token',
            githubUsername: mockUsername,
            displayName: mockName,
            githubAvatarUrl: mockAvatar,
            avatarUrl: mockAvatar,
            isAdmin: isAptitek,
          })
          .returning();

        userId = newUser.id;
        isAdmin = newUser.isAdmin;

        if (!isAdmin) {
          const [newStudent] = await db
            .insert(students)
            .values({
              userId: newUser.id,
            })
            .returning();

          authenticatedStudentId = newStudent.id;

          await db
            .insert(gameCharacters)
            .values(getDefaultCharacterValues(newStudent.id, DEFAULT_CHARACTER_CLASS));
        }
      }

      if (!isAdmin && authenticatedStudentId) {
        await assignStudentToInvitedCohort(databaseUrl, cohortInvite, userId);
      }
    } catch (dbError: any) {
      console.error('DB mock registration failed, playing offline mode:', dbError.message);
    }
  }

  const payload: UserPayload = {
    id: userId,
    email: mockEmail,
    githubUsername: mockUsername,
    displayName: mockName,
    githubAvatarUrl: mockAvatar,
    avatarUrl: mockAvatar,
    isAdmin,
  };

  const token = await sign(payload, jwtSecret);
  return c.redirect(`${frontendUrl}/?token=${token}`);
});

// 4. GET /api/auth/me : Récupère la session courante (Sécurisé)
authRouter.get('/me', authMiddleware, async (c) => {
  const userPayload = c.get('user') as UserPayload;

  if (!userPayload) {
    return c.json(
      { success: false, error: 'Unauthorized', errorKey: 'profile.errors.unauthorized' },
      401
    );
  }

  const databaseUrl = c.env.DATABASE_URL;
  const allowMockData = isMockDataEnabled(c.env);
  if (!databaseUrl && !allowMockData) {
    return c.json({ success: false, error: 'DATABASE_URL is required.' }, 503);
  }

  const debugProfile = allowMockData
    ? findDebugProfile(userPayload.id) || findDebugProfile(userPayload.email)
    : undefined;
  let loadedDbProfile = false;

  // Données utilisateur réelles ou fallback JWT
  let userObj: User = debugProfile?.user || {
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
    isAdmin: userPayload.isAdmin,
  };

  // Données de simulation par défaut (Offline/Resilient fallback)
  let studentObj: Student | null = userObj.isAdmin
    ? null
    : debugProfile?.student || {
        id: 'stud_mock_1',
        userId: userPayload.id,
        cohortMemberships: [
          {
            userId: userPayload.id,
            cohortId: 'cohort_mock_1',
            institutionalEmail: userPayload.email.split('@')[0] + '@school.edu',
            cohort: {
              id: 'cohort_mock_1',
              schoolId: 'school_mock_1',
              school: {
                id: 'school_mock_1',
                name: 'Aptitek',
                emailDomain: 'school.edu',
              },
              startYear: 2025,
              grade: 'bachelor',
              level: 3,
              name: 'Frontend Mages',
            },
          },
        ],
      };

  let characterObj: GameCharacter | null = userObj.isAdmin
    ? null
    : debugProfile?.character || {
        studentId: 'stud_mock_1',
        characterClass: DEFAULT_CHARACTER_CLASS,
        stats: {
          strength: 8,
          dexterity: 10,
          constitution: 10,
          intelligence: 18,
          wisdom: 12,
          charisma: 12,
        },
      };
  let activityCompletionObj: GameActivityCompletion[] = debugProfile?.activityCompletions || [];

  if (debugProfile) {
    userObj = debugProfile.user;
  }

  if (!databaseUrl && userObj.isAdmin) {
    return c.json({
      success: true,
      user: userObj,
      student: null,
      character: null,
      activityCompletions: [],
    });
  }

  // Si DB est configurée, charger les données réelles
  if (databaseUrl && !debugProfile) {
    try {
      const db = getDb(databaseUrl);

      // Charger le profil utilisateur réel pour récupérer les métadonnées (ex: avatar) en temps réel
      const loadedUsers = await db
        .select()
        .from(users)
        .where(eq(users.id, userPayload.id))
        .limit(1);
      if (loadedUsers.length > 0) {
        const userRecord = loadedUsers[0];
        userObj = {
          id: userRecord.id,
          email: userRecord.email,
          githubUsername: userRecord.githubUsername || undefined,
          firstName: userRecord.firstName || undefined,
          lastName: userRecord.lastName || undefined,
          displayName: userRecord.displayName || undefined,
          birthDate: userRecord.birthDate || undefined,
          bio: userRecord.bio || undefined,
          pronouns: userRecord.pronouns || undefined,
          avatarUrl: userRecord.avatarUrl || undefined,
          githubAvatarUrl: userRecord.githubAvatarUrl || undefined,
          isAdmin: userRecord.isAdmin,
        };
      }

      if (userObj.isAdmin) {
        return c.json({
          success: true,
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
          const charRecord = loadedCharacters[0];
          characterObj = {
            studentId: charRecord.studentId,
            characterClass: normalizeGameCharacterClass(charRecord.characterClass),
            stats: toGameCharacterStats(charRecord),
          };
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
      if (!allowMockData) {
        return c.json({ success: false, error: 'Profile could not be loaded.' }, 500);
      }
    }
  }

  if (!allowMockData && !loadedDbProfile) {
    return c.json({ success: false, error: 'Student profile not found.' }, 404);
  }

  return c.json({
    success: true,
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
    return c.json(
      { success: false, error: 'Unauthorized', errorKey: 'profile.errors.unauthorized' },
      401
    );
  }

  const databaseUrl = c.env.DATABASE_URL;
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
  };

  try {
    body = await c.req.json();
  } catch (e) {
    return c.json(
      { success: false, error: 'Invalid JSON body', errorKey: 'profile.errors.invalidPayload' },
      400
    );
  }

  const allowMockData = isMockDataEnabled(c.env);
  if (!databaseUrl && !allowMockData) {
    return c.json({ success: false, error: 'DATABASE_URL is required.' }, 503);
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

  // Validation offline/resilience
  if (!databaseUrl && allowMockData) {
    const defaultDomain = userPayload.isAdmin ? 'aptitek.io' : 'school.edu';
    if (
      body.institutionalEmail &&
      !body.institutionalEmail.toLowerCase().endsWith('@' + defaultDomain)
    ) {
      return c.json(
        {
          success: false,
          error: `Institutional email must end with @${defaultDomain}`,
          errorKey: 'profile.errors.institutionalEmailDomain',
        },
        400
      );
    }
  }

  // Objets mis à jour pour la réponse
  let userObj: User = {
    id: userPayload.id,
    email: body.email ?? userPayload.email,
    githubUsername: body.githubUsername ?? userPayload.githubUsername,
    firstName: body.firstName ?? userPayload.firstName,
    lastName: body.lastName ?? userPayload.lastName,
    displayName: body.displayName ?? userPayload.displayName,
    birthDate: body.birthDate === null ? undefined : (body.birthDate ?? userPayload.birthDate),
    bio: body.bio ?? userPayload.bio,
    pronouns: body.pronouns ?? userPayload.pronouns,
    avatarUrl: body.avatarUrl ?? userPayload.avatarUrl,
    githubAvatarUrl: userPayload.githubAvatarUrl,
    isAdmin: userPayload.isAdmin,
  };

  let studentObj: Student | null = userPayload.isAdmin
    ? null
    : {
        id: 'stud_mock_1',
        userId: userPayload.id,
        cohortMemberships: [
          {
            userId: userPayload.id,
            cohortId: 'cohort_mock_1',
            institutionalEmail:
              body.institutionalEmail ||
              body.email?.split('@')[0] + '@school.edu' ||
              userPayload.email.split('@')[0] + '@school.edu',
            cohort: {
              id: 'cohort_mock_1',
              schoolId: 'school_mock_1',
              school: {
                id: 'school_mock_1',
                name: 'Aptitek',
                emailDomain: 'school.edu',
              },
              startYear: 2025,
              grade: 'bachelor',
              level: 3,
              name: 'Frontend Mages',
            },
          },
        ],
      };

  let characterObj: GameCharacter | null = userPayload.isAdmin
    ? null
    : {
        studentId: 'stud_mock_1',
        characterClass: normalizeGameCharacterClass(body.characterClass),
        stats: {
          strength: 8,
          dexterity: 10,
          constitution: 10,
          intelligence: 18,
          wisdom: 12,
          charisma: 12,
        },
      };

  if (databaseUrl) {
    try {
      const db = getDb(databaseUrl);

      // 1. Mise à jour de la table `users`
      const [updatedUser] = await db
        .update(users)
        .set({
          displayName: body.displayName,
          firstName: body.firstName,
          lastName: body.lastName,
          githubUsername: body.githubUsername,
          email: body.email,
          avatarUrl: body.avatarUrl,
          birthDate: body.birthDate === null ? null : body.birthDate,
          bio: body.bio,
          pronouns: body.pronouns,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userPayload.id))
        .returning();

      if (updatedUser) {
        userObj = {
          id: updatedUser.id,
          email: updatedUser.email,
          githubUsername: updatedUser.githubUsername || undefined,
          firstName: updatedUser.firstName || undefined,
          lastName: updatedUser.lastName || undefined,
          displayName: updatedUser.displayName || undefined,
          birthDate: updatedUser.birthDate || undefined,
          bio: updatedUser.bio || undefined,
          pronouns: updatedUser.pronouns || undefined,
          avatarUrl: updatedUser.avatarUrl || undefined,
          githubAvatarUrl: updatedUser.githubAvatarUrl || undefined,
          isAdmin: updatedUser.isAdmin,
        };
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

        if (existingStudents.length > 0) {
          const studentRecord = existingStudents[0];
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

        // 3. Mise à jour de la table `game_characters`
        const [updatedChar] = await db
          .update(gameCharacters)
          .set({
            characterClass: normalizeGameCharacterClass(body.characterClass),
            updatedAt: new Date(),
          })
          .where(eq(gameCharacters.studentId, studentId))
          .returning();

        if (updatedChar) {
          characterObj = {
            studentId: updatedChar.studentId,
            characterClass: normalizeGameCharacterClass(updatedChar.characterClass),
            stats: toGameCharacterStats(updatedChar),
          };
        }
      }
      }
    } catch (dbError: any) {
      console.warn('Database error saving user profile:', dbError.message);
      if (!allowMockData) {
        return c.json({ success: false, error: 'Profile could not be saved.' }, 500);
      }
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
    isAdmin: userObj.isAdmin,
  };

  const newToken = await sign(newPayload, jwtSecret);

  return c.json({
    success: true,
    token: newToken,
    user: userObj,
    student: studentObj,
    character: characterObj,
  });
});
