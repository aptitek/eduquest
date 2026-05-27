import type {
  Address,
  Campus,
  Cohort,
  GameCharacter,
  GameCharacterClassDefinition,
  School,
  Student,
  User,
} from '@eduquest/shared';

export type ManagementTab = 'schools' | 'cohorts' | 'students';

export type SelectedManagementEntity = {
  tab: ManagementTab;
  id: string;
};

export type StudentRow = Student & {
  user: User;
  character?: GameCharacter;
  displayName: string;
  email: string;
  cohort?: CohortRow;
  school?: School;
  schoolId?: string;
  age?: number;
};

export type SchoolRow = School & {
  address?: Address;
  cohortCount: number;
  studentCount: number;
};

export type CohortRow = Cohort & {
  schoolName: string;
  campusName: string;
  studentCount: number;
};

export type DebugStudentProfile = {
  user: User;
  student: Student;
  character: GameCharacter;
};

export type DebugBackup = {
  addresses: Address[];
  schools: School[];
  campuses: Campus[];
  cohorts: Cohort[];
  characterClasses: GameCharacterClassDefinition[];
  students: DebugStudentProfile[];
};
