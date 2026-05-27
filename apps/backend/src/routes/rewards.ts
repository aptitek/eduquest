import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { cohortMemberships, gameActivities, students } from '../db/schema';
import type { UserPayload } from '../middleware/auth';
import { RewardPreviewService } from '../services/reward-preview';

type Bindings = {
  DATABASE_URL?: string;
};

type Variables = {
  user?: UserPayload;
};

export const rewardsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

rewardsRouter.get('/rewards/preview', async (c) => {
  const databaseUrl = c.env?.DATABASE_URL;
  const user = c.get('user');
  const activityId = c.req.query('activityId');
  const studentId = c.req.query('studentId');

  if (!databaseUrl) {
    return c.json({ success: false, error: 'DATABASE_URL is required.' }, 503);
  }

  if (!activityId || !studentId) {
    return c.json({ success: false, error: 'activityId and studentId are required.' }, 400);
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
        return c.json({ success: false, error: 'Forbidden.' }, 403);
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
      return c.json({ success: false, error: 'Guild membership not found.' }, 404);
    }

    const breakdown = await new RewardPreviewService(db).preview({
      activityId,
      studentId,
      guildId: membership.guildId,
      cohortId: membership.cohortId || undefined,
    });

    if (!breakdown) {
      return c.json({ success: false, error: 'Activity not found.' }, 404);
    }

    return c.json({ success: true, breakdown });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Reward preview failed.';
    console.error('Reward preview error:', message);
    return c.json({ success: false, error: message }, 500);
  }
});
