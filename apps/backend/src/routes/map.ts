import { Hono } from 'hono';
import { and, desc, eq, inArray, or, sql, sum } from 'drizzle-orm';
import {
  type Activity,
  type ActivityStepRange,
  type CohortProgressData,
  type GameActivityCompletion,
  type GameActivityCompletionType,
  type GameActivityEdge,
  type GameCharacterMove,
  type GameCharacterClass,
  type GameMapData,
  type GameMapNodeOccupancy,
  type GameMapRun,
  type GameRewardCardPayload,
} from '@eduquest/shared';
import { getDb } from '../db';
import {
  gameActivityCompletions,
  gameActivityEdges,
  gameCharacters,
  gameCharacterMoves,
  cohortMemberships,
  cohortProgress,
  cohorts,
  gameActivities,
  gameMapRuns,
  guilds,
  notifications,
  progressMilestones,
  students,
  users,
} from '../db/schema';
import {
  DEBUG_ACTIVITIES,
  DEBUG_ACTIVITY_EDGES,
  DEBUG_COHORTS,
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
type CohortRecord = typeof cohorts.$inferSelect;
type ProgressMilestoneRecord = typeof progressMilestones.$inferSelect;
type Database = ReturnType<typeof getDb>;

interface MapOccupancyMember {
  studentId: string;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  githubAvatarUrl?: string | null;
  characterClass?: string | null;
  guildId?: string | null;
  guildName?: string | null;
  guildIconUrl?: string | null;
  guildColor?: string | null;
}

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
  state: Pick<Activity, 'isCompleted' | 'isRevealed' | 'isLocked' | 'isCurrent'>,
  includeStepRanges = false
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
    ...(includeStepRanges ? { stepRanges: parseStepRanges(record.stepRanges, record.requiredLevel) } : {}),
    cardColor: record.cardColor || undefined,
    participationMode: record.participationMode,
    basePoints: record.basePoints,
    metadata: (record.metadata || {}) as Activity['metadata'],
    createdAt: toIsoString(record.createdAt),
    ...state,
  };
}

function parseStepRanges(value: unknown, requiredLevel = 1): ActivityStepRange[] {
  if (!Array.isArray(value)) {
    return [{ startStep: Math.max(requiredLevel - 1, 0) }];
  }

  const ranges = value.flatMap((item): ActivityStepRange[] => {
    if (!item || typeof item !== 'object') return [];
    const candidate = item as Record<string, unknown>;
    const startStep = candidate.startStep;
    const endStep = candidate.endStep;
    if (typeof startStep !== 'number' || !Number.isInteger(startStep) || startStep < 0) return [];
    if (
      endStep !== undefined &&
      (typeof endStep !== 'number' || !Number.isInteger(endStep) || endStep <= startStep)
    ) {
      return [];
    }
    return [{ startStep, endStep }];
  });

  return ranges.length > 0 ? ranges : [{ startStep: Math.max(requiredLevel - 1, 0) }];
}

function isStepInsideRange(step: number, range: ActivityStepRange) {
  return step > range.startStep && (range.endStep === undefined || step < range.endStep);
}

function formatOccupancyMemberName(member: MapOccupancyMember) {
  const fullName = [member.firstName, member.lastName].filter(Boolean).join(' ').trim();
  return member.displayName || fullName || member.email || 'Unknown player';
}

function toCharacterClass(value?: string | null): GameCharacterClass | undefined {
  return value === 'scholar' || value === 'champion' || value === 'guide' || value === 'specialist'
    ? value
    : undefined;
}

