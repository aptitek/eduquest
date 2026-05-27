import type {
  RewardActivityType,
  RewardComputationBreakdown,
  RewardModifier,
  RewardPolicy,
  StudentAttribute,
} from '@eduquest/shared';
import { AttributeResolver } from './attribute-resolver';
import type { GuildStatProfile } from './guild-stat-calculator';
import type { ActiveDaysRepository } from './rewards';
import type { ResolvedRewardBalanceConfig } from './reward-balance-config';

const ATTRIBUTE_LABEL_KEYS: Record<StudentAttribute, string> = {
  strength: 'rewards.modifiers.strength',
  dexterity: 'rewards.modifiers.dexterity',
  constitution: 'rewards.modifiers.constitution',
  intelligence: 'rewards.modifiers.intelligence',
  wisdom: 'rewards.modifiers.wisdom',
  charisma: 'rewards.modifiers.charisma',
};

export interface RewardPipelineInput {
  guildProfile: GuildStatProfile;
  studentId?: string;
  cohortId?: string;
  activityId?: string;
  trigger: string;
  policy: RewardPolicy;
  basePoints: number;
  targetAttribute: RewardActivityType | null;
  difficulty?: 1 | 2 | 3;
  hoursEarly?: number;
  activeDaysRepository?: ActiveDaysRepository;
  balanceConfig: ResolvedRewardBalanceConfig;
  now?: Date;
}

