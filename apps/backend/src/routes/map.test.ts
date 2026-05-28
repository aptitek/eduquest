import { describe, expect, it } from 'vitest';
import { sign } from 'hono/jwt';
import app from '../index';

const JWT_SECRET = 'test-secret';

describe('map routes', () => {
  it('requires database-backed map data', async () => {
    const response = await app.request(
      '/api/map',
      { headers: { Authorization: `Bearer ${await tokenFor()}` } },
      { JWT_SECRET, APP_ENV: 'development' }
    );
    const payload = (await response.json()) as any;

    expect(response.status).toBe(503);
    expect(payload.success).toBe(false);
    expect(payload.error).toBe('DATABASE_URL is required.');
  });

  it('does not complete activities without a database', async () => {
    const response = await app.request(
      '/api/map/activities/debug_activity_variables/complete',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${await tokenFor()}` },
      },
      { JWT_SECRET, APP_ENV: 'development' }
    );
    const payload = (await response.json()) as any;

    expect(response.status).toBe(503);
    expect(payload.success).toBe(false);
    expect(payload.error).toBe('DATABASE_URL is required.');
  });

  it('does not move characters without a database', async () => {
    const response = await app.request(
      '/api/map/activities/debug_activity_api_bridge/move',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${await tokenFor()}` },
      },
      { JWT_SECRET, APP_ENV: 'development' }
    );
    const payload = (await response.json()) as any;

    expect(response.status).toBe(503);
    expect(payload.success).toBe(false);
    expect(payload.error).toBe('DATABASE_URL is required.');
  });

  it('requires an admin to update activity positions', async () => {
    const response = await app.request(
      '/api/map/activities/debug_activity_api_bridge/position',
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${await tokenFor(false)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mapX: 120, mapY: 240 }),
      },
      { JWT_SECRET, APP_ENV: 'development' }
    );

    expect(response.status).toBe(403);
  });

  it('rejects invalid activity positions before updating', async () => {
    const response = await app.request(
      '/api/map/activities/debug_activity_api_bridge/position',
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${await tokenFor(true)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mapX: 120.5, mapY: 240 }),
      },
      { JWT_SECRET, APP_ENV: 'development', DATABASE_URL: 'postgres://invalid.test/db' }
    );
    const payload = (await response.json()) as any;

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(payload.error).toContain('mapX and mapY');
  });

  it('requires an admin to delete activities', async () => {
    const response = await app.request(
      '/api/map/activities/debug_activity_api_bridge',
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${await tokenFor(false)}`,
        },
      },
      { JWT_SECRET, APP_ENV: 'development' }
    );

    expect(response.status).toBe(403);
  });

  it('requires an admin to create activities', async () => {
    const response = await app.request(
      '/api/map/activities',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await tokenFor(false)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mapX: 500, mapY: 300, currentStep: 0 }),
      },
      { JWT_SECRET, APP_ENV: 'development' }
    );

    expect(response.status).toBe(403);
  });

  it('rejects invalid activity icons before updating', async () => {
    const response = await app.request(
      '/api/map/activities/debug_activity_api_bridge/icon',
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${await tokenFor(true)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ iconKey: '' }),
      },
      { JWT_SECRET, APP_ENV: 'development', DATABASE_URL: 'postgres://invalid.test/db' }
    );
    const payload = (await response.json()) as any;

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(payload.error).toContain('iconKey');
  });

  it('requires an admin to update activity step ranges', async () => {
    const response = await app.request(
      '/api/map/activities/debug_activity_api_bridge/step-ranges',
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${await tokenFor(false)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stepRanges: [{ startStep: 0 }] }),
      },
      { JWT_SECRET, APP_ENV: 'development' }
    );

    expect(response.status).toBe(403);
  });

  it('rejects malformed activity step ranges before updating', async () => {
    const response = await app.request(
      '/api/map/activities/debug_activity_api_bridge/step-ranges',
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${await tokenFor(true)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stepRanges: [{ startStep: 3, endStep: 3 }] }),
      },
      { JWT_SECRET, APP_ENV: 'development', DATABASE_URL: 'postgres://invalid.test/db' }
    );
    const payload = (await response.json()) as any;

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(payload.error).toContain('endStep');
  });

  it('requires an admin to delete activity edges', async () => {
    const response = await app.request(
      '/api/map/edges/00000000-0000-0000-0000-000000000001',
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${await tokenFor(false)}`,
        },
      },
      { JWT_SECRET, APP_ENV: 'development' }
    );

    expect(response.status).toBe(403);
  });

  it('requires an admin to update activity edge styles', async () => {
    const response = await app.request(
      '/api/map/edges/00000000-0000-0000-0000-000000000001',
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${await tokenFor(false)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ styleWindows: [{ startStep: 0, color: 'var(--color-status-quest)' }] }),
      },
      { JWT_SECRET, APP_ENV: 'development' }
    );

    expect(response.status).toBe(403);
  });

  it('rejects overlapping edge style windows before updating', async () => {
    const response = await app.request(
      '/api/map/edges/00000000-0000-0000-0000-000000000001',
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${await tokenFor(true)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          styleWindows: [
            { startStep: 0, endStep: 4, color: 'var(--color-status-quest)' },
            { startStep: 1, endStep: 5, animation: 'flow' },
          ],
        }),
      },
      { JWT_SECRET, APP_ENV: 'development', DATABASE_URL: 'postgres://invalid.test/db' }
    );
    const payload = (await response.json()) as any;

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(payload.error).toContain('overlap');
  });
});

function tokenFor(isAdmin = false) {
  return sign({ id: 'user-1', email: 'user@test.dev', isAdmin }, JWT_SECRET, 'HS256');
}
