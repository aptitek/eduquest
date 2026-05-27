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

export interface RewardSystemConfig {
  guild: {
    minStudents: number;
    maxStudents: number;
    targetSizeForModifier: number;
    sizeModifierPerMissingStudent: number;
  };
  attributes: {
    levelOneMaxValue: number;
    earningMultiplier: number;
  };
  modifiers: {
    charismaPassiveMultiplier: number;
  };
  strategies: {
    dexterityHoursEarlyMultiplier: number;
    constitutionActiveDaysMultiplier: number;
    constitutionActiveWindowDays: number;
  };
  voting: {
    quadraticExponent: number;
    charismaDiscountMultiplier: number;
    minimumDiscountFactor: number;
  };
}

export type RewardSystemConfigOverrides = {
  [Section in keyof RewardSystemConfig]?: Partial<RewardSystemConfig[Section]>;
};

export type RewardModifierKind =
  | 'base'
  | 'guild_size'
  | 'attribute'
  | 'charisma_passive'
  | 'early_bonus'
  | 'activity_streak'
  | 'event_bonus';

export interface RewardModifier {
  id: string;
  kind: RewardModifierKind;
  labelI18nKey: string;
  /** Points added (or net change) by this modifier step. */
  effect: number;
  /** Optional multiplier applied at this step (e.g. guild size ×1.5). */
  multiplier?: number;
  /** Optional metadata for UI (attribute name, student count, etc.). */
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
  balance?: number;
}

export interface RewardNotificationContext {
  type: 'reward';
  breakdown: RewardComputationBreakdown;
}

export const DEFAULT_REWARD_SYSTEM_CONFIG: RewardSystemConfig = {
  guild: {
    minStudents: 1,
    maxStudents: 3,
    targetSizeForModifier: 3,
    sizeModifierPerMissingStudent: 0.5,
  },
  attributes: {
    levelOneMaxValue: 5,
    earningMultiplier: 0.05,
  },
  modifiers: {
    charismaPassiveMultiplier: 0.02,
  },
  strategies: {
    dexterityHoursEarlyMultiplier: 0.5,
    constitutionActiveDaysMultiplier: 0.1,
    constitutionActiveWindowDays: 7,
  },
  voting: {
    quadraticExponent: 2,
    charismaDiscountMultiplier: 0.05,
    minimumDiscountFactor: 0.25,
  },
};
