// ==========================================
// 1. PARTIE ADMINISTRATIVE & UTILISATEURS
// ==========================================

export type UserStatus = 'online' | 'offline' | 'busy';

// Table `users` : Données de connexion et administration
export interface User {
  id: string;
  email: string;
  githubSsoToken?: string;
  githubUsername?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  birthDate?: string;
  pronouns?: string;
  bio?: string;
  avatarUrl?: string;
  githubAvatarUrl?: string;
  userStatus?: UserStatus;
  isAdmin: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string;
}

// Table `schools` : Établissement
export interface School {
  id: string;
  name: string;
  logoUrl?: string;
  website?: string;
  emailDomain?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Table `addresses` : Adresses postales réutilisables
export interface Address {
  id: string;
  line1: string;
  line2?: string;
  postalCode?: string;
  city: string;
  country?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Table `campuses` : Sites rattachés à une école
export interface Campus {
  id: string;
  schoolId: string;
  school?: School;
  addressId?: string;
  address?: Address;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export type CohortGrade = 'licence' | 'bachelor' | 'engineer' | 'master' | 'doctorate';

// Table `cohorts` : Classes d'étudiants au sein d'une école
export interface Cohort {
  id: string;
  schoolId: string;
  school?: School;
  campusId?: string;
  campus?: Campus;
  startYear: number;
  grade: CohortGrade;
  level: number;
  name: string;
  majorSpeciality?: string;
  minorSpeciality?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Table `guilds` : Groupes de JDR restreints à une cohort
export interface Guild {
  id: string;
  cohortId: string;
  cohort?: Cohort;
  name: string;
  description?: string;
  iconUrl?: string;
  color?: string; // Design accent token, e.g. quest, danger, specialist
  gold?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Table `cohort_memberships` : Association utilisateurs étudiants/classes, avec une guilde max par cohort
export interface CohortMembership {
  userId: string;
  cohortId: string;
  cohort?: Cohort;
  guildId?: string;
  guild?: Guild;
  institutionalEmail?: string;
  createdAt?: string;
}

// Table `students` : Profil élève lié à un utilisateur
export interface Student {
  id: string;
  userId: string;
  cohortMemberships?: CohortMembership[];
  createdAt?: string;
  updatedAt?: string;
}

// Table `student_skills_history` : Radar de compétences évolutif
export interface StudentSkillsHistory {
  id: string;
  studentId: string;
  skills: Record<string, number>; // JSONB (ex: {"tech": 0.8, "soft": 0.5, "design": 0.2})
  evaluatedAt?: string;
  evaluatedBy?: string; // ID de l'admin (User)
}

// ==========================================
// 2. PARTIE LUDIQUE (Préfixe game_)
// ==========================================

export const GAME_CHARACTER_CLASSES = ['scholar', 'champion', 'guide', 'specialist'] as const;

export type GameCharacterClass = (typeof GAME_CHARACTER_CLASSES)[number];

export const GAME_CHARACTER_CLASS_I18N_KEYS: Record<GameCharacterClass, string> = {
  scholar: 'game.characterClasses.scholar',
  champion: 'game.characterClasses.champion',
  guide: 'game.characterClasses.guide',
  specialist: 'game.characterClasses.specialist',
};

export interface GameCharacterClassDefinition {
  slug: GameCharacterClass;
  nameI18nKey: string;
  baseStats: GameStats;
  sortOrder: number;
  createdAt?: string;
}

export interface GameStats {
  strength: number;
  intelligence: number;
  wisdom: number;
  dexterity: number;
  constitution: number;
  charisma: number;
}

// Table `game_characters` : Verso de la carte étudiant (Stats JDR)
export interface GameCharacter {
  studentId: string;
  characterClass: GameCharacterClass;
  stats: GameStats;
  updatedAt?: string;
}

// Règle de déverrouillage de quête (logique métier)
export interface UnlockRule {
  requiredLevel?: number;
  requiredCompletedActivities?: string[]; // IDs des activités prérequises
  requiredItems?: string[];
}

// Métadonnées spécifiques aux Boss (Examens)
export interface BossMetadata {
  projectUrl?: string;
  gradingUrl?: string;
  [key: string]: any;
}

// Type d'activité du jeu
export type ActivityType = 'campfire' | 'quest' | 'boss';

// Table `game_activities` : Activités sur la carte
export interface Activity {
  id: string;
  type: ActivityType; // campfire (CM), quest (TD), boss (Exam)
  title: string;
  startDate?: string;
  endDate?: string;
  url?: string;
  isGraded: boolean;
  x: number;
  y: number;
  requiredLevel: number;
  basePoints?: number;
  bossMetadata?: BossMetadata; // JSONB
  unlockRule?: UnlockRule; // Optionnel : règles de progression
  createdAt?: string;
}

export interface ProgressReward {
  id: string;
  titleI18nKey: string;
  subtitleI18nKey?: string;
  accentToken?: string;
}

export interface ProgressMilestone {
  id: string;
  labelI18nKey: string;
  descriptionI18nKey?: string;
  cost: number;
  reward: ProgressReward;
}

export type NotificationTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface Notification {
  id: string;
  cohortId?: string;
  guildId?: string;
  titleI18nKey: string;
  descriptionI18nKey?: string;
  icon?: string;
  tone?: NotificationTone;
  actionLabelI18nKey?: string;
  actionTarget?: 'map' | 'acknowledge' | 'collect' | 'review';
}

export interface CohortProgressData {
  gauge: {
    currentPoints: number;
    targetPoints: number;
    labelI18nKey: string;
    milestones: ProgressMilestone[];
  };
  notifications: Notification[];
}

// Table `game_battles` : Rendus de devoirs et combats
export interface GameBattle {
  id: string;
  studentId: string;
  activityId: string;
  grade?: number; // Flottant entre 0 et 1 (Note sur 20 représentée en pourcentage)
  workUrl?: string;
  createdAt?: string;
}

// ==========================================
// 3. SYSTEME D'AUDIT
// ==========================================

// Table `audit_logs` : Historique des actions
export interface AuditLog {
  id: string;
  tableName: string;
  recordId: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  oldData?: any; // JSONB
  newData?: any; // JSONB
  userId?: string; // Auteur de l'action
  changedAt?: string;
}
