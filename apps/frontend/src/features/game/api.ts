import type {
  Activity,
  ActivityParticipationMode,
  Game,
  ActivityStepRange,
  BossActivitySubmissionField,
  CohortProgressData,
  GameBonusVoteState,
  GameActivityCompletion,
  GameActivityEdge,
  GameActivityEdgeStyleWindow,
  GameCharacterClass,
  GameCharacterClassDefinition,
  GameMilestonePayload,
  GameStats,
  GameCharacterMove,
  GameMapData,
  GameRewardCard,
  GameRewardCardPayload,
  Guild,
} from '@eduquest/shared';
import { BACKEND_BASE_URL } from '../auth/useAuth';
import { throwApiResponseError } from '../errors/api';

export type ActivityCompletionDraft = {
  answers?: Array<Pick<BossActivitySubmissionField, 'fieldId' | 'value'>>;
  files?: Record<string, File[]>;
};

export type ActivityCardFieldsPayload = {
  subtitle?: string;
  description?: string;
  resources?: Array<{ title?: string; url: string }>;
  basePoints?: number;
  participationMode?: ActivityParticipationMode;
  mapX?: number;
  mapY?: number;
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
      guilds: ClassRosterGuild[];
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

export interface ClassRosterGuild extends Guild {
  members?: ClassRosterStudent[];
}

export interface ClassRoster {
  guilds: ClassRosterGuild[];
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
    throwApiResponseError(response, data, 'Games request failed.');
  }

  return { games: data.games, selectedGameId: data.selectedGameId };
}

export async function fetchCharacterClasses(): Promise<GameCharacterClassDefinition[]> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/auth/character-classes`);
  const data = (await response.json()) as CharacterClassesResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Character classes request failed.');
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
    throwApiResponseError(response, data, 'Dashboard request failed.');
  }

  return data.progress;
}

export async function fetchGuilds(token: string, gameId?: string | null): Promise<ClassRosterGuild[]> {
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
    throwApiResponseError(response, data, 'Guilds request failed.');
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
    throwApiResponseError(response, data, 'Guild update failed.');
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

type ActivityUpdateResponse =
  | {
      success: true;
      activity: Activity;
    }
  | {
      success: false;
      error?: string;
    };

type ActivityEdgeDeleteResponse =
  | {
      success: true;
      edge: { id: string };
    }
  | {
      success: false;
      error?: string;
    };

type ActivityDeleteResponse =
  | {
      success: true;
      activity: { id: string };
    }
  | {
      success: false;
      error?: string;
    };

type ActivityEdgeUpdateResponse =
  | {
      success: true;
      edge: GameActivityEdge;
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

type SpendGuildVoteResult = Extract<SpendGuildVotesResponse, { success: true }>['voteSpend'];

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

type MilestonesResponse =
  | {
      success: true;
      milestones: CohortProgressData['gauge']['milestones'];
    }
  | {
      success: false;
      error?: string;
    };

type MilestoneResponse =
  | {
      success: true;
      milestone: CohortProgressData['gauge']['milestones'][number];
    }
  | {
      success: false;
      error?: string;
    };

type BonusVoteStateResponse =
  | {
      success: true;
      voteState: GameBonusVoteState;
    }
  | {
      success: false;
      error?: string;
    };

type BonusVoteResponse =
  | {
      success: true;
      vote: GameBonusVoteState['voteStates'][number]['guildVote'];
      voteSpend?: SpendGuildVoteResult;
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
    throwApiResponseError(response, data, 'Map request failed.');
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
    throwApiResponseError(response, data, 'Activity completion failed.');
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
    throwApiResponseError(response, data, 'Character move failed.');
  }

  return { move: data.move, currentActivityId: data.currentActivityId };
}

export async function createMapActivity(
  token: string,
  payload: { mapX: number; mapY: number; currentStep: number },
  gameId?: string | null
): Promise<Activity> {
  const response = await fetch(withGameParam('/api/map/activities', gameId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as ActivityUpdateResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Activity create failed.');
  }

  return data.activity;
}

export async function updateMapActivityPosition(
  token: string,
  activityId: string,
  position: { mapX: number; mapY: number },
  gameId?: string | null
): Promise<Activity> {
  const response = await fetch(withGameParam(`/api/map/activities/${activityId}/position`, gameId), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(position),
  });
  const data = (await response.json()) as ActivityUpdateResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Activity position update failed.');
  }

  return data.activity;
}

export async function updateMapActivityTitle(
  token: string,
  activityId: string,
  title: string,
  gameId?: string | null
): Promise<Activity> {
  const response = await fetch(withGameParam(`/api/map/activities/${activityId}/title`, gameId), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title }),
  });
  const data = (await response.json()) as ActivityUpdateResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Activity title update failed.');
  }

  return data.activity;
}

export async function updateMapActivityCardFields(
  token: string,
  activityId: string,
  payload: ActivityCardFieldsPayload,
  gameId?: string | null
): Promise<Activity> {
  const response = await fetch(withGameParam(`/api/map/activities/${activityId}/card-fields`, gameId), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as ActivityUpdateResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Activity card fields update failed.');
  }

  return data.activity;
}

export async function deleteMapActivity(
  token: string,
  activityId: string,
  gameId?: string | null
): Promise<{ id: string }> {
  const response = await fetch(withGameParam(`/api/map/activities/${activityId}`, gameId), {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = (await response.json()) as ActivityDeleteResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Activity delete failed.');
  }

  return data.activity;
}

export async function updateMapActivityIcon(
  token: string,
  activityId: string,
  iconKey: string,
  gameId?: string | null
): Promise<Activity> {
  const response = await fetch(withGameParam(`/api/map/activities/${activityId}/icon`, gameId), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ iconKey }),
  });
  const data = (await response.json()) as ActivityUpdateResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Activity icon update failed.');
  }

  return data.activity;
}

export async function updateMapActivityIllustration(
  token: string,
  activityId: string,
  illustrationUrl: string,
  gameId?: string | null
): Promise<Activity> {
  const response = await fetch(withGameParam(`/api/map/activities/${activityId}/illustration`, gameId), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ illustrationUrl }),
  });
  const data = (await response.json()) as ActivityUpdateResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Activity illustration update failed.');
  }

  return data.activity;
}

export async function updateMapActivityCardColor(
  token: string,
  activityId: string,
  cardColor: string,
  gameId?: string | null
): Promise<Activity> {
  const response = await fetch(withGameParam(`/api/map/activities/${activityId}/card-color`, gameId), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ cardColor }),
  });
  const data = (await response.json()) as ActivityUpdateResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Activity color update failed.');
  }

  return data.activity;
}

export async function updateMapActivityStepRanges(
  token: string,
  activityId: string,
  stepRanges: ActivityStepRange[],
  gameId?: string | null
): Promise<Activity> {
  const response = await fetch(withGameParam(`/api/map/activities/${activityId}/step-ranges`, gameId), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ stepRanges }),
  });
  const data = (await response.json()) as ActivityUpdateResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Activity step range update failed.');
  }

  return data.activity;
}

export async function deleteMapActivityEdge(
  token: string,
  edgeId: string,
  gameId?: string | null
): Promise<{ id: string }> {
  const response = await fetch(withGameParam(`/api/map/edges/${edgeId}`, gameId), {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = (await response.json()) as ActivityEdgeDeleteResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Activity edge delete failed.');
  }

  return data.edge;
}

export async function createMapActivityEdge(
  token: string,
  payload: { fromActivityId: string; toActivityId: string },
  gameId?: string | null
): Promise<GameActivityEdge> {
  const response = await fetch(withGameParam('/api/map/edges', gameId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as ActivityEdgeUpdateResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Activity edge create failed.');
  }

  return data.edge;
}

export async function updateMapActivityEdgeStyles(
  token: string,
  edgeId: string,
  styleWindows: GameActivityEdgeStyleWindow[],
  gameId?: string | null
): Promise<GameActivityEdge> {
  const response = await fetch(withGameParam(`/api/map/edges/${edgeId}`, gameId), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ styleWindows }),
  });
  const data = (await response.json()) as ActivityEdgeUpdateResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Activity edge update failed.');
  }

  return data.edge;
}

export async function fetchCohortStep(token: string, cohortId: string): Promise<number> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/admin/cohorts/${cohortId}/step`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = (await response.json()) as CohortStepResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Cohort step request failed.');
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
    throwApiResponseError(response, data, 'Cohort step update failed.');
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
    throwApiResponseError(response, data, 'Guild vote spend failed.');
  }

  return data.voteSpend;
}

