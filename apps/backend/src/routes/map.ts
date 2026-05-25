import { Hono } from 'hono';
import { desc, eq } from 'drizzle-orm';
import { type DashboardData } from '@eduquest/shared';
import { getDb } from '../db';
import {
  cohortRewardCards,
  dashboardNotifications,
  gameActivities,
  gameBattles,
  guilds,
  globalGaugeMilestones,
  globalGauges,
  studentCohorts,
  students,
} from '../db/schema';
import { DEBUG_ACTIVITIES, DEBUG_GUILDS } from '../dev/debugBackup';
import type { UserPayload } from '../middleware/auth';

type Bindings = {
  DATABASE_URL: string;
};
type Variables = {
  user?: UserPayload;
};

const DEBUG_DASHBOARD: DashboardData = {
  gauge: {
    currentPoints: 460,
    targetPoints: 1000,
    labelI18nKey: 'dashboard.dock.milestone',
    milestones: [
      { id: 'spark', labelI18nKey: 'dashboard.milestones.spark.label', descriptionI18nKey: 'dashboard.milestones.spark.description', positionPercent: 12 },
      { id: 'campfire', labelI18nKey: 'dashboard.milestones.campfire.label', descriptionI18nKey: 'dashboard.milestones.campfire.description', positionPercent: 24 },
      { id: 'quest', labelI18nKey: 'dashboard.milestones.quest.label', descriptionI18nKey: 'dashboard.milestones.quest.description', positionPercent: 38 },
      { id: 'rally', labelI18nKey: 'dashboard.milestones.rally.label', descriptionI18nKey: 'dashboard.milestones.rally.description', positionPercent: 52 },
      { id: 'treasure', labelI18nKey: 'dashboard.milestones.treasure.label', descriptionI18nKey: 'dashboard.milestones.treasure.description', positionPercent: 66 },
      { id: 'boss', labelI18nKey: 'dashboard.milestones.boss.label', descriptionI18nKey: 'dashboard.milestones.boss.description', positionPercent: 78 },
      { id: 'legend', labelI18nKey: 'dashboard.milestones.legend.label', descriptionI18nKey: 'dashboard.milestones.legend.description', positionPercent: 90 },
      { id: 'ascend', labelI18nKey: 'dashboard.milestones.ascend.label', descriptionI18nKey: 'dashboard.milestones.ascend.description', positionPercent: 100 },
    ],
  },
  rewards: [
    { id: 'deadline', titleI18nKey: 'dashboard.rewards.deadline.title', subtitleI18nKey: 'dashboard.rewards.deadline.subtitle', accentToken: 'campfire' },
    { id: 'mini-game', titleI18nKey: 'dashboard.rewards.miniGame.title', subtitleI18nKey: 'dashboard.rewards.miniGame.subtitle', accentToken: 'completed' },
    { id: 'tech-help', titleI18nKey: 'dashboard.rewards.techHelp.title', subtitleI18nKey: 'dashboard.rewards.techHelp.subtitle', accentToken: 'quest' },
    { id: 'reroll', titleI18nKey: 'dashboard.rewards.reroll.title', subtitleI18nKey: 'dashboard.rewards.reroll.subtitle', accentToken: 'specialist' },
  ],
  notifications: [
    { id: 'cohort-quest', titleI18nKey: 'dashboard.notifications.cohortQuest.title', descriptionI18nKey: 'dashboard.notifications.cohortQuest.description', metaI18nKey: 'dashboard.notifications.cohortQuest.meta', icon: 'map', tone: 'info', actionLabelI18nKey: 'dashboard.notifications.cohortQuest.action', actionTarget: 'map' },
    { id: 'cohort-campfire', titleI18nKey: 'dashboard.notifications.cohortCampfire.title', descriptionI18nKey: 'dashboard.notifications.cohortCampfire.description', metaI18nKey: 'dashboard.notifications.cohortCampfire.meta', icon: 'sparkles', tone: 'success', actionLabelI18nKey: 'dashboard.notifications.cohortCampfire.action', actionTarget: 'acknowledge' },
    { id: 'reward-gold', titleI18nKey: 'dashboard.notifications.rewardGold.title', descriptionI18nKey: 'dashboard.notifications.rewardGold.description', metaI18nKey: 'dashboard.notifications.rewardGold.meta', icon: 'coins', tone: 'warning', actionLabelI18nKey: 'dashboard.notifications.rewardGold.action', actionTarget: 'collect' },
    { id: 'reward-spend', titleI18nKey: 'dashboard.notifications.rewardSpend.title', descriptionI18nKey: 'dashboard.notifications.rewardSpend.description', metaI18nKey: 'dashboard.notifications.rewardSpend.meta', icon: 'gift', tone: 'neutral', actionLabelI18nKey: 'dashboard.notifications.rewardSpend.action', actionTarget: 'review' },
  ],
};

