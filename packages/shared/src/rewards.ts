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
