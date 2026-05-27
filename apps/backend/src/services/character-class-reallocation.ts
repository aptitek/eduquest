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

export function repairManualAllocation(
  manual: CharacterStatAllocation,
  baseStats: CharacterStatAllocation,
  cap = DEFAULT_REWARD_SYSTEM_CONFIG.attributes.levelOneMaxValue
): CharacterAllocationRepair {
  const nextManual = {} as CharacterStatAllocation;
  let refundedPoints = 0;
  let changed = false;

  for (const attribute of STUDENT_ATTRIBUTES) {
    const currentManual = Math.max(0, manual[attribute] || 0);
    const maxManual = Math.max(0, cap - (baseStats[attribute] || 0));
    const repairedManual = Math.min(currentManual, maxManual);

    nextManual[attribute] = repairedManual;
    refundedPoints += currentManual - repairedManual;
    changed = changed || repairedManual !== currentManual;
  }

  return {
    nextManual,
    refundedPoints,
    changed,
  };
}
