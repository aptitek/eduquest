import { describe, expect, it } from 'vitest';
import { sign } from 'hono/jwt';
import app from '../index';

const JWT_SECRET = 'test-secret';
const DB = {} as D1Database;

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
});

function tokenFor(isAdmin: boolean) {
  return sign({ id: 'user-1', email: 'user@test.dev', isAdmin }, JWT_SECRET, 'HS256');
}
