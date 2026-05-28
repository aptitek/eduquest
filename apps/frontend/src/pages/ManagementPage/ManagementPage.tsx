import { useEffect, useMemo, useState } from 'react';
import { GameLayout } from '../../components/templates/GameLayout';
import { GameHeader } from '../../components/organisms/GameHeader';
import { PlayingCard, type PlayingCardSide } from '../../components/molecules/PlayingCard';
import { ManagementTable } from '../../components/organisms/ManagementTable';
import {
  CardSkeleton,
  CohortDetailCard,
  SchoolDetailCard,
} from '../../components/organisms/ManagementCards';
import { CohortDropdownBadge, CohortListBadge } from '../../components/molecules/CohortBadge';
import { SchoolLogoBadge } from '../../components/molecules/SchoolLogoBadge';
import { InstitutionalProfileCard } from '../../components/organisms/InstitutionalProfileCard/InstitutionalProfileCard';
import { useGameStore } from '../../features/game/gameStore';
import {
  fetchManagementBackup,
  type ManagementCharacterClassUpdate,
  type ManagementSchoolUpdate,
  type ManagementStudentUpdate,
  updateManagementCohortCharacterClass,
  updateManagementSchool,
  updateManagementStudent,
} from '../../features/management/api';
import { useManagementColumns } from '../../features/management/useManagementColumns';
import type {
  CohortRow,
  ManagementBackup,
  ManagementTab,
  SchoolRow,
  SelectedManagementEntity,
  StudentRow,
} from '../../features/management/types';
import {
  calculateAge,
  formatSchoolYear,
  getLatestCohortMembership,
} from '../../features/management/utils';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../utils/cn';
import { formatUserDisplayName } from '../../utils/displayName';
import { uploadAsset } from '../../features/assets/api';
import { useErrorReporter } from '../../features/errors/notifications';

function getSchoolInstitutionalEmail(rowUser: StudentRow['user'], legacyEmail?: string) {
  return legacyEmail || rowUser.email;
}

