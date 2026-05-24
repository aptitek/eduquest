import type {
  Activity,
  Address,
  Campus,
  Cohort,
  GameBattle,
  GameCharacter,
  Guild,
  School,
  Student,
  User,
} from '@eduquest/shared';

type DebugStudentProfile = {
  user: User;
  student: Student;
  character: GameCharacter;
  battles: GameBattle[];
};

export const DEBUG_ADDRESSES: Address[] = [
  {
    id: 'debug_address_aptitek_paris',
    line1: '10 rue de la Tech',
    postalCode: '75001',
    city: 'Paris',
    country: 'France',
    createdAt: '2026-01-01',
  },
  {
    id: 'debug_address_polyforge_lyon',
    line1: '42 quai des Algorithmes',
    postalCode: '69002',
    city: 'Lyon',
    country: 'France',
    createdAt: '2026-01-01',
  },
];

export const DEBUG_SCHOOLS: School[] = [
  {
    id: 'debug_school_aptitek',
    name: 'Aptitek',
    website: 'https://aptitek.io',
    emailDomain: 'aptitek.io',
    createdAt: '2026-01-01',
  },
  {
    id: 'debug_school_polyforge',
    name: 'Polyforge Institute',
    website: 'https://polyforge.example',
    emailDomain: 'polyforge.school',
    createdAt: '2026-01-01',
  },
];

export const DEBUG_CAMPUSES: Campus[] = [
  {
    id: 'debug_campus_aptitek_paris',
    schoolId: 'debug_school_aptitek',
    school: DEBUG_SCHOOLS[0],
    addressId: 'debug_address_aptitek_paris',
    address: DEBUG_ADDRESSES[0],
    name: 'Paris',
    createdAt: '2026-01-01',
  },
  {
    id: 'debug_campus_polyforge_lyon',
    schoolId: 'debug_school_polyforge',
    school: DEBUG_SCHOOLS[1],
    addressId: 'debug_address_polyforge_lyon',
    address: DEBUG_ADDRESSES[1],
    name: 'Lyon',
    createdAt: '2026-01-01',
  },
];

export const DEBUG_COHORTS: Cohort[] = [
  {
    id: 'debug_cohort_frontend_mages',
    schoolId: 'debug_school_aptitek',
    school: DEBUG_SCHOOLS[0],
    campusId: 'debug_campus_aptitek_paris',
    campus: DEBUG_CAMPUSES[0],
    schoolYear: '2025-2026',
    grade: 'bachelor',
    level: 3,
    name: 'Frontend Mages',
    majorSpeciality: 'Frontend',
    minorSpeciality: 'UX',
    description: 'Interface craft, accessibility, and client-side quests.',
    createdAt: '2026-01-01',
  },
  {
    id: 'debug_cohort_fullstack_rangers',
    schoolId: 'debug_school_aptitek',
    school: DEBUG_SCHOOLS[0],
    campusId: 'debug_campus_aptitek_paris',
    campus: DEBUG_CAMPUSES[0],
    schoolYear: '2026-2027',
    grade: 'master',
    level: 1,
    name: 'Fullstack Rangers',
    majorSpeciality: 'Fullstack',
    minorSpeciality: 'DevOps',
    description: 'API design, deployment raids, and product-grade delivery.',
    createdAt: '2026-01-01',
  },
  {
    id: 'debug_cohort_data_alchemists',
    schoolId: 'debug_school_polyforge',
    school: DEBUG_SCHOOLS[1],
    campusId: 'debug_campus_polyforge_lyon',
    campus: DEBUG_CAMPUSES[1],
    schoolYear: '2024-2025',
    grade: 'engineer',
    level: 5,
    name: 'Data Alchemists',
    majorSpeciality: 'Data',
    minorSpeciality: 'AI',
    description: 'Analytics, model evaluation, and data-heavy boss battles.',
    createdAt: '2026-01-01',
  },
];

export const DEBUG_GUILDS: Guild[] = [
  {
    id: 'debug_guild_solarized_sentinels',
    cohortId: 'debug_cohort_frontend_mages',
    cohort: DEBUG_COHORTS[0],
    name: 'Solarized Sentinels',
    description: 'Guardians of consistent UI systems.',
    color: '#268bd2',
    createdAt: '2026-01-01',
  },
  {
    id: 'debug_guild_crimson_compilers',
    cohortId: 'debug_cohort_fullstack_rangers',
    cohort: DEBUG_COHORTS[1],
    name: 'Crimson Compilers',
    description: 'Backend raiders who never leave failing checks behind.',
    color: '#dc322f',
    createdAt: '2026-01-01',
  },
  {
    id: 'debug_guild_violet_oracles',
    cohortId: 'debug_cohort_data_alchemists',
    cohort: DEBUG_COHORTS[2],
    name: 'Violet Oracles',
    description: 'Data interpreters and probability mages.',
    color: '#6c71c4',
    createdAt: '2026-01-01',
  },
];

