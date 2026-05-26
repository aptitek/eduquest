import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../auth/useAuth', () => ({
  BACKEND_BASE_URL: 'http://backend.test',
}));

import {
  completeMapActivity,
  fetchCohortProgressData,
  fetchGuilds,
  fetchMapActivities,
  moveCharacterToActivity,
  spendGuildVotes,
} from './api';

describe('game API client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads guilds from the authenticated backend route', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true, guilds: [{ id: 'guild-1', name: 'Solarized Sentinels', cohortId: 'cohort-1', gold: 180 }] }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchGuilds('token-1')).resolves.toEqual([
      { id: 'guild-1', name: 'Solarized Sentinels', cohortId: 'cohort-1', gold: 180 },
    ]);
    expect(fetchMock).toHaveBeenCalledWith('http://backend.test/api/guilds', {
      headers: { Authorization: 'Bearer token-1' },
    });
  });

  it('loads cohort progress data without falling back to local card data', async () => {
    const progress = {
      gauge: { currentPoints: 20, targetPoints: 100, labelI18nKey: 'dashboard.dock.milestone', milestones: [] },
      notifications: [],
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ success: true, progress })));

    await expect(fetchCohortProgressData('token-1')).resolves.toEqual(progress);
  });

  it('loads map activities from the backend route', async () => {
    const map = {
      run: { id: 'run-1', cohortId: 'cohort-1', currentSectorDepth: 0, fogRevealDepth: 1, status: 'active' },
      activities: [
        { id: 'activity-1', type: 'practical', title: 'Quest', isGraded: true, mapX: 10, mapY: 20, sectorDepth: 1, requiredLevel: 1, basePoints: 100 },
      ],
      edges: [],
      completions: [],
      currentActivityId: 'activity-1',
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ success: true, map })));

    await expect(fetchMapActivities('token-1')).resolves.toEqual(map);
  });

  it('posts activity completion to the backend route', async () => {
    const completion = {
      id: 'completion-1',
      studentId: 'student-1',
      cohortId: 'cohort-1',
      activityId: 'activity-1',
      completionType: 'submission',
      grade: 1,
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true, completion }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(completeMapActivity('token-1', 'activity-1')).resolves.toEqual(completion);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://backend.test/api/map/activities/activity-1/complete',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer token-1' },
      }
    );
  });

  it('posts character moves to the backend route', async () => {
    const move = {
      id: 'move-1',
      studentId: 'student-1',
      cohortId: 'cohort-1',
      mapRunId: 'run-1',
      toActivityId: 'activity-1',
      moveType: 'move',
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true, move, currentActivityId: 'activity-1' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(moveCharacterToActivity('token-1', 'activity-1')).resolves.toEqual({
      move,
      currentActivityId: 'activity-1',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://backend.test/api/map/activities/activity-1/move',
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
