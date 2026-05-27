import type {
  Game,
  BossActivitySubmissionField,
  CohortProgressData,
  GameActivityCompletion,
  GameCharacterClass,
  GameCharacterClassDefinition,
  GameStats,
  GameCharacterMove,
  GameMapData,
  GameRewardCard,
  GameRewardCardPayload,
  Guild,
} from '@eduquest/shared';
import { BACKEND_BASE_URL } from '../auth/useAuth';

export type ActivityCompletionDraft = {
  answers?: Array<Pick<BossActivitySubmissionField, 'fieldId' | 'value'>>;
  files?: Record<string, File[]>;
};

function withGameParam(path: string, gameId?: string | null) {
  const url = new URL(`${BACKEND_BASE_URL}${path}`);
  if (gameId) url.searchParams.set('gameId', gameId);
  return url.toString();
}

type GamesResponse =
  | {
      success: true;
      games: Game[];
      selectedGameId?: string;
      source?: string;
    }
  | {
      success: false;
      error?: string;
    };

type CharacterClassesResponse =
  | {
      success: true;
      characterClasses: GameCharacterClassDefinition[];
    }
  | {
      success: false;
      error?: string;
    };

type DashboardResponse =
  | {
      success: true;
      progress: CohortProgressData;
    }
  | {
      success: false;
      error?: string;
    };

type GuildsResponse =
  | {
      success: true;
      guilds: Guild[];
      unguildedStudents?: ClassRosterStudent[];
      source?: string;
    }
  | {
      success: false;
      error?: string;
    };

type GuildUpdateResponse =
  | {
      success: true;
      guild: Guild;
      source?: string;
    }
  | {
      success: false;
      error?: string;
    };

export interface ClassRosterStudent {
  id: string;
  userId: string;
  displayName: string;
  email?: string;
  institutionalEmail?: string;
  avatarUrl?: string;
  characterClass?: GameCharacterClass;
  stats?: GameStats;
}

export interface ClassRoster {
  guilds: Guild[];
  unguildedStudents: ClassRosterStudent[];
}

export async function fetchSelectableGames(
  token: string,
  gameId?: string | null
): Promise<{ games: Game[]; selectedGameId?: string }> {
  const response = await fetch(withGameParam('/api/games', gameId), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = (await response.json()) as GamesResponse;

  if (!response.ok || !data.success) {
    throw new Error(data.success ? 'Games request failed.' : data.error || 'Games request failed.');
  }

  return { games: data.games, selectedGameId: data.selectedGameId };
}

export async function fetchCharacterClasses(): Promise<GameCharacterClassDefinition[]> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/auth/character-classes`);
  const data = (await response.json()) as CharacterClassesResponse;

  if (!response.ok || !data.success) {
    throw new Error(
      data.success
        ? 'Character classes request failed.'
        : data.error || 'Character classes request failed.'
    );
  }

  return data.characterClasses;
}

export async function fetchCohortProgressData(
  token: string,
  gameId?: string | null
): Promise<CohortProgressData> {
  const response = await fetch(withGameParam('/api/dashboard', gameId), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = (await response.json()) as DashboardResponse;

  if (!response.ok || !data.success) {
    throw new Error(data.success ? 'Dashboard request failed.' : data.error || 'Dashboard request failed.');
  }

  return data.progress;
}

export async function fetchGuilds(token: string, gameId?: string | null): Promise<Guild[]> {
  return (await fetchClassRoster(token, gameId)).guilds;
}

export async function fetchClassRoster(token: string, gameId?: string | null): Promise<ClassRoster> {
  const response = await fetch(withGameParam('/api/guilds', gameId), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = (await response.json()) as GuildsResponse;

  if (!response.ok || !data.success) {
    throw new Error(data.success ? 'Guilds request failed.' : data.error || 'Guilds request failed.');
  }

  return {
    guilds: data.guilds,
    unguildedStudents: data.unguildedStudents || [],
  };
}

export async function updateGuildIcon(
  token: string,
  guildId: string,
  iconKey: string
): Promise<Guild> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/guilds/${guildId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ iconKey }),
  });

  const data = (await response.json()) as GuildUpdateResponse;

  if (!response.ok || !data.success) {
    throw new Error(data.success ? 'Guild update failed.' : data.error || 'Guild update failed.');
  }

  return data.guild;
}

type MapResponse =
  | {
      success: true;
      map: GameMapData;
    }
  | {
      success: false;
      error?: string;
    };

type CompleteActivityResponse =
  | {
      success: true;
      completion: GameActivityCompletion;
    }
  | {
      success: false;
      error?: string;
    };

type MoveCharacterResponse =
  | {
      success: true;
      move: GameCharacterMove;
      currentActivityId: string;
    }
  | {
      success: false;
      error?: string;
    };

type CohortStepResponse =
  | {
      success: true;
      step?: { id: string; currentStep: number };
      cohort?: { id: string; currentStep: number };
    }
  | {
      success: false;
      error?: string;
    };

type SpendGuildVotesResponse =
  | {
      success: true;
      voteSpend: {
        guildId: string;
        votes: number;
        cost: number;
        balance: number;
      };
    }
  | {
      success: false;
      error?: string;
    };

type RewardCardsResponse =
  | {
      success: true;
      rewardCards: GameRewardCard[];
    }
  | {
      success: false;
      error?: string;
    };

type RewardCardResponse =
  | {
      success: true;
      rewardCard: GameRewardCard;
    }
  | {
      success: false;
      error?: string;
    };

export async function fetchMapActivities(token: string, gameId?: string | null): Promise<GameMapData> {
  const response = await fetch(withGameParam('/api/map', gameId), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = (await response.json()) as MapResponse;

  if (!response.ok || !data.success) {
    throw new Error(data.success ? 'Map request failed.' : data.error || 'Map request failed.');
  }

  return data.map;
}

export async function completeMapActivity(
  token: string,
  activityId: string,
  gameId?: string | null,
  draft?: ActivityCompletionDraft
): Promise<GameActivityCompletion> {
  const body = draft ? buildCompletionBody(draft) : undefined;
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (typeof body === 'string') {
    headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(withGameParam(`/api/map/activities/${activityId}/complete`, gameId), {
    method: 'POST',
    headers,
    body,
  });
  const data = (await response.json()) as CompleteActivityResponse;

  if (!response.ok || !data.success) {
    throw new Error(
      data.success ? 'Activity completion failed.' : data.error || 'Activity completion failed.'
    );
  }

  return data.completion;
}

function buildCompletionBody(draft: ActivityCompletionDraft) {
  const hasFiles = Object.values(draft.files || {}).some((files) => files.length > 0);

  if (!hasFiles) {
    return JSON.stringify({ answers: draft.answers || [] });
  }

  const formData = new FormData();
  formData.set('answers', JSON.stringify(draft.answers || []));
  for (const [fieldId, files] of Object.entries(draft.files || {})) {
    for (const file of files) {
      formData.append(`file:${fieldId}`, file);
    }
  }
  return formData;
}

export async function moveCharacterToActivity(
  token: string,
  activityId: string,
  gameId?: string | null
): Promise<{ move: GameCharacterMove; currentActivityId: string }> {
  const response = await fetch(withGameParam(`/api/map/activities/${activityId}/move`, gameId), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = (await response.json()) as MoveCharacterResponse;

  if (!response.ok || !data.success) {
    throw new Error(data.success ? 'Character move failed.' : data.error || 'Character move failed.');
  }

  return { move: data.move, currentActivityId: data.currentActivityId };
}

export async function fetchCohortStep(token: string, cohortId: string): Promise<number> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/admin/cohorts/${cohortId}/step`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = (await response.json()) as CohortStepResponse;

  if (!response.ok || !data.success) {
    throw new Error(data.success ? 'Cohort step request failed.' : data.error || 'Cohort step request failed.');
  }

  return data.step?.currentStep ?? data.cohort?.currentStep ?? 0;
}

