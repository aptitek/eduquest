import { Hono } from 'hono';
import { and, desc, eq, or, sql, sum } from 'drizzle-orm';
import { type CohortProgressData } from '@eduquest/shared';
import { getDb } from '../db';
import {
  cohortMemberships,
  cohortProgress,
  gameActivities,
  gameBattles,
  pointTransactions,
  guilds,
  notifications,
  progressMilestones,
  students,
} from '../db/schema';
import { DEBUG_ACTIVITIES, DEBUG_GUILDS } from '../dev/debugBackup';
import type { UserPayload } from '../middleware/auth';
import { isMockDataEnabled } from '../config/runtime';
import { VotingCostService } from '../services/rewards';

type Bindings = {
  APP_ENV?: string;
  ENABLE_MOCK_DATA?: string;
  DATABASE_URL?: string;
};
type Variables = {
  user?: UserPayload;
};

const DEBUG_COHORT_PROGRESS: CohortProgressData = {
  gauge: {
    currentPoints: 460,
    targetPoints: 460,
    labelI18nKey: 'dashboard.dock.milestone',
    milestones: [
      { id: 'spark', labelI18nKey: 'dashboard.milestones.spark.label', descriptionI18nKey: 'dashboard.milestones.spark.description', cost: 12, reward: { id: 'spark-reward', titleI18nKey: 'dashboard.rewards.deadline.title', subtitleI18nKey: 'dashboard.rewards.deadline.subtitle', accentToken: 'campfire' } },
      { id: 'campfire', labelI18nKey: 'dashboard.milestones.campfire.label', descriptionI18nKey: 'dashboard.milestones.campfire.description', cost: 24, reward: { id: 'campfire-reward', titleI18nKey: 'dashboard.rewards.miniGame.title', subtitleI18nKey: 'dashboard.rewards.miniGame.subtitle', accentToken: 'completed' } },
      { id: 'quest', labelI18nKey: 'dashboard.milestones.quest.label', descriptionI18nKey: 'dashboard.milestones.quest.description', cost: 38, reward: { id: 'quest-reward', titleI18nKey: 'dashboard.rewards.techHelp.title', subtitleI18nKey: 'dashboard.rewards.techHelp.subtitle', accentToken: 'quest' } },
      { id: 'rally', labelI18nKey: 'dashboard.milestones.rally.label', descriptionI18nKey: 'dashboard.milestones.rally.description', cost: 52, reward: { id: 'rally-reward', titleI18nKey: 'dashboard.rewards.reroll.title', subtitleI18nKey: 'dashboard.rewards.reroll.subtitle', accentToken: 'specialist' } },
      { id: 'treasure', labelI18nKey: 'dashboard.milestones.treasure.label', descriptionI18nKey: 'dashboard.milestones.treasure.description', cost: 66, reward: { id: 'treasure-reward', titleI18nKey: 'dashboard.milestones.treasure.label', accentToken: 'quest' } },
      { id: 'boss', labelI18nKey: 'dashboard.milestones.boss.label', descriptionI18nKey: 'dashboard.milestones.boss.description', cost: 78, reward: { id: 'boss-reward', titleI18nKey: 'dashboard.milestones.boss.label', accentToken: 'danger' } },
      { id: 'legend', labelI18nKey: 'dashboard.milestones.legend.label', descriptionI18nKey: 'dashboard.milestones.legend.description', cost: 90, reward: { id: 'legend-reward', titleI18nKey: 'dashboard.milestones.legend.label', accentToken: 'specialist' } },
      { id: 'ascend', labelI18nKey: 'dashboard.milestones.ascend.label', descriptionI18nKey: 'dashboard.milestones.ascend.description', cost: 100, reward: { id: 'ascend-reward', titleI18nKey: 'dashboard.milestones.ascend.label', accentToken: 'completed' } },
    ],
  },
  notifications: [
    { id: 'cohort-quest', titleI18nKey: 'dashboard.notifications.cohortQuest.title', descriptionI18nKey: 'dashboard.notifications.cohortQuest.description', icon: 'map', tone: 'info', actionLabelI18nKey: 'dashboard.notifications.cohortQuest.action', actionTarget: 'map' },
    { id: 'cohort-campfire', titleI18nKey: 'dashboard.notifications.cohortCampfire.title', descriptionI18nKey: 'dashboard.notifications.cohortCampfire.description', icon: 'sparkles', tone: 'success', actionLabelI18nKey: 'dashboard.notifications.cohortCampfire.action', actionTarget: 'acknowledge' },
    { id: 'reward-gold', titleI18nKey: 'dashboard.notifications.rewardGold.title', descriptionI18nKey: 'dashboard.notifications.rewardGold.description', icon: 'coins', tone: 'warning', actionLabelI18nKey: 'dashboard.notifications.rewardGold.action', actionTarget: 'collect' },
    { id: 'reward-spend', titleI18nKey: 'dashboard.notifications.rewardSpend.title', descriptionI18nKey: 'dashboard.notifications.rewardSpend.description', icon: 'gift', tone: 'neutral', actionLabelI18nKey: 'dashboard.notifications.rewardSpend.action', actionTarget: 'review' },
  ],
};

