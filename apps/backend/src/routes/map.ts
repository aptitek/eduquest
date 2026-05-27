import { Hono } from 'hono';
import { and, desc, eq, or, sql, sum } from 'drizzle-orm';
import {
  type Activity,
  type CohortProgressData,
  type GameActivityCompletion,
  type GameActivityCompletionType,
  type GameActivityEdge,
  type GameCharacterMove,
  type GameMapData,
  type GameMapRun,
} from '@eduquest/shared';
import { getDb } from '../db';
import {
  gameActivityCompletions,
  gameActivityEdges,
  gameCharacterMoves,
  cohortMemberships,
  cohortProgress,
  gameActivities,
  gameMapRuns,
  guilds,
  notifications,
  progressMilestones,
  students,
} from '../db/schema';
import {
  DEBUG_ACTIVITIES,
  DEBUG_ACTIVITY_EDGES,
  DEBUG_GUILDS,
  DEBUG_MAP_RUN,
} from '../dev/debugBackup';
import type { UserPayload } from '../middleware/auth';
import { isMockDataEnabled } from '../config/runtime';
import { createEventContext, publishEvent } from '../events';
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

type ActivityRecord = typeof gameActivities.$inferSelect;
type ActivityEdgeRecord = typeof gameActivityEdges.$inferSelect;
type ActivityCompletionRecord = typeof gameActivityCompletions.$inferSelect;
type CharacterMoveRecord = typeof gameCharacterMoves.$inferSelect;
type MapRunRecord = typeof gameMapRuns.$inferSelect;
type CohortMembershipRecord = typeof cohortMemberships.$inferSelect;
type StudentRecord = typeof students.$inferSelect;

function toIsoString(value?: Date | null) {
  return value?.toISOString?.();
}

function toMapRun(record: MapRunRecord): GameMapRun {
  return {
    id: record.id,
    cohortId: record.cohortId,
    currentSectorDepth: record.currentSectorDepth,
    fogRevealDepth: record.fogRevealDepth,
    status: record.status,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
  };
}

function toActivityEdge(record: ActivityEdgeRecord): GameActivityEdge {
  return {
    id: record.id,
    cohortId: record.cohortId || undefined,
    mapRunId: record.mapRunId || undefined,
    fromActivityId: record.fromActivityId,
    toActivityId: record.toActivityId,
    metadata: (record.metadata || {}) as Record<string, unknown>,
    createdAt: toIsoString(record.createdAt),
  };
}

function toActivityCompletion(record: ActivityCompletionRecord): GameActivityCompletion {
  return {
    id: record.id,
    studentId: record.studentId,
    cohortId: record.cohortId,
    activityId: record.activityId,
    completionType: record.completionType,
    grade: record.grade || undefined,
    workUrl: record.workUrl || undefined,
    metadata: (record.metadata || {}) as Record<string, unknown>,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
  };
}

function toCharacterMove(record: CharacterMoveRecord): GameCharacterMove {
  return {
    id: record.id,
    studentId: record.studentId,
    cohortId: record.cohortId,
    mapRunId: record.mapRunId,
    fromActivityId: record.fromActivityId || undefined,
    toActivityId: record.toActivityId,
    moveType: record.moveType,
    metadata: (record.metadata || {}) as Record<string, unknown>,
    createdAt: toIsoString(record.createdAt),
  };
}

function getCompletionType(activity: Pick<ActivityRecord, 'type' | 'isGraded'>): GameActivityCompletionType {
  if (activity.type === 'boss' || activity.type === 'mini_boss') return 'battle';
  if (activity.isGraded) return 'submission';
  return 'read';
}

function toActivity(
  record: ActivityRecord,
  state: Pick<Activity, 'isCompleted' | 'isRevealed' | 'isStormed' | 'isLocked' | 'isCurrent'>
): Activity {
  return {
    id: record.id,
    cohortId: record.cohortId || undefined,
    templateActivityId: record.templateActivityId || undefined,
    mapRunId: record.mapRunId || undefined,
    type: record.type,
    title: record.title,
    startDate: toIsoString(record.startDate),
    endDate: toIsoString(record.endDate),
    url: record.url || undefined,
    isGraded: record.isGraded,
    mapX: record.mapX,
    mapY: record.mapY,
    sectorDepth: record.sectorDepth,
    requiredLevel: record.requiredLevel,
    basePoints: record.basePoints,
    metadata: (record.metadata || {}) as Activity['metadata'],
    createdAt: toIsoString(record.createdAt),
    ...state,
  };
}

