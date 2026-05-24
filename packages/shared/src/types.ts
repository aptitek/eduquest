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
  statusOverride?: boolean;
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
  schoolYear: string;
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
  color?: string; // Code Hexa (ex: #ef4444)
  createdAt?: string;
  updatedAt?: string;
}

// Table `student_cohorts` : Association étudiants/classes, avec une guilde max par cohort
export interface StudentCohort {
  studentId: string;
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
  schoolId?: string;
  school?: School;
  cohortMemberships?: StudentCohort[];
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

// Table `game_characters` : Verso de la carte étudiant (Stats JDR)
export interface GameCharacter {
  studentId: string;
  characterClass: string; // ex: 'Archer', 'Mage', 'Guerrier'
  stats: {
    str: number;
    dex: number;
    int: number;
    cha: number;
    [key: string]: number;
  }; // JSONB
  currentLevel: number;
  updatedAt?: string;
}

// Table `game_decks` : Decks de classes / promotions
export interface GameDeck {
  id: string;
  schoolId: string;
  name: string;
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
  bossMetadata?: BossMetadata; // JSONB
  unlockRule?: UnlockRule; // Optionnel : règles de progression
  createdAt?: string;
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
