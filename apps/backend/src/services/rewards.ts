import {
  DEFAULT_REWARD_SYSTEM_CONFIG,
  type RewardActivityType,
  type RewardSystemConfig,
  type RewardSystemConfigOverrides,
  type StudentAttribute,
  type VoteSpendBreakdown,
} from '@eduquest/shared';
import { and, eq, gte, sql } from 'drizzle-orm';
import {
  cohortMemberships,
  gameCharacterClasses,
  gameCharacters,
  guilds,
  pointTransactions,
  students,
} from '../db/schema';
import { createEventContext, publishEvent } from '../events';
import { RewardBalanceConfigService } from './reward-balance-config';
import { loadGuildStatProfile } from './guild-profile-loader';
import { SpendBreakdownBuilder } from './spend-breakdown';

export type {
  RewardActivityType,
  RewardSystemConfig,
  RewardSystemConfigOverrides,
  StudentAttribute,
} from '@eduquest/shared';

export class RewardSystemConfigService {
  static resolve(overrides?: RewardSystemConfigOverrides): RewardSystemConfig {
    if (!overrides) {
      return {
        guild: { ...DEFAULT_REWARD_SYSTEM_CONFIG.guild },
        attributes: { ...DEFAULT_REWARD_SYSTEM_CONFIG.attributes },
        modifiers: { ...DEFAULT_REWARD_SYSTEM_CONFIG.modifiers },
        strategies: { ...DEFAULT_REWARD_SYSTEM_CONFIG.strategies },
        voting: { ...DEFAULT_REWARD_SYSTEM_CONFIG.voting },
        caps: { ...DEFAULT_REWARD_SYSTEM_CONFIG.caps },
        difficultyMultipliers: { ...DEFAULT_REWARD_SYSTEM_CONFIG.difficultyMultipliers },
      };
    }

    return {
      guild: {
        ...DEFAULT_REWARD_SYSTEM_CONFIG.guild,
        ...overrides.guild,
      },
      attributes: {
        ...DEFAULT_REWARD_SYSTEM_CONFIG.attributes,
        ...overrides.attributes,
      },
      modifiers: {
        ...DEFAULT_REWARD_SYSTEM_CONFIG.modifiers,
        ...overrides.modifiers,
      },
      strategies: {
        ...DEFAULT_REWARD_SYSTEM_CONFIG.strategies,
        ...overrides.strategies,
      },
      voting: {
        ...DEFAULT_REWARD_SYSTEM_CONFIG.voting,
        ...overrides.voting,
      },
      caps: {
        ...DEFAULT_REWARD_SYSTEM_CONFIG.caps,
        ...overrides.caps,
      },
      difficultyMultipliers: {
        ...DEFAULT_REWARD_SYSTEM_CONFIG.difficultyMultipliers,
        ...overrides.difficultyMultipliers,
      },
    };
  }

  static merge(
    ...overrides: (RewardSystemConfigOverrides | undefined)[]
  ): RewardSystemConfigOverrides | undefined {
    const definedOverrides = overrides.filter((override): override is RewardSystemConfigOverrides =>
      Boolean(override)
    );

    if (definedOverrides.length === 0) return undefined;

    return definedOverrides.reduce<RewardSystemConfigOverrides>((merged, override) => {
      return {
        guild: {
          ...merged.guild,
          ...override.guild,
        },
        attributes: {
          ...merged.attributes,
          ...override.attributes,
        },
        modifiers: {
          ...merged.modifiers,
          ...override.modifiers,
        },
        strategies: {
          ...merged.strategies,
          ...override.strategies,
        },
        voting: {
          ...merged.voting,
          ...override.voting,
        },
        caps: {
          ...merged.caps,
          ...override.caps,
        },
        difficultyMultipliers: {
          ...merged.difficultyMultipliers,
          ...override.difficultyMultipliers,
        },
      };
    }, {});
  }
}

