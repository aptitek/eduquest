import { useEffect, useState } from 'react';
import { BadgeDropdown } from '../../molecules/BadgeDropdown';
import { EditableFieldContext, EditableText } from '../../atoms/EditableText';
import type { CohortRow } from '../../../features/management/types';
import { mockCohorts } from '../../../features/management/mockData';
import { formatGrade } from '../../../features/management/utils';
import aptitekLogoUrl from '../../../assets/logo.svg';

export function CohortDetailCard({
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
  const resolvedLogoUrl =
    cohort.school?.logoUrl || (cohort.schoolName === 'Aptitek' ? aptitekLogoUrl : undefined);
  const schoolYearOptions = Array.from(
    new Set([cohort.schoolYear, ...mockCohorts.map((item) => item.schoolYear)])
  );
  const gradeOptions = ['Licence', 'Bachelor', 'Engineer', 'Master', 'Doctorate'];
  const levelOptions = ['1', '2', '3', '4', '5'];
  const majorOptions = Array.from(
    new Set(
      [cohort.majorSpeciality, ...mockCohorts.map((item) => item.majorSpeciality)].filter(
        (value): value is string => Boolean(value)
      )
    )
  );
  const minorOptions = Array.from(
    new Set(
      [cohort.minorSpeciality, ...mockCohorts.map((item) => item.minorSpeciality)].filter(
        (value): value is string => Boolean(value)
      )
    )
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
                <img
                  src={resolvedLogoUrl}
                  alt={cohort.schoolName}
                  className="max-h-full max-w-full object-contain"
                />
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
                onChange={(next) =>
                  setDraft((current) => ({ ...current, campusName: next[0] || current.campusName }))
                }
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
              onChange={(next) =>
                setDraft((current) => ({ ...current, schoolYear: next[0] || current.schoolYear }))
              }
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
              onChange={(next) =>
                setDraft((current) => ({ ...current, grade: next[0] || current.grade }))
              }
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
              onChange={(next) =>
                setDraft((current) => ({ ...current, level: next[0] || current.level }))
              }
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
              onChange={(next) =>
                setDraft((current) => ({ ...current, majorSpeciality: next[0] || '' }))
              }
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
              onChange={(next) =>
                setDraft((current) => ({ ...current, minorSpeciality: next[0] || '' }))
              }
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
