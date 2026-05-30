import type { DomainEvent } from '@eduquest/shared';
import { and, eq, sql } from 'drizzle-orm';
import { cohortProgress, guilds, pointTransactions } from '../db/schema';
import { createEventContext, publishEvent } from '../events';
import { RewardBalanceConfigService } from './reward-balance-config';
import { RewardContextResolver } from './reward-context-resolver';
import { RewardPipeline } from './reward-pipeline';
import { isRewardTriggerEvent, RewardPolicyRegistry } from './reward-policy-registry';
import { PointTransactionActiveDaysRepository } from './rewards';

type RewardDb = ReturnType<typeof import('../db').getDb>;

export class RewardComputationService {
  constructor(private readonly db: RewardDb) {}

  static isRewardTrigger = isRewardTriggerEvent;

  async processEvent(event: DomainEvent): Promise<boolean> {
    if (!isRewardTriggerEvent(event.type)) {
      return false;
    }

    const eventCohortId =
      event.payload && typeof event.payload === 'object' && 'cohortId' in event.payload
        ? String(event.payload.cohortId || '')
        : undefined;
    const balanceConfig = await RewardBalanceConfigService.getActiveConfig(this.db, eventCohortId);
    const policyRegistry = RewardPolicyRegistry.fromBalanceConfig(balanceConfig);
    const policy = policyRegistry.resolveForEvent(event);

    if (!policy) {
      return false;
    }

    const context = await new RewardContextResolver(this.db, balanceConfig).resolve(event, policy);
    if (!context) {
      return false;
    }

    if (context.activityId && context.studentId) {
      const [existingTransaction] = await this.db
        .select({ id: pointTransactions.id })
        .from(pointTransactions)
        .where(
          and(
            eq(pointTransactions.activityId, context.activityId),
            eq(pointTransactions.studentId, context.studentId),
            eq(pointTransactions.transactionType, 'EARNED')
          )
        )
        .limit(1);

      if (existingTransaction) {
        return false;
      }
    }

    const breakdown = await RewardPipeline.compute({
      guildProfile: context.guildProfile,
      studentId: context.studentId,
      cohortId: context.cohortId,
      activityId: context.activityId,
      trigger: event.type,
      policy: context.policy,
      basePoints: context.basePoints,
      targetAttribute: context.targetAttribute,
      difficulty: context.difficulty,
      hoursEarly: context.hoursEarly,
      activeDaysRepository: new PointTransactionActiveDaysRepository(this.db),
      balanceConfig,
    });

    if (breakdown.finalAmount <= 0) {
      return false;
    }

    const [updatedGuild] = await this.db
      .update(guilds)
      .set({
        gold: sql`${guilds.gold} + ${breakdown.finalAmount}`,
        updatedAt: new Date(),
      })
      .where(eq(guilds.id, context.guildId))
      .returning({ gold: guilds.gold });

    await this.db.insert(pointTransactions).values({
      guildId: context.guildId,
      studentId: context.studentId,
      activityId: context.activityId,
      amount: breakdown.finalAmount,
      transactionType: 'EARNED',
    });

    if (context.cohortId) {
      const [existingProgress] = await this.db
        .select({ id: cohortProgress.id })
        .from(cohortProgress)
        .where(eq(cohortProgress.cohortId, context.cohortId))
        .limit(1);

      if (!existingProgress) {
        await this.db.insert(cohortProgress).values({
          cohortId: context.cohortId,
          labelI18nKey: 'dashboard.dock.milestone',
        });
      }

      await this.db
        .update(cohortProgress)
        .set({
          currentPoints: sql`${cohortProgress.currentPoints} + ${breakdown.finalAmount}`,
          updatedAt: new Date(),
        })
        .where(eq(cohortProgress.cohortId, context.cohortId));
    }

    const balance = updatedGuild.gold;

    breakdown.balance = balance;

    await publishEvent(
      {
        type: 'reward.calculated',
        source: 'service.reward-computation',
        payload: {
          guildId: context.guildId,
          cohortId: context.cohortId,
          activityId: context.activityId,
          studentId: context.studentId,
          trigger: event.type,
          breakdown,
          balance,
        },
      },
      createEventContext({ db: this.db })
    );

    return true;
  }
}