export interface Student {
  id: string;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export type GuildStudents =
  | readonly [Student]
  | readonly [Student, Student]
  | readonly [Student, Student, Student];

export interface Guild {
  id: string;
  gold?: number;
  students: GuildStudents;
}

export interface CalculationContext {
  guild: Guild;
  guildId?: string;
  studentId?: string;
  activeDaysRepository?: ActiveDaysRepository;
  basePoints?: number;
  hoursEarly?: number;
  activeDays?: number;
  config?: RewardSystemConfigOverrides;
}

export interface ActiveDaysLookup {
  guildId: string;
  studentId?: string;
  windowDays: number;
  now?: Date;
}

export interface ActiveDaysRepository {
  countActiveDays(input: ActiveDaysLookup): Promise<number>;
}

type RewardDb = any;
type PointTransactionType = (typeof pointTransactions.transactionType.enumValues)[number];

export interface RewardActivityInput {
  id: string;
  basePoints: number;
  targetAttribute: RewardActivityType | null;
}

export interface RewardCalculationInput {
  guildId: string;
  activity: RewardActivityInput;
  studentId?: string;
  hoursEarly?: number;
  activeDays?: number;
  now?: Date;
  config?: RewardSystemConfigOverrides;
  transactionType?: Extract<PointTransactionType, 'EARNED' | 'MANUAL_BONUS'>;
}

export interface RewardCalculationResult {
  guildId: string;
  activityId: string;
  activityType: RewardActivityType;
  amount: number;
  calculatedPoints: number;
  finalPoints: number;
  activeDays?: number;
  balance: number;
}

export interface VoteSpendInput {
  guildId: string;
  votes: number;
  cohortId?: string;
  studentId?: string;
  alreadyPurchasedVotes?: number;
}

export interface VoteSpendResult {
  guildId: string;
  votes: number;
  cost: number;
  balance: number;
  breakdown: VoteSpendBreakdown;
}

export class GuildModifiers {
  static sizeModifier(
    guild: Guild,
    config: RewardSystemConfig = DEFAULT_REWARD_SYSTEM_CONFIG
  ): number {
    const studentCount = this.studentCount(guild, config);
    return (
      1 +
      config.guild.sizeModifierPerMissingStudent *
        (config.guild.targetSizeForModifier - studentCount)
    );
  }

  static attributeSum(
    guild: Guild,
    attribute: StudentAttribute,
    config: RewardSystemConfig = DEFAULT_REWARD_SYSTEM_CONFIG
  ): number {
    this.assertValidGuildSize(guild, config);

    return guild.students.reduce(
      (sum, student) => sum + this.requireFinite(student[attribute], attribute),
      0
    );
  }

  static charismaBuff(
    calculatedPoints: number,
    guild: Guild,
    config: RewardSystemConfig = DEFAULT_REWARD_SYSTEM_CONFIG
  ): number {
    const charismaSum = this.attributeSum(guild, 'charisma', config);
    return calculatedPoints * (1 + config.modifiers.charismaPassiveMultiplier * charismaSum);
  }

  private static studentCount(guild: Guild, config: RewardSystemConfig): number {
    this.assertValidGuildSize(guild, config);
    return guild.students.length;
  }

  private static assertValidGuildSize(guild: Guild, config: RewardSystemConfig): void {
    if (
      guild.students.length < config.guild.minStudents ||
      guild.students.length > config.guild.maxStudents
    ) {
      throw new Error(
        `A guild must have between ${config.guild.minStudents} and ${config.guild.maxStudents} students.`
      );
    }
  }

  private static requireFinite(value: number, label: string): number {
    if (!Number.isFinite(value)) {
      throw new Error(`Expected ${label} to be a finite number.`);
    }

    return value;
  }
}

export interface PointStrategy {
  calculate(context: CalculationContext, config: RewardSystemConfig): Promise<number>;
}

abstract class BaseRewardStrategy implements PointStrategy {
  abstract calculate(context: CalculationContext, config: RewardSystemConfig): Promise<number>;

  protected getBasePoints(context: CalculationContext): number {
    if (context.basePoints === undefined) {
      throw new Error('basePoints is required for this reward strategy.');
    }

    return this.requireFinite(context.basePoints, 'basePoints');
  }

  protected getSizeModifier(context: CalculationContext, config: RewardSystemConfig): number {
    return GuildModifiers.sizeModifier(context.guild, config);
  }

  protected getAttributeSum(
    context: CalculationContext,
    attribute: StudentAttribute,
    config: RewardSystemConfig
  ): number {
    return GuildModifiers.attributeSum(context.guild, attribute, config);
  }

