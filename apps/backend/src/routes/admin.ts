import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { cohorts } from '../db/schema';
import type { UserPayload } from '../middleware/auth';
import { apiError, parseJsonBody, requireAdminUser, requireDatabaseUrl } from './http';

type Bindings = {
  DATABASE_URL?: string;
};

type Variables = {
  user?: UserPayload;
};

type CohortStepBody = {
  currentStep?: number;
};

export const adminRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

adminRouter.patch('/cohorts/:cohortId/step', async (c) => {
  const adminUser = requireAdminUser(c);
  if (adminUser instanceof Response) return adminUser;

  const databaseUrl = requireDatabaseUrl(c);
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

    return c.json({
      success: true,
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

adminRouter.get('/cohorts/:cohortId/step', async (c) => {
  const adminUser = requireAdminUser(c);
  if (adminUser instanceof Response) return adminUser;

  const databaseUrl = requireDatabaseUrl(c);
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
