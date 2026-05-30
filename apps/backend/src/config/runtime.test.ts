import { describe, expect, it } from 'vitest';
import { getFrontendUrl, getJwtSecret, isDebugAuthEnabled } from './runtime';

describe('runtime configuration', () => {
  it('uses development defaults without leaking them into production', () => {
    expect(getFrontendUrl({ APP_ENV: 'development' })).toBe('http://localhost:5173');
    expect(getJwtSecret({ APP_ENV: 'development' })).toBe('eduquest-secret-key-1337-gaming-token');
    expect(getFrontendUrl({ APP_ENV: 'production' })).toBeUndefined();
    expect(getJwtSecret({ APP_ENV: 'production' })).toBeUndefined();
  });

  it('keeps debug auth tied to explicit dev-only debug flags', () => {
    expect(isDebugAuthEnabled({ APP_ENV: 'development' })).toBe(false);
    expect(
      isDebugAuthEnabled({
        APP_ENV: 'development',
        ENABLE_DEBUG_AUTH: 'true',
      })
    ).toBe(true);
    expect(isDebugAuthEnabled({ APP_ENV: 'development' })).toBe(false);
    expect(isDebugAuthEnabled({ APP_ENV: 'production', ENABLE_DEBUG_AUTH: 'true' })).toBe(false);
  });
});
