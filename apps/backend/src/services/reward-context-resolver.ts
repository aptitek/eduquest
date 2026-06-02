import type { DomainEvent, RewardPolicy } from '@eduquest/shared';
import { eq } from 'drizzle-orm';
import {
  cohortMemberships,
  gameActivities,
  gameCharacterClasses,
  gameCharacters,
  students,
  users,
} from '../db/schema';
import {
  CharacterStatCalculator,
  type ClassBaseStatInput,
  type ManualStatInput,
} from './character-stat-calculator';
import { GuildStatCalculator, type GuildStatProfile } from './guild-stat-calculator';
import type { ResolvedRewardBalanceConfig } from './reward-balance-config';
import type { RewardActivityInput } from './rewards';

type RewardDb = ReturnType<typeof import('../db').getDb>;
const GUILD_CREATION_ONBOARDING_REWARD_ACTION = 'guild_created';
const FIRST_GUILD_CREATION_BONUS_BASE_POINTS = 0;
const FIRST_GUILD_CREATION_BONUS_HOURS_EARLY = 168;

export interface ResolvedRewardContext {
  guildId: string;
  cohortId?: string;
  studentId?: string;
  activityId?: string;
  activity?: RewardActivityInput;
  guildProfile: GuildStatProfile;
  policy: RewardPolicy;
  basePoints: number;
  targetAttribute: RewardActivityInput['targetAttribute'];
  difficulty?: 1 | 2 | 3;
  hoursEarly?: number;
}

export interface GuildProfileLoadOptions {
  enforceConfiguredMemberCount?: boolean;
}

export class RewardContextResolver {
  constructor(
    private readonly db: RewardDb,
    private readonly balanceConfig: ResolvedRewardBalanceConfig
  ) {}

  async resolve(event: DomainEvent, policy: RewardPolicy): Promise<ResolvedRewardContext | null> {
    switch (event.type) {
      case 'activity.validated':
        return this.resolveActivityEvent(event as DomainEvent<'activity.validated'>, policy);
      case 'github.ci.passed':
      case 'github.pr.reviewed':
      case 'github.pr.merged':
        return this.resolveGitHubEvent(event, policy);
      default:
        return null;
    }
  }

  private async resolveActivityEvent(
    event: DomainEvent<'activity.validated'>,
    policy: RewardPolicy
  ): Promise<ResolvedRewardContext | null> {
    const payload = event.payload;
    if (!payload.guildId) {
      return null;
    }

    const [activity] = await this.db
      .select({
        id: gameActivities.id,
        basePoints: gameActivities.basePoints,
        targetAttribute: gameActivities.targetAttribute,
        endDate: gameActivities.endDate,
        metadata: gameActivities.metadata,
      })
      .from(gameActivities)
      .where(eq(gameActivities.id, payload.activityId))
      .limit(1);

    if (!activity) {
      return null;
    }

    const metadata = (activity.metadata || {}) as Record<string, unknown>;
    if (!isRewardableOnboardingActivity(metadata, event.metadata)) {
      return null;
    }

    const guildProfile = await this.loadGuildProfileOrNull(payload.guildId);
    if (!guildProfile) {
      return null;
    }
    const difficultyRaw = metadata.difficulty;
    const difficulty =
      difficultyRaw === 1 || difficultyRaw === 2 || difficultyRaw === 3
        ? difficultyRaw
        : undefined;
    const isFirstGuildBonus = isFirstGuildCreationBonus(metadata, event.metadata);

    let basePoints = activity.basePoints;
    if (policy.basePointsSource === 'fixed' && policy.fixedBasePoints !== undefined) {
      basePoints = policy.fixedBasePoints;
    }
    if (isFirstGuildBonus) {
      basePoints = FIRST_GUILD_CREATION_BONUS_BASE_POINTS;
    }
    const targetAttribute: RewardActivityInput['targetAttribute'] = isFirstGuildBonus
      ? 'dexterity'
      : activity.targetAttribute;
    const hoursEarly = activity.endDate
      ? Math.max(0, (activity.endDate.getTime() - Date.now()) / 3_600_000)
      : undefined;

    return {
      guildId: payload.guildId,
      cohortId: payload.cohortId,
      studentId: payload.studentId,
      activityId: payload.activityId,
      activity: {
        id: activity.id,
        basePoints,
        targetAttribute,
      },
      guildProfile,
      policy,
      basePoints,
      targetAttribute,
      difficulty: policy.difficultyMultiplier ? difficulty : undefined,
      hoursEarly: isFirstGuildBonus ? FIRST_GUILD_CREATION_BONUS_HOURS_EARLY : hoursEarly,
    };
  }