export const mapRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

mapRouter.get('/guilds', async (c) => {
  const databaseUrl = c.env?.DATABASE_URL;

  if (!databaseUrl) {
    if (!isMockDataEnabled(c.env)) {
      return c.json({ success: false, error: 'DATABASE_URL is required.' }, 503);
    }

    return c.json({
      success: true,
      source: 'mock',
      guilds: DEBUG_GUILDS,
    });
  }

  try {
    const db = getDb(databaseUrl);
    const guildRecords = await db.select().from(guilds).orderBy(desc(guilds.gold));

    return c.json({
      success: true,
      source: 'database',
      guilds: guildRecords.map((guild) => ({
        id: guild.id,
        cohortId: guild.cohortId,
        name: guild.name,
        description: guild.description || undefined,
        iconUrl: guild.iconUrl || undefined,
        color: guild.color || undefined,
        gold: guild.gold,
        createdAt: guild.createdAt?.toISOString?.(),
        updatedAt: guild.updatedAt?.toISOString?.(),
      })),
    });
  } catch (error: any) {
    console.error('Guild SQL error:', error.message);
    return c.json({ success: false, error: 'Guilds could not be loaded.' }, 500);
  }
});

mapRouter.post('/guilds/:guildId/votes', async (c) => {
  const databaseUrl = c.env?.DATABASE_URL;
  const guildId = c.req.param('guildId');
  const user = c.get('user');

  if (!databaseUrl) {
    return c.json({ success: false, error: 'DATABASE_URL is required.' }, 503);
  }

  let body: { votes?: number };
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }

  const votes = body.votes ?? 1;
  if (!Number.isInteger(votes) || votes <= 0) {
    return c.json({ success: false, error: 'votes must be a positive integer.' }, 400);
  }

  try {
    const db = getDb(databaseUrl);
    const [studentRecord] = user?.id
      ? await db.select().from(students).where(eq(students.userId, user.id)).limit(1)
      : [];

    if (!studentRecord) {
      return c.json({ success: false, error: 'Student profile not found.' }, 404);
    }

    const result = await new VotingCostService(db).spendGuildVotes({
      guildId,
      studentId: studentRecord.id,
      votes,
    });

    return c.json({ success: true, source: 'database', voteSpend: result });
  } catch (error: any) {
    console.error('Guild vote spend SQL error:', error.message);
    return c.json({ success: false, error: error.message || 'Guild vote spend failed.' }, 400);
  }
});

