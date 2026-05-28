import { eq } from 'drizzle-orm';
import type { RewardBalanceConfigPayload, RewardComputationBreakdown } from '@eduquest/shared';
import { DEFAULT_REWARD_POLICIES } from '@eduquest/shared';
import { gameActivities } from '../db/schema';
import { loadGuildStatProfile } from './guild-profile-loader';
import {
  RewardBalanceConfigService,
  type ResolvedRewardBalanceConfig,
} from './reward-balance-config';
import { RewardPipeline } from './reward-pipeline';
import { PointTransactionActiveDaysRepository, RewardSystemConfigService } from './rewards';

type RewardDb = ReturnType<typeof import('../db').getDb>;

export interface RewardPreviewInput {
  activityId: string;
  studentId: string;
  guildId: string;
  cohortId?: string;
  configOverride?: RewardBalanceConfigPayload;
}

function resolvePreviewConfig(payload: RewardBalanceConfigPayload): ResolvedRewardBalanceConfig {
  const rewardSystem = RewardSystemConfigService.resolve(payload.rewardSystem);
  const policies = { ...DEFAULT_REWARD_POLICIES };

  if (payload.policyIds) {
    for (const [policyId, override] of Object.entries(payload.policyIds) as Array<
      [keyof typeof DEFAULT_REWARD_POLICIES, { fixedBasePoints?: number }]
    >) {
      if (policies[policyId] && override?.fixedBasePoints !== undefined) {
        policies[policyId] = {
          ...policies[policyId],
          fixedBasePoints: override.fixedBasePoints,
        };
      }
    }
  }

  return {
    version: 0,
    label: payload.label || 'Preview',
    rewardSystem,
    policies,
  };
}

export class RewardPreviewService {
  constructor(private readonly db: RewardDb) {}

  async preview(input: RewardPreviewInput): Promise<RewardComputationBreakdown | null> {
    const balanceConfig = input.configOverride
      ? resolvePreviewConfig(input.configOverride)
      : await RewardBalanceConfigService.getActiveConfig(this.db, input.cohortId);

    const [activity] = await this.db
      .select({
        id: gameActivities.id,
        basePoints: gameActivities.basePoints,
        targetAttribute: gameActivities.targetAttribute,
        endDate: gameActivities.endDate,
        metadata: gameActivities.metadata,
      })
      .from(gameActivities)
      .where(eq(gameActivities.id, input.activityId))
      .limit(1);

    if (!activity) {
      return null;
    }

    const policy = balanceConfig.policies['activity.validated'];
    let guildProfile;
    try {
      guildProfile = await loadGuildStatProfile(this.db, input.guildId, balanceConfig);
    } catch (error) {
      if (error instanceof Error && error.message.includes('A guild must have between')) {
        throw new Error('Guild has no eligible RPG members for reward preview.');
      }
      throw error;
    }
    const metadata = (activity.metadata || {}) as Record<string, unknown>;
    const difficultyRaw = metadata.difficulty;
    const difficulty =
      difficultyRaw === 1 || difficultyRaw === 2 || difficultyRaw === 3
        ? difficultyRaw
        : undefined;

    return RewardPipeline.compute({
      guildProfile,
      studentId: input.studentId,
      cohortId: input.cohortId,
      activityId: activity.id,
      trigger: 'activity.validated',
      policy: {
        ...policy,
        primaryStrategy: activity.targetAttribute,
      },
      basePoints: activity.basePoints,
      targetAttribute: activity.targetAttribute,
      difficulty: policy.difficultyMultiplier ? difficulty : undefined,
      hoursEarly: activity.endDate
        ? Math.max(0, (activity.endDate.getTime() - Date.now()) / 3_600_000)
        : undefined,
      activeDaysRepository: new PointTransactionActiveDaysRepository(this.db),
      balanceConfig,
    });
  }
}
