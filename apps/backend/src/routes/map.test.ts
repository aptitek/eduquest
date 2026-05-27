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
});

function tokenFor() {
  return sign({ id: 'user-1', email: 'user@test.dev', isAdmin: false }, JWT_SECRET, 'HS256');
}
