import {
  STUDENT_ATTRIBUTES,
  type CharacterStatValue,
  type RewardSystemConfig,
  type StudentAttribute,
} from '@eduquest/shared';

export interface ManualStatInput {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface ClassBaseStatInput extends ManualStatInput {}

export type MemberCharacterStats = Record<StudentAttribute, CharacterStatValue>;

export class CharacterStatCalculator {
  static compute(
    classBase: ClassBaseStatInput,
    manual: ManualStatInput,
    config: RewardSystemConfig
  ): MemberCharacterStats {
    const cap = config.attributes.levelOneMaxValue;
    const stats = {} as MemberCharacterStats;

    for (const attribute of STUDENT_ATTRIBUTES) {
      const base = classBase[attribute] || 0;
      const manualPoints = manual[attribute] || 0;
      const rawTotal = base + manualPoints;
      stats[attribute] = {
        base,
        manual: manualPoints,
        rawTotal,
        effective: Math.min(cap, rawTotal),
      };
    }

    return stats;
  }
}