function buildMapData(
  run: GameMapRun,
  activityRecords: ActivityRecord[],
  edges: GameActivityEdge[],
  completions: GameActivityCompletion[],
  currentMove?: GameCharacterMove
): GameMapData {
  const completedActivityIds = new Set(completions.map((completion) => completion.activityId));
  const currentActivityId = currentMove?.toActivityId;
  const activityIds = new Set(activityRecords.map((activity) => activity.id));
  const incomingByActivity = new Map<string, string[]>();

  for (const edge of edges) {
    if (!activityIds.has(edge.fromActivityId) || !activityIds.has(edge.toActivityId)) continue;
    const incoming = incomingByActivity.get(edge.toActivityId) || [];
    incoming.push(edge.fromActivityId);
    incomingByActivity.set(edge.toActivityId, incoming);
  }

  const activities = activityRecords.map((activity) => {
    const prerequisites = incomingByActivity.get(activity.id) || [];
    const isCompleted = completedActivityIds.has(activity.id);
    const prerequisitesCompleted = prerequisites.every((id) => completedActivityIds.has(id));
    const isRoot = prerequisites.length === 0;
    const withinFog = activity.sectorDepth <= run.currentSectorDepth + run.fogRevealDepth;
    const isRevealed = isCompleted || (withinFog && (isRoot || prerequisitesCompleted));
    const isStormed = activity.sectorDepth < run.currentSectorDepth && !isCompleted;
    const isLocked = !isRevealed || isStormed || !prerequisitesCompleted;
    const isCurrent = activity.id === currentActivityId;

    return toActivity(activity, { isCompleted, isRevealed, isStormed, isLocked, isCurrent });
  });

  return { run, activities, edges, completions, currentActivityId, currentMove };
}

