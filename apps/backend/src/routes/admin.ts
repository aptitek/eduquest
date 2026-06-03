import { Hono } from 'hono';
import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';
import type { ActivityStepRange } from '@eduquest/shared';
import { getDb } from '../db';
import {
  cohortMemberships,
  cohorts,
  gameActivities,
  gameActivityCompletions,
  gameActivityEdges,
  gameCharacterMoves,
  gameMapRuns,
  students,
} from '../db/schema';
import type { UserPayload } from '../middleware/auth';
import { apiError, parseJsonBody, requireAdminUser, requireDatabase } from './http';

type Bindings = {
  DB?: D1Database;
};

type Variables = {
  user?: UserPayload;
};

type CohortStepBody = {
  currentStep?: number;
};
type Database = ReturnType<typeof getDb>;
type ActivityRecord = typeof gameActivities.$inferSelect;
type ActivityEdgeRecord = typeof gameActivityEdges.$inferSelect;
type CompletionRecord = typeof gameActivityCompletions.$inferSelect;
type CharacterMoveRecord = typeof gameCharacterMoves.$inferSelect;
type CharacterMoveInsert = typeof gameCharacterMoves.$inferInsert;
type RelocationPlan = {
  moves: CharacterMoveInsert[];
  forcedStudentIds: string[];
  unmovedStudentIds: string[];
};

export const adminRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

adminRouter.patch('/cohorts/:cohortId/step', async (c) => {
  const adminUser = requireAdminUser(c);
  if (adminUser instanceof Response) return adminUser;

  const databaseUrl = requireDatabase(c);
  if (databaseUrl instanceof Response) return databaseUrl;

  const body = await parseJsonBody<CohortStepBody>(c, {});
  const currentStep = normalizeStep(body.currentStep);

  if (currentStep === undefined) {
    return apiError(c, 'currentStep is required.', 400);
  }

  try {
    const db = getDb(databaseUrl);
    const [existingCohort] = await db
      .select()
      .from(cohorts)
      .where(eq(cohorts.id, c.req.param('cohortId')))
      .limit(1);

    if (!existingCohort) {
      return apiError(c, 'Cohort not found.', 404);
    }

    const [updatedCohort] = await db
      .update(cohorts)
      .set({
        currentStep,
        updatedAt: new Date(),
      })
      .where(eq(cohorts.id, existingCohort.id))
      .returning();

    const relocation = await applyFogRelocations(db, existingCohort.id, existingCohort.currentStep, currentStep);

    return c.json({
      success: true,
      relocation,
      cohort: {
        id: updatedCohort.id,
        schoolId: updatedCohort.schoolId,
        campusId: updatedCohort.campusId || undefined,
        startYear: updatedCohort.startYear,
        grade: updatedCohort.grade,
        level: updatedCohort.level,
        currentStep: updatedCohort.currentStep,
        name: updatedCohort.name,
        majorSpeciality: updatedCohort.majorSpeciality || undefined,
        minorSpeciality: updatedCohort.minorSpeciality || undefined,
        description: updatedCohort.description || undefined,
        createdAt: updatedCohort.createdAt?.toISOString?.(),
        updatedAt: updatedCohort.updatedAt?.toISOString?.(),
      },
    });
  } catch (error: any) {
    console.error('Cohort step SQL error:', error.message);
    return apiError(c, 'Cohort step could not be updated.', 500);
  }
});

async function applyFogRelocations(db: Database, cohortId: string, fromStep: number, toStep: number) {
  const emptyRelocation = {
    movedStudents: 0,
    forcedStudents: 0,
    unmovedStudents: 0,
    skipped: false,
  };

  if (toStep <= fromStep) return emptyRelocation;

  try {
    const relocationPlan = await planFogRelocations(db, cohortId, fromStep, toStep);

    if (relocationPlan.moves.length > 0) {
      await db.insert(gameCharacterMoves).values(relocationPlan.moves);
    }

    return {
      movedStudents: relocationPlan.moves.length,
      forcedStudents: relocationPlan.forcedStudentIds.length,
      unmovedStudents: relocationPlan.unmovedStudentIds.length,
      skipped: false,
    };
  } catch (error: any) {
    console.error('Cohort step relocation SQL error:', error.message);
    return {
      ...emptyRelocation,
      skipped: true,
    };
  }
}

adminRouter.get('/cohorts/:cohortId/step', async (c) => {
  const adminUser = requireAdminUser(c);
  if (adminUser instanceof Response) return adminUser;

  const databaseUrl = requireDatabase(c);
  if (databaseUrl instanceof Response) return databaseUrl;

  try {
    const db = getDb(databaseUrl);
    const [cohort] = await db
      .select({ id: cohorts.id, currentStep: cohorts.currentStep })
      .from(cohorts)
      .where(eq(cohorts.id, c.req.param('cohortId')))
      .limit(1);

    if (!cohort) {
      return apiError(c, 'Cohort not found.', 404);
    }

    return c.json({ success: true, step: cohort });
  } catch (error: any) {
    console.error('Cohort step SQL error:', error.message);
    return apiError(c, 'Cohort step could not be loaded.', 500);
  }
});