function buildNodeOccupancies(
  activityRecords: Array<Pick<ActivityRecord, 'id' | 'participationMode'>>,
  members: MapOccupancyMember[],
  moves: CharacterMoveRecord[]
): GameMapNodeOccupancy[] {
  const latestMoveByStudentId = new Map<string, CharacterMoveRecord>();

  for (const move of moves) {
    const current = latestMoveByStudentId.get(move.studentId);
    const moveTime = move.createdAt?.getTime?.() ?? 0;
    const currentTime = current?.createdAt?.getTime?.() ?? 0;
    if (!current || moveTime >= currentTime) {
      latestMoveByStudentId.set(move.studentId, move);
    }
  }

  const activityById = new Map(activityRecords.map((activity) => [activity.id, activity]));
  const occupancyByActivity = new Map<string, Map<string, GameMapNodeOccupancy['segments'][number]>>();

  for (const member of members) {
    const move = latestMoveByStudentId.get(member.studentId);
    if (!move || !activityById.has(move.toActivityId)) continue;

    const activity = activityById.get(move.toActivityId)!;
    const segments = occupancyByActivity.get(activity.id) || new Map<string, GameMapNodeOccupancy['segments'][number]>();
    const isGuildActivity = activity.participationMode === 'guild' && member.guildId;
    const segmentKey = isGuildActivity ? `guild:${member.guildId}` : 'solo';
    const currentSegment = segments.get(segmentKey);
    const segmentMember = {
      studentId: member.studentId,
      displayName: formatOccupancyMemberName(member),
      avatarUrl: member.avatarUrl || member.githubAvatarUrl || undefined,
      characterClass: toCharacterClass(member.characterClass),
      guildId: member.guildId || undefined,
      guildName: member.guildName || undefined,
      fromActivityId: move.fromActivityId || undefined,
      toActivityId: move.toActivityId,
    };

    if (currentSegment) {
      currentSegment.studentCount += 1;
      currentSegment.members = [...(currentSegment.members || []), segmentMember];
    } else if (isGuildActivity) {
      segments.set(segmentKey, {
        kind: 'guild',
        guildId: member.guildId || undefined,
        guildName: member.guildName || undefined,
        guildIconUrl: member.guildIconUrl || undefined,
        color: member.guildColor || undefined,
        studentCount: 1,
        members: [segmentMember],
      });
    } else {
      segments.set(segmentKey, {
        kind: 'solo',
        studentCount: 1,
        members: [segmentMember],
      });
    }

    occupancyByActivity.set(activity.id, segments);
  }

  return Array.from(occupancyByActivity.entries()).map(([activityId, segments]) => ({
    activityId,
    totalStudents: members.length,
    segments: Array.from(segments.values()),
  }));
}

function buildMapData(
  run: GameMapRun,
  activityRecords: ActivityRecord[],
  edges: GameActivityEdge[],
  completions: GameActivityCompletion[],
  currentMove?: GameCharacterMove,
  cohortProgression?: Pick<CohortRecord, 'currentStep'>,
  includeStepRanges = false,
  nodeOccupancies: GameMapNodeOccupancy[] = []
): GameMapData {
  const completedActivityIds = new Set(completions.map((completion) => completion.activityId));
  const currentActivityId = currentMove?.toActivityId;
  const currentStep = cohortProgression?.currentStep ?? run.currentSectorDepth;
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
    const stepRanges = parseStepRanges(activity.stepRanges, activity.requiredLevel);
    const hasBeenRevealed = stepRanges.some((range) => currentStep > range.startStep);
    const isActiveForStep = stepRanges.some((range) => isStepInsideRange(currentStep, range));
    const isRevealed = isCompleted || (hasBeenRevealed && isActiveForStep && (isRoot || prerequisitesCompleted));
    const isLocked = !isRevealed || !prerequisitesCompleted;
    const isCurrent = activity.id === currentActivityId;

    return toActivity(
      activity,
      { isCompleted, isRevealed, isLocked, isCurrent },
      includeStepRanges
    );
  });

  return {
    run,
    activities,
    edges,
    completions,
    nodeOccupancies,
    currentActivityId,
    currentMove,
  };
}

