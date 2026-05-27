import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { cohortMemberships, gameActivities, students } from '../db/schema';
import type { UserPayload } from '../middleware/auth';
import { RewardPreviewService } from '../services/reward-preview';
import { apiError, forbidden, requireDatabaseUrl } from './http';

type Bindings = {
  DATABASE_URL?: string;
};

type Variables = {
  user?: UserPayload;
};

export const rewardsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

rewardsRouter.get('/rewards/preview', async (c) => {
  const databaseUrl = requireDatabaseUrl(c);
  const user = c.get('user');
  const activityId = c.req.query('activityId');
  const studentId = c.req.query('studentId');

  if (databaseUrl instanceof Response) return databaseUrl;

  if (!activityId || !studentId) {
    return apiError(c, 'activityId and studentId are required.', 400);
  }

  try {
    const db = getDb(databaseUrl);

    if (user?.id) {
      const [studentRecord] = await db
        .select({ id: students.id })
        .from(students)
        .where(eq(students.userId, user.id))
        .limit(1);

      if (studentRecord && studentRecord.id !== studentId) {
        return forbidden(c, 'Forbidden.');
      }
    }

    const [membership] = await db
      .select({
        guildId: cohortMemberships.guildId,
        cohortId: cohortMemberships.cohortId,
      })
      .from(cohortMemberships)
      .innerJoin(students, eq(students.userId, cohortMemberships.userId))
      .where(eq(students.id, studentId))
      .limit(1);

    if (!membership?.guildId) {
      return apiError(c, 'Guild membership not found.', 404);
    }

    const breakdown = await new RewardPreviewService(db).preview({
      activityId,
      studentId,
      guildId: membership.guildId,
      cohortId: membership.cohortId || undefined,
    });

    if (!breakdown) {
      return apiError(c, 'Activity not found.', 404);
    }

    return c.json({ success: true, breakdown });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Reward preview failed.';
    console.error('Reward preview error:', message);
    return apiError(c, message, 500);
  }
});
