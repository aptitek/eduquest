import { useEffect, useMemo, useState } from 'react';
import { GameLayout } from '../../components/templates/GameLayout';
import { GameHeader } from '../../components/organisms/GameHeader';
import { PlayingCard, type PlayingCardFaceSlots } from '../../components/molecules/PlayingCard';
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
  createManagementCohort,
  createManagementSchool,
  deleteManagementCohort,
  deleteManagementSchool,
  deleteManagementStudent,
  fetchManagementBackup,
  type ManagementCohortUpdate,
  type ManagementSchoolUpdate,
  type ManagementStudentUpdate,
  updateManagementCohort,
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
import { getCharacterClassIconKey, toPlayingCardStats } from '../../features/game/characterStats';
import { useErrorReporter } from '../../features/errors/notifications';

function getSchoolInstitutionalEmail(rowUser: StudentRow['user'], legacyEmail?: string) {
  return legacyEmail || rowUser.email;
}

export function ManagementPage() {
  const { t } = useTranslation();
  const reportError = useErrorReporter();
  const { user, student, character, patchSchool } = useGameStore();
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

    return managementBackup.cohorts.map((cohort) => {
      const school = managementBackup.schools.find((item) => item.id === cohort.schoolId) || cohort.school;

      return {
        ...cohort,
        school,
        schoolName: school?.name || '-',
        campusName:
          cohort.campus?.name ||
          managementBackup.campuses.find((campus) => campus.id === cohort.campusId)?.name ||
          '-',
        studentCount: managementBackup.students.filter((profile) =>
          profile.student.cohortMemberships?.some((membership) => membership.cohortId === cohort.id)
        ).length,
      };
    });
  }, [managementBackup]);

  const studentRows = useMemo<StudentRow[]>(() => {
    if (managementBackup) {
      return managementBackup.students
        .filter(({ user: rowUser }) => !rowUser.isAdmin)
        .map(({ user: rowUser, student: rowStudent, character: rowCharacter }) => {
          const latestMembership = getLatestCohortMembership(rowStudent.cohortMemberships);
          const selectedCohort = latestMembership?.cohortId
            ? cohortRows.find((cohort) => cohort.id === latestMembership.cohortId)
            : undefined;
          const selectedSchool = selectedCohort?.school || latestMembership?.cohort?.school;

          return {
            ...rowStudent,
            schoolId: selectedSchool?.id,
            school: selectedSchool,
            character: rowCharacter,
            user: rowUser,
            displayName: formatUserDisplayName(rowUser),
            email: getSchoolInstitutionalEmail(rowUser, latestMembership?.institutionalEmail),
            cohort: selectedCohort,
            age: calculateAge(rowUser.birthDate),
          };
        });
    }

    if (!user || !student || !character || user.isAdmin) return [];
    const latestMembership = getLatestCohortMembership(student.cohortMemberships);
    const selectedSchool = latestMembership?.cohort?.school;

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
    () => Array.from(new Set(studentRows.map((row) => row.school?.name || t('management.schools.unassigned')))),
    [studentRows, t]
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
  const selectedStudentCohortIds =
    selectedStudentRow?.cohortMemberships
      ?.filter((membership) => membership.cohortId)
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      })
      .map((membership) => membership.cohortId) || [];
  const selectedStudentCohort =
    cohortRows.find((cohort) => cohort.id === selectedStudentCohortIds[0]) ||
    selectedStudentMembership?.cohort ||
    (selectedStudentMembership?.cohortId
      ? cohortRows.find((cohort) => cohort.id === selectedStudentMembership.cohortId)
      : undefined);
  const activeCardSkeletonVariant =
    activeTab === 'schools' ? 'school' : activeTab === 'cohorts' ? 'cohort' : 'student';
  const activeCardCreateLabel =
    activeTab === 'schools'
      ? t('management.table.addSchool')
      : activeTab === 'cohorts'
        ? t('management.table.addCohort')
        : t('management.table.inviteStudents');
  const canCreateManagementRow =
    activeTab === 'schools' ||
    (activeTab === 'cohorts' && schoolRows.length > 0);
  const activeCardCreateHint =
    activeTab === 'cohorts' && schoolRows.length === 0
      ? t('management.empty.createSchoolFirst')
      : activeTab === 'students'
        ? t('management.empty.createStudentsWithInvite')
      : undefined;
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
      const updatedSchool = backup.schools.find((school) => school.id === selectedSchoolRow.id);
      if (updatedSchool) patchSchool(updatedSchool);
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
  const updateSelectedCohort = async (update: ManagementCohortUpdate, shouldThrow = false) => {
    if (!selectedCohortRow) return;

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
      const backup = await updateManagementCohort(token, selectedCohortRow.id, update);
      setManagementBackup(backup);
    } catch (error) {
      reportError(error, {
        messageKey: 'management.errors.updateCohortFailed',
        id: 'management.errors.updateCohortFailed',
        logMessage: 'Could not update management cohort.',
      });
      setManagementErrorKey('management.errors.updateCohortFailed');
      if (shouldThrow) throw error;
    }
  };
  const mutateManagementRows = async (
    operation: (token: string) => Promise<ManagementBackup>,
    errorKey: string,
    logMessage: string,
    selectEntity?: (backup: ManagementBackup) => SelectedManagementEntity | null
  ) => {
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

    setManagementErrorKey(null);
    try {
      const backup = await operation(token);
      setManagementBackup(backup);
      const nextSelection = selectEntity?.(backup);
      if (nextSelection !== undefined) {
        setSelectedEntity(nextSelection);
      }
    } catch (error) {
      reportError(error, {
        messageKey: errorKey,
        id: errorKey,
        logMessage,
      });
      setManagementErrorKey(errorKey);
    }
  };
  const createManagementRow = () => {
    if (activeTab === 'schools') {
      const previousIds = new Set(schoolRows.map((row) => row.id));
      void mutateManagementRows(
        (token) => createManagementSchool(token, { name: t('management.schools.newSchool') }),
        'management.errors.createRowFailed',
        'Could not create management school.',
        (backup) => {
          const created = backup.schools.find((school) => !previousIds.has(school.id));
          return created ? { tab: 'schools', id: created.id } : null;
        }
      );
      return;
    }

    if (activeTab === 'cohorts') {
      if (schoolRows.length === 0) {
        setManagementErrorKey('management.empty.createSchoolFirst');
        return;
      }

      const previousIds = new Set(cohortRows.map((row) => row.id));
      void mutateManagementRows(
        (token) =>
          createManagementCohort(token, {
            schoolId: schoolRows[0]?.id,
            name: t('management.cohorts.newCohort'),
          }),
        'management.errors.createRowFailed',
        'Could not create management cohort.',
        (backup) => {
          const created = backup.cohorts.find((cohort) => !previousIds.has(cohort.id));
          return created ? { tab: 'cohorts', id: created.id } : null;
        }
      );
      return;
    }

    setManagementErrorKey('management.empty.createStudentsWithInvite');
  };
  const deleteManagementRow = (tab: ManagementTab, rowId: string) => {
    void mutateManagementRows(
      (token) => {
        if (tab === 'schools') return deleteManagementSchool(token, rowId);
        if (tab === 'cohorts') return deleteManagementCohort(token, rowId);
        return deleteManagementStudent(token, rowId);
      },
      'management.errors.deleteRowFailed',
      'Could not delete management row.',
      () => (selectedEntity?.tab === tab && selectedEntity.id === rowId ? null : selectedEntity)
    );
  };
  const selectedStudentCharacterBack = selectedStudentRow?.character
    ? buildStudentCharacterBackSide(selectedStudentRow, t, updateSelectedStudent)
    : undefined;
  const hasSelectedCard = Boolean(selectedSchoolRow || selectedCohortRow || selectedStudentRow);
  const selectedCardContent = selectedSchoolRow ? (
    <SchoolDetailCard
      school={selectedSchoolRow}
      t={t}
      onUpdate={(update) => updateSelectedSchool(update)}
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
      schoolOptions={schoolRows}
      campusOptions={campusOptions}
      onUpdate={(update) => updateSelectedCohort(update)}
      t={t}
    />
  ) : selectedStudentRow ? (
    <div className="h-full min-h-0 overflow-y-auto">
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
    <CardSkeleton label={t('management.card.rectoEmpty')} variant={activeCardSkeletonVariant} />
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
                deleteRowLabel={(row) => t('management.table.deleteStudent').replace('{name}', row.displayName)}
                onDeleteRow={(row) => deleteManagementRow('students', row.id)}
                emptyMessage={t('management.empty.students')}
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
                deleteRowLabel={(row) => t('management.table.deleteCohort').replace('{name}', row.name)}
                onDeleteRow={(row) => deleteManagementRow('cohorts', row.id)}
                emptyMessage={
                  schoolRows.length === 0
                    ? t('management.empty.createSchoolFirst')
                    : t('management.empty.cohorts')
                }
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
                deleteRowLabel={(row) => t('management.table.deleteSchool').replace('{name}', row.name)}
                onDeleteRow={(row) => deleteManagementRow('schools', row.id)}
                emptyMessage={t('management.empty.schools')}
                flushTop
              />
            )}
          </div>
        </div>

        {hasSelectedCard ? (
          <PlayingCard
            size="page"
            flipLabel={selectedStudentCharacterBack ? t('management.card.flip') : undefined}
            model={{
              front: {
                title: { value: t('management.title'), variant: 'title' },
                art: { node: selectedCardContent, alt: t('management.title') },
              },
              back: selectedStudentCharacterBack,
            }}
            kind={selectedStudentRow?.character ? 'character' : undefined}
            accentToken={selectedStudentRow?.character?.characterClass}
            presentation={
              selectedStudentRow
                ? { fit: 'contain', width: 'viewportConstrained' }
                : { fit: 'fillHeight' }
            }
            className={cn(
              'max-h-[calc(100vh-8rem)] xl:sticky xl:top-8',
              selectedStudentRow
                ? 'self-start'
                : 'h-full'
            )}
          />
        ) : (
          <PlayingCard
            size="page"
            kind={activeCardSkeletonVariant}
            accentToken="neutral"
            model={{
              front: {
                title: { value: activeCardCreateLabel },
                subtitle: activeCardCreateHint ? { value: activeCardCreateHint } : undefined,
                back: {},
              },
            }}
            onClick={canCreateManagementRow ? createManagementRow : undefined}
            interactive={canCreateManagementRow}
            presentation={{ fit: 'fillHeight' }}
            className="h-full max-h-[calc(100vh-8rem)] xl:sticky xl:top-8"
          />
        )}
      </section>
    </GameLayout>
  );
}

