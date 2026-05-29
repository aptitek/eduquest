import {
  DEFAULT_REWARD_SYSTEM_CONFIG,
  STUDENT_ATTRIBUTES,
  type GameStats,
  type StudentAttribute,
} from '@eduquest/shared';

export type CharacterStatAllocation = Record<StudentAttribute, number>;

export type CharacterAllocationRepair = {
  nextManual: CharacterStatAllocation;
  refundedPoints: number;
  changed: boolean;
};

export type CharacterStatRules = {
  cap?: number;
  budget?: number;
  baseStats?: Partial<GameStats>;
};

export function normalizeBaseStats(
  stats: Partial<GameStats>,
  cap = DEFAULT_REWARD_SYSTEM_CONFIG.attributes.levelOneMaxValue
): CharacterStatAllocation | undefined {
  const nextStats = {} as CharacterStatAllocation;

  for (const attribute of STUDENT_ATTRIBUTES) {
    const value = stats[attribute];
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > cap) {
      return undefined;
    }
    nextStats[attribute] = value;
  }

  return nextStats;
}

export function normalizeManualAllocation(
  stats: Partial<GameStats>,
  rules: CharacterStatRules = {}
): CharacterStatAllocation | undefined {
  const cap = rules.cap ?? DEFAULT_REWARD_SYSTEM_CONFIG.attributes.levelOneMaxValue;
  const budget = rules.budget ?? DEFAULT_REWARD_SYSTEM_CONFIG.attributes.statAllocationBudget;
  const baseStats = rules.baseStats || {};
  const nextStats = {} as CharacterStatAllocation;
  let spentPoints = 0;

  for (const attribute of STUDENT_ATTRIBUTES) {
    const value = stats[attribute];
    const baseValue = baseStats[attribute] || 0;
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > cap) {
      return undefined;
    }
    if (baseValue + value > cap) {
      return undefined;
    }

    nextStats[attribute] = value;
    spentPoints += value;
  }

  if (spentPoints > budget) {
    return undefined;
  }

  return nextStats;
}

export function repairManualAllocation(
  manual: CharacterStatAllocation,
  baseStats: CharacterStatAllocation,
  cap = DEFAULT_REWARD_SYSTEM_CONFIG.attributes.levelOneMaxValue,
  budget = DEFAULT_REWARD_SYSTEM_CONFIG.attributes.statAllocationBudget
): CharacterAllocationRepair {
  const nextManual = {} as CharacterStatAllocation;
  let refundedPoints = 0;
  let changed = false;
  let spentPoints = 0;

  for (const attribute of STUDENT_ATTRIBUTES) {
    const currentManual = Math.max(0, manual[attribute] || 0);
    const maxManual = Math.max(0, cap - (baseStats[attribute] || 0));
    const repairedManual = Math.min(currentManual, maxManual);

    nextManual[attribute] = repairedManual;
    refundedPoints += currentManual - repairedManual;
    changed = changed || repairedManual !== currentManual;
    spentPoints += repairedManual;
  }

  let overflow = Math.max(0, spentPoints - budget);
  for (const attribute of [...STUDENT_ATTRIBUTES].reverse()) {
    if (overflow <= 0) break;
    const refunded = Math.min(nextManual[attribute], overflow);
    nextManual[attribute] -= refunded;
    refundedPoints += refunded;
    overflow -= refunded;
    changed = changed || refunded > 0;
  }

  return {
    nextManual,
    refundedPoints,
    changed,
  };
}
