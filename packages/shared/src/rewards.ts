import type { RewardPolicyId } from './reward-policies';

export type StudentAttribute =
  | 'strength'
  | 'dexterity'
  | 'constitution'
  | 'intelligence'
  | 'wisdom'
  | 'charisma';

export type RewardActivityType =
  | 'strength'
  | 'intelligence'
  | 'wisdom'
  | 'dexterity'
  | 'constitution'
  | 'charisma';

export const STUDENT_ATTRIBUTES: StudentAttribute[] = [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
];

export interface RewardSystemConfig {
  guild: {
    minStudents: number;
    maxStudents: number;
    targetSizeForModifier: number;
    sizeModifierPerMissingStudent: number;
    statCapPerAttribute: number;
  };
  attributes: {
    levelOneMaxValue: number;
    statAllocationBudget: number;
    earningMultiplier: number;
    guildEarningMultiplier: number;
  };
  modifiers: {
    charismaPassiveMultiplier: number;
  };
  strategies: {
    dexterityHoursEarlyMultiplier: number;
    constitutionActiveDaysMultiplier: number;
    constitutionActiveWindowDays: number;
    constitutionActiveDaysCap: number;
  };
  voting: {
    baseVotesPerGuild: number;
    baseVoteCost: number;
    quadraticExponent: number;
    charismaDiscountMultiplier: number;
    minimumDiscountFactor: number;
  };
  caps: {
    maxGoldPerEvent: number;
    maxDexterityGoldPerEvent: number;
  };
  difficultyMultipliers: {
    1: number;
    2: number;
    3: number;
  };
}

export type RewardSystemConfigOverrides = {
  [Section in keyof RewardSystemConfig]?: Partial<RewardSystemConfig[Section]>;
};

export interface RewardBalanceConfigPayload {
  rewardSystem?: RewardSystemConfigOverrides;
  policyIds?: Partial<Record<RewardPolicyId, { fixedBasePoints?: number }>>;
  label?: string;
}

export type RewardModifierKind =
  | 'base'
  | 'guild_size'
  | 'attribute'
  | 'charisma_passive'
  | 'charisma_discount'
  | 'constitution'
  | 'early_bonus'
  | 'activity_streak'
  | 'event_bonus'
  | 'difficulty';

export interface CharacterStatValue {
  base: number;
  manual: number;
  rawTotal: number;
  effective: number;
}

export interface GuildStatValue {
  rawSum: number;
  cappedSum: number;
  sizeModifier: number;
  effective: number;
}

export interface RewardModifier {
  id: string;
  kind: RewardModifierKind;
  labelI18nKey: string;
  effect: number;
  multiplier?: number;
  detail?: Record<string, string | number>;
}

export interface RewardComputationBreakdown {
  basePoints: number;
  subtotal: number;
  modifiers: RewardModifier[];
  finalAmount: number;
  activityType?: RewardActivityType;
  guildId: string;
  studentId?: string;
  activityId?: string;
  cohortId?: string;
  trigger: string;
  policyId?: string;
  actorScope?: 'student' | 'guild';
  balanceConfigVersion?: number;
  balance?: number;
}

export interface RewardNotificationContext {
  type: 'reward';
  breakdown: RewardComputationBreakdown;
}

export interface VoteSpendBreakdown {
  votes: number;
  baseCost: number;
  subtotal: number;
  modifiers: RewardModifier[];
  finalCost: number;
  guildId: string;
  studentId?: string;
  balanceConfigVersion?: number;
  balance?: number;
}

export interface VoteSpendNotificationContext {
  type: 'vote_spend';
  breakdown: VoteSpendBreakdown;
}

export const DEFAULT_REWARD_SYSTEM_CONFIG: RewardSystemConfig = {
  guild: {
    minStudents: 1,
    maxStudents: 3,
    targetSizeForModifier: 3,
    sizeModifierPerMissingStudent: 0.35,
    statCapPerAttribute: 12,
  },
  attributes: {
    levelOneMaxValue: 5,
    statAllocationBudget: 6,
    earningMultiplier: 0.13,
    guildEarningMultiplier: 0.06,
  },
  modifiers: {
    charismaPassiveMultiplier: 0.028,
  },
  strategies: {
    dexterityHoursEarlyMultiplier: 0.2,
    constitutionActiveDaysMultiplier: 0.04,
    constitutionActiveWindowDays: 7,
    constitutionActiveDaysCap: 5,
  },
  voting: {
    baseVotesPerGuild: 1,
    baseVoteCost: 1,
    quadraticExponent: 2,
    charismaDiscountMultiplier: 0.045,
    minimumDiscountFactor: 0.25,
  },
  caps: {
    maxGoldPerEvent: 500,
    maxDexterityGoldPerEvent: 100,
  },
  difficultyMultipliers: {
    1: 1,
    2: 1.25,
    3: 1.5,
  },
};