function buildDebugMapData(includeStepRanges = false): GameMapData {
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
      stepRanges: activity.stepRanges || [],
      cardColor: activity.cardColor || null,
      participationMode: activity.participationMode || 'solo',
      basePoints: activity.basePoints || 0,
      targetAttribute: null,
      metadata: activity.metadata || {},
      createdAt: activity.createdAt ? new Date(activity.createdAt) : null,
    })),
    DEBUG_ACTIVITY_EDGES,
    completions,
    currentMove,
    { currentStep: 3 },
    includeStepRanges,
    [
      {
        activityId: 'debug_activity_variables',
        totalStudents: 3,
        segments: [
          {
            kind: 'solo',
            studentCount: 1,
            members: [
              {
                studentId: 'debug_student_lina',
                displayName: 'Lina MOREL',
                avatarUrl:
                  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
                characterClass: 'guide',
                fromActivityId: 'debug_activity_campfire_git',
                toActivityId: 'debug_activity_variables',
              },
            ],
          },
        ],
      },
      {
        activityId: 'debug_activity_api_bridge',
        totalStudents: 3,
        segments: [
          {
            kind: 'guild',
            guildId: DEBUG_GUILDS[1]?.id,
            guildName: DEBUG_GUILDS[1]?.name,
            guildIconUrl: DEBUG_GUILDS[1]?.iconUrl,
            color: DEBUG_GUILDS[1]?.color,
            studentCount: 1,
            members: [
              {
                studentId: 'debug_student_samir',
                displayName: 'Samir BENALI',
                avatarUrl:
                  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
                characterClass: 'champion',
                fromActivityId: 'debug_activity_variables',
                toActivityId: 'debug_activity_api_bridge',
              },
            ],
          },
          {
            kind: 'guild',
            guildId: DEBUG_GUILDS[2]?.id,
            guildName: DEBUG_GUILDS[2]?.name,
            guildIconUrl: DEBUG_GUILDS[2]?.iconUrl,
            color: DEBUG_GUILDS[2]?.color,
            studentCount: 1,
            members: [
              {
                studentId: 'debug_student_noa',
                displayName: 'Noa CHEN',
                avatarUrl:
                  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
                characterClass: 'specialist',
                fromActivityId: 'debug_activity_variables',
                toActivityId: 'debug_activity_api_bridge',
              },
            ],
          },
        ],
      },
    ]
  );
}

function toCohortPayload(record: CohortRecord) {
  return {
    id: record.id,
    schoolId: record.schoolId,
    campusId: record.campusId || undefined,
    startYear: record.startYear,
    grade: record.grade,
    level: record.level,
    currentStep: record.currentStep,
    name: record.name,
    majorSpeciality: record.majorSpeciality || undefined,
    minorSpeciality: record.minorSpeciality || undefined,
    description: record.description || undefined,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
  };
}

function toGamePayload(record: CohortRecord) {
  return {
    id: record.id,
    cohortId: record.id,
    cohort: toCohortPayload(record),
    name: record.name,
    currentStep: record.currentStep,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
  };
}

function toRewardCard(record: ProgressMilestoneRecord, gameId: string) {
  return {
    id: record.id,
    gameId,
    title: record.rewardTitleI18nKey,
    subtitle: record.rewardSubtitleI18nKey || undefined,
    description: record.descriptionI18nKey || undefined,
    cost: record.cost,
    accentToken: record.rewardAccentToken,
    sortOrder: record.sortOrder,
    createdAt: toIsoString(record.createdAt),
  };
}

function normalizeRewardCardPayload(value: unknown): GameRewardCardPayload | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Record<string, unknown>;
  const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
  const cost = typeof candidate.cost === 'number' ? candidate.cost : Number(candidate.cost);

  if (!title || !Number.isInteger(cost) || cost < 0) return undefined;

  return {
    title,
    subtitle: typeof candidate.subtitle === 'string' ? candidate.subtitle.trim() || undefined : undefined,
    description:
      typeof candidate.description === 'string' ? candidate.description.trim() || undefined : undefined,
    cost,
    accentToken:
      typeof candidate.accentToken === 'string' ? candidate.accentToken.trim() || 'quest' : 'quest',
    sortOrder:
      typeof candidate.sortOrder === 'number' && Number.isInteger(candidate.sortOrder)
        ? candidate.sortOrder
        : undefined,
  };
}

function getRequestedGameId(c: { req: { query: (name: string) => string | undefined } }) {
  return c.req.query('gameId') || c.req.query('cohortId') || undefined;
}

async function resolveStudentCohortContext(
  db: Database,
  user: UserPayload | undefined,
  requestedCohortId?: string
): Promise<
  | {
      studentRecord: StudentRecord;
      membership: CohortMembershipRecord;
      cohortRecord: CohortRecord;
    }
  | undefined