  private async resolveGitHubEvent(
    event: DomainEvent,
    policy: RewardPolicy
  ): Promise<ResolvedRewardContext | null> {
    const payload = event.payload as {
      authorLogin?: string;
      reviewerLogin?: string;
    };

    const login = payload.reviewerLogin || payload.authorLogin;
    if (!login) {
      return null;
    }

    const [userRecord] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.githubUsername, login))
      .limit(1);

    if (!userRecord) {
      return null;
    }

    const [studentRecord] = await this.db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.userId, userRecord.id))
      .limit(1);

    if (!studentRecord) {
      return null;
    }

    const [membership] = await this.db
      .select()
      .from(cohortMemberships)
      .where(eq(cohortMemberships.userId, userRecord.id))
      .limit(1);

    if (!membership?.guildId || !membership.cohortId) {
      return null;
    }

    const guildProfile = await this.loadGuildProfileOrNull(membership.guildId);
    if (!guildProfile) {
      return null;
    }
    const basePoints = policy.fixedBasePoints || 0;

    return {
      guildId: membership.guildId,
      cohortId: membership.cohortId,
      studentId: studentRecord.id,
      guildProfile,
      policy,
      basePoints,
      targetAttribute: policy.primaryStrategy,
    };
  }

  async loadGuildProfile(
    guildId: string,
    options: GuildProfileLoadOptions = {}
  ): Promise<GuildStatProfile> {
    const memberRows = await this.db
      .select({
        studentId: students.id,
        baseStrength: gameCharacterClasses.baseStrength,
        baseDexterity: gameCharacterClasses.baseDexterity,
        baseConstitution: gameCharacterClasses.baseConstitution,
        baseIntelligence: gameCharacterClasses.baseIntelligence,
        baseWisdom: gameCharacterClasses.baseWisdom,
        baseCharisma: gameCharacterClasses.baseCharisma,
        manualStrength: gameCharacters.strength,
        manualDexterity: gameCharacters.dexterity,
        manualConstitution: gameCharacters.constitution,
        manualIntelligence: gameCharacters.intelligence,
        manualWisdom: gameCharacters.wisdom,
        manualCharisma: gameCharacters.charisma,
      })
      .from(cohortMemberships)
      .innerJoin(students, eq(students.userId, cohortMemberships.userId))
      .innerJoin(gameCharacters, eq(gameCharacters.studentId, students.id))
      .innerJoin(gameCharacterClasses, eq(gameCharacterClasses.slug, gameCharacters.characterClass))
      .where(eq(cohortMemberships.guildId, guildId));

    if (
      options.enforceConfiguredMemberCount !== false &&
      (memberRows.length < 1 || memberRows.length > 3)
    ) {
      throw new Error('A guild must have between 1 and 3 students with RPG characters.');
    }

    const members: GuildStatProfile['members'] = {};

    for (const row of memberRows) {
      const classBase: ClassBaseStatInput = {
        strength: row.baseStrength,
        dexterity: row.baseDexterity,
        constitution: row.baseConstitution,
        intelligence: row.baseIntelligence,
        wisdom: row.baseWisdom,
        charisma: row.baseCharisma,
      };
      const manual: ManualStatInput = {
        strength: row.manualStrength,
        dexterity: row.manualDexterity,
        constitution: row.manualConstitution,
        intelligence: row.manualIntelligence,
        wisdom: row.manualWisdom,
        charisma: row.manualCharisma,
      };

      members[row.studentId] = CharacterStatCalculator.compute(
        classBase,
        manual,
        this.balanceConfig.rewardSystem
      );
    }

    return GuildStatCalculator.compute(guildId, members, this.balanceConfig.rewardSystem);
  }

  private async loadGuildProfileOrNull(guildId: string): Promise<GuildStatProfile | null> {
    try {
      return await this.loadGuildProfile(guildId);
    } catch (error) {
      if (error instanceof Error && error.message.includes('A guild must have between')) {
        return null;
      }
      throw error;
    }
  }
}

function isRewardableOnboardingActivity(
  activityMetadata: Record<string, unknown>,
  eventMetadata?: Record<string, unknown>
) {
  const onboardingTask = activityMetadata.onboardingTask;
  if (typeof onboardingTask !== 'string') return true;

  return isFirstGuildCreationBonus(activityMetadata, eventMetadata);
}

function isFirstGuildCreationBonus(
  activityMetadata: Record<string, unknown>,
  eventMetadata?: Record<string, unknown>
) {
  return (
    activityMetadata.onboardingTask === 'guild_rally' &&
    eventMetadata?.onboardingRewardAction === GUILD_CREATION_ONBOARDING_REWARD_ACTION &&
    eventMetadata.firstGuildBonus === true
  );
}