export async function fetchGameMilestones(
  token: string,
  gameId: string
): Promise<CohortProgressData['gauge']['milestones']> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/games/${gameId}/milestones`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = (await response.json()) as MilestonesResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Milestones request failed.');
  }

  return data.milestones;
}

export async function createGameMilestone(
  token: string,
  gameId: string,
  payload: GameMilestonePayload
): Promise<CohortProgressData['gauge']['milestones'][number]> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/games/${gameId}/milestones`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as MilestoneResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Milestone create failed.');
  }

  return data.milestone;
}

export async function updateGameMilestone(
  token: string,
  gameId: string,
  milestoneId: string,
  payload: GameMilestonePayload
): Promise<CohortProgressData['gauge']['milestones'][number]> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/games/${gameId}/milestones/${milestoneId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as MilestoneResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Milestone update failed.');
  }

  return data.milestone;
}

export async function deleteGameMilestone(
  token: string,
  gameId: string,
  milestoneId: string
): Promise<CohortProgressData['gauge']['milestones'][number]> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/games/${gameId}/milestones/${milestoneId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = (await response.json()) as MilestoneResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Milestone delete failed.');
  }

  return data.milestone;
}

export async function fetchGameBonusVoteState(token: string, gameId: string): Promise<GameBonusVoteState> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/games/${gameId}/bonus-votes`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = (await response.json()) as BonusVoteStateResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Bonus vote state request failed.');
  }

  return data.voteState;
}

export async function castMilestoneBonusVote(
  token: string,
  gameId: string,
  milestoneId: string,
  bonusCardId: string
) {
  const response = await fetch(`${BACKEND_BASE_URL}/api/games/${gameId}/milestones/${milestoneId}/bonus-votes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ bonusCardId }),
  });
  const data = (await response.json()) as BonusVoteResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Bonus vote failed.');
  }

  return data.vote;
}

export async function boostMilestoneBonusVote(
  token: string,
  gameId: string,
  milestoneId: string,
  votes = 1
) {
  const response = await fetch(`${BACKEND_BASE_URL}/api/games/${gameId}/milestones/${milestoneId}/boost-votes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ votes }),
  });
  const data = (await response.json()) as BonusVoteResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Bonus vote boost failed.');
  }

  return data;
}

export async function fetchGameRewardCards(token: string, gameId: string): Promise<GameRewardCard[]> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/games/${gameId}/reward-cards`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = (await response.json()) as RewardCardsResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Reward cards request failed.');
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
    throwApiResponseError(response, data, 'Reward card create failed.');
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
    throwApiResponseError(response, data, 'Reward card update failed.');
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
    throwApiResponseError(response, data, 'Reward card delete failed.');
  }

  return data.rewardCard;
}
