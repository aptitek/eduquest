import { useMemo, useState } from 'react';
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { School, Student, User } from '@eduquest/shared';
import { GameLayout } from '../../components/templates/GameLayout';
import { GameHeader } from '../../components/organisms/GameHeader';
import { PlayingCard } from '../../components/molecules/PlayingCard';
import { useGameStore } from '../../features/game/gameStore';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../utils/cn';
import { parsePronouns } from '../../utils/pronouns';

type ManagementTab = 'students' | 'schools';
type RoleFilter = 'all' | 'admin' | 'student';

type StudentRow = Student & {
  user: User;
  displayName: string;
  email: string;
  level: number;
  age?: number;
};

const mockSchools: School[] = [
  {
    id: 'school_aptitek',
    name: 'Aptitek School',
    emailDomain: 'aptitek.io',
    createdAt: '2026-01-01',
  },
];

function formatDate(value?: string) {
  if (!value) return '-';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

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

function ManagementTable<TData>({
  data,
  columns,
}: {
  data: TData[];
  columns: ColumnDef<TData>[];
}) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-hidden rounded-xl border border-gaming-border bg-gaming-card shadow-lg">
      <div className="overflow-x-auto">
        <table className="table">
          <thead className="bg-gaming-base/60 text-text-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="font-display text-xs uppercase tracking-wider">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
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
  const [activeTab, setActiveTab] = useState<ManagementTab>('students');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [schoolFilter, setSchoolFilter] = useState('all');

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
    () => ['all', ...mockSchools.map((school) => school.name)],
    []
  );

  const filteredStudentRows = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return studentRows.filter((row) => {
      const pronouns = parsePronouns(row.user.pronouns || '').join(' ');
      const schoolName = row.school?.name || 'Aptitek School';
      const role = row.user.isAdmin ? 'admin' : 'student';
      const haystack = [
        row.displayName,
        row.email,
        row.user.githubUsername,
        schoolName,
        pronouns,
        String(row.age ?? ''),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
      const matchesRole = roleFilter === 'all' || roleFilter === role;
      const matchesSchool = schoolFilter === 'all' || schoolFilter === schoolName;

      return matchesSearch && matchesRole && matchesSchool;
    });
  }, [roleFilter, schoolFilter, searchQuery, studentRows]);

  const filteredSchools = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return mockSchools.filter((school) => {
      const haystack = [school.name, school.emailDomain].filter(Boolean).join(' ').toLowerCase();
      return !normalizedSearch || haystack.includes(normalizedSearch);
    });
  }, [searchQuery]);

  const studentColumns = useMemo<ColumnDef<StudentRow>[]>(
    () => [
      {
        id: 'avatar',
        header: t('management.students.avatar'),
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
        accessorKey: 'school.name',
        header: t('management.students.school'),
        cell: ({ row }) => (
          <span className="badge badge-outline bg-gaming-base border-gaming-border text-text-secondary">
            {row.original.school?.name || 'Aptitek School'}
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

  const schoolColumns = useMemo<ColumnDef<School>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('management.schools.name'),
      },
      {
        accessorKey: 'emailDomain',
        header: t('management.schools.emailDomain'),
        cell: ({ getValue }) => getValue<string | undefined>() || '-',
      },
      {
        accessorKey: 'createdAt',
        header: t('management.schools.createdAt'),
        cell: ({ getValue }) => formatDate(getValue<string | undefined>()),
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
          {(['students', 'schools'] as const).map((tab) => (
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

        <div className="rounded-xl border border-gaming-border bg-gaming-card p-3 shadow-md">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <label className="form-control flex-1">
              <span className="label-text text-xs font-display uppercase tracking-wider text-text-muted">
                {t('management.filters.search')}
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('management.filters.searchPlaceholder')}
                className="input input-bordered input-sm bg-gaming-base border-gaming-border text-text-primary"
              />
            </label>

            {activeTab === 'students' && (
              <>
                <label className="form-control w-full lg:w-40">
                  <span className="label-text text-xs font-display uppercase tracking-wider text-text-muted">
                    {t('management.filters.role')}
                  </span>
                  <select
                    value={roleFilter}
                    onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
                    className="select select-bordered select-sm bg-gaming-base border-gaming-border text-text-primary"
                  >
                    <option value="all">{t('management.filters.allRoles')}</option>
                    <option value="admin">{t('profile.institutionalCard.adminRole')}</option>
                    <option value="student">{t('profile.institutionalCard.studentRole')}</option>
                  </select>
                </label>

                <label className="form-control w-full lg:w-48">
                  <span className="label-text text-xs font-display uppercase tracking-wider text-text-muted">
                    {t('management.filters.school')}
                  </span>
                  <select
                    value={schoolFilter}
                    onChange={(event) => setSchoolFilter(event.target.value)}
                    className="select select-bordered select-sm bg-gaming-base border-gaming-border text-text-primary"
                  >
                    {schoolFilterOptions.map((school) => (
                      <option key={school} value={school}>
                        {school === 'all' ? t('management.filters.allSchools') : school}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          {activeTab === 'students' ? (
            <ManagementTable data={filteredStudentRows} columns={studentColumns} />
          ) : (
            <ManagementTable data={filteredSchools} columns={schoolColumns} />
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