export const DEBUG_ACTIVITIES: Activity[] = [
  {
    id: 'debug_activity_campfire_git',
    type: 'campfire',
    title: "Le Feu de Camp de l'Onboarding Git",
    isGraded: false,
    x: 130,
    y: 320,
    requiredLevel: 1,
    unlockRule: { requiredLevel: 1 },
    createdAt: '2026-01-08',
  },
  {
    id: 'debug_activity_variables',
    type: 'quest',
    title: 'La Forêt des Variables et Constantes',
    isGraded: true,
    x: 330,
    y: 180,
    requiredLevel: 1,
    unlockRule: { requiredLevel: 1, requiredCompletedActivities: ['debug_activity_campfire_git'] },
    createdAt: '2026-01-10',
  },
  {
    id: 'debug_activity_api_bridge',
    type: 'quest',
    title: 'Le Pont des API et des Contrats Typés',
    isGraded: true,
    x: 540,
    y: 410,
    requiredLevel: 2,
    unlockRule: { requiredLevel: 2, requiredCompletedActivities: ['debug_activity_variables'] },
    createdAt: '2026-01-17',
  },
  {
    id: 'debug_activity_accessibility',
    type: 'quest',
    title: "Les Ruines de l'Accessibilité Perdue",
    isGraded: true,
    x: 700,
    y: 190,
    requiredLevel: 2,
    unlockRule: { requiredLevel: 2, requiredCompletedActivities: ['debug_activity_variables'] },
    createdAt: '2026-01-24',
  },
  {
    id: 'debug_activity_boss_release',
    type: 'boss',
    title: 'Le Dragon de la Release Candidate',
    isGraded: true,
    x: 880,
    y: 310,
    requiredLevel: 3,
    bossMetadata: {
      projectUrl: 'https://github.com/eduquest/debug-release-candidate',
      gradingUrl: 'https://api.eduquest.test/grade/debug-release-candidate',
    },
    unlockRule: {
      requiredLevel: 3,
      requiredCompletedActivities: ['debug_activity_api_bridge', 'debug_activity_accessibility'],
    },
    createdAt: '2026-02-01',
  },
];

