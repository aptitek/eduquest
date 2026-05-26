import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../auth/useAuth', () => ({
  BACKEND_BASE_URL: 'http://backend.test',
}));

import { uploadAsset } from './api';

describe('asset API client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('uploads a file with auth and optional entity metadata', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        key: 'schools/school-1/school-logo-1.svg',
        url: 'http://backend.test/assets/schools/school-1/school-logo-1.svg',
        contentType: 'image/svg+xml',
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const file = new File(['<svg />'], 'logo.svg', { type: 'image/svg+xml' });
    await expect(uploadAsset('token-1', 'school-logo', file, 'school-1')).resolves.toEqual({
      success: true,
      key: 'schools/school-1/school-logo-1.svg',
      url: 'http://backend.test/assets/schools/school-1/school-logo-1.svg',
      contentType: 'image/svg+xml',
    });

    expect(fetchMock).toHaveBeenCalledWith('http://backend.test/api/assets/school-logo', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token-1',
      },
      body: expect.any(FormData),
    });

    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body.get('file')).toBe(file);
    expect(body.get('entityId')).toBe('school-1');
  });

  it('surfaces backend upload errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ success: false, error: 'Unsafe SVG content.' }, 400))
    );

    const file = new File(['<script />'], 'logo.svg', { type: 'image/svg+xml' });
    await expect(uploadAsset('token-1', 'school-logo', file)).rejects.toThrow(
      'Unsafe SVG content.'
    );
  });
});

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}