export async function updateCohortStep(token: string, cohortId: string, currentStep: number): Promise<number> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/admin/cohorts/${cohortId}/step`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentStep }),
  });
  const data = (await response.json()) as CohortStepResponse;

  if (!response.ok || !data.success) {
    throw new Error(data.success ? 'Cohort step update failed.' : data.error || 'Cohort step update failed.');
  }

  return data.cohort?.currentStep ?? data.step?.currentStep ?? currentStep;
}

export async function spendGuildVotes(token: string, guildId: string, votes = 1) {
  const response = await fetch(`${BACKEND_BASE_URL}/api/guilds/${guildId}/votes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ votes }),
  });
  const data = (await response.json()) as SpendGuildVotesResponse;

  if (!response.ok || !data.success) {
    throw new Error(data.success ? 'Guild vote spend failed.' : data.error || 'Guild vote spend failed.');
  }

  return data.voteSpend;
}

export async function fetchGameRewardCards(token: string, gameId: string): Promise<GameRewardCard[]> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/games/${gameId}/reward-cards`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = (await response.json()) as RewardCardsResponse;

  if (!response.ok || !data.success) {
    throw new Error(data.success ? 'Reward cards request failed.' : data.error || 'Reward cards request failed.');
  }

  return data.rewardCards;
}

export async function createGameRewardCard(
  token: string,
  gameId: string,
  payload: GameRewardCardPayload
): Promise<GameRewardCard> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/games/${gameId}/reward-cards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as RewardCardResponse;

  if (!response.ok || !data.success) {
    throw new Error(data.success ? 'Reward card create failed.' : data.error || 'Reward card create failed.');
  }

  return data.rewardCard;
}

export async function updateGameRewardCard(
  token: string,
  gameId: string,
  rewardCardId: string,
  payload: GameRewardCardPayload
): Promise<GameRewardCard> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/games/${gameId}/reward-cards/${rewardCardId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as RewardCardResponse;

  if (!response.ok || !data.success) {
    throw new Error(data.success ? 'Reward card update failed.' : data.error || 'Reward card update failed.');
  }

  return data.rewardCard;
}

export async function deleteGameRewardCard(
  token: string,
  gameId: string,
  rewardCardId: string
): Promise<GameRewardCard> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/games/${gameId}/reward-cards/${rewardCardId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = (await response.json()) as RewardCardResponse;

  if (!response.ok || !data.success) {
    throw new Error(data.success ? 'Reward card delete failed.' : data.error || 'Reward card delete failed.');
  }

  return data.rewardCard;
}