function normalizeStep(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) return undefined;
  return value;
}

async function planFogRelocations(
  db: Database,
  cohortId: string,
  fromStep: number,
  toStep: number
): Promise<RelocationPlan> {
  const [activeRun] = await db
    .select()
    .from(gameMapRuns)
    .where(and(eq(gameMapRuns.cohortId, cohortId), eq(gameMapRuns.status, 'active')))
    .limit(1);

  if (!activeRun) return { moves: [], forcedStudentIds: [], unmovedStudentIds: [] };

  const cohortStudents = await db
    .select({ id: students.id })
    .from(cohortMemberships)
    .innerJoin(students, eq(students.userId, cohortMemberships.userId))
    .where(eq(cohortMemberships.cohortId, cohortId));
  const studentIds = cohortStudents.map((student) => student.id);

  if (studentIds.length === 0) return { moves: [], forcedStudentIds: [], unmovedStudentIds: [] };

  const [activities, edges, completions, moves] = await Promise.all([
    db
      .select()
      .from(gameActivities)
      .where(
        or(
          sql`${gameActivities.cohortId} IS NULL`,
          eq(gameActivities.cohortId, cohortId),
          eq(gameActivities.mapRunId, activeRun.id)
        )
      ),
    db
      .select()
      .from(gameActivityEdges)
      .where(
        or(
          sql`${gameActivityEdges.cohortId} IS NULL AND ${gameActivityEdges.mapRunId} IS NULL`,
          eq(gameActivityEdges.cohortId, cohortId),
          eq(gameActivityEdges.mapRunId, activeRun.id)
        )
      ),
    db
      .select()
      .from(gameActivityCompletions)
      .where(
        and(
          eq(gameActivityCompletions.cohortId, cohortId),
          inArray(gameActivityCompletions.studentId, studentIds)
        )
      ),
    db
      .select()
      .from(gameCharacterMoves)
      .where(
        and(
          eq(gameCharacterMoves.cohortId, cohortId),
          eq(gameCharacterMoves.mapRunId, activeRun.id),
          inArray(gameCharacterMoves.studentId, studentIds)
        )
      )
      .orderBy(desc(gameCharacterMoves.createdAt)),
  ]);

  const graph = buildRelocationGraph(activities, edges);
  const latestMoveByStudentId = getLatestMoveByStudentId(moves);
  const completionsByStudentId = getCompletionsByStudentId(completions);
  const forcedStudentIds: string[] = [];
  const unmovedStudentIds: string[] = [];
  const moveInserts: CharacterMoveInsert[] = [];

  for (const studentId of studentIds) {
    const latestMove = latestMoveByStudentId.get(studentId);
    if (!latestMove) continue;

    const currentActivity = graph.activityById.get(latestMove.toActivityId);
    if (!currentActivity || isActivityActiveForStep(currentActivity, toStep)) continue;

    const clearTargetActivityId = findClearRelocationTarget(
      latestMove.toActivityId,
      graph,
      completionsByStudentId.get(studentId) || new Set<string>(),
      toStep
    );
    const targetActivityId =
      clearTargetActivityId || findForcedRelocationTarget(latestMove.toActivityId, graph, toStep);

    if (!targetActivityId) {
      unmovedStudentIds.push(studentId);
      continue;
    }
    const isForced = !clearTargetActivityId;
    if (isForced) forcedStudentIds.push(studentId);

    moveInserts.push({
      studentId,
      cohortId,
      mapRunId: activeRun.id,
      fromActivityId: latestMove.toActivityId,
      toActivityId: targetActivityId,
      moveType: 'move',
      metadata: {
        automatic: true,
        forced: isForced,
        reason: isForced ? 'cohort_step_forced_fog_relocation' : 'cohort_step_fog_relocation',
        fromStep,
        toStep,
      },
    });
  }

  return { moves: moveInserts, forcedStudentIds, unmovedStudentIds };
}

function buildRelocationGraph(activities: ActivityRecord[], edges: ActivityEdgeRecord[]) {
  const activityById = new Map(activities.map((activity) => [activity.id, activity]));
  const adjacencyByActivityId = new Map<string, string[]>();
  const incomingByActivityId = new Map<string, string[]>();

  for (const edge of edges) {
    if (!activityById.has(edge.fromActivityId) || !activityById.has(edge.toActivityId)) continue;

    adjacencyByActivityId.set(edge.fromActivityId, [
      ...(adjacencyByActivityId.get(edge.fromActivityId) || []),
      edge.toActivityId,
    ]);
    adjacencyByActivityId.set(edge.toActivityId, [
      ...(adjacencyByActivityId.get(edge.toActivityId) || []),
      edge.fromActivityId,
    ]);
    incomingByActivityId.set(edge.toActivityId, [
      ...(incomingByActivityId.get(edge.toActivityId) || []),
      edge.fromActivityId,
    ]);
  }

  return { activityById, adjacencyByActivityId, incomingByActivityId };
}