> {
  const [studentRecord] = user?.id
    ? await db.select().from(students).where(eq(students.userId, user.id)).limit(1)
    : [];

  if (!studentRecord) return undefined;

  const memberships = await db
    .select()
    .from(cohortMemberships)
    .where(eq(cohortMemberships.userId, studentRecord.userId))
    .orderBy(desc(cohortMemberships.createdAt));
  const membership = requestedCohortId
    ? memberships.find((item) => item.cohortId === requestedCohortId)
    : memberships[0];

  if (!membership?.cohortId) return undefined;

  const [cohortRecord] = await db
    .select()
    .from(cohorts)
    .where(eq(cohorts.id, membership.cohortId))
    .limit(1);

  return cohortRecord ? { studentRecord, membership, cohortRecord } : undefined;
}

async function resolveAdminCohort(
  db: Database,
  requestedCohortId?: string
): Promise<CohortRecord | undefined> {
  if (requestedCohortId) {
    const [cohortRecord] = await db
      .select()
      .from(cohorts)
      .where(eq(cohorts.id, requestedCohortId))
      .limit(1);
    return cohortRecord;
  }

  const [activeRun] = await db
    .select()
    .from(gameMapRuns)
    .where(eq(gameMapRuns.status, 'active'))
    .orderBy(desc(gameMapRuns.createdAt))
    .limit(1);

  if (activeRun) {
    const [cohortRecord] = await db
      .select()
      .from(cohorts)
      .where(eq(cohorts.id, activeRun.cohortId))
      .limit(1);
    if (cohortRecord) return cohortRecord;
  }

  const [firstCohort] = await db.select().from(cohorts).orderBy(desc(cohorts.startYear)).limit(1);
  return firstCohort;
}

async function getOrCreateActiveRun(db: Database, cohortId: string) {
  let [activeRun] = await db
    .select()
    .from(gameMapRuns)
    .where(and(eq(gameMapRuns.cohortId, cohortId), eq(gameMapRuns.status, 'active')))
    .orderBy(desc(gameMapRuns.createdAt))
    .limit(1);

  if (!activeRun) {
    [activeRun] = await db.insert(gameMapRuns).values({ cohortId }).returning();
  }

  return activeRun;
}

export const mapRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

mapRouter.get('/games', async (c) => {
  const databaseUrl = c.env?.DATABASE_URL;
  const user = c.get('user');

  if (!databaseUrl) {
    if (!isMockDataEnabled(c.env)) {
      return c.json({ success: false, error: 'DATABASE_URL is required.' }, 503);
    }

    const debugCohorts = user?.isAdmin
      ? DEBUG_COHORTS
      : DEBUG_COHORTS.filter((cohort) => cohort.id === DEBUG_MAP_RUN.cohortId);

    return c.json({
      success: true,
      source: 'mock',
      games: debugCohorts.map((cohort) => ({
        id: cohort.id,
        cohortId: cohort.id,
        cohort,
        name: cohort.name,
        currentStep: 1,
        createdAt: cohort.createdAt,
        updatedAt: cohort.updatedAt,
      })),
      selectedGameId: debugCohorts[0]?.id,
    });
  }

  try {
    const db = getDb(databaseUrl);
    const requestedGameId = getRequestedGameId(c);

    if (user?.isAdmin) {
      const cohortRecords = await db.select().from(cohorts).orderBy(desc(cohorts.startYear));
      const selectedCohort = await resolveAdminCohort(db, requestedGameId);

      return c.json({
        success: true,
        source: 'database',
        games: cohortRecords.map(toGamePayload),
        selectedGameId: selectedCohort?.id || cohortRecords[0]?.id,
      });
    }

    const [studentRecord] = user?.id
      ? await db.select().from(students).where(eq(students.userId, user.id)).limit(1)
      : [];

    if (!studentRecord) {
      return c.json({ success: false, error: 'Student profile not found.' }, 404);
    }

    const memberships = await db
      .select()
      .from(cohortMemberships)
      .where(eq(cohortMemberships.userId, studentRecord.userId))
      .orderBy(desc(cohortMemberships.createdAt));
    const cohortIds = [...new Set(memberships.map((membership) => membership.cohortId))];

    if (cohortIds.length === 0) {
      return c.json({ success: true, source: 'database', games: [], selectedGameId: undefined });
    }

    const cohortRecords = await db.select().from(cohorts).where(inArray(cohorts.id, cohortIds));
    const selectedMembership =
      (requestedGameId && memberships.find((membership) => membership.cohortId === requestedGameId)) ||
      memberships[0];

    return c.json({
      success: true,
      source: 'database',
      games: cohortRecords.map(toGamePayload),
      selectedGameId: selectedMembership?.cohortId,
    });
  } catch (error: any) {
    console.error('Game selector SQL error:', error.message);
    return c.json({ success: false, error: 'Games could not be loaded.' }, 500);
  }
});

