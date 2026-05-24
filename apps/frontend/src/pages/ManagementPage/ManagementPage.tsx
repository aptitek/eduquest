import { useEffect, useMemo, useState } from 'react';
import { GameLayout } from '../../components/templates/GameLayout';
import { GameHeader } from '../../components/organisms/GameHeader';
import { PlayingCard } from '../../components/molecules/PlayingCard';
import { ManagementTable } from '../../components/organisms/ManagementTable';
import { CardSkeleton, CohortDetailCard, SchoolDetailCard } from '../../components/organisms/ManagementCards';
import { CohortDropdownBadge, CohortListBadge } from '../../components/molecules/CohortBadge';
import { SchoolLogoBadge } from '../../components/molecules/SchoolLogoBadge';
import { InstitutionalProfileCard } from '../../components/organisms/InstitutionalProfileCard/InstitutionalProfileCard';
import { BACKEND_BASE_URL } from '../../features/auth/useAuth';
import { useGameStore } from '../../features/game/gameStore';
import { mockCohorts, mockSchools } from '../../features/management/mockData';
import { useManagementColumns } from '../../features/management/useManagementColumns';
import type {
  CohortRow,
  DebugBackup,
  ManagementTab,
  SchoolRow,
  SelectedManagementEntity,
  StudentRow,
} from '../../features/management/types';
import {
  calculateAge,
  getLatestCohortMembership,
} from '../../features/management/utils';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../utils/cn';

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
  const { cohortColumns, schoolColumns, studentColumns } = useManagementColumns(t);

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