  protected requireFinite(value: number, label: string): number {
    if (!Number.isFinite(value)) {
      throw new Error(`Expected ${label} to be a finite number.`);
    }

    return value;
  }
}

export class StrengthStrategy extends BaseRewardStrategy {
  async calculate(context: CalculationContext, config: RewardSystemConfig): Promise<number> {
    const basePoints = this.getBasePoints(context);
    const strengthSum = this.getAttributeSum(context, 'strength', config);

    return (
      basePoints *
      this.getSizeModifier(context, config) *
      (1 + config.attributes.earningMultiplier * strengthSum)
    );
  }
}

export class IntelligenceStrategy extends BaseRewardStrategy {
  async calculate(context: CalculationContext, config: RewardSystemConfig): Promise<number> {
    const basePoints = this.getBasePoints(context);
    const intelligenceSum = this.getAttributeSum(context, 'intelligence', config);

    return (
      basePoints *
      this.getSizeModifier(context, config) *
      (1 + config.attributes.earningMultiplier * intelligenceSum)
    );
  }
}

export class WisdomStrategy extends BaseRewardStrategy {
  async calculate(context: CalculationContext, config: RewardSystemConfig): Promise<number> {
    const basePoints = this.getBasePoints(context);
    const wisdomSum = this.getAttributeSum(context, 'wisdom', config);

    return (
      basePoints *
      this.getSizeModifier(context, config) *
      (1 + config.attributes.earningMultiplier * wisdomSum)
    );
  }
}

export class DexterityStrategy extends BaseRewardStrategy {
  async calculate(context: CalculationContext, config: RewardSystemConfig): Promise<number> {
    if (context.hoursEarly === undefined) {
      throw new Error('hoursEarly is required for the dexterity reward strategy.');
    }

    const hoursEarly = this.requireFinite(context.hoursEarly, 'hoursEarly');
    const dexteritySum = this.getAttributeSum(context, 'dexterity', config);

    return (
      config.strategies.dexterityHoursEarlyMultiplier *
      dexteritySum *
      hoursEarly *
      this.getSizeModifier(context, config)
    );
  }
}

export class ConstitutionStrategy extends BaseRewardStrategy {
  async calculate(context: CalculationContext, config: RewardSystemConfig): Promise<number> {
    const basePoints = this.getBasePoints(context);
    const activeDays = await this.getActiveDays(context, config);
    const constitutionSum = this.getAttributeSum(context, 'constitution', config);

    return (
      basePoints *
      this.getSizeModifier(context, config) *
      (1 + config.attributes.earningMultiplier * constitutionSum) *
      (1 + config.strategies.constitutionActiveDaysMultiplier * activeDays)
    );
  }

  private async getActiveDays(
    context: CalculationContext,
    config: RewardSystemConfig
  ): Promise<number> {
    if (context.activeDays !== undefined) {
      return this.requireFinite(context.activeDays, 'activeDays');
    }

    if (!context.activeDaysRepository) {
      throw new Error('activeDaysRepository is required for the constitution reward strategy.');
    }

    const activeDays = await context.activeDaysRepository.countActiveDays({
      guildId: context.guildId || context.guild.id,
      studentId: context.studentId,
      windowDays: config.strategies.constitutionActiveWindowDays,
    });

    return this.requireFinite(activeDays, 'activeDays');
  }
}

export class CharismaStrategy extends BaseRewardStrategy {
  async calculate(context: CalculationContext, config: RewardSystemConfig): Promise<number> {
    const basePoints = this.getBasePoints(context);
    const charismaSum = this.getAttributeSum(context, 'charisma', config);

    return (
      basePoints *
      this.getSizeModifier(context, config) *
      (1 + config.attributes.earningMultiplier * charismaSum)
    );
  }
}

export class PointTransactionActiveDaysRepository implements ActiveDaysRepository {
  constructor(private readonly db: RewardDb) {}

  async countActiveDays({ guildId, studentId, windowDays, now = new Date() }: ActiveDaysLookup) {
    const since = new Date(now);
    since.setUTCDate(since.getUTCDate() - windowDays);

    const conditions = [
      eq(pointTransactions.guildId, guildId),
      gte(pointTransactions.createdAt, since),
    ];

    if (studentId) {
      conditions.push(eq(pointTransactions.studentId, studentId));
    }

    const [row] = await this.db
      .select({
        activeDays: sql<number>`count(distinct date(${pointTransactions.createdAt}))`,
      })
      .from(pointTransactions)
      .where(and(...conditions));

    return Number(row?.activeDays || 0);
  }
}

export class GuildSnapshotRepository {
  constructor(private readonly db: RewardDb) {}

