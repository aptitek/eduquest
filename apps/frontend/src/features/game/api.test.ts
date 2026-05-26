import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../auth/useAuth', () => ({
  BACKEND_BASE_URL: 'http://backend.test',
}));

import {
  completeMapActivity,
  fetchDashboardData,
  fetchGuilds,
  fetchMapActivities,
  spendGuildVotes,
} from './api';

describe('game API client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads guilds from the authenticated backend route', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true, guilds: [{ id: 'guild-1', name: 'Solarized Sentinels', cohortId: 'cohort-1', totalPoints: 180 }] }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchGuilds('token-1')).resolves.toEqual([
      { id: 'guild-1', name: 'Solarized Sentinels', cohortId: 'cohort-1', totalPoints: 180 },
    ]);
    expect(fetchMock).toHaveBeenCalledWith('http://backend.test/api/guilds', {
      headers: { Authorization: 'Bearer token-1' },
    });
  });

  it('loads dashboard data without falling back to local card data', async () => {
    const dashboard = {
      gauge: { currentPoints: 20, targetPoints: 100, labelI18nKey: 'dashboard.dock.milestone', milestones: [] },
      rewards: [],
      notifications: [],
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ success: true, dashboard })));

    await expect(fetchDashboardData('token-1')).resolves.toEqual(dashboard);
  });

  it('loads map activities from the backend route', async () => {
    const activities = [
      { id: 'activity-1', type: 'quest', title: 'Quest', isGraded: true, x: 10, y: 20, requiredLevel: 1, basePoints: 100 },
    ];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ success: true, activities })));

    await expect(fetchMapActivities('token-1')).resolves.toEqual(activities);
  });

  it('posts activity completion to the backend route', async () => {
    const battle = { id: 'battle-1', studentId: 'student-1', activityId: 'activity-1', grade: 1 };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true, battle }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(completeMapActivity('token-1', 'activity-1')).resolves.toEqual(battle);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://backend.test/api/map/activities/activity-1/complete',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer token-1' },
      }
    );
  });

  it('posts guild vote spending to the backend route', async () => {
    const voteSpend = { guildId: 'guild-1', votes: 1, cost: 1, balance: 179 };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true, voteSpend }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(spendGuildVotes('token-1', 'guild-1', 1)).resolves.toEqual(voteSpend);
    expect(fetchMock).toHaveBeenCalledWith('http://backend.test/api/guilds/guild-1/votes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-1',
      },
      body: JSON.stringify({ votes: 1 }),
    });
  });

  it('surfaces API errors instead of substituting mock data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ success: false, error: 'DATABASE_URL is required.' }, 503))
    );

    await expect(fetchMapActivities('token-1')).rejects.toThrow('DATABASE_URL is required.');
  });
});

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}
