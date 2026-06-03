import { describe, expect, it, vi } from 'vitest';
import { sign } from 'hono/jwt';
import app from '../index';

const JWT_SECRET = 'test-secret';
const DB = {} as D1Database;

const getDbMock = vi.hoisted(() => vi.fn());

vi.mock('../db', () => ({
  getDb: getDbMock,
}));

describe('admin routes', () => {
  it('requires an admin for cohort progression updates', async () => {
    const response = await app.request(
      '/api/admin/cohorts/cohort-1/step',
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${await tokenFor(false)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentStep: 2 }),
      },
      { JWT_SECRET }
    );

    expect(response.status).toBe(403);
  });

  it('rejects invalid current steps before updating', async () => {
    const response = await app.request(
      '/api/admin/cohorts/cohort-1/step',
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${await tokenFor(true)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentStep: -1 }),
      },
      { JWT_SECRET, DB }
    );
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(payload.error).toContain('currentStep');
  });

  it('updates cohort progression even when fog relocation fails', async () => {
    const existingCohort = {
      id: 'cohort-1',
      schoolId: 'school-1',
      campusId: null,
      startYear: 2026,
      grade: 'master',
      level: 1,
      currentStep: 1,
      name: 'Cohort 1',
      majorSpeciality: null,
      minorSpeciality: null,
      description: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    const updatedCohort = { ...existingCohort, currentStep: 2, updatedAt: new Date('2026-01-02T00:00:00.000Z') };
    const updateSet = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([updatedCohort]),
      }),
    });
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(selectLimitBuilder([existingCohort]))
        .mockReturnValueOnce(selectLimitBuilder(new Error('relocation query failed'))),
      update: vi.fn().mockReturnValue({ set: updateSet }),
      insert: vi.fn(),
    };
    getDbMock.mockReturnValueOnce(db);

    const response = await app.request(
      '/api/admin/cohorts/cohort-1/step',
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${await tokenFor(true)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentStep: 2 }),
      },
      { JWT_SECRET, DB }
    );
    const payload = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.cohort.currentStep).toBe(2);
    expect(payload.relocation.skipped).toBe(true);
    expect(db.insert).not.toHaveBeenCalled();
  });
});

function tokenFor(isAdmin: boolean) {
  return sign({ id: 'user-1', email: 'user@test.dev', isAdmin }, JWT_SECRET, 'HS256');
}

function selectLimitBuilder(result: unknown[] | Error) {
  const builder = {
    from: vi.fn(() => builder),
    where: vi.fn(() => builder),
    limit: vi.fn(() => (result instanceof Error ? Promise.reject(result) : Promise.resolve(result))),
  };
  return builder;
}
