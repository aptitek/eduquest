import type { Address, Campus } from '@eduquest/shared';
import type { CohortRow, SchoolRow } from './types';

export const mockAddresses: Address[] = [
  {
    id: 'address_aptitek_paris',
    line1: '10 rue de la Tech',
    postalCode: '75001',
    city: 'Paris',
    country: 'France',
    createdAt: '2026-01-01',
  },
];

export const mockSchools: SchoolRow[] = [
  {
    id: 'school_aptitek',
    name: 'Aptitek',
    website: 'https://aptitek.io',
    emailDomain: 'aptitek.io',
    address: mockAddresses[0],
    cohortCount: 2,
    studentCount: 1,
    createdAt: '2026-01-01',
  },
];

export const mockCampuses: Campus[] = [
  {
    id: 'campus_aptitek_paris',
    schoolId: 'school_aptitek',
    addressId: 'address_aptitek_paris',
    address: mockAddresses[0],
    name: 'Paris',
    createdAt: '2026-01-01',
  },
];

export const mockCohorts: CohortRow[] = [
  {
    id: 'cohort_frontend_mages',
    schoolId: 'school_aptitek',
    campusId: 'campus_aptitek_paris',
    schoolName: 'Aptitek',
    campusName: mockCampuses[0].name,
    schoolYear: '2025-2026',
    grade: 'bachelor',
    level: 3,
    name: 'Frontend Mages',
    majorSpeciality: 'Frontend',
    minorSpeciality: 'UX',
    description: 'Students focused on interface craft and client-side quests.',
    studentCount: 1,
    createdAt: '2026-01-01',
  },
  {
    id: 'cohort_fullstack_rangers',
    schoolId: 'school_aptitek',
    campusId: 'campus_aptitek_paris',
    schoolName: 'Aptitek',
    campusName: mockCampuses[0].name,
    schoolYear: '2026-2027',
    grade: 'master',
    level: 1,
    name: 'Fullstack Rangers',
    majorSpeciality: 'Fullstack',
    minorSpeciality: 'DevOps',
    description: 'Students bridging frontend quests, APIs, and deployment raids.',
    studentCount: 0,
    createdAt: '2026-01-01',
  },
];