function getLatestMoveByStudentId(moves: CharacterMoveRecord[]) {
  const latestMoveByStudentId = new Map<string, CharacterMoveRecord>();

  for (const move of moves) {
    if (!latestMoveByStudentId.has(move.studentId)) {
      latestMoveByStudentId.set(move.studentId, move);
    }
  }

  return latestMoveByStudentId;
}

function getCompletionsByStudentId(completions: CompletionRecord[]) {
  const completionsByStudentId = new Map<string, Set<string>>();

  for (const completion of completions) {
    const studentCompletions = completionsByStudentId.get(completion.studentId) || new Set<string>();
    studentCompletions.add(completion.activityId);
    completionsByStudentId.set(completion.studentId, studentCompletions);
  }

  return completionsByStudentId;
}

function findClearRelocationTarget(
  fromActivityId: string,
  graph: ReturnType<typeof buildRelocationGraph>,
  completedActivityIds: Set<string>,
  currentStep: number
) {
  const queue = [...(graph.adjacencyByActivityId.get(fromActivityId) || [])];
  const visited = new Set<string>([fromActivityId]);

  while (queue.length > 0) {
    const activityId = queue.shift()!;
    if (visited.has(activityId)) continue;
    visited.add(activityId);

    const activity = graph.activityById.get(activityId);
    if (!activity) continue;

    if (isRelocationTarget(activity, graph.incomingByActivityId, completedActivityIds, currentStep)) {
      return activity.id;
    }

    queue.push(...(graph.adjacencyByActivityId.get(activityId) || []));
  }

  return undefined;
}

function findForcedRelocationTarget(
  fromActivityId: string,
  graph: ReturnType<typeof buildRelocationGraph>,
  currentStep: number
) {
  const reachableActiveTarget = findReachableRelocationTarget(fromActivityId, graph, (activity) =>
    isActivityActiveForStep(activity, currentStep)
  );
  if (reachableActiveTarget) return reachableActiveTarget;

  const activeTarget = [...graph.activityById.values()].find(
    (activity) => activity.id !== fromActivityId && isActivityActiveForStep(activity, currentStep)
  );
  if (activeTarget) return activeTarget.id;

  return findReachableRelocationTarget(fromActivityId, graph, (activity) => activity.id !== fromActivityId);
}

function findReachableRelocationTarget(
  fromActivityId: string,
  graph: ReturnType<typeof buildRelocationGraph>,
  isTarget: (activity: ActivityRecord) => boolean
) {
  const queue = [...(graph.adjacencyByActivityId.get(fromActivityId) || [])];
  const visited = new Set<string>([fromActivityId]);

  while (queue.length > 0) {
    const activityId = queue.shift()!;
    if (visited.has(activityId)) continue;
    visited.add(activityId);

    const activity = graph.activityById.get(activityId);
    if (!activity) continue;
    if (isTarget(activity)) return activity.id;

    queue.push(...(graph.adjacencyByActivityId.get(activityId) || []));
  }

  return undefined;
}

function isRelocationTarget(
  activity: ActivityRecord,
  incomingByActivityId: Map<string, string[]>,
  completedActivityIds: Set<string>,
  currentStep: number
) {
  if (!isActivityActiveForStep(activity, currentStep)) return false;

  const prerequisites = incomingByActivityId.get(activity.id) || [];
  return (
    completedActivityIds.has(activity.id) ||
    prerequisites.length === 0 ||
    prerequisites.every((activityId) => completedActivityIds.has(activityId))
  );
}

function isActivityActiveForStep(activity: Pick<ActivityRecord, 'requiredLevel' | 'stepRanges'>, step: number) {
  return parseStepRanges(activity.stepRanges, activity.requiredLevel).some((range) =>
    isStepInsideRange(step, range)
  );
}

function parseStepRanges(value: unknown, requiredLevel = 1): ActivityStepRange[] {
  if (!Array.isArray(value)) {
    return [{ startStep: Math.max(requiredLevel - 1, 0) }];
  }

  const ranges = value.flatMap((range): ActivityStepRange[] => {
    if (!range || typeof range !== 'object') return [];
    const candidate = range as Partial<ActivityStepRange>;
    if (typeof candidate.startStep !== 'number' || candidate.startStep < 0) return [];
    if (
      candidate.endStep !== undefined &&
      candidate.endStep !== null &&
      (typeof candidate.endStep !== 'number' || candidate.endStep <= candidate.startStep)
    ) {
      return [];
    }
    return [{ startStep: candidate.startStep, endStep: candidate.endStep ?? undefined }];
  });

  return ranges.length > 0 ? ranges : [{ startStep: Math.max(requiredLevel - 1, 0) }];
}

function isStepInsideRange(step: number, range: ActivityStepRange) {
  return step >= range.startStep && (range.endStep == null || step < range.endStep);
}