mapRouter.get('/guilds', async (c) => {
  const databaseUrl = c.env?.DATABASE_URL;
  const user = c.get('user');
  const requestedCohortId = getRequestedGameId(c);

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
    const cohortRecord = user?.isAdmin
      ? await resolveAdminCohort(db, requestedCohortId)
      : (await resolveStudentCohortContext(db, user, requestedCohortId))?.cohortRecord;

    if (!cohortRecord) {
      return c.json({ success: false, error: 'Guild cohort context not found.' }, 404);
    }

    const guildRecords = await db
      .select()
      .from(guilds)
      .where(eq(guilds.cohortId, cohortRecord.id))
      .orderBy(desc(guilds.gold));

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
  const requestedCohortId = getRequestedGameId(c);

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
    const context = await resolveStudentCohortContext(db, user, requestedCohortId);

    if (!context) {
      return c.json({ success: false, error: 'Cohort context not found.' }, 404);
    }

    const { studentRecord, membership } = context;

    const [activity] = await db
      .select()
      .from(gameActivities)
      .where(
        and(
          eq(gameActivities.id, activityId),
          or(
            sql`${gameActivities.cohortId} IS NULL`,
            eq(gameActivities.cohortId, membership.cohortId)
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
          eq(gameActivityCompletions.cohortId, membership.cohortId),
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
        cohortId: membership.cohortId,
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
          cohortId: membership.cohortId,
          guildId: membership.guildId || undefined,
          completionType: getCompletionType(activity),
        },
      },
      eventContext
    );

    await publishEvent(
      {
        type: 'activity.validated',
        source: 'http.map',
        payload: {
          activityId,
          studentId: studentRecord.id,
          cohortId: membership.cohortId,
          guildId: membership.guildId || undefined,
          validatedBy: 'system',
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
  const requestedCohortId = getRequestedGameId(c);

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
    const context = await resolveStudentCohortContext(db, user, requestedCohortId);

    if (!context) {
      return c.json({ success: false, error: 'Cohort context not found.' }, 404);
    }
    const { studentRecord, membership } = context;

    const activeRun = await getOrCreateActiveRun(db, membership.cohortId);

    const [activity] = await db
      .select()
      .from(gameActivities)
      .where(
        and(
          eq(gameActivities.id, activityId),
          or(
            sql`${gameActivities.cohortId} IS NULL`,
            eq(gameActivities.cohortId, membership.cohortId),
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
          eq(gameCharacterMoves.cohortId, membership.cohortId),
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
        cohortId: membership.cohortId,
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
      map: buildDebugMapData(Boolean(c.get('user')?.isAdmin)),
    });
  }

  try {
    const db = getDb(databaseUrl);
    const user = c.get('user');
    const requestedCohortId = getRequestedGameId(c);
    const studentContext = user?.isAdmin
      ? undefined
      : await resolveStudentCohortContext(db, user, requestedCohortId);
    const cohortRecord = user?.isAdmin
      ? await resolveAdminCohort(db, requestedCohortId)
      : studentContext?.cohortRecord;

    if (!cohortRecord) {
      return c.json({ success: false, error: 'Map cohort not found.' }, 404);
    }

    if (!user?.isAdmin && !studentContext) {
      return c.json({ success: false, error: 'Student cohort context not found.' }, 404);
    }

    const activeRun = await getOrCreateActiveRun(db, cohortRecord.id);

    const activitiesFromDb = await db
      .select()
      .from(gameActivities)
      .where(
        or(
          sql`${gameActivities.cohortId} IS NULL`,
          eq(gameActivities.cohortId, cohortRecord.id),
          eq(gameActivities.mapRunId, activeRun.id)
        )
      );

    const edgesFromDb = await db
      .select()
      .from(gameActivityEdges)
      .where(
        or(
          sql`${gameActivityEdges.cohortId} IS NULL AND ${gameActivityEdges.mapRunId} IS NULL`,
          eq(gameActivityEdges.cohortId, cohortRecord.id),
          eq(gameActivityEdges.mapRunId, activeRun.id)
        )
      );

    const completionsFromDb = studentContext
      ? await db
          .select()
          .from(gameActivityCompletions)
          .where(
            and(
              eq(gameActivityCompletions.studentId, studentContext.studentRecord.id),
              eq(gameActivityCompletions.cohortId, cohortRecord.id)
            )
          )
          .orderBy(desc(gameActivityCompletions.createdAt))
      : [];
    const [latestMove] = studentContext
      ? await db
          .select()
          .from(gameCharacterMoves)
          .where(
            and(
              eq(gameCharacterMoves.studentId, studentContext.studentRecord.id),
              eq(gameCharacterMoves.cohortId, cohortRecord.id),
              eq(gameCharacterMoves.mapRunId, activeRun.id)
            )
          )
          .orderBy(desc(gameCharacterMoves.createdAt))
          .limit(1)
      : [];
    const [occupancyMembers, occupancyMoves] = await Promise.all([
      db
        .select({
          studentId: students.id,
          displayName: users.displayName,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          avatarUrl: users.avatarUrl,
          githubAvatarUrl: users.githubAvatarUrl,
          characterClass: gameCharacters.characterClass,
          guildId: cohortMemberships.guildId,
          guildName: guilds.name,
          guildIconUrl: guilds.iconUrl,
          guildColor: guilds.color,
        })
        .from(cohortMemberships)
        .innerJoin(students, eq(students.userId, cohortMemberships.userId))
        .innerJoin(users, eq(users.id, cohortMemberships.userId))
        .leftJoin(gameCharacters, eq(gameCharacters.studentId, students.id))
        .leftJoin(guilds, eq(guilds.id, cohortMemberships.guildId))
        .where(eq(cohortMemberships.cohortId, cohortRecord.id)),
      db
        .select()
        .from(gameCharacterMoves)
        .where(
          and(
            eq(gameCharacterMoves.cohortId, cohortRecord.id),
            eq(gameCharacterMoves.mapRunId, activeRun.id)
          )
        ),
    ]);
    const nodeOccupancies = buildNodeOccupancies(activitiesFromDb, occupancyMembers, occupancyMoves);

    if (activitiesFromDb.length === 0) {
      return c.json({
        success: true,
        source: 'database',
        map: buildMapData(
          toMapRun(activeRun),
          [],
          [],
          completionsFromDb.map(toActivityCompletion),
          latestMove ? toCharacterMove(latestMove) : undefined,
          cohortRecord,
          Boolean(user?.isAdmin),
          nodeOccupancies
        ),
      });
    }

    const map = buildMapData(
      toMapRun(activeRun),
      activitiesFromDb,
      edgesFromDb.map(toActivityEdge),
      completionsFromDb.map(toActivityCompletion),
      latestMove ? toCharacterMove(latestMove) : undefined,
      cohortRecord,
      Boolean(user?.isAdmin),
      nodeOccupancies
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
    const requestedCohortId = getRequestedGameId(c);
    const studentContext = user?.isAdmin
      ? undefined
      : await resolveStudentCohortContext(db, user, requestedCohortId);
    const cohortRecord = user?.isAdmin
      ? await resolveAdminCohort(db, requestedCohortId)
      : studentContext?.cohortRecord;

    if (!cohortRecord) {
      return c.json({ success: false, error: 'Progress cohort context not found.' }, 404);
    }

    const [progress] = await db
      .select()
      .from(cohortProgress)
      .where(eq(cohortProgress.cohortId, cohortRecord.id))
      .limit(1);

    if (!progress) {
      return c.json({ success: false, error: 'Cohort progress not found.' }, 404);
    }

    const guildId = studentContext?.membership.guildId;
    const notificationScope = guildId
      ? and(
          eq(notifications.cohortId, cohortRecord.id),
          or(eq(notifications.guildId, guildId), sql`${notifications.guildId} IS NULL`)
        )
      : and(eq(notifications.cohortId, cohortRecord.id), sql`${notifications.guildId} IS NULL`);

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

mapRouter.get('/games/:gameId/reward-cards', async (c) => {
  const user = c.get('user');
  if (!user?.isAdmin) {
    return c.json({ success: false, error: 'Forbidden' }, 403);
  }

  const databaseUrl = c.env?.DATABASE_URL;
  if (!databaseUrl) {
    if (!isMockDataEnabled(c.env)) {
      return c.json({ success: false, error: 'DATABASE_URL is required.' }, 503);
    }

    return c.json({
      success: true,
      source: 'mock',
      rewardCards: DEBUG_COHORT_PROGRESS.gauge.milestones.map((milestone, index) => ({
        id: milestone.id,
        gameId: c.req.param('gameId'),
        title: milestone.reward.titleI18nKey,
        subtitle: milestone.reward.subtitleI18nKey,
        description: milestone.descriptionI18nKey,
        cost: milestone.cost,
        accentToken: milestone.reward.accentToken,
        sortOrder: index,
      })),
    });
  }

  try {
    const db = getDb(databaseUrl);
    const cohortRecord = await resolveAdminCohort(db, c.req.param('gameId'));
    if (!cohortRecord) {
      return c.json({ success: false, error: 'Game not found.' }, 404);
    }

    const [progress] = await db
      .select()
      .from(cohortProgress)
      .where(eq(cohortProgress.cohortId, cohortRecord.id))
      .limit(1);

    if (!progress) {
      return c.json({ success: true, source: 'database', rewardCards: [] });
    }

    const rewardCards = await db
      .select()
      .from(progressMilestones)
      .where(eq(progressMilestones.progressId, progress.id))
      .orderBy(progressMilestones.sortOrder);

    return c.json({
      success: true,
      source: 'database',
      rewardCards: rewardCards.map((card) => toRewardCard(card, cohortRecord.id)),
    });
  } catch (error: any) {
    console.error('Reward cards SQL error:', error.message);
    return c.json({ success: false, error: 'Reward cards could not be loaded.' }, 500);
  }
});

mapRouter.post('/games/:gameId/reward-cards', async (c) => {
  const user = c.get('user');
  if (!user?.isAdmin) {
    return c.json({ success: false, error: 'Forbidden' }, 403);
  }

  const databaseUrl = c.env?.DATABASE_URL;
  if (!databaseUrl) {
    return c.json({ success: false, error: 'DATABASE_URL is required.' }, 503);
  }

  const body = normalizeRewardCardPayload(await c.req.json().catch(() => undefined));
  if (!body) {
    return c.json({ success: false, error: 'A title and non-negative integer cost are required.' }, 400);
  }

  try {
    const db = getDb(databaseUrl);
    const cohortRecord = await resolveAdminCohort(db, c.req.param('gameId'));
    if (!cohortRecord) {
      return c.json({ success: false, error: 'Game not found.' }, 404);
    }

    let [progress] = await db
      .select()
      .from(cohortProgress)
      .where(eq(cohortProgress.cohortId, cohortRecord.id))
      .limit(1);

    if (!progress) {
      [progress] = await db
        .insert(cohortProgress)
        .values({
          cohortId: cohortRecord.id,
          labelI18nKey: 'dashboard.dock.milestone',
        })
        .returning();
    }

    const [maxSortOrder] = await db
      .select({ value: sql<number>`coalesce(max(${progressMilestones.sortOrder}), -1)` })
      .from(progressMilestones)
      .where(eq(progressMilestones.progressId, progress.id));

    const [created] = await db
      .insert(progressMilestones)
      .values({
        progressId: progress.id,
        labelI18nKey: body.title,
        descriptionI18nKey: body.description || null,
        cost: body.cost,
        rewardTitleI18nKey: body.title,
        rewardSubtitleI18nKey: body.subtitle || null,
        rewardAccentToken: body.accentToken || 'quest',
        sortOrder: body.sortOrder ?? Number(maxSortOrder?.value ?? -1) + 1,
      })
      .returning();

    return c.json({ success: true, rewardCard: toRewardCard(created, cohortRecord.id) }, 201);
  } catch (error: any) {
    console.error('Reward card create SQL error:', error.message);
    return c.json({ success: false, error: 'Reward card could not be created.' }, 500);
  }
});

mapRouter.put('/games/:gameId/reward-cards/:rewardCardId', async (c) => {
  const user = c.get('user');
  if (!user?.isAdmin) {
    return c.json({ success: false, error: 'Forbidden' }, 403);
  }

  const databaseUrl = c.env?.DATABASE_URL;
  if (!databaseUrl) {
    return c.json({ success: false, error: 'DATABASE_URL is required.' }, 503);
  }

  const body = normalizeRewardCardPayload(await c.req.json().catch(() => undefined));
  if (!body) {
    return c.json({ success: false, error: 'A title and non-negative integer cost are required.' }, 400);
  }

  try {
    const db = getDb(databaseUrl);
    const cohortRecord = await resolveAdminCohort(db, c.req.param('gameId'));
    if (!cohortRecord) {
      return c.json({ success: false, error: 'Game not found.' }, 404);
    }

    const [progress] = await db
      .select()
      .from(cohortProgress)
      .where(eq(cohortProgress.cohortId, cohortRecord.id))
      .limit(1);

    if (!progress) {
      return c.json({ success: false, error: 'Game progress not found.' }, 404);
    }

    const [updated] = await db
      .update(progressMilestones)
      .set({
        labelI18nKey: body.title,
        descriptionI18nKey: body.description || null,
        cost: body.cost,
        rewardTitleI18nKey: body.title,
        rewardSubtitleI18nKey: body.subtitle || null,
        rewardAccentToken: body.accentToken || 'quest',
        sortOrder: body.sortOrder ?? 0,
      })
      .where(
        and(
          eq(progressMilestones.id, c.req.param('rewardCardId')),
          eq(progressMilestones.progressId, progress.id)
        )
      )
      .returning();

    if (!updated) {
      return c.json({ success: false, error: 'Reward card not found.' }, 404);
    }

    return c.json({ success: true, rewardCard: toRewardCard(updated, cohortRecord.id) });
  } catch (error: any) {
    console.error('Reward card update SQL error:', error.message);
    return c.json({ success: false, error: 'Reward card could not be updated.' }, 500);
  }
});

mapRouter.delete('/games/:gameId/reward-cards/:rewardCardId', async (c) => {
  const user = c.get('user');
  if (!user?.isAdmin) {
    return c.json({ success: false, error: 'Forbidden' }, 403);
  }

  const databaseUrl = c.env?.DATABASE_URL;
  if (!databaseUrl) {
    return c.json({ success: false, error: 'DATABASE_URL is required.' }, 503);
  }

  try {
    const db = getDb(databaseUrl);
    const cohortRecord = await resolveAdminCohort(db, c.req.param('gameId'));
    if (!cohortRecord) {
      return c.json({ success: false, error: 'Game not found.' }, 404);
    }

    const [progress] = await db
      .select()
      .from(cohortProgress)
      .where(eq(cohortProgress.cohortId, cohortRecord.id))
      .limit(1);

    if (!progress) {
      return c.json({ success: false, error: 'Game progress not found.' }, 404);
    }

    const [deleted] = await db
      .delete(progressMilestones)
      .where(
        and(
          eq(progressMilestones.id, c.req.param('rewardCardId')),
          eq(progressMilestones.progressId, progress.id)
        )
      )
      .returning();

    if (!deleted) {
      return c.json({ success: false, error: 'Reward card not found.' }, 404);
    }

    return c.json({ success: true, rewardCard: toRewardCard(deleted, cohortRecord.id) });
  } catch (error: any) {
    console.error('Reward card delete SQL error:', error.message);
    return c.json({ success: false, error: 'Reward card could not be deleted.' }, 500);
  }
});
