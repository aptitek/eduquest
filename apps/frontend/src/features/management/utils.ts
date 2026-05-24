import type { Address, Cohort, CohortGrade, StudentCohort } from '@eduquest/shared';

export function getLatestCohortMembership(memberships?: StudentCohort[]) {
  if (!memberships || memberships.length === 0) return undefined;
  return [...memberships].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  })[0];
}

export function calculateAge(birthDate?: string) {
  if (!birthDate) return undefined;
  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) return undefined;

  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const birthdayPassed =
    now.getMonth() > date.getMonth() ||
    (now.getMonth() === date.getMonth() && now.getDate() >= date.getDate());
  if (!birthdayPassed) age -= 1;
  return age;
}

export function formatAddress(address?: Address) {
  if (!address) return '-';
  return [address.line1, address.line2, [address.postalCode, address.city].filter(Boolean).join(' '), address.country]
    .filter(Boolean)
    .join(', ');
}

export function formatSchoolYear(value: string) {
  const years = value.match(/\d{4}/g);
  if (!years || years.length < 2) return value;
  return `${years[0].slice(-2)}-${years[1].slice(-2)}`;
}

export function formatGrade(value: CohortGrade) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export function getCohortBadgeParts(
  cohort: Pick<Cohort, 'grade' | 'level' | 'name' | 'majorSpeciality' | 'minorSpeciality'>
) {
  const cohortCode = `${cohort.grade.charAt(0).toUpperCase()}${cohort.level}`;
  return cohort.name
    ? [cohortCode, cohort.name]
    : [cohortCode, cohort.majorSpeciality, cohort.minorSpeciality];
}