export default ManagementPage;

function buildStudentCharacterBackSide(
  row: StudentRow,
  t: (key: string) => string,
  updateSelectedStudent: (update: ManagementStudentUpdate, shouldThrow?: boolean) => Promise<void>
): PlayingCardFaceSlots {
  const character = row.character;
  const classLabel = character ? t(`game.classes.${character.characterClass}`) : '';
  const illustrationUrl = character?.illustrationUrl || row.user.avatarUrl || row.user.githubAvatarUrl;

  return {
    title: {
      value: row.displayName,
      variant: 'title',
      editable: true,
      onChange: (value) => void updateSelectedStudent({ user: { displayName: value } }),
    },
    subtitle: {
      value: character?.title || '',
      variant: 'subtitle',
      placeholder: t('character.characterTitlePlaceholder'),
      editable: true,
      onChange: (value) => void updateSelectedStudent({ characterTitle: value }),
    },
    art: {
      value: illustrationUrl,
      alt: row.displayName,
      editable: true,
      upload: async (file) => {
        const token = localStorage.getItem('eduquest_token');
        if (!token) throw new Error('management.errors.missingSession');

        const asset = await uploadAsset(token, 'character-illustration', file, row.id);
        return asset.url;
      },
      onChange: (value) => void updateSelectedStudent({ characterIllustrationUrl: value }),
    },
    icon: character ? { value: getCharacterClassIconKey(character.characterClass), colored: true } : undefined,
    type: { variant: 'class', text: { value: classLabel, variant: 'ribbon' } },
    info: {
      sections: [
        {
          id: 'description',
          description: {
            value: row.user.bio || '',
            variant: 'description',
            editable: true,
            onChange: (value) => void updateSelectedStudent({ user: { bio: value } }),
          },
        },
      ],
      stats: {
        values: toPlayingCardStats(character?.stats),
        label: row.displayName,
      },
    },
  };
}