mapRouter.post('/map/activities/:activityId/complete', async (c) => {
  const databaseUrl = c.env?.DATABASE_URL;
  const activityId = c.req.param('activityId');
  const user = c.get('user');

  if (!databaseUrl) {
    if (!isMockDataEnabled(c.env)) {
      return c.json({ success: false, error: 'DATABASE_URL is required.' }, 503);
    }

    return c.json({
      success: true,
      source: 'mock',
      battle: {
        id: `battle_${Date.now()}`,
        studentId: 'debug_student',
        activityId,
        createdAt: new Date().toISOString(),
      },
    });
  }

  try {
    const db = getDb(databaseUrl);
    const [studentRecord] = user?.id
      ? await db.select().from(students).where(eq(students.userId, user.id)).limit(1)
      : [];

    if (!studentRecord) {
      return c.json({ success: false, error: 'Student profile not found.' }, 404);
    }

    const [activity] = await db
      .select()
      .from(gameActivities)
      .where(eq(gameActivities.id, activityId))
      .limit(1);

    if (!activity) {
      return c.json({ success: false, error: 'Activity not found.' }, 404);
    }

    const [existingBattle] = await db
      .select()
      .from(gameBattles)
      .where(and(eq(gameBattles.studentId, studentRecord.id), eq(gameBattles.activityId, activityId)))
      .limit(1);

    if (existingBattle) {
      return c.json({
        success: true,
        source: 'database',
        battle: {
          id: existingBattle.id,
          studentId: existingBattle.studentId,
          activityId: existingBattle.activityId,
          grade: existingBattle.grade || undefined,
          workUrl: existingBattle.workUrl || undefined,
          createdAt: existingBattle.createdAt?.toISOString?.(),
        },
      });
    }

    const [battle] = await db
      .insert(gameBattles)
      .values({
        studentId: studentRecord.id,
        activityId,
        grade: activity.isGraded ? 1 : null,
      })
      .returning();

    const [latestMembership] = await db
      .select()
      .from(cohortMemberships)
      .where(eq(cohortMemberships.userId, studentRecord.userId))
      .orderBy(desc(cohortMemberships.createdAt))
      .limit(1);
    const earnedPoints = activity.basePoints || 0;

    if (earnedPoints > 0 && latestMembership?.guildId) {
      await db
        .update(guilds)
        .set({
          gold: sql`${guilds.gold} + ${earnedPoints}`,
          updatedAt: new Date(),
        })
        .where(eq(guilds.id, latestMembership.guildId));

      await db.insert(pointTransactions).values({
        guildId: latestMembership.guildId,
        studentId: studentRecord.id,
        activityId,
        amount: earnedPoints,
        transactionType: 'EARNED',
      });
    }

    if (earnedPoints > 0 && latestMembership?.cohortId) {
      await db
        .update(cohortProgress)
        .set({
          currentPoints: sql`${cohortProgress.currentPoints} + ${earnedPoints}`,
          updatedAt: new Date(),
        })
        .where(eq(cohortProgress.cohortId, latestMembership.cohortId));
    }

    return c.json({
      success: true,
      source: 'database',
      battle: {
        id: battle.id,
        studentId: battle.studentId,
        activityId: battle.activityId,
        grade: battle.grade || undefined,
        workUrl: battle.workUrl || undefined,
        createdAt: battle.createdAt?.toISOString?.(),
      },
    });
  } catch (error: any) {
    console.error('Activity completion SQL error:', error.message);
    return c.json({ success: false, error: 'Activity completion failed.' }, 500);
  }
});

// GET /api/map : Renvoie la carte des activités (dynamique ou mock)
mapRouter.get('/map', async (c) => {
  const databaseUrl = c.env?.DATABASE_URL;

  // Si aucune URL de base de données n'est spécifiée, on renvoie les mocks
  if (!databaseUrl) {
    if (!isMockDataEnabled(c.env)) {
      return c.json({ success: false, error: 'DATABASE_URL is required.' }, 503);
    }

    return c.json({
      success: true,
      source: 'mock',
      activities: DEBUG_ACTIVITIES,
    });
  }

  try {
    const db = getDb(databaseUrl);
    const activitiesFromDb = await db.select().from(gameActivities);

    if (activitiesFromDb.length === 0) {
      return c.json({ success: true, source: 'database', activities: [] });
    }

    return c.json({
      success: true,
      source: 'database',
      activities: activitiesFromDb.map((act) => ({
        id: act.id,
        type: act.type as any,
        title: act.title,
        startDate: act.startDate || undefined,
        endDate: act.endDate || undefined,
        url: act.url || undefined,
        isGraded: act.isGraded,
        x: act.x,
        y: act.y,
        requiredLevel: act.requiredLevel,
        basePoints: act.basePoints,
        unlockRule: act.unlockRule || undefined,
        bossMetadata: act.bossMetadata || undefined,
      })),
    });
  } catch (error: any) {
    console.error('Map SQL error:', error.message);
    return c.json({ success: false, error: 'Map activities could not be loaded.' }, 500);
  }
});

