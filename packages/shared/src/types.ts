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
  registrationOpen?: boolean;
  name: string;
  majorSpeciality?: string;
  minorSpeciality?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

// A cohort owns one playable game context. Maps, guilds, progress, votes, and steps belong to this game.
export interface Game {
  id: string;
  cohortId: string;
  cohort?: Cohort;
  name: string;
  currentStep: number;
  createdAt?: string;
  updatedAt?: string;
}

export type GuildRecruitmentStatus = 'open' | 'invite_only' | 'closed';
export type GuildInvitationStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

// Table `guilds` : Groupes de JDR restreints à une cohort
export interface Guild {
  id: string;
  gameId?: string;
  cohortId: string;
  cohort?: Cohort;
  name: string;
  description?: string;
  iconUrl?: string;
  iconKey?: string;
  color?: string; // Design accent token, e.g. quest, danger, specialist
  gold?: number;
  boostPointsSpent?: number;
  stats?: GameStats;
  recruitmentStatus?: GuildRecruitmentStatus;
  recruitmentMessage?: string;
  maxMembers?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface GuildInvitation {
  id: string;
  cohortId: string;
  guildId: string;
  guild?: Guild;
  inviterUserId: string;
  inviterDisplayName?: string;
  inviteeUserId: string;
  inviteeDisplayName?: string;
  status: GuildInvitationStatus;
  message?: string;
  respondedAt?: string;
  expiresAt?: string;
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

export interface GameCharacterStatConfig {
  maxValue: number;
  allocationBudget: number;
}

// Table `game_characters` : Verso de la carte étudiant (Stats JDR)
export interface GameCharacter {
  studentId: string;
  characterClass: GameCharacterClass;
  stats: GameStats;
  illustrationUrl?: string;
  updatedAt?: string;
}

export const GAME_ACTIVITY_TYPES = [
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
] as const;

export const ACTIVITY_ICON_KEYS = GAME_ACTIVITY_TYPES;

// Type d'activité du jeu
export type ActivityType = (typeof GAME_ACTIVITY_TYPES)[number];

export type ActivityMetadata = Record<string, unknown> & {
  subtitle?: string;
  description?: string;
  illustrationUrl?: string;
  illustrationAlt?: string;
  iconKey?: string;
  projectUrl?: string;
  gradingUrl?: string;
  geniallyUrl?: string;
  resources?: Array<{ title?: string; url: string }>;
  rubricUrl?: string;
  answerFields?: BossActivityAnswerField[];
  boss?: {
    projectUrl?: string;
    gradingUrl?: string;
    answerFields?: BossActivityAnswerField[];
  };
};

export type BossActivityAnswerFieldKind = 'text' | 'url' | 'file';

export interface BossActivityAnswerField {
  id: string;
  label: string;
  kind: BossActivityAnswerFieldKind;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  accept?: string;
  maxFiles?: number;
  maxBytes?: number;
}

export interface ActivityStepRange {
  startStep: number;
  endStep?: number;
}

export type ActivityParticipationMode = 'solo' | 'guild';

// Table `game_activities` : Activités sur la carte
export interface Activity {
  id: string;
  cohortId?: string;
  templateActivityId?: string;
  mapRunId?: string;
  type: ActivityType;
  title: string;
  startDate?: string;
  endDate?: string;
  url?: string;
  isGraded: boolean;
  mapX: number;
  mapY: number;
  sectorDepth: number;
  requiredLevel: number;
  stepRanges?: ActivityStepRange[];
  cardColor?: string;
  participationMode?: ActivityParticipationMode;
  basePoints?: number;
  metadata?: ActivityMetadata;
  isCompleted?: boolean;
  isRevealed?: boolean;
  isLocked?: boolean;
  isCurrent?: boolean;
  createdAt?: string;
}

export type GameMapRunStatus = 'active' | 'completed' | 'archived';

export interface GameMapRun {
  id: string;
  cohortId: string;
  currentSectorDepth: number;
  fogRevealDepth: number;
  status: GameMapRunStatus;
  createdAt?: string;
  updatedAt?: string;
}

// ==========================================
// 5. API RESPONSE CONTRACTS
// ==========================================

export type ApiErrorCode =
  | 'bad_request'
  | 'validation_failed'
  | 'unauthorized'
  | 'session_expired'
  | 'access_denied'
  | 'not_found'
  | 'conflict'
  | 'payload_too_large'
  | 'unsupported_media_type'
  | 'service_unavailable'
  | 'server_configuration'
  | 'internal_error'
  | 'network_error'
  | 'unknown_error';

export interface ApiErrorPayload {
  success: false;
  errorCode: ApiErrorCode;
  /**
   * Human-readable, user-facing error message.
   * Kept alongside `error` so older callers can migrate incrementally.
   */
  message: string;
  error: string;
  errorKey?: string;
  details?: Record<string, unknown>;
  fieldErrors?: Record<string, string>;
}

export type ApiSuccessPayload<T extends Record<string, unknown> = Record<string, never>> =
  { success: true } & T;

export type ApiResponse<T extends Record<string, unknown> = Record<string, never>> =
  | ApiSuccessPayload<T>
  | ApiErrorPayload;

export interface GameActivityEdge {
  id: string;
  cohortId?: string;
  mapRunId?: string;
  fromActivityId: string;
  toActivityId: string;
  metadata?: GameActivityEdgeMetadata;
  createdAt?: string;
}

export type GameActivityEdgeAnimation = 'disabled' | 'none' | 'flow' | 'pulse';

export interface GameActivityEdgeStyleWindow {
  startStep: number;
  endStep?: number;
  color?: string;
  animation?: GameActivityEdgeAnimation;
}

export type GameActivityEdgeMetadata = Record<string, unknown> & {
  color?: string;
  edgeColor?: string;
  animation?: GameActivityEdgeAnimation;
  edgeAnimation?: GameActivityEdgeAnimation;
  strokeDasharray?: string;
  opacity?: number;
  strokeWidth?: number;
  styleWindows?: GameActivityEdgeStyleWindow[];
};

export type GameActivityCompletionType = 'read' | 'submission' | 'battle' | 'system';

export interface GameActivityCompletion {
  id: string;
  studentId: string;
  cohortId: string;
  activityId: string;
  completionType: GameActivityCompletionType;
  grade?: number;
  workUrl?: string;
  metadata?: GameActivityCompletionMetadata;
  createdAt?: string;
  updatedAt?: string;
}

export type GameActivityCompletionMetadata = Record<string, unknown> & {
  bossSubmission?: BossActivitySubmission;
};

export interface BossActivitySubmission {
  submittedAt: string;
  fields: BossActivitySubmissionField[];
}

export interface BossActivitySubmissionField {
  fieldId: string;
  label: string;
  kind: BossActivityAnswerFieldKind;
  value?: string;
  files?: BossActivitySubmissionFile[];
}

export interface BossActivitySubmissionFile {
  id: string;
  key: string;
  fileName: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

export type GameCharacterMoveType = 'enter' | 'move';

export interface GameCharacterMove {
  id: string;
  studentId: string;
  cohortId: string;
  mapRunId: string;
  fromActivityId?: string;
  toActivityId: string;
  moveType: GameCharacterMoveType;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export type GameMapOccupancySegmentKind = 'guild' | 'solo';

export interface GameMapOccupancyMember {
  studentId: string;
  displayName: string;
  avatarUrl?: string;
  characterIllustrationUrl?: string;
  characterClass?: GameCharacterClass;
  guildId?: string;
  guildName?: string;
  guildIconUrl?: string;
  guildIconKey?: string;
  guildColor?: string;
  fromActivityId?: string;
  toActivityId?: string;
}

export interface GameMapOccupancySegment {
  kind: GameMapOccupancySegmentKind;
  studentCount: number;
  guildId?: string;
  guildName?: string;
  guildIconUrl?: string;
  guildIconKey?: string;
  color?: string;
  members?: GameMapOccupancyMember[];
}

export interface GameMapNodeOccupancy {
  activityId: string;
  totalStudents: number;
  segments: GameMapOccupancySegment[];
}

export interface GameMapData {
  run?: GameMapRun;
  activities: Activity[];
  edges: GameActivityEdge[];
  completions: GameActivityCompletion[];
  nodeOccupancies?: GameMapNodeOccupancy[];
  currentGuildMemberCount?: number;
  currentStep?: number;
  currentActivityId?: string;
  currentMove?: GameCharacterMove;
}

export interface ProgressReward {
  id: string;
  titleI18nKey: string;
  subtitleI18nKey?: string;
  accentToken?: string;
  iconKey?: string;
  illustrationUrl?: string;
  color?: string;
}

export interface ProgressMilestone {
  id: string;
  labelI18nKey: string;
  descriptionI18nKey?: string;
  cost: number;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface GameMilestonePayload {
  label: string;
  description?: string;
  cost: number;
  sortOrder?: number;
}

export interface GameRewardCard {
  id: string;
  gameId: string;
  title: string;
  subtitle?: string;
  description?: string;
  cost: number;
  accentToken?: string;
  iconKey?: string;
  illustrationUrl?: string;
  color?: string;
  sortOrder: number;
  createdAt?: string;
}

export interface GameRewardCardPayload {
  title: string;
  subtitle?: string;
  description?: string;
  cost: number;
  accentToken?: string;
  iconKey?: string;
  illustrationUrl?: string;
  color?: string;
  sortOrder?: number;
}

export interface MilestoneBonusVote {
  id: string;
  milestoneId: string;
  bonusCardId: string;
  guildId: string;
  voteCount: number;
  metadata?: Record<string, unknown> & {
    boostApproval?: {
      requiredVotes: number;
      receivedVotes: number;
      hasVoted?: boolean;
      votes?: number;
      status?: 'pending' | 'complete';
    };
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface MilestoneBonusVoteResult {
  bonusCardId: string;
  voteCount: number;
  isLeader: boolean;
}

export interface MilestoneBonusVoteState {
  milestone: ProgressMilestone;
  results: MilestoneBonusVoteResult[];
  guildVote?: MilestoneBonusVote;
  leadingBonusCardIds: string[];
  hasTie: boolean;
  isVoteOpen: boolean;
  isVoteClosed: boolean;
}

export interface GameBonusVoteState {
  milestones: ProgressMilestone[];
  bonusCards: GameRewardCard[];
  voteStates: MilestoneBonusVoteState[];
  selectedMilestoneId?: string;
  guildId?: string;
  guildGold?: number;
  currentGuildMemberCount?: number;
  boostCostPreview?: VoteSpendBreakdown;
  baseVotesPerGuild: number;
}

export type NotificationTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

import type { RewardNotificationContext, VoteSpendBreakdown } from './rewards';

export interface Notification {
  id: string;
  cohortId?: string;
  guildId?: string;
  titleI18nKey: string;
  descriptionI18nKey?: string;
  icon?: string;
  tone?: NotificationTone;
  actionLabelI18nKey?: string;
  actionTarget?: 'map' | 'guild' | 'acknowledge' | 'collect' | 'review';
  context?: RewardNotificationContext;
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
