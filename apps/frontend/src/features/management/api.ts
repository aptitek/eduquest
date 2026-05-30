import { BACKEND_BASE_URL } from '../auth/useAuth';
import type { Cohort, GameCharacterClass, GameStats, School, User } from '@eduquest/shared';
import type { ManagementBackup } from './types';

import { throwApiResponseError } from '../errors/api';
type ManagementResponse =
  | {
      success: true;
      backup: ManagementBackup;
    }
  | {
      success: false;
      error?: string;
    };

type CohortInviteResponse =
  | {
      success: true;
      invite: ManagementCohortInvite;
    }
  | {
      success: false;
      error?: string;
    };

type CohortInvitesResponse =
  | {
      success: true;
      invites: ManagementCohortInvite[];
    }
  | {
      success: false;
      error?: string;
    };

export async function fetchManagementBackup(token: string): Promise<ManagementBackup> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/auth/management`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = (await response.json()) as ManagementResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Management request failed.');
  }

  return data.backup;
}

export type ManagementStudentUpdate = {
  user?: Partial<
    Pick<
      User,
      | 'displayName'
      | 'firstName'
      | 'lastName'
      | 'email'
      | 'avatarUrl'
      | 'birthDate'
      | 'bio'
      | 'pronouns'
    >
  >;
  cohortIds?: string[];
  institutionalEmail?: string;
  institutionalEmailCohortId?: string;
  institutionalSchoolId?: string;
  characterIllustrationUrl?: string;
  characterClass?: GameCharacterClass;
  characterStats?: GameStats;
  gameId?: string | null;
};

export type ManagementSchoolUpdate = Partial<Pick<School, 'name' | 'website' | 'emailDomain' | 'logoUrl'>> & {
  address?: string;
};

export type ManagementSchoolCreate = Partial<Pick<School, 'name' | 'website' | 'emailDomain'>>;

export type ManagementCohortUpdate = Partial<
  Pick<Cohort, 'schoolId' | 'startYear' | 'grade' | 'level' | 'registrationOpen' | 'name' | 'majorSpeciality' | 'minorSpeciality' | 'description'>
> & {
  campusName?: string;
};

export type ManagementCohortCreate = Partial<
  Pick<Cohort, 'schoolId' | 'startYear' | 'grade' | 'level' | 'registrationOpen' | 'name' | 'majorSpeciality' | 'minorSpeciality' | 'description'>
> & {
  campusName?: string;
};

export type ManagementCharacterClassUpdate = {
  baseStats: GameStats;
};

export type ManagementCohortInvite = {
  id: string;
  cohortId: string;
  url: string;
  token: string;
  expiresAt: string;
  createdAt?: string;
};

export async function updateManagementStudent(
  token: string,
  studentId: string,
  update: ManagementStudentUpdate
): Promise<ManagementBackup> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/auth/management/students/${studentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(update),
  });

  const data = (await response.json()) as ManagementResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Management update failed.');
  }

  return data.backup;
}

export async function deleteManagementStudent(
  token: string,
  studentId: string
): Promise<ManagementBackup> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/auth/management/students/${studentId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = (await response.json()) as ManagementResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Management delete failed.');
  }

  return data.backup;
}

export async function createManagementSchool(
  token: string,
  create: ManagementSchoolCreate = {}
): Promise<ManagementBackup> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/auth/management/schools`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(create),
  });

  const data = (await response.json()) as ManagementResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Management create failed.');
  }

  return data.backup;
}

export async function updateManagementSchool(
  token: string,
  schoolId: string,
  update: ManagementSchoolUpdate
): Promise<ManagementBackup> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/auth/management/schools/${schoolId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(update),
  });

  const data = (await response.json()) as ManagementResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Management update failed.');
  }

  return data.backup;
}

export async function deleteManagementSchool(
  token: string,
  schoolId: string
): Promise<ManagementBackup> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/auth/management/schools/${schoolId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = (await response.json()) as ManagementResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Management delete failed.');
  }

  return data.backup;
}

export async function createManagementCohort(
  token: string,
  create: ManagementCohortCreate = {}
): Promise<ManagementBackup> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/auth/management/cohorts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(create),
  });

  const data = (await response.json()) as ManagementResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Management create failed.');
  }

  return data.backup;
}

export async function updateManagementCohort(
  token: string,
  cohortId: string,
  update: ManagementCohortUpdate
): Promise<ManagementBackup> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/auth/management/cohorts/${cohortId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(update),
  });

  const data = (await response.json()) as ManagementResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Management update failed.');
  }

  return data.backup;
}

export async function deleteManagementCohort(
  token: string,
  cohortId: string
): Promise<ManagementBackup> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/auth/management/cohorts/${cohortId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = (await response.json()) as ManagementResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Management delete failed.');
  }

  return data.backup;
}

export async function updateManagementCohortCharacterClass(
  token: string,
  cohortId: string,
  characterClass: GameCharacterClass,
  update: ManagementCharacterClassUpdate
): Promise<ManagementBackup> {
  const response = await fetch(
    `${BACKEND_BASE_URL}/api/auth/management/cohorts/${cohortId}/character-classes/${characterClass}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(update),
    }
  );

  const data = (await response.json()) as ManagementResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Character class update failed.');
  }

  return data.backup;
}

export async function createManagementCohortInvite(
  token: string,
  cohortId: string
): Promise<ManagementCohortInvite> {
  const response = await fetch(
    `${BACKEND_BASE_URL}/api/auth/management/cohorts/${cohortId}/invite`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = (await response.json()) as CohortInviteResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Cohort invite request failed.');
  }

  return data.invite;
}

export async function fetchManagementCohortInvites(
  token: string,
  cohortId: string
): Promise<ManagementCohortInvite[]> {
  const response = await fetch(
    `${BACKEND_BASE_URL}/api/auth/management/cohorts/${cohortId}/invites`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = (await response.json()) as CohortInvitesResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Cohort invites request failed.');
  }

  return data.invites;
}

export async function revokeManagementCohortInvite(
  token: string,
  cohortId: string,
  inviteId: string
): Promise<ManagementCohortInvite[]> {
  const response = await fetch(
    `${BACKEND_BASE_URL}/api/auth/management/cohorts/${cohortId}/invites/${inviteId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = (await response.json()) as CohortInvitesResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Cohort invite revoke failed.');
  }

  return data.invites;
}