mapRouter.get('/dashboard', async (c) => {
  const databaseUrl = c.env?.DATABASE_URL;

  if (!databaseUrl) {
    if (!isMockDataEnabled(c.env)) {
      return c.json({ success: false, error: 'DATABASE_URL is required.' }, 503);
    }

    return c.json({ success: true, source: 'mock', progress: DEBUG_COHORT_PROGRESS });
  }

  try {
    const db = getDb(databaseUrl);
    const user = c.get('user');
    const [studentRecord] = user?.id
      ? await db.select().from(students).where(eq(students.userId, user.id)).limit(1)
      : [];
    const [latestMembership] = studentRecord
      ? await db
          .select()
          .from(cohortMemberships)
          .where(eq(cohortMemberships.userId, studentRecord.userId))
          .orderBy(desc(cohortMemberships.createdAt))
          .limit(1)
      : [];

    if (!latestMembership?.cohortId) {
      return c.json({ success: false, error: 'Progress cohort context not found.' }, 404);
    }

    const [progress] = await db
      .select()
      .from(cohortProgress)
      .where(eq(cohortProgress.cohortId, latestMembership.cohortId))
      .limit(1);

    if (!progress) {
      return c.json({ success: false, error: 'Cohort progress not found.' }, 404);
    }

    const notificationScope = latestMembership.guildId
      ? and(
          eq(notifications.cohortId, latestMembership.cohortId),
          or(eq(notifications.guildId, latestMembership.guildId), sql`${notifications.guildId} IS NULL`)
        )
      : and(eq(notifications.cohortId, latestMembership.cohortId), sql`${notifications.guildId} IS NULL`);

    const [milestones, [targetRow], notificationRows] = await Promise.all([
      db
        .select()
        .from(progressMilestones)
        .where(eq(progressMilestones.progressId, progress.id))
        .orderBy(progressMilestones.sortOrder),
      db
        .select({ targetPoints: sum(progressMilestones.cost) })
        .from(progressMilestones)
        .where(eq(progressMilestones.progressId, progress.id)),
      db
        .select()
        .from(notifications)
        .where(notificationScope)
        .orderBy(notifications.sortOrder),
    ]);

    const progressData: CohortProgressData = {
      gauge: {
        currentPoints: progress.currentPoints,
        targetPoints: Number(targetRow?.targetPoints || 0),
        labelI18nKey: progress.labelI18nKey,
        milestones: milestones.map((milestone) => ({
          id: milestone.id,
          labelI18nKey: milestone.labelI18nKey,
          descriptionI18nKey: milestone.descriptionI18nKey || undefined,
          cost: milestone.cost,
          reward: {
            id: `${milestone.id}-reward`,
            titleI18nKey: milestone.rewardTitleI18nKey,
            subtitleI18nKey: milestone.rewardSubtitleI18nKey || undefined,
            accentToken: milestone.rewardAccentToken,
          },
        })),
      },
      notifications: notificationRows.map((notification) => ({
        id: notification.id,
        cohortId: notification.cohortId || undefined,
        guildId: notification.guildId || undefined,
        titleI18nKey: notification.titleI18nKey,
        descriptionI18nKey: notification.descriptionI18nKey || undefined,
        icon: notification.icon,
        tone: notification.tone as CohortProgressData['notifications'][number]['tone'],
        actionLabelI18nKey: notification.actionLabelI18nKey || undefined,
        actionTarget: notification.actionTarget as CohortProgressData['notifications'][number]['actionTarget'],
      })),
    };

    return c.json({ success: true, source: 'database', progress: progressData });
  } catch (error: any) {
    console.error('Progress SQL error:', error.message);
    return c.json({ success: false, error: 'Progress data could not be loaded.' }, 500);
  }
});
