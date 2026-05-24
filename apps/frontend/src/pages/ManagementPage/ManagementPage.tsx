import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Address,
  Campus,
  Cohort,
  CohortGrade,
  School,
  Student,
  StudentCohort,
  User,
  GameCharacter,
} from '@eduquest/shared';
import { GameLayout } from '../../components/templates/GameLayout';
import { GameHeader } from '../../components/organisms/GameHeader';
import { PlayingCard } from '../../components/molecules/PlayingCard';
import { BadgeDropdown } from '../../components/molecules/BadgeDropdown';
import { CompoundBadge } from '../../components/atoms/CompoundBadge';
import { EditableFieldContext, EditableText } from '../../components/atoms/EditableText';
import { InstitutionalProfileCard } from '../../components/organisms/InstitutionalProfileCard/InstitutionalProfileCard';
import { BACKEND_BASE_URL } from '../../features/auth/useAuth';
import { useGameStore } from '../../features/game/gameStore';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../utils/cn';
import { parsePronouns } from '../../utils/pronouns';
import aptitekLogoUrl from '../../assets/logo.svg';

type ManagementTab = 'schools' | 'cohorts' | 'students';

type SelectedManagementEntity = {
  tab: ManagementTab;
  id: string;
};

type StudentRow = Student & {
  user: User;
  displayName: string;
  email: string;
  level: number;
  age?: number;
};

type SchoolRow = School & {
  address?: Address;
  cohortCount: number;
  studentCount: number;
};

type CohortRow = Cohort & {
  schoolName: string;
  campusName: string;
  studentCount: number;
};

type DebugStudentProfile = {
  user: User;
  student: Student;
  character: GameCharacter;
};

type DebugBackup = {
  addresses: Address[];
  schools: School[];
  campuses: Campus[];
  cohorts: Cohort[];
  students: DebugStudentProfile[];
};

function getLatestCohortMembership(memberships?: StudentCohort[]) {
  if (!memberships || memberships.length === 0) return undefined;
  return [...memberships].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  })[0];
}

const mockAddresses: Address[] = [
  {
    id: 'address_aptitek_paris',
    line1: '10 rue de la Tech',
    postalCode: '75001',
    city: 'Paris',
    country: 'France',
    createdAt: '2026-01-01',
  },
];

