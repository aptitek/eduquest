import { BACKEND_BASE_URL } from '../auth/useAuth';
import type { School, User } from '@eduquest/shared';
import type { DebugBackup } from './types';

type ManagementResponse =
  | {
      success: true;
      backup: DebugBackup;
    }
  | {
      success: false;
      error?: string;
    };

export async function fetchManagementBackup(token: string): Promise<DebugBackup> {
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
};

export type ManagementSchoolUpdate = Partial<Pick<School, 'logoUrl'>>;

export async function updateManagementStudent(
  token: string,
  studentId: string,
  update: ManagementStudentUpdate
): Promise<DebugBackup> {
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
): Promise<DebugBackup> {
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
