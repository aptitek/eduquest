import { describe, expect, it } from 'vitest';
import { getFrontendUrl, getJwtSecret, isDebugAuthEnabled, isMockDataEnabled } from './runtime';

describe('runtime configuration', () => {
  it('keeps mock data opt-in when a dev database is configured', () => {
    expect(isMockDataEnabled({ APP_ENV: 'development', DATABASE_URL: 'postgres://local' })).toBe(
      false
    );
    expect(
      isMockDataEnabled({
        APP_ENV: 'development',
        DATABASE_URL: 'postgres://local',
        ENABLE_MOCK_DATA: 'true',
      })
    ).toBe(true);
  });

  it('allows offline mock data only outside production', () => {
    expect(isMockDataEnabled({ APP_ENV: 'development' })).toBe(true);
    expect(isMockDataEnabled({ APP_ENV: 'production', ENABLE_MOCK_DATA: 'true' })).toBe(false);
  });

  it('uses development defaults without leaking them into production', () => {
    expect(getFrontendUrl({ APP_ENV: 'development' })).toBe('http://localhost:5173');
    expect(getJwtSecret({ APP_ENV: 'development' })).toBe('eduquest-secret-key-1337-gaming-token');
    expect(getFrontendUrl({ APP_ENV: 'production' })).toBeUndefined();
    expect(getJwtSecret({ APP_ENV: 'production' })).toBeUndefined();
  });

  it('keeps debug auth tied to dev-only mock or explicit debug flags', () => {
    expect(isDebugAuthEnabled({ APP_ENV: 'development', DATABASE_URL: 'postgres://local' })).toBe(
      false
    );
    expect(
      isDebugAuthEnabled({
        APP_ENV: 'development',
        DATABASE_URL: 'postgres://local',
        ENABLE_DEBUG_AUTH: 'true',
      })
    ).toBe(true);
    expect(
      isDebugAuthEnabled({ APP_ENV: 'production', ENABLE_DEBUG_AUTH: 'true', ENABLE_MOCK_DATA: 'true' })
    ).toBe(false);
  });
});
