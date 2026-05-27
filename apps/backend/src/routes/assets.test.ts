import { describe, expect, it, vi } from 'vitest';
import { sign } from 'hono/jwt';
import app from '../index';

const JWT_SECRET = 'test-secret';

describe('asset routes', () => {
  it('does not accept the development JWT secret in production', async () => {
    const bucket = createBucketMock();
    const token = await sign(
      { id: 'user-1', email: 'user@test.dev', isAdmin: false },
      'eduquest-secret-key-1337-gaming-token',
      'HS256'
    );
    const form = new FormData();
    form.set('file', new File(['avatar-bytes'], 'avatar.webp', { type: 'image/webp' }));

    const response = await app.request(
      '/api/assets/avatar',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      },
      { ASSETS: bucket, APP_ENV: 'production' }
    );

    expect(response.status).toBe(500);
    expect(bucket.put).not.toHaveBeenCalled();
  });

  it('stores authenticated avatar uploads in R2 and returns a public asset URL', async () => {
    const bucket = createBucketMock();
    const token = await tokenFor({ id: 'user-1', email: 'user@test.dev', isAdmin: false });
    const form = new FormData();
    form.set('file', new File(['avatar-bytes'], 'avatar.webp', { type: 'image/webp' }));

    const response = await app.request(
      '/api/assets/avatar',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      },
      { ASSETS: bucket, JWT_SECRET }
    );
    const payload = (await response.json()) as { success: boolean; key: string; url: string };

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.key).toMatch(/^users\/user-1\/avatar-/);
    expect(payload.url).toBe(`http://localhost/assets/${payload.key}`);
    expect(bucket.put).toHaveBeenCalledWith(
      payload.key,
      expect.any(ArrayBuffer),
      expect.objectContaining({
        httpMetadata: expect.objectContaining({
          contentType: 'image/webp',
          cacheControl: 'public, max-age=31536000, immutable',
        }),
        customMetadata: expect.objectContaining({
          kind: 'avatar',
          uploadedBy: 'user-1',
        }),
      })
    );
  });

  it('rejects SVG avatars before writing to R2', async () => {
    const bucket = createBucketMock();
    const token = await tokenFor({ id: 'user-1', email: 'user@test.dev', isAdmin: false });
    const form = new FormData();
    form.set('file', new File(['<svg />'], 'avatar.svg', { type: 'image/svg+xml' }));

    const response = await app.request(
      '/api/assets/avatar',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      },
      { ASSETS: bucket, JWT_SECRET }
    );

    expect(response.status).toBe(400);
    expect(bucket.put).not.toHaveBeenCalled();
  });

  it('requires an admin user for school logo uploads', async () => {
    const bucket = createBucketMock();
    const token = await tokenFor({ id: 'user-1', email: 'user@test.dev', isAdmin: false });
    const form = new FormData();
    form.set('file', new File(['logo'], 'logo.png', { type: 'image/png' }));

    const response = await app.request(
      '/api/assets/school-logo',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      },
      { ASSETS: bucket, JWT_SECRET }
    );

    expect(response.status).toBe(403);
    expect(bucket.put).not.toHaveBeenCalled();
  });

  it('sanitizes safe SVG school logos and rejects unsafe SVG content', async () => {
    const bucket = createBucketMock();
    const token = await tokenFor({ id: 'admin-1', email: 'admin@test.dev', isAdmin: true });
    const safeForm = new FormData();
    safeForm.set(
      'file',
      new File(['<?xml version="1.0"?><!-- comment --><svg viewBox="0 0 1 1"></svg>'], 'logo.svg', {
        type: 'image/svg+xml',
      })
    );
    safeForm.set('entityId', 'school-1');

    const safeResponse = await app.request(
      '/api/assets/school-logo',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: safeForm,
      },
      { ASSETS: bucket, JWT_SECRET }
    );
    const safePayload = (await safeResponse.json()) as { key: string };

    expect(safeResponse.status).toBe(200);
    expect(safePayload.key).toMatch(/^schools\/school-1\/school-logo-/);
    expect(bucket.put).toHaveBeenCalledWith(
      safePayload.key,
      '<svg viewBox="0 0 1 1"></svg>',
      expect.any(Object)
    );

    const unsafeForm = new FormData();
    unsafeForm.set(
      'file',
      new File(['<svg><script>alert(1)</script></svg>'], 'logo.svg', {
        type: 'image/svg+xml',
      })
    );

    const unsafeResponse = await app.request(
      '/api/assets/school-logo',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: unsafeForm,
      },
      { ASSETS: bucket, JWT_SECRET }
    );

    expect(unsafeResponse.status).toBe(400);
    expect(bucket.put).toHaveBeenCalledTimes(1);
  });

  it('serves R2 assets with cache and SVG security headers', async () => {
    const object = createR2Object('<svg viewBox="0 0 1 1"></svg>', 'image/svg+xml');
    const bucket = createBucketMock(object);

    const response = await app.request('/assets/schools/school-1/logo.svg', {}, { ASSETS: bucket });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('<svg viewBox="0 0 1 1"></svg>');
    expect(response.headers.get('content-type')).toBe('image/svg+xml');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('content-security-policy')).toContain("default-src 'none'");
    expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
  });

  it('does not serve private boss submission objects through the public asset route', async () => {
    const object = createR2Object('private', 'application/zip');
    const bucket = createBucketMock(object);

    const response = await app.request(
      '/assets/boss-submissions/cohort-1/activity-1/student-1/attachments/file.zip',
      {},
      { ASSETS: bucket }
    );

    expect(response.status).toBe(404);
    expect(bucket.get).not.toHaveBeenCalled();
  });

  it('rejects data URLs when profile updates try to persist avatars directly', async () => {
    const token = await tokenFor({ id: 'user-1', email: 'user@test.dev', isAdmin: false });

    const response = await app.request(
      '/api/auth/profile',
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ avatarUrl: 'data:image/png;base64,abc123' }),
      },
      { JWT_SECRET, APP_ENV: 'development' }
    );
    const payload = (await response.json()) as { errorKey?: string };

    expect(response.status).toBe(400);
    expect(payload.errorKey).toBe('profile.errors.avatarProcessingFailed');
  });

  it('rejects data URLs when management updates try to persist school logos directly', async () => {
    const token = await tokenFor({ id: 'admin-1', email: 'admin@test.dev', isAdmin: true });

    const response = await app.request(
      '/api/auth/management/schools/school_mock_1',
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logoUrl: 'data:image/svg+xml;base64,abc123' }),
      },
      { JWT_SECRET, APP_ENV: 'development' }
    );

    expect(response.status).toBe(400);
  });

  it('requires a database before accepting self-service profile updates', async () => {
    const token = await tokenFor({ id: 'user-1', email: 'user@test.dev', isAdmin: false });

    const response = await app.request(
      '/api/auth/profile',
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: 'Updated profile',
          email: 'admin@test.dev',
          githubUsername: 'aptitek',
        }),
      },
      { JWT_SECRET, APP_ENV: 'development' }
    );
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(503);
    expect(payload.error).toBe('DATABASE_URL is required.');
  });

  it('requires a GitHub webhook secret in production', async () => {
    const response = await app.request(
      '/api/webhooks/github',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'opened' }),
      },
      { APP_ENV: 'production' }
    );

    expect(response.status).toBe(401);
  });
});

function createBucketMock(object?: R2ObjectBody) {
  return {
    put: vi.fn(),
    get: vi.fn().mockResolvedValue(object ?? null),
  } as unknown as R2Bucket & { put: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };
}

function createR2Object(body: string, contentType: string) {
  return {
    body: new Response(body).body,
    httpEtag: '"etag-1"',
    writeHttpMetadata(headers: Headers) {
      headers.set('content-type', contentType);
      headers.set('cache-control', 'public, max-age=31536000, immutable');
    },
  } as R2ObjectBody;
}

function tokenFor(payload: { id: string; email: string; isAdmin: boolean }) {
  return sign(payload, JWT_SECRET, 'HS256');
}
