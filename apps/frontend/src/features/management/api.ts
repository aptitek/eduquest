import { BACKEND_BASE_URL } from '../auth/useAuth';
import type { GameCharacterClass, GameStats, School, User } from '@eduquest/shared';
import type { ManagementBackup } from './types';

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
    throw new Error(
      data.success ? 'Management request failed.' : data.error || 'Management request failed.'
    );
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
};

export type ManagementSchoolUpdate = Partial<Pick<School, 'logoUrl'>>;

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
    throw new Error(
      data.success ? 'Management update failed.' : data.error || 'Management update failed.'
    );
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
    throw new Error(
      data.success ? 'Management update failed.' : data.error || 'Management update failed.'
    );
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
    throw new Error(
      data.success ? 'Character class update failed.' : data.error || 'Character class update failed.'
    );
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
    throw new Error(
      data.success ? 'Cohort invite request failed.' : data.error || 'Cohort invite request failed.'
    );
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
    throw new Error(
      data.success
        ? 'Cohort invites request failed.'
        : data.error || 'Cohort invites request failed.'
    );
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
    throw new Error(
      data.success ? 'Cohort invite revoke failed.' : data.error || 'Cohort invite revoke failed.'
    );
  }

  return data.invites;
}