export function ManagementPage() {
  const { t } = useTranslation();
  const reportError = useErrorReporter();
  const { user, student, character } = useGameStore();
  const [activeTab, setActiveTab] = useState<ManagementTab>('schools');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<SelectedManagementEntity | null>(null);
  const [managementBackup, setManagementBackup] = useState<ManagementBackup | null>(null);
  const [isManagementLoading, setIsManagementLoading] = useState(false);
  const [managementErrorKey, setManagementErrorKey] = useState<string | null>(null);

  useEffect(() => {
    setSelectedEntity(null);
    setSearchQuery('');
  }, [activeTab]);

  useEffect(() => {
    if (!user?.isAdmin) return;

    let isMounted = true;
    const loadManagementBackup = async () => {
      const token = localStorage.getItem('eduquest_token');
      if (!token) {
        reportError('Missing session token.', {
          messageKey: 'management.errors.missingSession',
          id: 'management.errors.missingSession',
          includeDetail: false,
        });
        setManagementErrorKey('management.errors.missingSession');
        return;
      }

      setIsManagementLoading(true);
      setManagementErrorKey(null);
      try {
        const backup = await fetchManagementBackup(token);
        if (isMounted) setManagementBackup(backup);
      } catch (error) {
        reportError(error, {
          messageKey: 'management.errors.loadBackupFailed',
          id: 'management.errors.loadBackupFailed',
          logMessage: 'Could not load management backup.',
        });
        if (isMounted) setManagementErrorKey('management.errors.loadBackupFailed');
      } finally {
        if (isMounted) setIsManagementLoading(false);
      }
    };

    loadManagementBackup();
    return () => {
      isMounted = false;
    };
  }, [user?.isAdmin]);

  const schoolRows = useMemo<SchoolRow[]>(() => {
    if (!managementBackup) return [];

    return managementBackup.schools.map((school) => {
      const campus = managementBackup.campuses.find((item) => item.schoolId === school.id);
      const cohortCount = managementBackup.cohorts.filter(
        (cohort) => cohort.schoolId === school.id
      ).length;
      const studentCount = managementBackup.students.filter((profile) =>
        profile.student.cohortMemberships?.some(
          (membership) => membership.cohort?.schoolId === school.id
        )
      ).length;

      return {
        ...school,
        address: campus?.address,
        cohortCount,
        studentCount,
      };
    });
  }, [managementBackup]);

  const cohortRows = useMemo<CohortRow[]>(() => {
    if (!managementBackup) return [];

    return managementBackup.cohorts.map((cohort) => ({
      ...cohort,
      schoolName:
        cohort.school?.name ||
        managementBackup.schools.find((school) => school.id === cohort.schoolId)?.name ||
        '-',
      campusName:
        cohort.campus?.name ||
        managementBackup.campuses.find((campus) => campus.id === cohort.campusId)?.name ||
        '-',
      studentCount: managementBackup.students.filter((profile) =>
        profile.student.cohortMemberships?.some((membership) => membership.cohortId === cohort.id)
      ).length,
    }));
  }, [managementBackup]);

  const studentRows = useMemo<StudentRow[]>(() => {
    if (managementBackup) {
      return managementBackup.students
        .filter(({ user: rowUser }) => !rowUser.isAdmin)
        .map(({ user: rowUser, student: rowStudent, character: rowCharacter }) => {
          const latestMembership = getLatestCohortMembership(rowStudent.cohortMemberships);
          const selectedSchool = latestMembership?.cohort?.school || schoolRows[0];

          return {
            ...rowStudent,
            schoolId: selectedSchool?.id,
            school: selectedSchool,
            character: rowCharacter,
            user: rowUser,
            displayName: formatUserDisplayName(rowUser),
            email: getSchoolInstitutionalEmail(rowUser, latestMembership?.institutionalEmail),
            cohort: latestMembership?.cohortId
              ? cohortRows.find((cohort) => cohort.id === latestMembership.cohortId)
              : undefined,
            age: calculateAge(rowUser.birthDate),
          };
        });
    }

    if (!user || !student || !character || user.isAdmin) return [];
    const latestMembership = getLatestCohortMembership(student.cohortMemberships);
    const selectedSchool = latestMembership?.cohort?.school || schoolRows[0];

    return [
      {
        ...student,
        schoolId: selectedSchool?.id,
        school: selectedSchool,
        character,
        user,
        displayName: formatUserDisplayName(user),
        email: getSchoolInstitutionalEmail(user, latestMembership?.institutionalEmail),
        cohort: latestMembership?.cohortId
          ? cohortRows.find((cohort) => cohort.id === latestMembership.cohortId)
          : undefined,
        age: calculateAge(user.birthDate),
      },
    ];
  }, [character, cohortRows, managementBackup, schoolRows, student, user]);
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
  const selectedStudentMembership = getLatestCohortMembership(
    selectedStudentRow?.cohortMemberships
  );
  const selectedStudentInitialCohortIds = selectedStudentMembership?.cohortId
    ? [selectedStudentMembership.cohortId]
    : [];
  const selectedStudentCohortIds =
    selectedStudentInitialCohortIds.length > 0
      ? selectedStudentInitialCohortIds
      : selectedStudentMembership?.cohortId
        ? [selectedStudentMembership.cohortId]
        : [];
  const selectedStudentCohort =
    cohortRows.find((cohort) => cohort.id === selectedStudentCohortIds[0]) ||
    selectedStudentMembership?.cohort ||
    (selectedStudentMembership?.cohortId
      ? cohortRows.find((cohort) => cohort.id === selectedStudentMembership.cohortId)
      : undefined);
  const updateSelectedSchool = async (update: ManagementSchoolUpdate, shouldThrow = false) => {
    if (!selectedSchoolRow) return;

    const token = localStorage.getItem('eduquest_token');
    if (!token) {
      reportError('Missing session token.', {
        messageKey: 'management.errors.missingSession',
        id: 'management.errors.missingSession',
        includeDetail: false,
      });
      setManagementErrorKey('management.errors.missingSession');
      if (shouldThrow) throw new Error('management.errors.missingSession');
      return;
    }

    setManagementErrorKey(null);
    try {
      const backup = await updateManagementSchool(token, selectedSchoolRow.id, update);
      setManagementBackup(backup);
    } catch (error) {
      reportError(error, {
        messageKey: 'management.errors.updateSchoolFailed',
        id: 'management.errors.updateSchoolFailed',
        logMessage: 'Could not update management school.',
      });
      setManagementErrorKey('management.errors.updateSchoolFailed');
      if (shouldThrow) throw error;
    }
  };
  const updateSelectedStudent = async (update: ManagementStudentUpdate, shouldThrow = false) => {
    if (!selectedStudentRow) return;

    const token = localStorage.getItem('eduquest_token');
    if (!token) {
      reportError('Missing session token.', {
        messageKey: 'management.errors.missingSession',
        id: 'management.errors.missingSession',
        includeDetail: false,
      });
      setManagementErrorKey('management.errors.missingSession');
      if (shouldThrow) throw new Error('management.errors.missingSession');
      return;
    }

    setManagementErrorKey(null);
    try {
      const backup = await updateManagementStudent(token, selectedStudentRow.id, update);
      setManagementBackup(backup);
    } catch (error) {
      reportError(error, {
        messageKey: 'management.errors.updateStudentFailed',
        id: 'management.errors.updateStudentFailed',
        logMessage: 'Could not update management student.',
      });
      setManagementErrorKey('management.errors.updateStudentFailed');
      if (shouldThrow) throw error;
    }
  };
  const updateSelectedCohortCharacterClass = async (
    characterClassUpdate: ManagementCharacterClassUpdate['baseStats'],
    characterClass: Parameters<typeof updateManagementCohortCharacterClass>[2]
  ) => {
    if (!selectedCohortRow) return;

    const token = localStorage.getItem('eduquest_token');
    if (!token) {
      reportError('Missing session token.', {
        messageKey: 'management.errors.missingSession',
        id: 'management.errors.missingSession',
        includeDetail: false,
      });
      setManagementErrorKey('management.errors.missingSession');
      throw new Error('management.errors.missingSession');
    }

    setManagementErrorKey(null);
    try {
      const backup = await updateManagementCohortCharacterClass(
        token,
        selectedCohortRow.id,
        characterClass,
        { baseStats: characterClassUpdate }
      );
      setManagementBackup(backup);
    } catch (error) {
      reportError(error, {
        messageKey: 'management.errors.updateClassStatsFailed',
        id: 'management.errors.updateClassStatsFailed',
        logMessage: 'Could not update management character class.',
      });
      setManagementErrorKey('management.errors.updateClassStatsFailed');
      throw error;
    }
  };
  const selectedStudentCharacterBack = selectedStudentRow?.character
    ? buildStudentCharacterBackSide(selectedStudentRow, t, updateSelectedStudent)
    : undefined;
  const selectedCardContent = selectedSchoolRow ? (
    <SchoolDetailCard
      school={selectedSchoolRow}
      t={t}
      onUploadLogo={async (file) => {
        const token = localStorage.getItem('eduquest_token');
        if (!token) throw new Error('management.errors.missingSession');

        const asset = await uploadAsset(token, 'school-logo', file, selectedSchoolRow.id);
        await updateSelectedSchool({ logoUrl: asset.url }, true);
      }}
      onResetLogo={() => updateSelectedSchool({ logoUrl: '' }, true)}
    />
  ) : selectedCohortRow ? (
    <CohortDetailCard
      cohort={selectedCohortRow}
      cohortOptions={cohortRows}
      campusOptions={campusOptions}
      characterClasses={managementBackup?.characterClasses || []}
      onUpdateCharacterClass={(characterClass, baseStats) =>
        updateSelectedCohortCharacterClass(baseStats, characterClass)
      }
      t={t}
    />
  ) : selectedStudentRow ? (
    <div className="h-full min-h-[18rem]">
      <InstitutionalProfileCard
        user={selectedStudentRow.user}
        variant="management"
        onUpdateProfile={(data) => updateSelectedStudent({ user: data })}
        onUploadAvatar={async (file) => {
          const token = localStorage.getItem('eduquest_token');
          if (!token) throw new Error('management.errors.missingSession');

          const asset = await uploadAsset(token, 'avatar', file);
          await updateSelectedStudent({ user: { avatarUrl: asset.url } }, true);
        }}
        onResetAvatar={() =>
          updateSelectedStudent(
            { user: { avatarUrl: selectedStudentRow.user.githubAvatarUrl || '' } },
            true
          )
        }
        schoolLogoUrl={selectedStudentCohort?.school?.logoUrl}
        institutionalEmail={
          selectedStudentMembership?.institutionalEmail
        }
        institutionalEmailDomain={selectedStudentCohort?.school?.emailDomain}
        onInstitutionalEmailChange={(institutionalEmail, cohortId) =>
          updateSelectedStudent({
            institutionalEmail,
            institutionalEmailCohortId:
              cohortId || selectedStudentMembership?.cohortId || selectedStudentCohortIds[0],
          })
        }
        cohort={selectedStudentCohort}
        cohortRibbonLabel={
          selectedStudentCohort ? formatSchoolYear(selectedStudentCohort.startYear) : undefined
        }
        cohortOptions={cohortRows.map((cohort) => cohort.id)}
        selectedCohorts={selectedStudentCohortIds}
        onCohortsChange={(cohortIds) =>
          updateSelectedStudent({
            cohortIds,
            institutionalEmailCohortId:
              selectedStudentMembership?.cohortId || cohortIds[0] || selectedStudentCohortIds[0],
          })
        }
        renderCohortBadge={(cohortId) => {
          const cohort = cohortRows.find((item) => item.id === cohortId);
          return cohort ? <CohortDropdownBadge cohort={cohort} /> : cohortId;
        }}
        renderSelectedCohortBadge={(cohortId) => {
          const cohort = cohortRows.find((item) => item.id === cohortId);
          return cohort ? <CohortListBadge cohort={cohort} showSchoolYear={false} /> : cohortId;
        }}
        renderCohortSchoolBadge={(schoolName) => {
          const school = schoolRows.find((item) => item.name === schoolName);
          return (
            <SchoolLogoBadge
              name={schoolName}
              logoUrl={school?.logoUrl}
              className="h-full w-full object-contain"
            />
          );
        }}
        getCohortSchoolName={(cohortId) =>
          cohortRows.find((item) => item.id === cohortId)?.schoolName
        }
        getCohortInstitutionalEmail={(cohortId) => {
          return getSchoolInstitutionalEmail(
            selectedStudentRow.user,
            selectedStudentRow.cohortMemberships?.find(
              (membership) => membership.cohortId === cohortId
            )?.institutionalEmail
          );
        }}
        getCohortInstitutionalEmailDomain={(cohortId) => {
          const cohort = cohortRows.find((item) => item.id === cohortId);
          return (
            cohort?.school?.emailDomain ||
            schoolRows.find((school) => school.id === cohort?.schoolId)?.emailDomain
          );
        }}
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

          {isManagementLoading && (
            <p className="text-sm text-text-muted">{t('management.loading')}</p>
          )}

          {managementErrorKey && (
            <div
              role="alert"
              className="alert alert-warning border-gaming-border bg-gaming-base/60 text-text-secondary"
            >
              {t(managementErrorKey)}
            </div>
          )}

          <div className="flex flex-col">
            <div className="tabs tabs-lifted w-fit gap-1">
              {(['schools', 'cohorts', 'students'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'tab rounded-t-xl border-gaming-border px-6 font-display font-semibold',
                    activeTab === tab
                      ? 'tab-active bg-gaming-card text-text-primary'
                      : 'bg-gaming-base/40 text-text-muted hover:text-text-secondary'
                  )}
                >
                  {t(`management.tabs.${tab}`)}
                </button>
              ))}
            </div>

            {activeTab === 'students' ? (
              <ManagementTable
                key="students"
                data={studentRows}
                columns={studentColumns}
                globalFilter={searchQuery}
                onGlobalFilterChange={setSearchQuery}
                searchLabel={t('management.filters.search')}
                schoolFilterOptions={schoolFilterOptions}
                selectedRowId={selectedEntity?.tab === 'students' ? selectedEntity.id : undefined}
                onRowSelect={(row) => setSelectedEntity({ tab: 'students', id: row.id })}
                flushTop
              />
            ) : activeTab === 'cohorts' ? (
              <ManagementTable
                key="cohorts"
                data={cohortRows}
                columns={cohortColumns}
                globalFilter={searchQuery}
                onGlobalFilterChange={setSearchQuery}
                searchLabel={t('management.filters.search')}
                selectedRowId={selectedEntity?.tab === 'cohorts' ? selectedEntity.id : undefined}
                onRowSelect={(row) => setSelectedEntity({ tab: 'cohorts', id: row.id })}
                flushTop
              />
            ) : (
              <ManagementTable
                key="schools"
                data={schoolRows}
                columns={schoolColumns}
                globalFilter={searchQuery}
                onGlobalFilterChange={setSearchQuery}
                searchLabel={t('management.filters.search')}
                selectedRowId={selectedEntity?.tab === 'schools' ? selectedEntity.id : undefined}
                onRowSelect={(row) => setSelectedEntity({ tab: 'schools', id: row.id })}
                flushTop
              />
            )}
          </div>
        </div>

        <PlayingCard
          size="full"
          title={t('management.title')}
          flipLabel={selectedStudentCharacterBack ? t('management.card.flip') : undefined}
          frontContent={selectedCardContent}
          back={selectedStudentCharacterBack}
          kind={selectedStudentRow?.character ? 'character' : undefined}
          characterClass={selectedStudentRow?.character?.characterClass}
          className="h-full max-h-[calc(100vh-8rem)] xl:sticky xl:top-8"
        />
      </section>
    </GameLayout>
  );
}

