import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { CohortGrade } from '@eduquest/shared';
import { TruncatedText } from '../../components/atoms/TruncatedText';
import { CohortListBadge } from '../../components/molecules/CohortBadge';
import { SchoolLogoBadge } from '../../components/molecules/SchoolLogoBadge';
import type { CohortRow, SchoolRow, StudentRow } from './types';
import { formatAddress, formatGrade, formatSchoolYear } from './utils';
import { formatPronounsForDisplay, getPronounLabel, parsePronouns } from '../../utils/pronouns';

export function useManagementColumns(t: (key: string) => string) {
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
              <div className="w-8 rounded-full">
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
        accessorFn: (row) => formatPronounsForDisplay(row.user.pronouns || '', t),
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
                  {getPronounLabel(pronoun, t)}
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
        id: 'cohort',
        accessorFn: (row) =>
          row.cohort
            ? [
                formatSchoolYear(row.cohort.startYear),
                row.cohort.grade,
                row.cohort.level,
                row.cohort.name,
                row.cohort.majorSpeciality,
                row.cohort.minorSpeciality,
              ]
                .filter(Boolean)
                .join(' ')
            : '',
        header: t('management.students.cohort'),
        cell: ({ row }) =>
          row.original.cohort ? (
            <CohortListBadge cohort={row.original.cohort} />
          ) : (
            <span className="text-text-muted">-</span>
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
          return <span className="block max-w-full truncate whitespace-nowrap">{address}</span>;
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
        accessorKey: 'startYear',
        header: t('management.cohorts.schoolYear'),
        cell: ({ getValue }) => (
          <span
            className="badge badge-sm badge-outline border-gaming-border text-text-secondary"
            title={String(getValue<number>())}
          >
            {formatSchoolYear(getValue<number>())}
          </span>
        ),
      },
      {
        accessorKey: 'grade',
        header: t('management.cohorts.grade'),
        cell: ({ getValue }) => (
          <span
            className="badge badge-sm border-gaming-border bg-gaming-base text-text-secondary"
            title={formatGrade(getValue<CohortGrade>())}
          >
            {formatGrade(getValue<CohortGrade>())}
          </span>
        ),
      },
      {
        accessorKey: 'level',
        header: t('management.cohorts.level'),
        cell: ({ getValue }) => (
          <span
            className="badge badge-sm badge-outline border-gaming-border text-text-secondary"
            title={String(getValue<number>())}
          >
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

  return {
    cohortColumns,
    schoolColumns,
    studentColumns,
  };
}