export const DEBUG_STUDENT_PROFILES: DebugStudentProfile[] = [
  {
    user: {
      id: 'debug_user_lina',
      email: 'lina.morel@github.test',
      githubSsoToken: 'debug-token-lina',
      githubUsername: 'lina-morel',
      firstName: 'Lina',
      lastName: 'MOREL',
      displayName: 'Lina Morel',
      birthDate: '2001-04-12',
      pronouns: 'She/Her',
      bio: 'Frontend apprentice who likes polishing tiny UI states.',
      avatarUrl:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
      githubAvatarUrl:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
      userStatus: 'online',
      isAdmin: false,
      createdAt: '2026-01-01',
    },
    student: {
      id: 'debug_student_lina',
      userId: 'debug_user_lina',
      schoolId: 'debug_school_aptitek',
      school: DEBUG_SCHOOLS[0],
      cohortMemberships: [
        {
          studentId: 'debug_student_lina',
          cohortId: 'debug_cohort_frontend_mages',
          cohort: DEBUG_COHORTS[0],
          guildId: 'debug_guild_solarized_sentinels',
          guild: DEBUG_GUILDS[0],
          institutionalEmail: 'lina.morel@aptitek.io',
          createdAt: '2026-01-01',
        },
        {
          studentId: 'debug_student_lina',
          cohortId: 'debug_cohort_fullstack_rangers',
          cohort: DEBUG_COHORTS[1],
          guildId: 'debug_guild_crimson_compilers',
          guild: DEBUG_GUILDS[1],
          institutionalEmail: 'lina.morel+master@aptitek.io',
          createdAt: '2026-03-01',
        },
      ],
      createdAt: '2026-01-01',
    },
    character: {
      studentId: 'debug_student_lina',
      characterClass: 'UI Bard',
      stats: { str: 7, dex: 16, int: 13, cha: 15, xp: 140 },
      currentLevel: 2,
      updatedAt: '2026-02-12',
    },
    battles: [
      {
        id: 'debug_battle_lina_git',
        studentId: 'debug_student_lina',
        activityId: 'debug_activity_campfire_git',
        createdAt: '2026-01-09',
      },
      {
        id: 'debug_battle_lina_variables',
        studentId: 'debug_student_lina',
        activityId: 'debug_activity_variables',
        grade: 0.92,
        createdAt: '2026-01-13',
      },
    ],
  },
  {
    user: {
      id: 'debug_user_samir',
      email: 'samir.benali@github.test',
      githubSsoToken: 'debug-token-samir',
      githubUsername: 'samir-benali',
      firstName: 'Samir',
      lastName: 'BENALI',
      displayName: 'Samir Benali',
      birthDate: '1999-11-03',
      pronouns: 'He/Him',
      bio: 'Fullstack ranger focused on API contracts and deployment rituals.',
      avatarUrl:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
      githubAvatarUrl:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
      userStatus: 'busy',
      isAdmin: false,
      createdAt: '2026-01-01',
    },
    student: {
      id: 'debug_student_samir',
      userId: 'debug_user_samir',
      schoolId: 'debug_school_aptitek',
      school: DEBUG_SCHOOLS[0],
      cohortMemberships: [
        {
          studentId: 'debug_student_samir',
          cohortId: 'debug_cohort_fullstack_rangers',
          cohort: DEBUG_COHORTS[1],
          guildId: 'debug_guild_crimson_compilers',
          guild: DEBUG_GUILDS[1],
          institutionalEmail: 'samir.benali@aptitek.io',
          createdAt: '2026-01-15',
        },
      ],
      createdAt: '2026-01-01',
    },
    character: {
      studentId: 'debug_student_samir',
      characterClass: 'Backend Ranger',
      stats: { str: 12, dex: 11, int: 17, cha: 10, xp: 320 },
      currentLevel: 3,
      updatedAt: '2026-02-18',
    },
    battles: [
      {
        id: 'debug_battle_samir_git',
        studentId: 'debug_student_samir',
        activityId: 'debug_activity_campfire_git',
        createdAt: '2026-01-16',
      },
      {
        id: 'debug_battle_samir_variables',
        studentId: 'debug_student_samir',
        activityId: 'debug_activity_variables',
        grade: 0.81,
        createdAt: '2026-01-18',
      },
      {
        id: 'debug_battle_samir_api',
        studentId: 'debug_student_samir',
        activityId: 'debug_activity_api_bridge',
        grade: 0.88,
        createdAt: '2026-01-25',
      },
    ],
  },
  {
    user: {
      id: 'debug_user_noa',
      email: 'noa.chen@github.test',
      githubSsoToken: 'debug-token-noa',
      githubUsername: 'noa-chen',
      firstName: 'Noa',
      lastName: 'CHEN',
      displayName: 'Noa Chen',
      birthDate: '2000-07-29',
      pronouns: 'They/Them',
      bio: 'Data alchemist testing analytics-heavy workflows and long labels.',
      avatarUrl:
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
      githubAvatarUrl:
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
      userStatus: 'offline',
      isAdmin: false,
      createdAt: '2026-01-01',
    },
    student: {
      id: 'debug_student_noa',
      userId: 'debug_user_noa',
      schoolId: 'debug_school_polyforge',
      school: DEBUG_SCHOOLS[1],
      cohortMemberships: [
        {
          studentId: 'debug_student_noa',
          cohortId: 'debug_cohort_data_alchemists',
          cohort: DEBUG_COHORTS[2],
          guildId: 'debug_guild_violet_oracles',
          guild: DEBUG_GUILDS[2],
          institutionalEmail: 'noa.chen@polyforge.school',
          createdAt: '2026-02-01',
        },
      ],
      createdAt: '2026-02-01',
    },
    character: {
      studentId: 'debug_student_noa',
      characterClass: 'Data Oracle',
      stats: { str: 8, dex: 10, int: 19, cha: 13, xp: 580 },
      currentLevel: 5,
      updatedAt: '2026-03-01',
    },
    battles: [
      {
        id: 'debug_battle_noa_git',
        studentId: 'debug_student_noa',
        activityId: 'debug_activity_campfire_git',
        createdAt: '2026-02-02',
      },
      {
        id: 'debug_battle_noa_variables',
        studentId: 'debug_student_noa',
        activityId: 'debug_activity_variables',
        grade: 0.97,
        createdAt: '2026-02-04',
      },
      {
        id: 'debug_battle_noa_api',
        studentId: 'debug_student_noa',
        activityId: 'debug_activity_api_bridge',
        grade: 0.9,
        createdAt: '2026-02-08',
      },
      {
        id: 'debug_battle_noa_accessibility',
        studentId: 'debug_student_noa',
        activityId: 'debug_activity_accessibility',
        grade: 0.84,
        createdAt: '2026-02-11',
      },
    ],
  },
];

export function getDebugStudentOptions() {
  return DEBUG_STUDENT_PROFILES.map(({ user, student, character }) => ({
    id: user.id,
    username: user.githubUsername || user.id,
    displayName: user.displayName || user.email,
    email: user.email,
    schoolName: student.school?.name,
    cohortNames:
      student.cohortMemberships?.map((membership) => membership.cohort?.name).filter(Boolean) || [],
    level: character.currentLevel,
  }));
}

export function getDebugBackup() {
  return {
    addresses: DEBUG_ADDRESSES,
    schools: DEBUG_SCHOOLS,
    campuses: DEBUG_CAMPUSES,
    cohorts: DEBUG_COHORTS,
    guilds: DEBUG_GUILDS,
    activities: DEBUG_ACTIVITIES,
    students: DEBUG_STUDENT_PROFILES,
  };
}

export function getDebugProfile(identifier?: string | null) {
  return findDebugProfile(identifier) || DEBUG_STUDENT_PROFILES[0];
}

export function findDebugProfile(identifier?: string | null) {
  const normalized = identifier?.trim().toLowerCase();
  if (!normalized) return undefined;

  return DEBUG_STUDENT_PROFILES.find(
    ({ user, student }) =>
      user.id.toLowerCase() === normalized ||
      student.id.toLowerCase() === normalized ||
      user.email.toLowerCase() === normalized ||
      user.githubUsername?.toLowerCase() === normalized
  );
}
