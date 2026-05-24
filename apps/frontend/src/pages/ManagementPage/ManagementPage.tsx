import { useMemo, useState } from 'react';
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
import { Address, Campus, Cohort, CohortGrade, School, Student, User } from '@eduquest/shared';
import { GameLayout } from '../../components/templates/GameLayout';
import { GameHeader } from '../../components/organisms/GameHeader';
import { PlayingCard } from '../../components/molecules/PlayingCard';
import { BadgeDropdown } from '../../components/molecules/BadgeDropdown';
import { useGameStore } from '../../features/game/gameStore';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../utils/cn';
import { parsePronouns } from '../../utils/pronouns';
import logoUrl from '../../assets/logo.svg';

type ManagementTab = 'schools' | 'cohorts' | 'students';

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
    name: 'Aptitek School',
    website: 'https://aptitek.io',
    emailDomain: 'aptitek.io',
    address: mockAddresses[0],
    cohortCount: 1,
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
    schoolName: 'Aptitek School',
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

function SchoolLogoBadge({ name }: { name: string }) {
  return (
    <img src={logoUrl} alt={name} title={name} className="h-4 w-auto max-w-none object-contain" />
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

function ManagementTable<TData>({
  data,
  columns,
  globalFilter,
  onGlobalFilterChange,
  schoolFilterOptions = [],
}: {
  data: TData[];
  columns: ColumnDef<TData>[];
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  schoolFilterOptions?: string[];
}) {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

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
  });
  const schoolColumn = table.getColumn('school');
  const selectedSchools = (schoolColumn?.getFilterValue() as string[] | undefined) ?? [];

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
        <table className="table">
          <thead className="bg-gaming-base/60 text-text-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="font-display text-xs uppercase tracking-wider">
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        disabled={!header.column.getCanSort()}
                        className={cn(
                          'inline-flex items-center gap-1 uppercase tracking-wider',
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
              <tr key={row.id} className="border-gaming-border hover:bg-gaming-base/40">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="text-text-secondary">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
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

  const studentRows = useMemo<StudentRow[]>(() => {
    if (!user || !student || !character) return [];
    const selectedSchoolId = student.schoolId || mockSchools[0]?.id;
    const selectedSchool = mockSchools.find((school) => school.id === selectedSchoolId);

    return [
      {
        ...student,
        schoolId: selectedSchoolId,
        school: selectedSchool || student.school,
        user,
        displayName:
          user.displayName ||
          [user.firstName, user.lastName].filter(Boolean).join(' ') ||
          user.githubUsername ||
          user.email,
        email: student.institutionalEmail || user.email,
        level: character.currentLevel,
        age: calculateAge(user.birthDate),
      },
    ];
  }, [character, student, user]);
  const schoolFilterOptions = useMemo(
    () => Array.from(new Set(studentRows.map((row) => row.school?.name || 'Aptitek School'))),
    [studentRows]
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
          <span className="font-display font-semibold text-text-primary">
            {getValue<string>()}
          </span>
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
            <div className="flex flex-wrap gap-1">
              {pronouns.map((pronoun) => (
                <span
                  key={pronoun}
                  className="badge badge-sm badge-outline border-gaming-border text-text-secondary"
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
      },
      {
        id: 'school',
        accessorFn: (row) => row.school?.name || 'Aptitek School',
        header: t('management.students.school'),
        filterFn: (row, columnId, filterValue) => {
          const selected = filterValue as string[] | undefined;
          if (!selected || selected.length === 0) return true;
          return selected.includes(row.getValue<string>(columnId));
        },
        cell: ({ row }) => (
          <span
            className="badge badge-outline bg-gaming-base border-gaming-border text-text-secondary"
            title={row.original.school?.name || 'Aptitek School'}
          >
            <SchoolLogoBadge name={row.original.school?.name || 'Aptitek School'} />
          </span>
        ),
      },
      {
        accessorKey: 'age',
        header: t('management.students.age'),
        cell: ({ getValue }) => getValue<number | undefined>() ?? '-',
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
          <span className="badge badge-outline bg-gaming-base border-gaming-border text-text-secondary">
            <SchoolLogoBadge name={row.original.name} />
          </span>
        ),
      },
      {
        accessorKey: 'name',
        header: t('management.schools.name'),
        cell: ({ getValue }) => (
          <span className="font-display font-semibold text-text-primary">
            {getValue<string>()}
          </span>
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
              className="text-solarized-blue hover:underline"
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
            <span className="block max-w-[16rem] truncate" title={address}>
              {address}
            </span>
          );
        },
      },
      {
        accessorKey: 'cohortCount',
        header: t('management.schools.cohorts'),
      },
      {
        accessorKey: 'studentCount',
        header: t('management.schools.students'),
      },
    ],
    [t]
  );

  const cohortColumns = useMemo<ColumnDef<CohortRow>[]>(
    () => [
      {
        accessorKey: 'schoolName',
        header: t('management.cohorts.school'),
        cell: ({ getValue }) => (
          <span className="badge badge-outline bg-gaming-base border-gaming-border text-text-secondary">
            <SchoolLogoBadge name={getValue<string>()} />
          </span>
        ),
      },
      {
        accessorKey: 'campusName',
        header: t('management.cohorts.campus'),
      },
      {
        accessorKey: 'schoolYear',
        header: t('management.cohorts.schoolYear'),
        cell: ({ getValue }) => (
          <span className="badge badge-sm badge-outline border-gaming-border text-text-secondary">
            {formatSchoolYear(getValue<string>())}
          </span>
        ),
      },
      {
        accessorKey: 'grade',
        header: t('management.cohorts.grade'),
        cell: ({ getValue }) => (
          <span className="badge badge-sm bg-gaming-base border-gaming-border text-text-secondary">
            {formatGrade(getValue<CohortGrade>())}
          </span>
        ),
      },
      {
        accessorKey: 'level',
        header: t('management.cohorts.level'),
        cell: ({ getValue }) => (
          <span className="badge badge-sm badge-outline border-gaming-border text-text-secondary">
            {getValue<number>()}
          </span>
        ),
      },
      {
        accessorKey: 'name',
        header: t('management.cohorts.name'),
        cell: ({ getValue }) => (
          <span className="font-display font-semibold text-text-primary">
            {getValue<string>()}
          </span>
        ),
      },
      {
        id: 'speciality',
        accessorFn: (row) => [row.majorSpeciality, row.minorSpeciality].filter(Boolean).join(' '),
        header: t('management.cohorts.speciality'),
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.majorSpeciality && (
              <span className="badge badge-sm badge-outline border-gaming-border text-text-secondary">
                {row.original.majorSpeciality}
              </span>
            )}
            {row.original.minorSpeciality && (
              <span className="badge badge-sm badge-ghost text-text-muted">
                {row.original.minorSpeciality}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'studentCount',
        header: t('management.cohorts.students'),
      },
    ],
    [t]
  );

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <GameLayout>
      <GameHeader currentView="management" />

      <section className="flex flex-col gap-5">
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

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          {activeTab === 'students' ? (
            <ManagementTable
              data={studentRows}
              columns={studentColumns}
              globalFilter={searchQuery}
              onGlobalFilterChange={setSearchQuery}
              schoolFilterOptions={schoolFilterOptions}
            />
          ) : activeTab === 'cohorts' ? (
            <ManagementTable
              data={mockCohorts}
              columns={cohortColumns}
              globalFilter={searchQuery}
              onGlobalFilterChange={setSearchQuery}
            />
          ) : (
            <ManagementTable
              data={mockSchools}
              columns={schoolColumns}
              globalFilter={searchQuery}
              onGlobalFilterChange={setSearchQuery}
            />
          )}

          <PlayingCard
            flipLabel={t('management.card.flip')}
            recto={
              <div className="flex h-full min-h-[18rem] flex-col items-center justify-center text-center text-text-muted">
                <span className="text-xs font-display uppercase tracking-widest">
                  {t('management.card.rectoEmpty')}
                </span>
              </div>
            }
            verso={
              <div className="flex h-full min-h-[18rem] flex-col items-center justify-center text-center text-text-muted">
                <span className="text-xs font-display uppercase tracking-widest">
                  {t('management.card.versoEmpty')}
                </span>
              </div>
            }
          />
        </div>
      </section>
    </GameLayout>
  );
}

export default ManagementPage;
