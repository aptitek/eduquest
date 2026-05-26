import type {
  Activity,
  Address,
  Campus,
  Cohort,
  GameActivityCompletion,
  GameActivityEdge,
  GameCharacter,
  GameMapRun,
  Guild,
  School,
  Student,
  User,
} from '@eduquest/shared';

type DebugStudentProfile = {
  user: User;
  student: Student;
  character: GameCharacter;
  activityCompletions: GameActivityCompletion[];
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
    startYear: 2025,
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
    startYear: 2026,
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
    startYear: 2024,
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
    gold: 180,
    createdAt: '2026-01-01',
  },
  {
    id: 'debug_guild_crimson_compilers',
    cohortId: 'debug_cohort_fullstack_rangers',
    cohort: DEBUG_COHORTS[1],
    name: 'Crimson Compilers',
    description: 'Backend raiders who never leave failing checks behind.',
    color: '#dc322f',
    gold: 168,
    createdAt: '2026-01-01',
  },
  {
    id: 'debug_guild_violet_oracles',
    cohortId: 'debug_cohort_data_alchemists',
    cohort: DEBUG_COHORTS[2],
    name: 'Violet Oracles',
    description: 'Data interpreters and probability mages.',
    color: '#6c71c4',
    gold: 132,
    createdAt: '2026-01-01',
  },
];

export const DEBUG_ACTIVITIES: Activity[] = [
  {
    id: 'debug_activity_campfire_git',
    type: 'onboarding',
    title: "Le Feu de Camp de l'Onboarding Git",
    isGraded: false,
    mapX: 130,
    mapY: 320,
    sectorDepth: 0,
    requiredLevel: 1,
    metadata: { resources: [{ title: 'Git onboarding', url: 'https://git-scm.com/docs/gittutorial' }] },
    createdAt: '2026-01-08',
  },
  {
    id: 'debug_activity_variables',
    type: 'practical',
    title: 'La Forêt des Variables et Constantes',
    isGraded: true,
    mapX: 330,
    mapY: 180,
    sectorDepth: 1,
    requiredLevel: 1,
    metadata: {},
    createdAt: '2026-01-10',
  },
  {
    id: 'debug_activity_api_bridge',
    type: 'practical',
    title: 'Le Pont des API et des Contrats Typés',
    isGraded: true,
    mapX: 540,
    mapY: 410,
    sectorDepth: 2,
    requiredLevel: 2,
    metadata: {},
    createdAt: '2026-01-17',
  },
  {
    id: 'debug_activity_accessibility',
    type: 'practical',
    title: "Les Ruines de l'Accessibilité Perdue",
    isGraded: true,
    mapX: 700,
    mapY: 190,
    sectorDepth: 2,
    requiredLevel: 2,
    metadata: {},
    createdAt: '2026-01-24',
  },
  {
    id: 'debug_activity_boss_release',
    type: 'boss',
    title: 'Le Dragon de la Release Candidate',
    isGraded: true,
    mapX: 880,
    mapY: 310,
    sectorDepth: 3,
    requiredLevel: 3,
    metadata: {
      boss: {
        projectUrl: 'https://github.com/eduquest/debug-release-candidate',
        gradingUrl: 'https://api.eduquest.test/grade/debug-release-candidate',
      },
    },
    createdAt: '2026-02-01',
  },
];

export const DEBUG_MAP_RUN: GameMapRun = {
  id: 'debug_map_run_frontend_mages',
  cohortId: 'debug_cohort_frontend_mages',
  currentSectorDepth: 1,
  fogRevealDepth: 1,
  status: 'active',
  createdAt: '2026-01-08',
  updatedAt: '2026-01-18',
};