export class RewardPipeline {
  static async compute(input: RewardPipelineInput): Promise<RewardComputationBreakdown> {
    const config = input.balanceConfig.rewardSystem;
    const modifiers: RewardModifier[] = [];
    let runningTotal = input.basePoints;

    modifiers.push({
      id: 'base',
      kind: 'base',
      labelI18nKey: 'rewards.modifiers.base',
      effect: runningTotal,
    });

    if (input.difficulty && input.difficulty > 1) {
      const multiplier = config.difficultyMultipliers[input.difficulty] || 1;
      const afterDifficulty = runningTotal * multiplier;
      modifiers.push({
        id: 'difficulty',
        kind: 'difficulty',
        labelI18nKey: 'rewards.modifiers.difficulty',
        multiplier,
        effect: afterDifficulty - runningTotal,
        detail: { difficulty: input.difficulty },
      });
      runningTotal = afterDifficulty;
    }

    const primaryStrategy =
      input.policy.primaryStrategy || input.targetAttribute || null;

    if (input.policy.actorScope === 'student') {
      const sizeModifier = input.guildProfile.sizeModifier;
      const afterSize = runningTotal * sizeModifier;
      if (sizeModifier !== 1) {
        modifiers.push({
          id: 'guild_size',
          kind: 'guild_size',
          labelI18nKey: 'rewards.modifiers.guildSize',
          multiplier: sizeModifier,
          effect: afterSize - runningTotal,
          detail: {
            memberCount: input.guildProfile.memberCount,
          },
        });
        runningTotal = afterSize;
      }
    }

    if (primaryStrategy === 'dexterity') {
      const hoursEarly = input.hoursEarly ?? 0;
      if (hoursEarly <= 0) {
        return RewardPipeline.emptyBreakdown(input, modifiers);
      }

      const dex = AttributeResolver.resolve(
        'student',
        input.guildProfile,
        input.studentId,
        'dexterity'
      );
      const dexGold =
        config.strategies.dexterityHoursEarlyMultiplier *
        dex *
        hoursEarly *
        input.guildProfile.sizeModifier;
      const cappedDex = Math.min(config.caps.maxDexterityGoldPerEvent, Math.round(dexGold));

      modifiers.push({
        id: 'dexterity',
        kind: 'early_bonus',
        labelI18nKey: 'rewards.modifiers.dexterity',
        effect: cappedDex - runningTotal,
        detail: { hoursEarly, dexterity: dex },
      });

      runningTotal = cappedDex;
    } else if (primaryStrategy) {
      const attr = primaryStrategy as StudentAttribute;
      const attrValue = AttributeResolver.resolve(
        input.policy.actorScope,
        input.guildProfile,
        input.studentId,
        attr
      );
      const earningMultiplier =
        input.policy.actorScope === 'guild'
          ? config.attributes.guildEarningMultiplier
          : config.attributes.earningMultiplier;
      const afterAttribute = runningTotal * (1 + earningMultiplier * attrValue);
      modifiers.push({
        id: 'attribute',
        kind: 'attribute',
        labelI18nKey: ATTRIBUTE_LABEL_KEYS[attr],
        effect: afterAttribute - runningTotal,
        detail: {
          attribute: attr,
          scope: input.policy.actorScope,
          value: attrValue,
        },
      });
      runningTotal = afterAttribute;
    }

    if (input.policy.applyConstitutionOverlay) {
      const conValue = AttributeResolver.resolve(
        input.policy.actorScope,
        input.guildProfile,
        input.studentId,
        'constitution'
      );
      const earningMultiplier =
        input.policy.actorScope === 'guild'
          ? config.attributes.guildEarningMultiplier
          : config.attributes.earningMultiplier;
      let activeDays = 0;

      if (input.activeDaysRepository) {
        activeDays = await input.activeDaysRepository.countActiveDays({
          guildId: input.guildProfile.guildId,
          studentId: input.policy.actorScope === 'student' ? input.studentId : undefined,
          windowDays: config.strategies.constitutionActiveWindowDays,
          now: input.now,
        });
        activeDays = Math.min(config.strategies.constitutionActiveDaysCap, activeDays);
      }

      const conFactor = 1 + earningMultiplier * conValue;
      const daysFactor = 1 + config.strategies.constitutionActiveDaysMultiplier * activeDays;
      const afterConstitution = runningTotal * conFactor * daysFactor;
      modifiers.push({
        id: 'constitution',
        kind: 'constitution',
        labelI18nKey: 'rewards.modifiers.constitution',
        effect: afterConstitution - runningTotal,
        detail: { constitution: conValue, activeDays },
      });
      runningTotal = afterConstitution;
    }

    const chaEffective = input.guildProfile.stats.charisma.effective;
    const afterCharisma =
      runningTotal * (1 + config.modifiers.charismaPassiveMultiplier * chaEffective);
    if (afterCharisma !== runningTotal) {
      modifiers.push({
        id: 'charisma_passive',
        kind: 'charisma_passive',
        labelI18nKey: 'rewards.modifiers.charismaPassive',
        effect: afterCharisma - runningTotal,
        detail: {
          scope: 'guild',
          effective: chaEffective,
          rawSum: input.guildProfile.stats.charisma.rawSum,
          cappedSum: input.guildProfile.stats.charisma.cappedSum,
        },
      });
      runningTotal = afterCharisma;
    }

    const finalAmount = Math.min(config.caps.maxGoldPerEvent, Math.round(runningTotal));

    return {
      basePoints: input.basePoints,
      subtotal: runningTotal,
      modifiers,
      finalAmount,
      activityType: primaryStrategy || undefined,
      guildId: input.guildProfile.guildId,
      studentId: input.studentId,
      activityId: input.activityId,
      cohortId: input.cohortId,
      trigger: input.trigger,
      policyId: input.policy.id,
      actorScope: input.policy.actorScope,
      balanceConfigVersion: input.balanceConfig.version,
    };
  }

  private static emptyBreakdown(
    input: RewardPipelineInput,
    modifiers: RewardModifier[]
  ): RewardComputationBreakdown {
    return {
      basePoints: input.basePoints,
      subtotal: 0,
      modifiers,
      finalAmount: 0,
      guildId: input.guildProfile.guildId,
      studentId: input.studentId,
      activityId: input.activityId,
      cohortId: input.cohortId,
      trigger: input.trigger,
      policyId: input.policy.id,
      actorScope: input.policy.actorScope,
      balanceConfigVersion: input.balanceConfig.version,
    };
  }
}