export const mapRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

mapRouter.get('/guilds', async (c) => {
  const databaseUrl = c.env?.DATABASE_URL;

  if (!databaseUrl) {
    return c.json({
      success: true,
      source: 'mock',
      guilds: DEBUG_GUILDS,
    });
  }

  try {
    const db = getDb(databaseUrl);
    const guildRecords = await db.select().from(guilds).orderBy(desc(guilds.totalPoints));

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
        totalPoints: guild.totalPoints,
        createdAt: guild.createdAt?.toISOString?.(),
        updatedAt: guild.updatedAt?.toISOString?.(),
      })),
    });
  } catch (error: any) {
    console.error('Guild SQL error:', error.message);
    return c.json({ success: false, error: 'Guilds could not be loaded.' }, 500);
  }
});

mapRouter.post('/map/activities/:activityId/complete', async (c) => {
  const databaseUrl = c.env?.DATABASE_URL;
  const activityId = c.req.param('activityId');
  const user = c.get('user');

  if (!databaseUrl) {
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

    const [battle] = await db
      .insert(gameBattles)
      .values({
        studentId: studentRecord.id,
        activityId,
        grade: activity.isGraded ? 1 : null,
      })
      .returning();

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
      return c.json({
        success: true,
        source: 'mock_fallback',
        activities: DEBUG_ACTIVITIES,
      });
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
    console.error('Erreur SQL, repli vers les données mocks:', error.message);
    return c.json({
      success: true,
      source: 'mock_error_fallback',
      warning: 'Erreur SQL, renvoi des fausses données de secours.',
      activities: DEBUG_ACTIVITIES,
    });
  }
});

mapRouter.get('/dashboard', async (c) => {
  const databaseUrl = c.env?.DATABASE_URL;

  if (!databaseUrl) {
    return c.json({ success: true, source: 'mock', dashboard: DEBUG_DASHBOARD });
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
          .from(studentCohorts)
          .where(eq(studentCohorts.studentId, studentRecord.id))
          .orderBy(desc(studentCohorts.createdAt))
          .limit(1)
      : [];

    if (!latestMembership?.cohortId) {
      return c.json({ success: true, source: 'mock_fallback', dashboard: DEBUG_DASHBOARD });
    }

    const [gauge] = await db
      .select()
      .from(globalGauges)
      .where(eq(globalGauges.cohortId, latestMembership.cohortId))
      .limit(1);

    if (!gauge) {
      return c.json({ success: true, source: 'mock_fallback', dashboard: DEBUG_DASHBOARD });
    }

    const [milestones, rewards, notifications] = await Promise.all([
      db
        .select()
        .from(globalGaugeMilestones)
        .where(eq(globalGaugeMilestones.gaugeId, gauge.id))
        .orderBy(globalGaugeMilestones.sortOrder),
      db
        .select()
        .from(cohortRewardCards)
        .where(eq(cohortRewardCards.cohortId, latestMembership.cohortId))
        .orderBy(cohortRewardCards.sortOrder),
      db
        .select()
        .from(dashboardNotifications)
        .where(eq(dashboardNotifications.cohortId, latestMembership.cohortId))
        .orderBy(dashboardNotifications.sortOrder),
    ]);

    const dashboard: DashboardData = {
      gauge: {
        currentPoints: gauge.currentPoints,
        targetPoints: gauge.targetPoints,
        labelI18nKey: gauge.milestoneName,
        milestones: milestones.map((milestone) => ({
          id: milestone.id,
          labelI18nKey: milestone.labelI18nKey,
          descriptionI18nKey: milestone.descriptionI18nKey || undefined,
          positionPercent: milestone.positionPercent || undefined,
          value: milestone.value || undefined,
        })),
      },
      rewards: rewards.map((reward) => ({
        id: reward.id,
        titleI18nKey: reward.titleI18nKey,
        subtitleI18nKey: reward.subtitleI18nKey || undefined,
        accentToken: reward.accentToken,
        faceDown: reward.faceDown,
      })),
      notifications: notifications.map((notification) => ({
        id: notification.id,
        titleI18nKey: notification.titleI18nKey,
        descriptionI18nKey: notification.descriptionI18nKey || undefined,
        metaI18nKey: notification.metaI18nKey || undefined,
        icon: notification.icon as DashboardData['notifications'][number]['icon'],
        tone: notification.tone as DashboardData['notifications'][number]['tone'],
        actionLabelI18nKey: notification.actionLabelI18nKey || undefined,
        actionTarget: notification.actionTarget as DashboardData['notifications'][number]['actionTarget'],
      })),
    };

    return c.json({ success: true, source: 'database', dashboard });
  } catch (error: any) {
    console.error('Dashboard SQL error, falling back to mock data:', error.message);
    return c.json({ success: true, source: 'mock_error_fallback', dashboard: DEBUG_DASHBOARD });
  }
});