const mockSchools: SchoolRow[] = [
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

const mockCampuses: Campus[] = [
  {
    id: 'campus_aptitek_paris',
    schoolId: 'school_aptitek',
    addressId: 'address_aptitek_paris',
    address: mockAddresses[0],
    name: 'Paris',
    createdAt: '2026-01-01',
  },
];

const mockCohorts: CohortRow[] = [
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

function calculateAge(birthDate?: string) {
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

function SchoolLogoBadge({ name, logoUrl }: { name: string; logoUrl?: string }) {
  const resolvedLogoUrl = logoUrl || (name === 'Aptitek' ? aptitekLogoUrl : undefined);

  if (resolvedLogoUrl) {
    return <img src={resolvedLogoUrl} alt={name} title={name} className="h-4 w-auto max-w-none object-contain" />;
  }

  return (
    <span className="max-w-[8rem] truncate text-xs font-semibold" title={name}>
      {name}
    </span>
  );
}

function TruncatedText({
  value,
  className,
}: {
  value: string | number | undefined | null;
  className?: string;
}) {
  const displayValue = value ?? '-';

  return (
    <span className={cn('block max-w-full truncate whitespace-nowrap', className)}>
      {displayValue}
    </span>
  );
}

function formatAddress(address?: Address) {
  if (!address) return '-';
  return [address.line1, address.line2, [address.postalCode, address.city].filter(Boolean).join(' '), address.country]
    .filter(Boolean)
    .join(', ');
}

function formatSchoolYear(value: string) {
  const years = value.match(/\d{4}/g);
  if (!years || years.length < 2) return value;
  return `${years[0].slice(-2)}-${years[1].slice(-2)}`;
}

function formatGrade(value: CohortGrade) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function getCohortBadgeParts(cohort: Pick<Cohort, 'grade' | 'level' | 'name' | 'majorSpeciality' | 'minorSpeciality'>) {
  const cohortCode = `${cohort.grade.charAt(0).toUpperCase()}${cohort.level}`;
  return cohort.name
    ? [cohortCode, cohort.name]
    : [cohortCode, cohort.majorSpeciality, cohort.minorSpeciality];
}

function CohortDropdownBadge({ cohort }: { cohort: CohortRow }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1">
      <SchoolLogoBadge name={cohort.schoolName} logoUrl={cohort.school?.logoUrl} />
      <span className="badge badge-sm badge-outline border-gaming-border text-text-secondary">
        {formatSchoolYear(cohort.schoolYear)}
      </span>
      <CompoundBadge parts={getCohortBadgeParts(cohort)} />
    </span>
  );
}

function CohortListBadge({ cohort }: { cohort: CohortRow }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1">
      <span className="badge badge-sm badge-outline border-gaming-border text-text-secondary">
        {formatSchoolYear(cohort.schoolYear)}
      </span>
      <CompoundBadge parts={getCohortBadgeParts(cohort)} />
    </span>
  );
}

function CardSkeleton({ label }: { label: string }) {
  return (
    <div className="h-full min-h-[18rem] p-5">
      <div className="flex h-full flex-col gap-5">
        <div className="flex items-start gap-4">
          <div className="h-20 w-20 rounded-full bg-gaming-base/70" />
          <div className="flex flex-1 flex-col gap-3 pt-2">
            <div className="h-5 w-2/3 rounded-full bg-gaming-base/70" />
            <div className="h-3 w-1/2 rounded-full bg-gaming-base/60" />
            <div className="h-6 w-28 rounded-full border border-gaming-border bg-gaming-base/50" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-3 w-full rounded-full bg-gaming-base/60" />
          <div className="h-3 w-5/6 rounded-full bg-gaming-base/50" />
          <div className="h-3 w-3/4 rounded-full bg-gaming-base/40" />
        </div>
        <div className="mt-auto text-center text-xs font-display uppercase tracking-widest text-text-muted">
          {label}
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="rounded-lg border border-gaming-border bg-gaming-base/30 p-3">
      <div className="text-[0.65rem] font-display uppercase tracking-widest text-text-muted">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-semibold text-text-primary">
        {value || '-'}
      </div>
    </div>
  );
}

function SchoolDetailCard({ school, t }: { school: SchoolRow; t: (key: string) => string }) {
  const [draft, setDraft] = useState({
    name: school.name,
    website: school.website || '',
    emailDomain: school.emailDomain || '',
    address: formatAddress(school.address),
  });
  const resolvedLogoUrl = school.logoUrl || (school.name === 'Aptitek' ? aptitekLogoUrl : undefined);

  useEffect(() => {
    setDraft({
      name: school.name,
      website: school.website || '',
      emailDomain: school.emailDomain || '',
      address: formatAddress(school.address),
    });
  }, [school]);

  return (
    <EditableFieldContext.Provider value={{ showPencil: true }}>
      <div className="relative h-full min-h-[18rem] p-5 pt-10">
        <div className="badge badge-outline absolute left-0 top-0 rounded-none rounded-br-xl border-0 bg-gaming-base px-3 py-2 text-xs font-semibold text-text-secondary">
          {school.cohortCount} {t('management.schools.cohorts')} · {school.studentCount}{' '}
          {t('management.schools.students')}
        </div>

        <div className="flex h-full flex-col gap-5">
          <div className="flex h-32 w-full shrink-0 items-center justify-center rounded-2xl border border-gaming-border bg-gaming-base/50 p-5">
            {resolvedLogoUrl ? (
              <img src={resolvedLogoUrl} alt={school.name} className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-center text-lg font-display font-semibold text-text-secondary">
                {school.name}
              </span>
            )}
          </div>

          <div>
            <EditableText
              value={draft.name}
              onChange={(value) => setDraft((current) => ({ ...current, name: value }))}
              placeholder={t('management.schools.name')}
              className="text-2xl font-display font-bold text-text-primary"
            />
          </div>

          <div className="grid gap-3">
            <EditableText
              value={draft.website}
              onChange={(value) => setDraft((current) => ({ ...current, website: value }))}
              placeholder={t('management.schools.website')}
              className="text-sm text-solarized-blue"
            />
            <EditableText
              value={draft.address}
              onChange={(value) => setDraft((current) => ({ ...current, address: value }))}
              placeholder={t('management.schools.address')}
              className="text-sm text-text-secondary"
            />
            <EditableText
              value={draft.emailDomain}
              onChange={(value) => setDraft((current) => ({ ...current, emailDomain: value }))}
              placeholder={t('management.schools.emailDomain')}
              className="text-sm text-text-secondary"
            />
          </div>

          <div className="mt-auto">
            <DetailItem label={t('management.schools.createdAt')} value={formatDate(school.createdAt)} />
          </div>
        </div>
      </div>
    </EditableFieldContext.Provider>
  );
}

function CohortDetailCard({
  cohort,
  campusOptions,
  t,
}: {
  cohort: CohortRow;
  campusOptions: string[];
  t: (key: string) => string;
}) {
  const [draft, setDraft] = useState({
    campusName: cohort.campusName,
    name: cohort.name,
    description: cohort.description || '',
    schoolYear: cohort.schoolYear,
    grade: formatGrade(cohort.grade),
    level: String(cohort.level),
    majorSpeciality: cohort.majorSpeciality || '',
    minorSpeciality: cohort.minorSpeciality || '',
  });
  const resolvedLogoUrl = cohort.school?.logoUrl || (cohort.schoolName === 'Aptitek' ? aptitekLogoUrl : undefined);
  const schoolYearOptions = Array.from(new Set([cohort.schoolYear, ...mockCohorts.map((item) => item.schoolYear)]));
  const gradeOptions = ['Licence', 'Bachelor', 'Engineer', 'Master', 'Doctorate'];
  const levelOptions = ['1', '2', '3', '4', '5'];
  const majorOptions = Array.from(
    new Set([cohort.majorSpeciality, ...mockCohorts.map((item) => item.majorSpeciality)].filter((value): value is string => Boolean(value)))
  );
  const minorOptions = Array.from(
    new Set([cohort.minorSpeciality, ...mockCohorts.map((item) => item.minorSpeciality)].filter((value): value is string => Boolean(value)))
  );

  useEffect(() => {
    setDraft({
      campusName: cohort.campusName,
      name: cohort.name,
      description: cohort.description || '',
      schoolYear: cohort.schoolYear,
      grade: formatGrade(cohort.grade),
      level: String(cohort.level),
      majorSpeciality: cohort.majorSpeciality || '',
      minorSpeciality: cohort.minorSpeciality || '',
    });
  }, [cohort]);

  return (
    <EditableFieldContext.Provider value={{ showPencil: true }}>
      <div className="relative h-full min-h-[18rem] p-5 pt-10">
        <div className="badge badge-outline absolute left-0 top-0 rounded-none rounded-br-xl border-0 bg-gaming-base px-3 py-2 text-xs font-semibold text-text-secondary">
          {cohort.studentCount} {t('management.cohorts.students')}
        </div>

        <div className="flex h-full flex-col gap-5">
          <div className="flex w-full flex-col items-center gap-2">
            <div
              className="flex h-32 w-full shrink-0 items-center justify-center rounded-2xl border border-gaming-border bg-gaming-base/50 p-5"
              title={cohort.schoolName}
            >
              {resolvedLogoUrl ? (
                <img src={resolvedLogoUrl} alt={cohort.schoolName} className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-center text-sm font-display font-semibold text-text-secondary">
                  {cohort.schoolName}
                </span>
              )}
            </div>

            <div className="w-full min-w-0">
              <BadgeDropdown
                options={campusOptions}
                value={[draft.campusName]}
                onChange={(next) => setDraft((current) => ({ ...current, campusName: next[0] || current.campusName }))}
                multiple={false}
                placeholder={t('management.cohorts.campus')}
                searchPlaceholder={t('management.cohorts.campus')}
                emptyFilterHint={t('management.cohorts.campus')}
                className="w-full"
                badgeClassName="border-gaming-border bg-gaming-card text-text-secondary"
                selectedMaxWidth="max-w-full"
                fullWidth
                showArrow
              />
            </div>
          </div>

          <div>
            <EditableText
              value={draft.name}
              onChange={(value) => setDraft((current) => ({ ...current, name: value }))}
              placeholder={t('management.cohorts.name')}
              className="text-2xl font-display font-bold text-text-primary"
            />
            <EditableText
              multiline
              value={draft.description}
              onChange={(value) => setDraft((current) => ({ ...current, description: value }))}
              placeholder={t('management.cohorts.description')}
              truncate={false}
              className="mt-2 text-sm leading-relaxed text-text-secondary"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <BadgeDropdown
              options={schoolYearOptions}
              value={[draft.schoolYear]}
              onChange={(next) => setDraft((current) => ({ ...current, schoolYear: next[0] || current.schoolYear }))}
              multiple={false}
              placeholder={t('management.cohorts.schoolYear')}
              searchPlaceholder={t('management.cohorts.schoolYear')}
              emptyFilterHint={t('management.cohorts.schoolYear')}
              badgeClassName="border-gaming-border bg-gaming-base text-text-secondary"
              selectedMaxWidth="max-w-[9rem]"
              showArrow
            />
            <BadgeDropdown
              options={gradeOptions}
              value={[draft.grade]}
              onChange={(next) => setDraft((current) => ({ ...current, grade: next[0] || current.grade }))}
              multiple={false}
              placeholder={t('management.cohorts.grade')}
              searchPlaceholder={t('management.cohorts.grade')}
              emptyFilterHint={t('management.cohorts.grade')}
              badgeClassName="border-gaming-border bg-gaming-base text-text-secondary"
              selectedMaxWidth="max-w-[9rem]"
              showArrow
            />
            <BadgeDropdown
              options={levelOptions}
              value={[draft.level]}
              onChange={(next) => setDraft((current) => ({ ...current, level: next[0] || current.level }))}
              multiple={false}
              placeholder={t('management.cohorts.level')}
              searchPlaceholder={t('management.cohorts.level')}
              emptyFilterHint={t('management.cohorts.level')}
              badgeClassName="border-gaming-border bg-gaming-base text-text-secondary"
              selectedMaxWidth="max-w-[6rem]"
              showArrow
            />
          </div>

          <div className="mt-auto flex flex-wrap gap-2">
            <BadgeDropdown
              options={majorOptions}
              value={draft.majorSpeciality ? [draft.majorSpeciality] : []}
              onChange={(next) => setDraft((current) => ({ ...current, majorSpeciality: next[0] || '' }))}
              multiple={false}
              placeholder="Major"
              searchPlaceholder="Major"
              emptyFilterHint="Major"
              badgeClassName="border-gaming-border bg-gaming-base text-text-secondary"
              selectedMaxWidth="max-w-[10rem]"
              showArrow
            />
            <BadgeDropdown
              options={minorOptions}
              value={draft.minorSpeciality ? [draft.minorSpeciality] : []}
              onChange={(next) => setDraft((current) => ({ ...current, minorSpeciality: next[0] || '' }))}
              multiple={false}
              placeholder="Minor"
              searchPlaceholder="Minor"
              emptyFilterHint="Minor"
              badgeClassName="border-gaming-border bg-gaming-base text-text-secondary"
              selectedMaxWidth="max-w-[10rem]"
              showArrow
            />
          </div>
        </div>
      </div>
    </EditableFieldContext.Provider>
  );
}

const DEFAULT_COLUMN_BOUNDS = {
  min: 5,
  max: 18,
  expandedMax: 24,
};

const COLUMN_BOUNDS: Record<string, { min: number; max: number; expandedMax?: number }> = {
  avatar: { min: 5, max: 5, expandedMax: 5 },
  logo: { min: 8, max: 8, expandedMax: 8 },
  displayName: { min: 8, max: 16, expandedMax: 22 },
  pronouns: { min: 5, max: 10, expandedMax: 13 },
  email: { min: 10, max: 18, expandedMax: 26 },
  school: { min: 5, max: 9, expandedMax: 12 },
  age: { min: 4, max: 4, expandedMax: 4 },
  website: { min: 8, max: 16, expandedMax: 24 },
  address: { min: 10, max: 20, expandedMax: 30 },
  cohortCount: { min: 5, max: 6, expandedMax: 6 },
  studentCount: { min: 5, max: 6, expandedMax: 6 },
  schoolName: { min: 5, max: 9, expandedMax: 12 },
  campusName: { min: 6, max: 12, expandedMax: 16 },
  schoolYear: { min: 5, max: 6, expandedMax: 6 },
  grade: { min: 5, max: 7, expandedMax: 7 },
  level: { min: 4, max: 4, expandedMax: 4 },
  name: { min: 8, max: 17, expandedMax: 24 },
  speciality: { min: 7, max: 15, expandedMax: 20 },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getDisplayLength(value: unknown) {
  if (value === undefined || value === null || value === '') return 1;
  if (typeof value === 'number') return String(value).length;
  if (typeof value === 'string') return value.replace(/^https?:\/\//, '').length;
  return 1;
}

function getHeaderLength(header: unknown, columnId: string) {
  return typeof header === 'string' ? header.length : columnId.length;
}

function getColumnWeight({
  columnId,
  header,
  values,
  isExpanded,
}: {
  columnId: string;
  header: unknown;
  values: unknown[];
  isExpanded: boolean;
}) {
  const bounds = COLUMN_BOUNDS[columnId] || DEFAULT_COLUMN_BOUNDS;
  const longestValue = values.reduce<number>(
    (longest, value) => Math.max(longest, getDisplayLength(value)),
    getHeaderLength(header, columnId)
  );
  const contentWeight = Math.ceil(longestValue * 0.62) + 2;
  const baseWeight = clamp(contentWeight, bounds.min, bounds.max);
  const expandedMax = bounds.expandedMax ?? bounds.max;

  return isExpanded ? clamp(Math.ceil(baseWeight * 1.45), baseWeight, expandedMax) : baseWeight;
}

function getColumnWidthPercentages(
  columns: { id: string; header: unknown; values: unknown[] }[],
  expandedColumnId: string | null
) {
  const weights = columns.map((column) =>
    getColumnWeight({
      columnId: column.id,
      header: column.header,
      values: column.values,
      isExpanded: expandedColumnId === column.id,
    })
  );
  const total = weights.reduce((sum, weight) => sum + weight, 0);

  return Object.fromEntries(
    columns.map((column, index) => [column.id, `${(weights[index] / total) * 100}%`])
  );
}

function ManagementTable<TData extends { id: string }>({
  data,
  columns,
  globalFilter,
  onGlobalFilterChange,
  schoolFilterOptions = [],
  selectedRowId,
  onRowSelect,
}: {
  data: TData[];
  columns: ColumnDef<TData>[];
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  schoolFilterOptions?: string[];
  selectedRowId?: string;
  onRowSelect?: (row: TData) => void;
}) {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [expandedColumnId, setExpandedColumnId] = useState<string | null>(null);

  const table = useReactTable({
    data,
    columns,
    state: {
      columnFilters,
      globalFilter,
      sorting,
    },
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
  });
  const schoolColumn = table.getColumn('school');
  const selectedSchools = (schoolColumn?.getFilterValue() as string[] | undefined) ?? [];
  const visibleColumns = table.getVisibleLeafColumns();
  const displayedRows = table.getRowModel().rows;
  const columnWidths = getColumnWidthPercentages(
    visibleColumns.map((column) => ({
      id: column.id,
      header: column.columnDef.header,
      values: displayedRows.map((row) => row.getValue(column.id)),
    })),
    expandedColumnId
  );

  return (
    <div className="overflow-hidden rounded-xl border border-gaming-border bg-gaming-card shadow-lg">
      <div className="flex flex-col gap-2 border-b border-gaming-border bg-gaming-card p-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={globalFilter}
          onChange={(event) => table.setGlobalFilter(event.target.value)}
          placeholder={t('management.filters.searchPlaceholder')}
          className="input input-bordered input-sm min-w-0 flex-1 bg-gaming-base border-gaming-border text-text-primary"
        />
        {schoolColumn && schoolFilterOptions.length > 0 && (
          <BadgeDropdown
            options={schoolFilterOptions}
            value={selectedSchools}
            onChange={(next) => schoolColumn.setFilterValue(next.length > 0 ? next : undefined)}
            multiple
            placeholder={t('management.filters.allSchools')}
            searchPlaceholder={t('management.filters.school')}
            emptyFilterHint={t('management.filters.noSchools')}
            badgeClassName="border-gaming-border bg-gaming-base text-text-secondary"
            selectedMaxWidth="max-w-[16rem]"
            showArrow
            renderBadge={(school) => <SchoolLogoBadge name={school} />}
          />
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="table table-fixed w-full">
          <colgroup>
            {visibleColumns.map((column) => (
              <col
                key={column.id}
                style={{ width: columnWidths[column.id] }}
                className="transition-[width] duration-300 ease-out"
              />
            ))}
          </colgroup>
          <thead className="bg-gaming-base/60 text-text-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onMouseEnter={() => setExpandedColumnId(header.column.id)}
                    onMouseLeave={() => setExpandedColumnId(null)}
                    className={cn(
                      'overflow-hidden whitespace-nowrap font-display text-xs uppercase tracking-wider transition-[width] duration-300 ease-out'
                    )}
                    style={{ width: columnWidths[header.column.id] }}
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        disabled={!header.column.getCanSort()}
                        className={cn(
                          'inline-flex max-w-full items-center gap-1 overflow-hidden whitespace-nowrap uppercase tracking-wider',
                          header.column.getCanSort() && 'cursor-pointer hover:text-text-primary',
                          !header.column.getCanSort() && 'cursor-default'
                        )}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: '↑',
                          desc: '↓',
                        }[header.column.getIsSorted() as string] ?? null}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowSelect?.(row.original)}
                className={cn(
                  'border-gaming-border hover:bg-gaming-base/40',
                  onRowSelect && 'cursor-pointer',
                  selectedRowId === row.original.id && 'bg-gaming-base/60 outline outline-1 outline-solarized-blue/50'
                )}
                aria-selected={selectedRowId === row.original.id}
              >
                {row.getVisibleCells().map((cell) => {
                  return (
                    <td
                      key={cell.id}
                      onMouseEnter={() => setExpandedColumnId(cell.column.id)}
                      onMouseLeave={() => setExpandedColumnId(null)}
                      className={cn(
                        'overflow-hidden whitespace-nowrap text-text-secondary transition-[width] duration-300 ease-out'
                      )}
                      style={{ width: columnWidths[cell.column.id] }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ManagementPage() {
  const { t } = useTranslation();
  const { user, student, character } = useGameStore();
  const [activeTab, setActiveTab] = useState<ManagementTab>('schools');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<SelectedManagementEntity | null>(null);
  const [studentCohortSelections, setStudentCohortSelections] = useState<Record<string, string[]>>({});
  const [debugBackup, setDebugBackup] = useState<DebugBackup | null>(null);

  useEffect(() => {
    setSelectedEntity(null);
  }, [activeTab]);

  useEffect(() => {
    if (!import.meta.env.DEV || !user?.isAdmin) return;

    const loadDebugBackup = async () => {
      try {
        const response = await fetch(`${BACKEND_BASE_URL}/api/auth/debug-backup`);
        const data = await response.json();
        if (data.success && data.backup) {
          setDebugBackup(data.backup);
        }
      } catch (error) {
        console.warn('Could not load debug management backup.', error);
      }
    };

    loadDebugBackup();
  }, [user?.isAdmin]);

  const schoolRows = useMemo<SchoolRow[]>(() => {
    if (!debugBackup) return mockSchools;

    return debugBackup.schools.map((school) => {
      const campus = debugBackup.campuses.find((item) => item.schoolId === school.id);
      const cohortCount = debugBackup.cohorts.filter((cohort) => cohort.schoolId === school.id).length;
      const studentCount = debugBackup.students.filter((profile) => profile.student.schoolId === school.id).length;

      return {
        ...school,
        address: campus?.address,
        cohortCount,
        studentCount,
      };
    });
  }, [debugBackup]);

  const cohortRows = useMemo<CohortRow[]>(() => {
    if (!debugBackup) return mockCohorts;

    return debugBackup.cohorts.map((cohort) => ({
      ...cohort,
      schoolName: cohort.school?.name || debugBackup.schools.find((school) => school.id === cohort.schoolId)?.name || '-',
      campusName: cohort.campus?.name || debugBackup.campuses.find((campus) => campus.id === cohort.campusId)?.name || '-',
      studentCount: debugBackup.students.filter((profile) =>
        profile.student.cohortMemberships?.some((membership) => membership.cohortId === cohort.id)
      ).length,
    }));
  }, [debugBackup]);

  const studentRows = useMemo<StudentRow[]>(() => {
    if (debugBackup) {
      return debugBackup.students
        .filter(({ user: rowUser }) => !rowUser.isAdmin)
        .map(({ user: rowUser, student: rowStudent, character: rowCharacter }) => {
          const latestMembership = getLatestCohortMembership(rowStudent.cohortMemberships);
          const selectedSchool = latestMembership?.cohort?.school || rowStudent.school || schoolRows[0];

          return {
            ...rowStudent,
            schoolId: selectedSchool?.id,
            school: selectedSchool,
            user: rowUser,
            displayName:
              rowUser.displayName ||
              [rowUser.firstName, rowUser.lastName].filter(Boolean).join(' ') ||
              rowUser.githubUsername ||
              rowUser.email,
            email: latestMembership?.institutionalEmail || rowUser.email,
            level: rowCharacter.currentLevel,
            age: calculateAge(rowUser.birthDate),
          };
        });
    }

    if (!user || !student || !character || user.isAdmin) return [];
    const latestMembership = getLatestCohortMembership(student.cohortMemberships);
    const selectedSchool = latestMembership?.cohort?.school || student.school || schoolRows[0];

    return [
      {
        ...student,
        schoolId: selectedSchool.id,
        school: selectedSchool,
        user,
        displayName:
          user.displayName ||
          [user.firstName, user.lastName].filter(Boolean).join(' ') ||
          user.githubUsername ||
          user.email,
        email: latestMembership?.institutionalEmail || user.email,
        level: character.currentLevel,
        age: calculateAge(user.birthDate),
      },
    ];
  }, [character, debugBackup, schoolRows, student, user]);
  const schoolFilterOptions = useMemo(
    () => Array.from(new Set(studentRows.map((row) => row.school?.name || 'Aptitek'))),
    [studentRows]
  );
  const campusOptions = useMemo(
    () => Array.from(new Set(cohortRows.map((row) => row.campusName).filter(Boolean))),
    [cohortRows]
  );

  const studentColumns = useMemo<ColumnDef<StudentRow>[]>(
    () => [
      {
        id: 'avatar',
        header: t('management.students.avatar'),
        enableSorting: false,
        enableGlobalFilter: false,
        cell: ({ row }) => {
          const avatarUrl =
            row.original.user.avatarUrl ||
            row.original.user.githubAvatarUrl ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';

          return (
            <div className="avatar rounded-full ring-2 ring-solarized-blue/30 ring-offset-2 ring-offset-gaming-card">
              <div className="w-10 rounded-full">
                <img src={avatarUrl} alt={row.original.displayName} />
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'displayName',
        header: t('management.students.displayName'),
        cell: ({ getValue }) => (
          <TruncatedText
            value={getValue<string>()}
            className="font-display font-semibold text-text-primary"
          />
        ),
      },
      {
        id: 'pronouns',
        accessorFn: (row) => parsePronouns(row.user.pronouns || '').join(' '),
        header: t('management.students.pronouns'),
        cell: ({ row }) => {
          const pronouns = parsePronouns(row.original.user.pronouns || '');
          if (pronouns.length === 0) return <span className="text-text-muted">-</span>;

          return (
            <div className="flex max-w-full flex-nowrap gap-1 overflow-hidden">
              {pronouns.map((pronoun) => (
                <span
                  key={pronoun}
                  className="badge badge-sm badge-outline shrink-0 border-gaming-border text-text-secondary"
                >
                  {pronoun}
                </span>
              ))}
            </div>
          );
        },
      },
      {
        accessorKey: 'email',
        header: t('management.students.email'),
        cell: ({ getValue }) => <TruncatedText value={getValue<string>()} />,
      },
      {
        id: 'school',
        accessorFn: (row) => row.school?.name || 'Aptitek',
        header: t('management.students.school'),
        filterFn: (row, columnId, filterValue) => {
          const selected = filterValue as string[] | undefined;
          if (!selected || selected.length === 0) return true;
          return selected.includes(row.getValue<string>(columnId));
        },
        cell: ({ row }) => (
          <span
            className="badge badge-outline bg-gaming-base border-gaming-border text-text-secondary"
            title={row.original.school?.name || 'Aptitek'}
          >
            <SchoolLogoBadge
              name={row.original.school?.name || 'Aptitek'}
              logoUrl={row.original.school?.logoUrl}
            />
          </span>
        ),
      },
      {
        accessorKey: 'age',
        header: t('management.students.age'),
        cell: ({ getValue }) => <TruncatedText value={getValue<number | undefined>()} />,
      },
    ],
    [t]
  );

  const schoolColumns = useMemo<ColumnDef<SchoolRow>[]>(
    () => [
      {
        id: 'logo',
        header: t('management.schools.logo'),
        enableSorting: false,
        enableGlobalFilter: false,
        cell: ({ row }) => (
          <span className="badge badge-outline inline-flex min-w-0 max-w-full bg-gaming-base border-gaming-border text-text-secondary">
            <SchoolLogoBadge name={row.original.name} logoUrl={row.original.logoUrl} />
          </span>
        ),
      },
      {
        accessorKey: 'name',
        header: t('management.schools.name'),
        cell: ({ getValue }) => (
          <TruncatedText
            value={getValue<string>()}
            className="font-display font-semibold text-text-primary"
          />
        ),
      },
      {
        accessorKey: 'website',
        header: t('management.schools.website'),
        cell: ({ getValue }) => {
          const website = getValue<string | undefined>();
          if (!website) return '-';
          return (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="block max-w-full truncate whitespace-nowrap text-solarized-blue hover:underline"
            >
              {website.replace(/^https?:\/\//, '')}
            </a>
          );
        },
      },
      {
        id: 'address',
        accessorFn: (row) => formatAddress(row.address),
        header: t('management.schools.address'),
        cell: ({ getValue }) => {
          const address = getValue<string>();
          return (
            <span className="block max-w-full truncate whitespace-nowrap">
              {address}
            </span>
          );
        },
      },
      {
        accessorKey: 'cohortCount',
        header: t('management.schools.cohorts'),
        cell: ({ getValue }) => <TruncatedText value={getValue<number>()} />,
      },
      {
        accessorKey: 'studentCount',
        header: t('management.schools.students'),
        cell: ({ getValue }) => <TruncatedText value={getValue<number>()} />,
      },
    ],
    [t]
  );

  const cohortColumns = useMemo<ColumnDef<CohortRow>[]>(
    () => [
      {
        accessorKey: 'schoolName',
        header: t('management.cohorts.school'),
        cell: ({ getValue, row }) => (
          <span className="badge badge-outline inline-flex min-w-0 max-w-full bg-gaming-base border-gaming-border text-text-secondary">
            <SchoolLogoBadge name={getValue<string>()} logoUrl={row.original.school?.logoUrl} />
          </span>
        ),
      },
      {
        accessorKey: 'campusName',
        header: t('management.cohorts.campus'),
        cell: ({ getValue }) => <TruncatedText value={getValue<string>()} />,
      },
      {
        accessorKey: 'schoolYear',
        header: t('management.cohorts.schoolYear'),
        cell: ({ getValue }) => (
          <span className="badge badge-sm badge-outline border-gaming-border text-text-secondary" title={getValue<string>()}>
            {formatSchoolYear(getValue<string>())}
          </span>
        ),
      },
      {
        accessorKey: 'grade',
        header: t('management.cohorts.grade'),
        cell: ({ getValue }) => (
          <span className="badge badge-sm border-gaming-border bg-gaming-base text-text-secondary" title={formatGrade(getValue<CohortGrade>())}>
            {formatGrade(getValue<CohortGrade>())}
          </span>
        ),
      },
      {
        accessorKey: 'level',
        header: t('management.cohorts.level'),
        cell: ({ getValue }) => (
          <span className="badge badge-sm badge-outline border-gaming-border text-text-secondary" title={String(getValue<number>())}>
            {getValue<number>()}
          </span>
        ),
      },
      {
        accessorKey: 'name',
        header: t('management.cohorts.name'),
        cell: ({ getValue }) => (
          <TruncatedText
            value={getValue<string>()}
            className="font-display font-semibold text-text-primary"
          />
        ),
      },
      {
        id: 'speciality',
        accessorFn: (row) => [row.majorSpeciality, row.minorSpeciality].filter(Boolean).join(' '),
        header: t('management.cohorts.speciality'),
        cell: ({ row }) => (
          <div className="flex max-w-full flex-nowrap gap-1 overflow-hidden">
            {row.original.majorSpeciality && (
              <span className="badge badge-sm badge-outline shrink-0 border-gaming-border text-text-secondary">
                {row.original.majorSpeciality}
              </span>
            )}
            {row.original.minorSpeciality && (
              <span className="badge badge-sm badge-ghost shrink-0 text-text-muted">
                {row.original.minorSpeciality}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'studentCount',
        header: t('management.cohorts.students'),
        cell: ({ getValue }) => <TruncatedText value={getValue<number>()} />,
      },
    ],
    [t]
  );

  const selectedSchoolRow =
    selectedEntity?.tab === 'schools'
      ? schoolRows.find((row) => row.id === selectedEntity.id)
      : undefined;
  const selectedCohortRow =
    selectedEntity?.tab === 'cohorts'
      ? cohortRows.find((row) => row.id === selectedEntity.id)
      : undefined;
  const selectedStudentRow =
    selectedEntity?.tab === 'students'
      ? studentRows.find((row) => row.id === selectedEntity.id)
      : undefined;
  const selectedStudentMembership = getLatestCohortMembership(selectedStudentRow?.cohortMemberships);
  const selectedStudentInitialCohortIds =
    selectedStudentRow?.cohortMemberships?.map((membership) => membership.cohortId).filter(Boolean) || [];
  const selectedStudentCohortIds = selectedStudentRow
    ? studentCohortSelections[selectedStudentRow.id] ??
      (selectedStudentInitialCohortIds.length > 0
        ? selectedStudentInitialCohortIds
        : selectedStudentMembership?.cohortId
          ? [selectedStudentMembership.cohortId]
          : [])
    : [];
  const selectedStudentCohort =
    cohortRows.find((cohort) => cohort.id === selectedStudentCohortIds[0]) ||
    selectedStudentMembership?.cohort ||
    (selectedStudentMembership?.cohortId
      ? cohortRows.find((cohort) => cohort.id === selectedStudentMembership.cohortId)
      : undefined);
  const selectedCardContent = selectedSchoolRow ? (
    <SchoolDetailCard school={selectedSchoolRow} t={t} />
  ) : selectedCohortRow ? (
    <CohortDetailCard cohort={selectedCohortRow} campusOptions={campusOptions} t={t} />
  ) : selectedStudentRow ? (
    <div className="h-full min-h-[18rem]">
      <InstitutionalProfileCard
        user={selectedStudentRow.user}
        onUpdateProfile={async () => undefined}
        hideRoleBadge
        stackPronouns
        institutionalEmail={selectedStudentMembership?.institutionalEmail}
        institutionalEmailDomain={selectedStudentRow.school?.emailDomain}
        onInstitutionalEmailChange={async () => undefined}
        cohort={selectedStudentCohort}
        cohortOptions={cohortRows.map((cohort) => cohort.id)}
        selectedCohorts={selectedStudentCohortIds}
        onCohortsChange={(cohorts) => {
          setStudentCohortSelections((current) => ({
            ...current,
            [selectedStudentRow.id]: cohorts,
          }));
        }}
        renderCohortBadge={(cohortId) => {
          const cohort = cohortRows.find((item) => item.id === cohortId);
          return cohort ? <CohortDropdownBadge cohort={cohort} /> : cohortId;
        }}
        renderSelectedCohortBadge={(cohortId) => {
          const cohort = cohortRows.find((item) => item.id === cohortId);
          return cohort ? <CohortListBadge cohort={cohort} /> : cohortId;
        }}
        renderCohortSchoolBadge={(schoolName) => {
          const school = schoolRows.find((item) => item.name === schoolName);
          return <SchoolLogoBadge name={schoolName} logoUrl={school?.logoUrl} />;
        }}
        getCohortSchoolName={(cohortId) => cohortRows.find((item) => item.id === cohortId)?.schoolName}
        getCohortInstitutionalEmail={(cohortId) =>
          selectedStudentRow.cohortMemberships?.find((membership) => membership.cohortId === cohortId)
            ?.institutionalEmail
        }
        getCohortInstitutionalEmailDomain={(cohortId) => {
          const cohort = cohortRows.find((item) => item.id === cohortId);
          return cohort?.school?.emailDomain || schoolRows.find((school) => school.id === cohort?.schoolId)?.emailDomain;
        }}
        className="max-w-none border-0 bg-transparent shadow-none rounded-none"
      />
    </div>
  ) : (
    <CardSkeleton label={t('management.card.rectoEmpty')} />
  );

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <GameLayout>
      <GameHeader currentView="management" />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-stretch">
        <div className="flex min-w-0 flex-col gap-5">
          <div>
            <h2 className="text-2xl font-display font-bold text-text-primary">
              {t('management.title')}
            </h2>
            <p className="text-sm text-text-muted">{t('management.subtitle')}</p>
          </div>

          <div className="tabs tabs-boxed w-fit bg-gaming-card border border-gaming-border p-1">
            {(['schools', 'cohorts', 'students'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'tab font-display font-semibold',
                  activeTab === tab
                    ? 'tab-active bg-gaming-base text-text-primary'
                    : 'text-text-muted hover:text-text-secondary'
                )}
              >
                {t(`management.tabs.${tab}`)}
              </button>
            ))}
          </div>

          {activeTab === 'students' ? (
              <ManagementTable
                data={studentRows}
                columns={studentColumns}
                globalFilter={searchQuery}
                onGlobalFilterChange={setSearchQuery}
                schoolFilterOptions={schoolFilterOptions}
                selectedRowId={selectedEntity?.tab === 'students' ? selectedEntity.id : undefined}
                onRowSelect={(row) => setSelectedEntity({ tab: 'students', id: row.id })}
              />
            ) : activeTab === 'cohorts' ? (
              <ManagementTable
                data={cohortRows}
                columns={cohortColumns}
                globalFilter={searchQuery}
                onGlobalFilterChange={setSearchQuery}
                selectedRowId={selectedEntity?.tab === 'cohorts' ? selectedEntity.id : undefined}
                onRowSelect={(row) => setSelectedEntity({ tab: 'cohorts', id: row.id })}
              />
            ) : (
              <ManagementTable
                data={schoolRows}
                columns={schoolColumns}
                globalFilter={searchQuery}
                onGlobalFilterChange={setSearchQuery}
                selectedRowId={selectedEntity?.tab === 'schools' ? selectedEntity.id : undefined}
                onRowSelect={(row) => setSelectedEntity({ tab: 'schools', id: row.id })}
              />
            )}
        </div>

          <PlayingCard
            flipLabel={t('management.card.flip')}
            recto={selectedCardContent}
            verso={
              <div className="flex h-full min-h-[18rem] flex-col items-center justify-center p-5 text-center text-text-muted">
                <span className="text-xs font-display uppercase tracking-widest">
                  {t('management.card.versoEmpty')}
                </span>
              </div>
            }
            className="h-full max-h-[calc(100vh-8rem)] xl:sticky xl:top-8"
          />
      </section>
    </GameLayout>
  );
}

export default ManagementPage;
