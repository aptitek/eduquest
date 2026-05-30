import { desc } from 'drizzle-orm';
import type {
  DomainEvent,
  DomainEventType,
  RewardNotificationContext,
  VoteSpendNotificationContext,
} from '@eduquest/shared';
import { auditLogs, notifications } from '../../db/schema';
import type { EventContext, EventHandler } from '../context';

const NOTIFICATION_TEMPLATES: Partial<
  Record<
    DomainEventType,
    {
      titleI18nKey: string;
      descriptionI18nKey?: string;
      icon: string;
      tone: string;
      actionLabelI18nKey?: string;
      actionTarget?: string;
    }
  >
> = {
  'github.ci.passed': {
    titleI18nKey: 'dashboard.notifications.cohortQuest.title',
    descriptionI18nKey: 'dashboard.notifications.cohortQuest.description',
    icon: 'map',
    tone: 'success',
    actionLabelI18nKey: 'dashboard.notifications.cohortQuest.action',
    actionTarget: 'map',
  },
  'github.pr.merged': {
    titleI18nKey: 'dashboard.notifications.cohortCampfire.title',
    descriptionI18nKey: 'dashboard.notifications.cohortCampfire.description',
    icon: 'sparkles',
    tone: 'success',
    actionLabelI18nKey: 'dashboard.notifications.cohortCampfire.action',
    actionTarget: 'acknowledge',
  },
};

function resolveNotificationScope(event: DomainEvent): {
  cohortId?: string;
  guildId?: string;
} {
  const payload = event.payload as unknown as Record<string, unknown>;

  return {
    cohortId: typeof payload.cohortId === 'string' ? payload.cohortId : undefined,
    guildId: typeof payload.guildId === 'string' ? payload.guildId : undefined,
  };
}

async function nextNotificationSortOrder(db: EventContext['db']): Promise<number> {
  const [latestNotification] = await db!
    .select({ sortOrder: notifications.sortOrder })
    .from(notifications)
    .orderBy(desc(notifications.sortOrder))
    .limit(1);

  return (latestNotification?.sortOrder ?? 0) + 10;
}

export const auditEventHandler: EventHandler = async (event, context) => {
  if (!context.db) return;

  await context.db.insert(auditLogs).values({
    tableName: 'domain_events',
    recordId: event.id,
    action: event.type,
    newData: {
      source: event.source,
      payload: event.payload,
      metadata: event.metadata,
      occurredAt: event.occurredAt,
    },
    userId: context.userId,
  });
};

export const notificationEventHandler: EventHandler = async (event, context) => {
  if (!context.db) return;

  if (event.type === 'reward.calculated') {
    const payload = event.payload as import('@eduquest/shared').RewardCalculatedPayload;
    const sortOrder = await nextNotificationSortOrder(context.db);
    const notificationContext: RewardNotificationContext = {
      type: 'reward',
      breakdown: payload.breakdown,
    };

    await context.db.insert(notifications).values({
      cohortId: payload.cohortId,
      guildId: payload.guildId,
      titleI18nKey: 'rewards.notification.title',
      descriptionI18nKey: 'rewards.notification.description',
      icon: 'coins',
      tone: 'warning',
      context: notificationContext,
      sortOrder,
    });
    return;
  }

  if (event.type === 'guild.gold.spent') {
    const payload = event.payload as import('@eduquest/shared').GuildGoldSpentPayload;
    if (payload.reason !== 'votes' || !payload.breakdown) {
      return;
    }

    const sortOrder = await nextNotificationSortOrder(context.db);
    const notificationContext: VoteSpendNotificationContext = {
      type: 'vote_spend',
      breakdown: payload.breakdown,
    };

    await context.db.insert(notifications).values({
      guildId: payload.guildId,
      titleI18nKey: 'rewards.spend.notification.title',
      descriptionI18nKey: 'rewards.spend.notification.description',
      icon: 'gift',
      tone: 'neutral',
      actionLabelI18nKey: 'dashboard.notifications.rewardSpend.action',
      actionTarget: 'review',
      context: notificationContext,
      sortOrder,
    });
    return;
  }

  const template = NOTIFICATION_TEMPLATES[event.type];
  if (!template) return;

  const scope = resolveNotificationScope(event);
  const sortOrder = await nextNotificationSortOrder(context.db);

  await context.db.insert(notifications).values({
    cohortId: scope.cohortId,
    guildId: scope.guildId,
    titleI18nKey: template.titleI18nKey,
    descriptionI18nKey: template.descriptionI18nKey,
    icon: template.icon,
    tone: template.tone,
    actionLabelI18nKey: template.actionLabelI18nKey,
    actionTarget: template.actionTarget,
    sortOrder,
  });
};
