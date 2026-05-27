import { describe, expect, it } from 'vitest';
import { sign } from 'hono/jwt';
import app from '../index';

const JWT_SECRET = 'test-secret';

describe('map routes', () => {
  it('returns FTL map data with run, activities, edges, and completions', async () => {
    const response = await app.request(
      '/api/map',
      { headers: { Authorization: `Bearer ${await tokenFor()}` } },
      { JWT_SECRET, APP_ENV: 'development', ENABLE_MOCK_DATA: 'true' }
    );
    const payload = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.map.run).toMatchObject({ status: 'active' });
    expect(payload.map.cohortCurrentStep).toBeUndefined();
    expect(payload.map.activities[0]).toEqual(
      expect.objectContaining({
        mapX: expect.any(Number),
        mapY: expect.any(Number),
        sectorDepth: expect.any(Number),
        metadata: expect.any(Object),
      })
    );
    expect(payload.map.activities[0].stepRanges).toBeUndefined();
    expect(payload.map.edges.length).toBeGreaterThan(0);
    expect(payload.map.completions.length).toBeGreaterThan(0);
    expect(payload.map.currentActivityId).toBe('debug_activity_variables');
    expect(payload.map.nodeOccupancies).toContainEqual(
      expect.objectContaining({
        activityId: 'debug_activity_variables',
        totalStudents: 3,
        segments: [
          expect.objectContaining({
            kind: 'solo',
            studentCount: 1,
            members: [
              expect.objectContaining({
                studentId: 'debug_student_lina',
                displayName: 'Lina MOREL',
                avatarUrl: expect.any(String),
                characterClass: 'guide',
              }),
            ],
          }),
        ],
      })
    );
    expect(payload.map.nodeOccupancies).toContainEqual(
      expect.objectContaining({
        activityId: 'debug_activity_api_bridge',
        totalStudents: 3,
        segments: expect.arrayContaining([
          expect.objectContaining({
            kind: 'guild',
            guildName: expect.any(String),
            color: expect.any(String),
            studentCount: 1,
            members: [
              expect.objectContaining({
                displayName: expect.any(String),
                avatarUrl: expect.any(String),
              }),
            ],
          }),
        ]),
      })
    );
    expect(payload.map.activities).toContainEqual(
      expect.objectContaining({ id: 'debug_activity_variables', isCurrent: true })
    );
  });

  it('returns a unified activity completion when completing a node', async () => {
    const response = await app.request(
      '/api/map/activities/debug_activity_variables/complete',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${await tokenFor()}` },
      },
      { JWT_SECRET, APP_ENV: 'development', ENABLE_MOCK_DATA: 'true' }
    );
    const payload = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.completion).toEqual(
      expect.objectContaining({
        activityId: 'debug_activity_variables',
        cohortId: expect.any(String),
        completionType: 'read',
      })
    );
  });

  it('records a character move and returns the new current activity', async () => {
    const response = await app.request(
      '/api/map/activities/debug_activity_api_bridge/move',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${await tokenFor()}` },
      },
      { JWT_SECRET, APP_ENV: 'development', ENABLE_MOCK_DATA: 'true' }
    );
    const payload = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.currentActivityId).toBe('debug_activity_api_bridge');
    expect(payload.move).toEqual(
      expect.objectContaining({
        cohortId: expect.any(String),
        mapRunId: expect.any(String),
        toActivityId: 'debug_activity_api_bridge',
        moveType: 'move',
      })
    );
  });
});

function tokenFor() {
  return sign({ id: 'user-1', email: 'user@test.dev', isAdmin: false }, JWT_SECRET, 'HS256');
}
