import {
  type RewardActivityType,
  type RewardComputationBreakdown,
  type RewardModifier,
  type RewardSystemConfigOverrides,
} from '@eduquest/shared';
import {
  ConstitutionStrategy,
  DexterityStrategy,
  GuildModifiers,
  RewardService,
  RewardSystemConfigService,
  StrengthStrategy,
  IntelligenceStrategy,
  WisdomStrategy,
  CharismaStrategy,
  type ActiveDaysRepository,
  type CalculationContext,
  type Guild,
  type PointStrategy,
  type RewardActivityInput,
} from './rewards';

export interface RewardBreakdownInput {
  guild: Guild;
  guildId: string;
  studentId?: string;
  activity: RewardActivityInput;
  trigger: string;
  cohortId?: string;
  hoursEarly?: number;
  activeDays?: number;
  activeDaysRepository?: ActiveDaysRepository;
  now?: Date;
  configOverrides?: RewardSystemConfigOverrides;
}

const STRATEGIES: Record<RewardActivityType, PointStrategy> = {
  strength: new StrengthStrategy(),
  intelligence: new IntelligenceStrategy(),
  wisdom: new WisdomStrategy(),
  dexterity: new DexterityStrategy(),
  constitution: new ConstitutionStrategy(),
  charisma: new CharismaStrategy(),
};

const ATTRIBUTE_LABEL_KEYS: Record<RewardActivityType, string> = {
  strength: 'rewards.modifiers.strength',
  intelligence: 'rewards.modifiers.intelligence',
  wisdom: 'rewards.modifiers.wisdom',
  dexterity: 'rewards.modifiers.dexterity',
  constitution: 'rewards.modifiers.constitution',
  charisma: 'rewards.modifiers.charisma',
};

export class RewardBreakdownBuilder {
  static async build(input: RewardBreakdownInput): Promise<RewardComputationBreakdown> {
    const configOverrides = RewardSystemConfigService.merge(input.configOverrides);
    const config = RewardSystemConfigService.resolve(configOverrides);
    const basePoints = input.activity.basePoints || 0;
    const modifiers: RewardModifier[] = [
      {
        id: 'base',
        kind: 'base',
        labelI18nKey: 'rewards.modifiers.base',
        effect: basePoints,
      },
    ];

    if (basePoints <= 0 || !input.activity.targetAttribute) {
      return {
        basePoints,
        subtotal: basePoints,
        modifiers,
        finalAmount: Math.max(0, basePoints),
        guildId: input.guildId,
        studentId: input.studentId,
        activityId: input.activity.id,
        cohortId: input.cohortId,
        trigger: input.trigger,
      };
    }

    const activityType = input.activity.targetAttribute;
    const context: CalculationContext = {
      guild: input.guild,
      guildId: input.guildId,
      studentId: input.studentId,
      basePoints,
      hoursEarly: input.hoursEarly,
      activeDays: input.activeDays,
      activeDaysRepository: input.activeDaysRepository,
      config: configOverrides,
    };

    const strategy = STRATEGIES[activityType];
    const preCharismaTotal = await strategy.calculate(context, config);
    const guildStatsEffect = preCharismaTotal - basePoints;

    if (guildStatsEffect !== 0) {
      modifiers.push({
        id: 'guild_stats',
        kind: 'attribute',
        labelI18nKey: ATTRIBUTE_LABEL_KEYS[activityType],
        effect: guildStatsEffect,
        detail: {
          attribute: activityType,
          memberCount: input.guild.students.length,
        },
      });
    }

    const finalAmount = Math.round(GuildModifiers.charismaBuff(preCharismaTotal, input.guild, config));
    const charismaEffect = finalAmount - preCharismaTotal;

    if (charismaEffect !== 0) {
      modifiers.push({
        id: 'charisma_passive',
        kind: 'charisma_passive',
        labelI18nKey: 'rewards.modifiers.charismaPassive',
        effect: charismaEffect,
        detail: {
          charismaSum: GuildModifiers.attributeSum(input.guild, 'charisma', config),
        },
      });
    }

    return {
      basePoints,
      subtotal: preCharismaTotal,
      modifiers,
      finalAmount,
      activityType,
      guildId: input.guildId,
      studentId: input.studentId,
      activityId: input.activity.id,
      cohortId: input.cohortId,
      trigger: input.trigger,
    };
  }

  static preview(
    activityType: RewardActivityType,
    context: CalculationContext,
    configOverrides?: RewardSystemConfigOverrides
  ): Promise<number> {
    return RewardService.calculatePreview(activityType, context, configOverrides);
  }
}
