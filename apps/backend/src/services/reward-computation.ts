import type { DomainEvent, DomainEventType } from '@eduquest/shared';
import { and, eq, sql } from 'drizzle-orm';
import {
  cohortProgress,
  gameActivities,
  guilds,
  pointTransactions,
} from '../db/schema';
import { createEventContext, publishEvent } from '../events';
import { RewardBreakdownBuilder } from './reward-breakdown';
import {
  GuildSnapshotRepository,
  PointTransactionActiveDaysRepository,
  type RewardActivityInput,
} from './rewards';

type RewardDb = ReturnType<typeof import('../db').getDb>;

const REWARD_TRIGGER_EVENTS = [
  'activity.completed',
  'activity.validated',
  'github.ci.passed',
  'github.pr.merged',
] as const satisfies readonly DomainEventType[];

export type RewardTriggerEvent = (typeof REWARD_TRIGGER_EVENTS)[number];

export interface ResolvedRewardTrigger {
  trigger: RewardTriggerEvent;
  guildId: string;
  cohortId?: string;
  studentId?: string;
  activityId?: string;
  activity?: RewardActivityInput;
  basePoints?: number;
}

export class RewardComputationService {
  constructor(private readonly db: RewardDb) {}

  static isRewardTrigger(eventType: DomainEventType): eventType is RewardTriggerEvent {
    return (REWARD_TRIGGER_EVENTS as readonly string[]).includes(eventType);
  }

  async processEvent(event: DomainEvent<RewardTriggerEvent>): Promise<boolean> {
    const resolved = await this.resolveTrigger(event);
    if (!resolved) {
      return false;
    }

    if (resolved.activityId && resolved.studentId) {
      const [existingTransaction] = await this.db
        .select({ id: pointTransactions.id })
        .from(pointTransactions)
        .where(
          and(
            eq(pointTransactions.activityId, resolved.activityId),
            eq(pointTransactions.studentId, resolved.studentId),
            eq(pointTransactions.transactionType, 'EARNED')
          )
        )
        .limit(1);

      if (existingTransaction) {
        return false;
      }
    }

    const guild = await new GuildSnapshotRepository(this.db).getGuild(resolved.guildId);
    const activity = resolved.activity || {
      id: resolved.activityId || `event:${event.id}`,
      basePoints: resolved.basePoints || 0,
      targetAttribute: null,
    };

    const breakdown = await RewardBreakdownBuilder.build({
      guild,
      guildId: resolved.guildId,
      studentId: resolved.studentId,
      cohortId: resolved.cohortId,
      activity,
      trigger: resolved.trigger,
      activeDaysRepository: new PointTransactionActiveDaysRepository(this.db),
    });

    if (breakdown.finalAmount <= 0) {
      return false;
    }

    const balance = await this.db.transaction(async (tx) => {
      const [updatedGuild] = await tx
        .update(guilds)
        .set({
          gold: sql`${guilds.gold} + ${breakdown.finalAmount}`,
          updatedAt: new Date(),
        })
        .where(eq(guilds.id, resolved.guildId))
        .returning({ gold: guilds.gold });

      await tx.insert(pointTransactions).values({
        guildId: resolved.guildId,
        studentId: resolved.studentId,
        activityId: resolved.activityId,
        amount: breakdown.finalAmount,
        transactionType: 'EARNED',
      });

      if (resolved.cohortId) {
        await tx
          .update(cohortProgress)
          .set({
            currentPoints: sql`${cohortProgress.currentPoints} + ${breakdown.finalAmount}`,
            updatedAt: new Date(),
          })
          .where(eq(cohortProgress.cohortId, resolved.cohortId));
      }

      return updatedGuild.gold;
    });

    breakdown.balance = balance;

    const eventContext = createEventContext({ db: this.db });
    await publishEvent(
      {
        type: 'reward.calculated',
        source: 'service.reward-computation',
        payload: {
          guildId: resolved.guildId,
          cohortId: resolved.cohortId,
          activityId: resolved.activityId,
          studentId: resolved.studentId,
          trigger: resolved.trigger,
          breakdown,
          balance,
        },
      },
      eventContext
    );

    return true;
  }

  private async resolveTrigger(
    event: DomainEvent<RewardTriggerEvent>
  ): Promise<ResolvedRewardTrigger | null> {
    switch (event.type) {
      case 'activity.completed':
      case 'activity.validated': {
        const payload = event.payload as
          | import('@eduquest/shared').ActivityCompletedPayload
          | import('@eduquest/shared').ActivityValidatedPayload;
        if (!payload.guildId) {
          return null;
        }

        const [activity] = await this.db
          .select({
            id: gameActivities.id,
            basePoints: gameActivities.basePoints,
            targetAttribute: gameActivities.targetAttribute,
          })
          .from(gameActivities)
          .where(eq(gameActivities.id, payload.activityId))
          .limit(1);

        if (!activity) {
          return null;
        }

        return {
          trigger: event.type,
          guildId: payload.guildId,
          cohortId: payload.cohortId,
          studentId: payload.studentId,
          activityId: payload.activityId,
          activity: {
            id: activity.id,
            basePoints: activity.basePoints,
            targetAttribute: activity.targetAttribute,
          },
        };
      }
      case 'github.ci.passed':
      case 'github.pr.merged': {
        return null;
      }
      default:
        return null;
    }
  }
}
