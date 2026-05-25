import type { Activity, DashboardData, GameBattle } from '@eduquest/shared';
import { BACKEND_BASE_URL } from '../auth/useAuth';

type DashboardResponse =
  | {
      success: true;
      dashboard: DashboardData;
    }
  | {
      success: false;
      error?: string;
    };

export async function fetchDashboardData(token: string): Promise<DashboardData> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/dashboard`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = (await response.json()) as DashboardResponse;

  if (!response.ok || !data.success) {
    throw new Error(data.success ? 'Dashboard request failed.' : data.error || 'Dashboard request failed.');
  }

  return data.dashboard;
}

type MapResponse =
  | {
      success: true;
      activities: Activity[];
    }
  | {
      success: false;
      error?: string;
    };

type CompleteActivityResponse =
  | {
      success: true;
      battle: GameBattle;
    }
  | {
      success: false;
      error?: string;
    };

export async function fetchMapActivities(token: string): Promise<Activity[]> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/map`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = (await response.json()) as MapResponse;

  if (!response.ok || !data.success) {
    throw new Error(data.success ? 'Map request failed.' : data.error || 'Map request failed.');
  }

  return data.activities;
}

export async function completeMapActivity(token: string, activityId: string): Promise<GameBattle> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/map/activities/${activityId}/complete`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = (await response.json()) as CompleteActivityResponse;

  if (!response.ok || !data.success) {
    throw new Error(
      data.success ? 'Activity completion failed.' : data.error || 'Activity completion failed.'
    );
  }

  return data.battle;
}