  async getGuild(guildId: string): Promise<Guild> {
    const memberRows = await this.db
      .select({
        id: students.id,
        strength: sql<number>`${gameCharacters.strength} + ${gameCharacterClasses.baseStrength}`,
        dexterity: sql<number>`${gameCharacters.dexterity} + ${gameCharacterClasses.baseDexterity}`,
        constitution: sql<number>`${gameCharacters.constitution} + ${gameCharacterClasses.baseConstitution}`,
        intelligence: sql<number>`${gameCharacters.intelligence} + ${gameCharacterClasses.baseIntelligence}`,
        wisdom: sql<number>`${gameCharacters.wisdom} + ${gameCharacterClasses.baseWisdom}`,
        charisma: sql<number>`${gameCharacters.charisma} + ${gameCharacterClasses.baseCharisma}`,
      })
      .from(cohortMemberships)
      .innerJoin(students, eq(students.userId, cohortMemberships.userId))
      .innerJoin(gameCharacters, eq(gameCharacters.studentId, students.id))
      .innerJoin(gameCharacterClasses, eq(gameCharacterClasses.slug, gameCharacters.characterClass))
      .where(eq(cohortMemberships.guildId, guildId));

    if (memberRows.length < 1 || memberRows.length > 3) {
      throw new Error('A guild must have between 1 and 3 students with RPG characters.');
    }

    const [guildRecord] = await this.db
      .select({
        gold: guilds.gold,
      })
      .from(guilds)
      .where(eq(guilds.id, guildId))
      .limit(1);

    if (!guildRecord) {
      throw new Error('Guild not found.');
    }

    return {
      id: guildId,
      gold: guildRecord.gold,
      students: memberRows as GuildStudents,
    };
  }
}

export class RewardService {
  constructor(
    private readonly db: RewardDb,
    private readonly configOverrides?: RewardSystemConfigOverrides
  ) {}

  private static readonly strategies: Record<RewardActivityType, PointStrategy> = {
    strength: new StrengthStrategy(),
    intelligence: new IntelligenceStrategy(),
    wisdom: new WisdomStrategy(),
    dexterity: new DexterityStrategy(),
    constitution: new ConstitutionStrategy(),
    charisma: new CharismaStrategy(),
  };

  static async calculatePreview(
    activityType: RewardActivityType,
    context: CalculationContext,
    configOverrides?: RewardSystemConfigOverrides
  ): Promise<number> {
    const config = RewardSystemConfigService.resolve(
      RewardSystemConfigService.merge(configOverrides, context.config)
    );
    const strategy = this.strategies[activityType];
    const calculatedPoints = await strategy.calculate(context, config);
    const finalPoints = GuildModifiers.charismaBuff(calculatedPoints, context.guild, config);

    return Math.round(finalPoints);
  }

  async calculateReward(input: RewardCalculationInput): Promise<RewardCalculationResult> {
    if (!input.activity.targetAttribute) {
      throw new Error('Activity targetAttribute is required to calculate a reward.');
    }

    const activityType = input.activity.targetAttribute;
    const configOverrides = RewardSystemConfigService.merge(this.configOverrides, input.config);
    const config = RewardSystemConfigService.resolve(configOverrides);

    const guild = await new GuildSnapshotRepository(this.db).getGuild(input.guildId);
    let resolvedActiveDays = input.activeDays;
    const strategy = RewardService.strategies[activityType];
    const calculatedPoints = await strategy.calculate(
      {
        guild,
        guildId: input.guildId,
        studentId: input.studentId,
        basePoints: input.activity.basePoints,
        hoursEarly: input.hoursEarly,
        activeDays: input.activeDays,
        activeDaysRepository: {
          countActiveDays: async (lookup) => {
            const activeDays = await new PointTransactionActiveDaysRepository(this.db).countActiveDays({
              ...lookup,
              now: input.now,
            });
            resolvedActiveDays = activeDays;
            return activeDays;
          },
        },
        config: configOverrides,
      },
      config
    );
    const finalPoints = GuildModifiers.charismaBuff(calculatedPoints, guild, config);
    const amount = Math.round(finalPoints);

    const [updatedGuild] = await this.db
      .update(guilds)
      .set({
        gold: sql`${guilds.gold} + ${amount}`,
        updatedAt: input.now || new Date(),
      })
      .where(eq(guilds.id, input.guildId))
      .returning({ gold: guilds.gold });

    await this.db.insert(pointTransactions).values({
      guildId: input.guildId,
      studentId: input.studentId,
      activityId: input.activity.id,
      amount,
      transactionType: input.transactionType || 'EARNED',
      createdAt: input.now || new Date(),
    });

    return {
      guildId: input.guildId,
      activityId: input.activity.id,
      activityType,
      amount,
      calculatedPoints,
      finalPoints,
      activeDays: resolvedActiveDays,
      balance: updatedGuild.gold,
    };
  }
}

export class VotingCostService {
  constructor(
    private readonly db?: RewardDb,
    private readonly configOverrides?: RewardSystemConfigOverrides
  ) {}