function buildDebugMapData(): GameMapData {
  const completions = DEBUG_ACTIVITIES.slice(0, 2).map((activity, index): GameActivityCompletion => ({
    id: `debug_completion_${activity.id}`,
    studentId: 'debug_student',
    cohortId: DEBUG_MAP_RUN.cohortId,
    activityId: activity.id,
    completionType: index === 0 ? 'read' : 'submission',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const currentMove: GameCharacterMove = {
    id: 'debug_move_current',
    studentId: 'debug_student',
    cohortId: DEBUG_MAP_RUN.cohortId,
    mapRunId: DEBUG_MAP_RUN.id,
    fromActivityId: 'debug_activity_campfire_git',
    toActivityId: 'debug_activity_variables',
    moveType: 'move',
    createdAt: new Date().toISOString(),
  };

  return buildMapData(
    DEBUG_MAP_RUN,
    DEBUG_ACTIVITIES.map((activity) => ({
      id: activity.id,
      cohortId: activity.cohortId || null,
      templateActivityId: activity.templateActivityId || null,
      mapRunId: activity.mapRunId || null,
      type: activity.type,
      title: activity.title,
      startDate: activity.startDate ? new Date(activity.startDate) : null,
      endDate: activity.endDate ? new Date(activity.endDate) : null,
      url: activity.url || null,
      isGraded: activity.isGraded,
      mapX: activity.mapX,
      mapY: activity.mapY,
      sectorDepth: activity.sectorDepth,
      requiredLevel: activity.requiredLevel,
      basePoints: activity.basePoints || 0,
      targetAttribute: null,
      metadata: activity.metadata || {},
      createdAt: activity.createdAt ? new Date(activity.createdAt) : null,
    })),
    DEBUG_ACTIVITY_EDGES,
    completions,
    currentMove
  );
}

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
      completion: {
        id: `completion_${Date.now()}`,
        studentId: 'debug_student',
        cohortId: DEBUG_MAP_RUN.cohortId,
        activityId,
        completionType: 'read',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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

    const [latestMembership] = await db
      .select()
      .from(cohortMemberships)
      .where(eq(cohortMemberships.userId, studentRecord.userId))
      .orderBy(desc(cohortMemberships.createdAt))
      .limit(1);

    if (!latestMembership?.cohortId) {
      return c.json({ success: false, error: 'Cohort context not found.' }, 404);
    }

    const [activity] = await db
      .select()
      .from(gameActivities)
      .where(
        and(
          eq(gameActivities.id, activityId),
          or(
            sql`${gameActivities.cohortId} IS NULL`,
            eq(gameActivities.cohortId, latestMembership.cohortId)
          )
        )
      )
      .limit(1);

    if (!activity) {
      return c.json({ success: false, error: 'Activity not found.' }, 404);
    }

    const [existingCompletion] = await db
      .select()
      .from(gameActivityCompletions)
      .where(
        and(
          eq(gameActivityCompletions.studentId, studentRecord.id),
          eq(gameActivityCompletions.cohortId, latestMembership.cohortId),
          eq(gameActivityCompletions.activityId, activityId)
        )
      )
      .limit(1);

    if (existingCompletion) {
      return c.json({
        success: true,
        source: 'database',
        completion: toActivityCompletion(existingCompletion),
      });
    }

    const [completion] = await db
      .insert(gameActivityCompletions)
      .values({
        studentId: studentRecord.id,
        cohortId: latestMembership.cohortId,
        activityId,
        completionType: getCompletionType(activity),
        grade: activity.isGraded ? 1 : null,
      })
      .returning();

    const eventContext = createEventContext({ db, env: c.env, userId: user?.id });
    await publishEvent(
      {
        type: 'activity.completed',
        source: 'http.map',
        payload: {
          activityId,
          studentId: studentRecord.id,
          cohortId: latestMembership.cohortId,
          guildId: latestMembership.guildId || undefined,
          completionType: getCompletionType(activity),
        },
      },
      eventContext
    );

    return c.json({
      success: true,
      source: 'database',
      completion: toActivityCompletion(completion),
    });
  } catch (error: any) {
    console.error('Activity completion SQL error:', error.message);
    return c.json({ success: false, error: 'Activity completion failed.' }, 500);
  }
});

mapRouter.post('/map/activities/:activityId/move', async (c) => {
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
      move: {
        id: `move_${Date.now()}`,
        studentId: 'debug_student',
        cohortId: DEBUG_MAP_RUN.cohortId,
        mapRunId: DEBUG_MAP_RUN.id,
        toActivityId: activityId,
        moveType: 'move',
        createdAt: new Date().toISOString(),
      },
      currentActivityId: activityId,
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

    const [latestMembership] = await db
      .select()
      .from(cohortMemberships)
      .where(eq(cohortMemberships.userId, studentRecord.userId))
      .orderBy(desc(cohortMemberships.createdAt))
      .limit(1);

    if (!latestMembership?.cohortId) {
      return c.json({ success: false, error: 'Cohort context not found.' }, 404);
    }

    const [activeRun] = await db
      .select()
      .from(gameMapRuns)
      .where(and(eq(gameMapRuns.cohortId, latestMembership.cohortId), eq(gameMapRuns.status, 'active')))
      .orderBy(desc(gameMapRuns.createdAt))
      .limit(1);

    if (!activeRun) {
      return c.json({ success: false, error: 'Active map run not found.' }, 404);
    }

    const [activity] = await db
      .select()
      .from(gameActivities)
      .where(
        and(
          eq(gameActivities.id, activityId),
          or(
            sql`${gameActivities.cohortId} IS NULL`,
            eq(gameActivities.cohortId, latestMembership.cohortId),
            eq(gameActivities.mapRunId, activeRun.id)
          )
        )
      )
      .limit(1);

    if (!activity) {
      return c.json({ success: false, error: 'Activity not found in active map.' }, 404);
    }

    const [latestMove] = await db
      .select()
      .from(gameCharacterMoves)
      .where(
        and(
          eq(gameCharacterMoves.studentId, studentRecord.id),
          eq(gameCharacterMoves.cohortId, latestMembership.cohortId),
          eq(gameCharacterMoves.mapRunId, activeRun.id)
        )
      )
      .orderBy(desc(gameCharacterMoves.createdAt))
      .limit(1);

    if (latestMove?.toActivityId === activityId) {
      const move = toCharacterMove(latestMove);
      return c.json({ success: true, source: 'database', move, currentActivityId: move.toActivityId });
    }

    const [moveRecord] = await db
      .insert(gameCharacterMoves)
      .values({
        studentId: studentRecord.id,
        cohortId: latestMembership.cohortId,
        mapRunId: activeRun.id,
        fromActivityId: latestMove?.toActivityId || null,
        toActivityId: activityId,
        moveType: latestMove ? 'move' : 'enter',
      })
      .returning();
    const move = toCharacterMove(moveRecord);

    return c.json({ success: true, source: 'database', move, currentActivityId: move.toActivityId });
  } catch (error: any) {
    console.error('Character move SQL error:', error.message);
    return c.json({ success: false, error: 'Character move failed.' }, 500);
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
      map: buildDebugMapData(),
    });
  }

  try {
    const db = getDb(databaseUrl);
    const user = c.get('user');
    const [studentRecord] = user?.id
      ? await db.select().from(students).where(eq(students.userId, user.id)).limit(1)
      : [];

    if (!studentRecord) {
      return c.json({ success: false, error: 'Student profile not found.' }, 404);
    }

    const [latestMembership] = await db
      .select()
      .from(cohortMemberships)
      .where(eq(cohortMemberships.userId, studentRecord.userId))
      .orderBy(desc(cohortMemberships.createdAt))
      .limit(1);

    if (!latestMembership?.cohortId) {
      return c.json({ success: false, error: 'Map cohort context not found.' }, 404);
    }

    let [activeRun] = await db
      .select()
      .from(gameMapRuns)
      .where(and(eq(gameMapRuns.cohortId, latestMembership.cohortId), eq(gameMapRuns.status, 'active')))
      .orderBy(desc(gameMapRuns.createdAt))
      .limit(1);

    if (!activeRun) {
      [activeRun] = await db
        .insert(gameMapRuns)
        .values({ cohortId: latestMembership.cohortId })
        .returning();
    }

    const activitiesFromDb = await db
      .select()
      .from(gameActivities)
      .where(
        or(
          sql`${gameActivities.cohortId} IS NULL`,
          eq(gameActivities.cohortId, latestMembership.cohortId),
          eq(gameActivities.mapRunId, activeRun.id)
        )
      );

    const edgesFromDb = await db
      .select()
      .from(gameActivityEdges)
      .where(
        or(
          sql`${gameActivityEdges.cohortId} IS NULL AND ${gameActivityEdges.mapRunId} IS NULL`,
          eq(gameActivityEdges.cohortId, latestMembership.cohortId),
          eq(gameActivityEdges.mapRunId, activeRun.id)
        )
      );

    const completionsFromDb = await db
      .select()
      .from(gameActivityCompletions)
      .where(
        and(
          eq(gameActivityCompletions.studentId, studentRecord.id),
          eq(gameActivityCompletions.cohortId, latestMembership.cohortId)
        )
      )
      .orderBy(desc(gameActivityCompletions.createdAt));
    const [latestMove] = await db
      .select()
      .from(gameCharacterMoves)
      .where(
        and(
          eq(gameCharacterMoves.studentId, studentRecord.id),
          eq(gameCharacterMoves.cohortId, latestMembership.cohortId),
          eq(gameCharacterMoves.mapRunId, activeRun.id)
        )
      )
      .orderBy(desc(gameCharacterMoves.createdAt))
      .limit(1);

    if (activitiesFromDb.length === 0) {
      return c.json({
        success: true,
        source: 'database',
        map: buildMapData(
          toMapRun(activeRun),
          [],
          [],
          completionsFromDb.map(toActivityCompletion),
          latestMove ? toCharacterMove(latestMove) : undefined
        ),
      });
    }

    const map = buildMapData(
      toMapRun(activeRun),
      activitiesFromDb,
      edgesFromDb.map(toActivityEdge),
      completionsFromDb.map(toActivityCompletion),
      latestMove ? toCharacterMove(latestMove) : undefined
    );

    return c.json({
      success: true,
      source: 'database',
      map,
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
        context: (notification.context as CohortProgressData['notifications'][number]['context']) || undefined,
      })),
    };

    return c.json({ success: true, source: 'database', progress: progressData });
  } catch (error: any) {
    console.error('Progress SQL error:', error.message);
    return c.json({ success: false, error: 'Progress data could not be loaded.' }, 500);
  }
});
