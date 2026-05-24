import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '../db';
import { users, students, gameCharacters, schools, cohorts, studentCohorts } from '../db/schema';
import { authMiddleware, UserPayload } from '../middleware/auth';

type Bindings = {
  DATABASE_URL?: string;
  JWT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GITHUB_REDIRECT_URI?: string;
  FRONTEND_URL?: string;
};

type Variables = {
  user?: UserPayload;
};

export const authRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Secret JWT par défaut en développement
const DEFAULT_JWT_SECRET = 'eduquest-secret-key-1337-gaming-token';
const DEFAULT_FRONTEND_URL = 'http://localhost:5173';

// 1. GET /api/auth/github : Redirige vers GitHub OAuth
authRouter.get('/github', (c) => {
  const clientId = c.env.GITHUB_CLIENT_ID;
  const redirectUri = c.env.GITHUB_REDIRECT_URI || 'http://localhost:8787/api/auth/github/callback';

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
  )}&scope=user:email`;

  return c.redirect(githubAuthUrl);
});

// 2. GET /api/auth/github/callback : Callback GitHub OAuth
authRouter.get('/github/callback', async (c) => {
  const code = c.req.query('code');
  const jwtSecret = c.env.JWT_SECRET || DEFAULT_JWT_SECRET;
  const frontendUrl = c.env.FRONTEND_URL || DEFAULT_FRONTEND_URL;

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
    const isAptitek = githubUser.login.toLowerCase() === 'aptitek';
    let isAdmin = isAptitek;

    if (databaseUrl) {
      try {
        const db = getDb(databaseUrl);

        // Self-healing: Ensure a default school exists in the database
        let defaultSchoolId: string | undefined = undefined;
        const existingSchools = await db.select().from(schools).limit(1);
        if (existingSchools.length === 0) {
          const [newSchool] = await db
            .insert(schools)
            .values({
              name: 'Aptitek School',
              emailDomain: 'school.edu',
            })
            .returning();
          defaultSchoolId = newSchool.id;
        } else {
          defaultSchoolId = existingSchools[0].id;
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

          // Création du profil étudiant associé (RPG Persona)
          const [newStudent] = await db
            .insert(students)
            .values({
              userId: newUser.id,
              schoolId: defaultSchoolId,
            })
            .returning();

          // Création du personnage JDR avec stats de départ
          await db.insert(gameCharacters).values({
            studentId: newStudent.id,
            characterClass: 'Mage Frontend',
            stats: {
              str: 10,
              dex: 10,
              int: 10,
              cha: 10,
              xp: 0,
            },
            currentLevel: 1,
          });
        }
      } catch (dbError: any) {
        console.error(
          'Database registration error, falling back to mock UUID session:',
          dbError.message
        );
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

// 3. GET /api/auth/mock : Bypass développeur pour environnement local
authRouter.get('/mock', async (c) => {
  const jwtSecret = c.env.JWT_SECRET || DEFAULT_JWT_SECRET;
  const frontendUrl = c.env.FRONTEND_URL || DEFAULT_FRONTEND_URL;

  const mockUsername = c.req.query('username') || 'wizard1337';
  const isAptitek = mockUsername.toLowerCase() === 'aptitek';
  const mockEmail = isAptitek ? 'aptitek@github.com' : 'wizard@github.com';
  const mockAvatar =
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';
  const mockName = isAptitek ? 'Aptitek Master' : 'Archmage Coder';
  let userId = isAptitek ? 'user_mock_aptitek' : 'user_mock_1337';
  let isAdmin = isAptitek;

  const databaseUrl = c.env.DATABASE_URL;
  if (databaseUrl) {
    try {
      const db = getDb(databaseUrl);

      // Self-healing: Ensure a default school exists in the database
      let defaultSchoolId: string | undefined = undefined;
      const existingSchools = await db.select().from(schools).limit(1);
      if (existingSchools.length === 0) {
        const [newSchool] = await db
          .insert(schools)
          .values({
            name: 'Aptitek School',
            emailDomain: 'school.edu',
          })
          .returning();
        defaultSchoolId = newSchool.id;
      } else {
        defaultSchoolId = existingSchools[0].id;
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

        const [newStudent] = await db
          .insert(students)
          .values({
            userId: newUser.id,
            schoolId: defaultSchoolId,
          })
          .returning();

        await db.insert(gameCharacters).values({
          studentId: newStudent.id,
          characterClass: 'Mage Frontend',
          stats: {
            str: 10,
            dex: 10,
            int: 18,
            cha: 12,
            xp: 0,
          },
          currentLevel: 1,
        });
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

  // Données utilisateur réelles ou fallback JWT
  let userObj = {
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
  let studentObj = {
    id: 'stud_mock_1',
    userId: userPayload.id,
    schoolId: 'school_mock_1',
    school: {
      id: 'school_mock_1',
      name: 'Aptitek School',
      emailDomain: 'school.edu',
    },
    cohortMemberships: [
      {
        studentId: 'stud_mock_1',
        cohortId: 'cohort_mock_1',
        institutionalEmail: userPayload.email.split('@')[0] + '@school.edu',
        cohort: {
          id: 'cohort_mock_1',
          schoolId: 'school_mock_1',
          school: {
            id: 'school_mock_1',
            name: 'Aptitek School',
            emailDomain: 'school.edu',
          },
          schoolYear: '2025-2026',
          grade: 'bachelor',
          level: 3,
          name: 'Frontend Mages',
        },
      },
    ],
  };

  let characterObj = {
    studentId: 'stud_mock_1',
    characterClass: 'Mage Frontend',
    stats: {
      str: 8,
      dex: 10,
      int: 18,
      cha: 12,
      xp: 25,
    },
    currentLevel: 1,
  };

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

      const loadedStudents = await db
        .select()
        .from(students)
        .where(eq(students.userId, userPayload.id))
        .limit(1);

      if (loadedStudents.length > 0) {
        const studentRecord = loadedStudents[0];

        let schoolObj: any = undefined;
        if (studentRecord.schoolId) {
          const loadedSchools = await db
            .select()
            .from(schools)
            .where(eq(schools.id, studentRecord.schoolId))
            .limit(1);
          if (loadedSchools.length > 0) {
            schoolObj = {
              id: loadedSchools[0].id,
              name: loadedSchools[0].name,
              logoUrl: loadedSchools[0].logoUrl || undefined,
              emailDomain: loadedSchools[0].emailDomain || undefined,
            };
          }
        }

        const latestMemberships = await db
          .select()
          .from(studentCohorts)
          .where(eq(studentCohorts.studentId, studentRecord.id))
          .orderBy(desc(studentCohorts.createdAt))
          .limit(1);

        const cohortMemberships = [];
        for (const membership of latestMemberships) {
          const loadedCohorts = await db
            .select()
            .from(cohorts)
            .where(eq(cohorts.id, membership.cohortId))
            .limit(1);

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

            cohortMemberships.push({
              studentId: membership.studentId,
              cohortId: membership.cohortId,
              guildId: membership.guildId || undefined,
              institutionalEmail: membership.institutionalEmail || undefined,
              createdAt: membership.createdAt?.toISOString?.() || undefined,
              cohort: {
                id: cohortRecord.id,
                schoolId: cohortRecord.schoolId,
                school: cohortSchoolObj,
                campusId: cohortRecord.campusId || undefined,
                schoolYear: cohortRecord.schoolYear,
                grade: cohortRecord.grade,
                level: cohortRecord.level,
                name: cohortRecord.name,
                majorSpeciality: cohortRecord.majorSpeciality || undefined,
                minorSpeciality: cohortRecord.minorSpeciality || undefined,
                description: cohortRecord.description || undefined,
              },
            });
          }
        }

        const latestCohortSchool = cohortMemberships[0]?.cohort?.school;

        studentObj = {
          id: studentRecord.id,
          userId: studentRecord.userId,
          schoolId: latestCohortSchool?.id || studentRecord.schoolId || undefined,
          school: latestCohortSchool || schoolObj,
          cohortMemberships,
        };

        const loadedCharacters = await db
          .select()
          .from(gameCharacters)
          .where(eq(gameCharacters.studentId, studentRecord.id))
          .limit(1);

        if (loadedCharacters.length > 0) {
          const charRecord = loadedCharacters[0];
          characterObj = {
            studentId: charRecord.studentId,
            characterClass: charRecord.characterClass || 'Mage Frontend',
            stats: (charRecord.stats as any) || characterObj.stats,
            currentLevel: charRecord.currentLevel,
          };
        }
      }
    } catch (dbError: any) {
      console.warn(
        'Database error loading user profile, returning mock resilience profiles:',
        dbError.message
      );
    }
  }

  return c.json({
    success: true,
    user: userObj,
    student: studentObj,
    character: characterObj,
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
  const jwtSecret = c.env.JWT_SECRET || DEFAULT_JWT_SECRET;

  let body: {
    displayName?: string;
    firstName?: string;
    lastName?: string;
    githubUsername?: string;
    email?: string;
    avatarUrl?: string;
    institutionalEmail?: string;
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

  // Validation offline/resilience
  if (!databaseUrl) {
    const defaultDomain = 'school.edu';
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
  let userObj = {
    id: userPayload.id,
    email: body.email ?? userPayload.email,
    githubUsername: body.githubUsername ?? userPayload.githubUsername,
    firstName: body.firstName ?? userPayload.firstName,
    lastName: body.lastName ?? userPayload.lastName,
    displayName: body.displayName ?? userPayload.displayName,
    birthDate:
      body.birthDate === null ? undefined : body.birthDate ?? userPayload.birthDate,
    bio: body.bio ?? userPayload.bio,
    pronouns: body.pronouns ?? userPayload.pronouns,
    avatarUrl: body.avatarUrl ?? userPayload.avatarUrl,
    githubAvatarUrl: userPayload.githubAvatarUrl,
    isAdmin: userPayload.isAdmin,
  };

  let studentObj = {
    id: 'stud_mock_1',
    userId: userPayload.id,
    schoolId: 'school_mock_1',
    school: {
      id: 'school_mock_1',
      name: 'Aptitek School',
      emailDomain: 'school.edu',
    },
    cohortMemberships: [
      {
        studentId: 'stud_mock_1',
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
            name: 'Aptitek School',
            emailDomain: 'school.edu',
          },
          schoolYear: '2025-2026',
          grade: 'bachelor',
          level: 3,
          name: 'Frontend Mages',
        },
      },
    ],
  };

  let characterObj = {
    studentId: 'stud_mock_1',
    characterClass: body.characterClass || 'Mage Frontend',
    stats: {
      str: 8,
      dex: 10,
      int: 18,
      cha: 12,
      xp: 25,
    },
    currentLevel: 1,
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
          .from(studentCohorts)
          .where(eq(studentCohorts.studentId, studentId))
          .orderBy(desc(studentCohorts.createdAt))
          .limit(1);

        const latestMembership = latestMemberships[0];
        let latestCohort: any = undefined;
        let latestCohortSchool: any = undefined;
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
            .update(studentCohorts)
            .set({
              institutionalEmail: body.institutionalEmail,
            })
            .where(
              and(
                eq(studentCohorts.studentId, studentId),
                eq(studentCohorts.cohortId, latestMembership.cohortId)
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
          let schoolObj: any = undefined;
          if (updatedStudent.schoolId) {
            const loadedSchools = await db
              .select()
              .from(schools)
              .where(eq(schools.id, updatedStudent.schoolId))
              .limit(1);
            if (loadedSchools.length > 0) {
              schoolObj = {
                id: loadedSchools[0].id,
                name: loadedSchools[0].name,
                logoUrl: loadedSchools[0].logoUrl || undefined,
                emailDomain: loadedSchools[0].emailDomain || undefined,
              };
            }
          }

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
                    studentId: updatedMembership.studentId,
                    cohortId: updatedMembership.cohortId,
                    guildId: updatedMembership.guildId || undefined,
                    institutionalEmail: updatedMembership.institutionalEmail || undefined,
                    createdAt: updatedMembership.createdAt?.toISOString?.() || undefined,
                    cohort: {
                      id: latestCohort.id,
                      schoolId: latestCohort.schoolId,
                      school: latestSchoolObj,
                      campusId: latestCohort.campusId || undefined,
                      schoolYear: latestCohort.schoolYear,
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
            schoolId: latestSchoolObj?.id || updatedStudent.schoolId || undefined,
            school: latestSchoolObj || schoolObj,
            cohortMemberships,
          } as any;
        }

        // 3. Mise à jour de la table `game_characters`
        const [updatedChar] = await db
          .update(gameCharacters)
          .set({
            characterClass: body.characterClass,
            updatedAt: new Date(),
          })
          .where(eq(gameCharacters.studentId, studentId))
          .returning();

        if (updatedChar) {
          characterObj = {
            studentId: updatedChar.studentId,
            characterClass: updatedChar.characterClass || 'Mage Frontend',
            stats: (updatedChar.stats as any) || characterObj.stats,
            currentLevel: updatedChar.currentLevel,
          };
        }
      }
    } catch (dbError: any) {
      console.warn('Database error saving user profile, returning local updates:', dbError.message);
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