export default ManagementPage;

function buildStudentCharacterBackSide(
  row: StudentRow,
  t: (key: string) => string,
  updateSelectedStudent: (update: ManagementStudentUpdate, shouldThrow?: boolean) => Promise<void>
): PlayingCardSide {
  const character = row.character;
  const classLabel = character ? t(`game.classes.${character.characterClass}`) : '';

  return {
    title: row.displayName,
    subtitle: classLabel,
    description: row.user.bio || '',
    illustrationUrl: row.user.avatarUrl || row.user.githubAvatarUrl,
    illustrationAlt: row.displayName,
    ribbonText: classLabel,
    ribbonEditable: false,
    editable: true,
    statsEditable: false,
    stats: character
      ? [
          { id: 'strength', label: 'STR', value: character.stats.strength },
          { id: 'dexterity', label: 'DEX', value: character.stats.dexterity },
          { id: 'constitution', label: 'CON', value: character.stats.constitution },
          { id: 'intelligence', label: 'INT', value: character.stats.intelligence },
          { id: 'wisdom', label: 'WIS', value: character.stats.wisdom },
          { id: 'charisma', label: 'CHA', value: character.stats.charisma },
        ]
      : undefined,
    onFieldChange: (field, value) => {
      if (field === 'title') {
        void updateSelectedStudent({ user: { displayName: value } });
        return;
      }

      if (field === 'description') {
        void updateSelectedStudent({ user: { bio: value } });
        return;
      }

      if (field === 'illustrationUrl') {
        void updateSelectedStudent({ user: { avatarUrl: value } });
      }
    },
  };
}