  static buildBreakdown(
    votes: number,
    guildProfile: import('./guild-stat-calculator').GuildStatProfile,
    config: RewardSystemConfig,
    guildId: string,
    studentId?: string,
    balanceConfigVersion?: number,
    alreadyPurchasedVotes?: number
  ): VoteSpendBreakdown {
    return SpendBreakdownBuilder.build({
      votes,
      guildProfile,
      config,
      guildId,
      studentId,
      alreadyPurchasedVotes,
      balanceConfigVersion,
    });
  }

  async previewGuildVotes(input: VoteSpendInput): Promise<VoteSpendBreakdown> {
    if (!this.db) {
      throw new Error('A database client is required to preview guild votes.');
    }

    const balanceConfig = await RewardBalanceConfigService.getActiveConfig(this.db, input.cohortId);
    const guildProfile = await loadGuildStatProfile(this.db, input.guildId, balanceConfig, {
      enforceConfiguredMemberCount: false,
    });
    return SpendBreakdownBuilder.build({
      votes: input.votes,
      guildProfile,
      config: balanceConfig.rewardSystem,
      guildId: input.guildId,
      studentId: input.studentId,
      balanceConfigVersion: balanceConfig.version,
    });
  }

  async spendGuildVotes(input: VoteSpendInput): Promise<VoteSpendResult> {
    if (!this.db) {
      throw new Error('A database client is required to spend guild votes.');
    }

    const balanceConfig = await RewardBalanceConfigService.getActiveConfig(this.db, input.cohortId);
    const config = balanceConfig.rewardSystem;
    const guildProfile = await loadGuildStatProfile(this.db, input.guildId, balanceConfig, {
      enforceConfiguredMemberCount: false,
    });
    const breakdown = SpendBreakdownBuilder.build({
      votes: input.votes,
      guildProfile,
      config,
      guildId: input.guildId,
      studentId: input.studentId,
      alreadyPurchasedVotes: input.alreadyPurchasedVotes,
      balanceConfigVersion: balanceConfig.version,
    });
    const cost = breakdown.finalCost;

    const [guildRecord] = await this.db
      .select({ gold: guilds.gold })
      .from(guilds)
      .where(eq(guilds.id, input.guildId))
      .limit(1);

    if (!guildRecord) {
      throw new Error('Guild not found.');
    }

    if ((guildRecord.gold || 0) < cost) {
      throw new Error('Guild does not have enough gold to buy these votes.');
    }

    const [updatedGuild] = await this.db
      .update(guilds)
      .set({
        gold: sql`${guilds.gold} - ${cost}`,
        updatedAt: new Date(),
      })
      .where(eq(guilds.id, input.guildId))
      .returning({ gold: guilds.gold });

    await this.db.insert(pointTransactions).values({
      guildId: input.guildId,
      studentId: input.studentId,
      amount: -cost,
      transactionType: 'SPENT_VOTE',
    });

    breakdown.balance = updatedGuild.gold;

    const result = {
      guildId: input.guildId,
      votes: input.votes,
      cost,
      balance: updatedGuild.gold,
      breakdown,
    };

    const eventContext = createEventContext({ db: this.db });
    await publishEvent(
      {
        type: 'guild.votes.spent',
        source: 'service.rewards',
        payload: {
          guildId: result.guildId,
          studentId: input.studentId,
          votes: result.votes,
          cost: result.cost,
          balance: result.balance,
        },
      },
      eventContext
    );
    await publishEvent(
      {
        type: 'guild.gold.spent',
        source: 'service.rewards',
        payload: {
          guildId: result.guildId,
          studentId: input.studentId,
          amount: result.cost,
          balance: result.balance,
          reason: 'votes',
          breakdown,
        },
      },
      eventContext
    );
    await publishEvent(
      {
        type: 'progress.boosted',
        source: 'service.rewards',
        payload: {
          guildId: result.guildId,
          studentId: input.studentId,
          votes: result.votes,
          cost: result.cost,
        },
      },
      eventContext
    );

    return result;
  }
}