export const DEBUG_ACTIVITY_EDGES: GameActivityEdge[] = [
  {
    id: 'debug_edge_git_variables',
    cohortId: 'debug_cohort_frontend_mages',
    mapRunId: 'debug_map_run_frontend_mages',
    fromActivityId: 'debug_activity_campfire_git',
    toActivityId: 'debug_activity_variables',
    createdAt: '2026-01-08',
  },
  {
    id: 'debug_edge_variables_api',
    cohortId: 'debug_cohort_frontend_mages',
    mapRunId: 'debug_map_run_frontend_mages',
    fromActivityId: 'debug_activity_variables',
    toActivityId: 'debug_activity_api_bridge',
    createdAt: '2026-01-10',
  },
  {
    id: 'debug_edge_variables_accessibility',
    cohortId: 'debug_cohort_frontend_mages',
    mapRunId: 'debug_map_run_frontend_mages',
    fromActivityId: 'debug_activity_variables',
    toActivityId: 'debug_activity_accessibility',
    createdAt: '2026-01-10',
  },
  {
    id: 'debug_edge_api_boss',
    cohortId: 'debug_cohort_frontend_mages',
    mapRunId: 'debug_map_run_frontend_mages',
    fromActivityId: 'debug_activity_api_bridge',
    toActivityId: 'debug_activity_boss_release',
    createdAt: '2026-01-17',
  },
  {
    id: 'debug_edge_accessibility_boss',
    cohortId: 'debug_cohort_frontend_mages',
    mapRunId: 'debug_map_run_frontend_mages',
    fromActivityId: 'debug_activity_accessibility',
    toActivityId: 'debug_activity_boss_release',
    createdAt: '2026-01-24',
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
      displayName: 'Lina MOREL',
      birthDate: '2001-04-12',
      pronouns: 'she, her',
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
      cohortMemberships: [
        {
          userId: 'debug_user_lina',
          cohortId: 'debug_cohort_frontend_mages',
          cohort: DEBUG_COHORTS[0],
          guildId: 'debug_guild_solarized_sentinels',
          guild: DEBUG_GUILDS[0],
          institutionalEmail: 'lina.morel@aptitek.io',
          createdAt: '2026-01-01',
        },
        {
          userId: 'debug_user_lina',
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
      characterClass: 'guide',
      stats: { strength: 7, dexterity: 16, constitution: 0, intelligence: 13, wisdom: 0, charisma: 15 },
      updatedAt: '2026-02-12',
    },
    activityCompletions: [
      {
        id: 'debug_battle_lina_git',
        studentId: 'debug_student_lina',
        cohortId: 'debug_cohort_frontend_mages',
        activityId: 'debug_activity_campfire_git',
        completionType: 'read',
        createdAt: '2026-01-09',
      },
      {
        id: 'debug_battle_lina_variables',
        studentId: 'debug_student_lina',
        cohortId: 'debug_cohort_frontend_mages',
        activityId: 'debug_activity_variables',
        completionType: 'battle',
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
      displayName: 'Samir BENALI',
      birthDate: '1999-11-03',
      pronouns: 'he, him',
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
      cohortMemberships: [
        {
          userId: 'debug_user_samir',
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
      characterClass: 'champion',
      stats: { strength: 12, dexterity: 11, constitution: 0, intelligence: 17, wisdom: 0, charisma: 10 },
      updatedAt: '2026-02-18',
    },
    activityCompletions: [
      {
        id: 'debug_battle_samir_git',
        studentId: 'debug_student_samir',
        cohortId: 'debug_cohort_fullstack_rangers',
        activityId: 'debug_activity_campfire_git',
        completionType: 'read',
        createdAt: '2026-01-16',
      },
      {
        id: 'debug_battle_samir_variables',
        studentId: 'debug_student_samir',
        cohortId: 'debug_cohort_fullstack_rangers',
        activityId: 'debug_activity_variables',
        completionType: 'battle',
        grade: 0.81,
        createdAt: '2026-01-18',
      },
      {
        id: 'debug_battle_samir_api',
        studentId: 'debug_student_samir',
        cohortId: 'debug_cohort_fullstack_rangers',
        activityId: 'debug_activity_api_bridge',
        completionType: 'battle',
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
      displayName: 'Noa CHEN',
      birthDate: '2000-07-29',
      pronouns: 'they, them',
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
      cohortMemberships: [
        {
          userId: 'debug_user_noa',
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
      characterClass: 'specialist',
      stats: { strength: 8, dexterity: 10, constitution: 0, intelligence: 19, wisdom: 0, charisma: 13 },
      updatedAt: '2026-03-01',
    },
    activityCompletions: [
      {
        id: 'debug_battle_noa_git',
        studentId: 'debug_student_noa',
        cohortId: 'debug_cohort_data_alchemists',
        activityId: 'debug_activity_campfire_git',
        completionType: 'read',
        createdAt: '2026-02-02',
      },
      {
        id: 'debug_battle_noa_variables',
        studentId: 'debug_student_noa',
        cohortId: 'debug_cohort_data_alchemists',
        activityId: 'debug_activity_variables',
        completionType: 'battle',
        grade: 0.97,
        createdAt: '2026-02-04',
      },
      {
        id: 'debug_battle_noa_api',
        studentId: 'debug_student_noa',
        cohortId: 'debug_cohort_data_alchemists',
        activityId: 'debug_activity_api_bridge',
        completionType: 'battle',
        grade: 0.9,
        createdAt: '2026-02-08',
      },
      {
        id: 'debug_battle_noa_accessibility',
        studentId: 'debug_student_noa',
        cohortId: 'debug_cohort_data_alchemists',
        activityId: 'debug_activity_accessibility',
        completionType: 'battle',
        grade: 0.84,
        createdAt: '2026-02-11',
      },
    ],
  },
];

export function getDebugStudentOptions() {
  return DEBUG_STUDENT_PROFILES.map(({ user, student }) => ({
    id: user.id,
    username: user.githubUsername || user.id,
    displayName: user.displayName || user.email,
    email: user.email,
    schoolName: student.cohortMemberships?.[0]?.cohort?.school?.name,
    cohortNames:
      student.cohortMemberships
        ?.map((membership) => membership.cohort?.name)
        .filter((name): name is string => Boolean(name)) || [],
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
