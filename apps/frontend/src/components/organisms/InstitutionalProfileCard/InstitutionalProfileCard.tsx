import { useState, useEffect, useMemo } from 'react';
import { EditableText, EditableFieldContext } from '../../atoms/EditableText';
import { CompoundBadge } from '../../atoms/CompoundBadge';
import { CornerRibbon } from '../../atoms/CornerRibbon';
import { EditableAvatar } from '../../molecules/EditableAvatar';
import { SplitEditableText } from '../../molecules/SplitEditableText';
import { EditablePronouns } from '../../molecules/EditablePronouns';
import { BadgeDropdown } from '../../molecules/BadgeDropdown/BadgeDropdown';
import { EditableList } from '../../molecules/EditableList';
import { SchoolLogoBadge } from '../../molecules/SchoolLogoBadge';
import { useTranslation } from '../../../hooks/useTranslation';
import { Cohort, User } from '@eduquest/shared';
import { Github, Cake, Quote } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { formatUserDisplayName } from '../../../utils/displayName';
import { formatPronounsForDisplay, PRONOUN_OPTION_IDS } from '../../../utils/pronouns';

export interface InstitutionalProfileCardProps {
  user: User;
  variant?: InstitutionalProfileCardVariant;
  onUpdateProfile?: (data: Partial<User>) => Promise<void>;
  onUploadAvatar?: (file: File) => Promise<void>;
  onResetAvatar?: () => Promise<void>;
  onRoleChange?: (isAdmin: boolean) => void;
  readOnly?: boolean;
  schoolName?: string;
  schoolLogoUrl?: string;
  schoolOptions?: string[];
  onSchoolChange?: (schoolName: string) => void;
  institutionalEmail?: string;
  institutionalEmailDomain?: string;
  onInstitutionalEmailChange?: (email: string, cohortId?: string) => Promise<void> | void;
  cohort?: Pick<Cohort, 'grade' | 'level' | 'name' | 'majorSpeciality' | 'minorSpeciality'>;
  hideRoleBadge?: boolean;
  useRoleRibbon?: boolean;
  cohortRibbonLabel?: string;
  cohortRibbonColorSeed?: string;
  stackPronouns?: boolean;
  cohortOptions?: string[];
  selectedCohorts?: string[];
  onCohortsChange?: (cohorts: string[]) => void;
  renderCohortBadge?: (cohort: string) => React.ReactNode;
  renderSelectedCohortBadge?: (cohort: string) => React.ReactNode;
  renderCohortSchoolBadge?: (schoolName: string) => React.ReactNode;
  getCohortSchoolName?: (cohort: string) => string | undefined;
  getCohortInstitutionalEmail?: (cohort: string) => string | undefined;
  getCohortInstitutionalEmailDomain?: (cohort: string) => string | undefined;
  className?: string;
}

type NameFields = Pick<User, 'displayName' | 'firstName' | 'lastName'>;
export type InstitutionalProfileCardVariant = 'default' | 'dropdown' | 'management';

const AVATAR_SIZE = 88;

const variantClassNameMap: Record<InstitutionalProfileCardVariant, string | undefined> = {
  default: undefined,
  dropdown: 'shadow-none border-none rounded-none border-b border-gaming-border',
  management: 'max-w-none border-0 bg-transparent shadow-none rounded-none',
};

export function InstitutionalProfileCard({
  user,
  variant = 'default',
  onUpdateProfile,
  onUploadAvatar,
  onResetAvatar,
  onRoleChange,
  readOnly,
  schoolName,
  schoolLogoUrl,
  institutionalEmail,
  institutionalEmailDomain,
  onInstitutionalEmailChange,
  cohort,
  hideRoleBadge,
  useRoleRibbon,
  cohortRibbonLabel,
  cohortRibbonColorSeed,
  stackPronouns,
  cohortOptions,
  selectedCohorts,
  onCohortsChange,
  renderCohortBadge,
  renderSelectedCohortBadge,
  renderCohortSchoolBadge,
  getCohortSchoolName,
  getCohortInstitutionalEmail,
  getCohortInstitutionalEmailDomain,
  className,
}: InstitutionalProfileCardProps) {
  const { t } = useTranslation();
  const ic = (key: string) => t(`profile.institutionalCard.${key}`);
  const displayPronouns = (value?: string) =>
    value ? formatPronounsForDisplay(value, t) || ic('emptyValue') : ic('emptyValue');
  const resolvedUseRoleRibbon = useRoleRibbon ?? variant === 'dropdown';
  const resolvedHideRoleBadge = hideRoleBadge ?? variant === 'management';
  const resolvedStackPronouns = stackPronouns ?? variant === 'management';

  const [nameDraft, setNameDraft] = useState<Partial<NameFields>>({});
  const [cohortSchoolDraft, setCohortSchoolDraft] = useState<string | null>(null);

  useEffect(() => {
    setNameDraft({});
    setCohortSchoolDraft(null);
  }, [user]);

  const currentUser = useMemo(() => ({ ...user, ...nameDraft }), [user, nameDraft]);

  const persistField = async (key: keyof User, value: string) => {
    if (!onUpdateProfile) return;
    const current = currentUser[key];
    if (value === (current ?? '')) return;
    await onUpdateProfile({ [key]: value });
  };

  const collapsedName = formatUserDisplayName(currentUser);

  const firstLastHint =
    currentUser.firstName && currentUser.lastName
      ? formatUserDisplayName({
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          email: currentUser.email,
        })
      : undefined;

  const saveNameDraft = async () => {
    if (!onUpdateProfile || Object.keys(nameDraft).length === 0) return;
    await onUpdateProfile(nameDraft);
    setNameDraft({});
  };

  const metaMuted = 'text-sm text-text-muted';
  const roleLabel = user.isAdmin ? ic('adminRole') : ic('studentRole');
  const fixedInstitutionalDomain = institutionalEmailDomain || 'school.edu';
  const getInstitutionalEmailLocalPart = (email?: string, domain = fixedInstitutionalDomain) =>
    email?.endsWith(`@${domain}`) ? email.slice(0, -domain.length - 1) : email?.split('@')[0] || '';
  const suggestedInstitutionalEmailLocalPart = [currentUser.firstName, currentUser.lastName]
    .map((part) =>
      (part || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    )
    .filter(Boolean)
    .join('.');
  const cohortCode = cohort ? `${cohort.grade.charAt(0).toUpperCase()}${cohort.level}` : undefined;
  const selectedCohortValues = selectedCohorts?.filter(Boolean) || [];
  const getCohortOptionSchoolName = (cohortId: string) =>
    getCohortSchoolName?.(cohortId) || schoolName || ic('school');
  const remainingCohortOptions = (cohortOptions || []).filter(
    (option) => !selectedCohortValues.includes(option)
  );
  const addableSchoolOptions = Array.from(
    new Set(remainingCohortOptions.map((option) => getCohortOptionSchoolName(option)))
  );
  const addableCohortOptions = cohortSchoolDraft
    ? remainingCohortOptions.filter(
        (option) => getCohortOptionSchoolName(option) === cohortSchoolDraft
      )
    : [];
  const cohortRows = user.isAdmin
    ? []
    : selectedCohortValues.length > 0
      ? selectedCohortValues
      : cohort
        ? ['current-cohort']
        : [];
  const renderCohortContent = (cohortId: string) => {
    if (cohortId !== 'current-cohort' && renderCohortBadge) {
      return renderCohortBadge(cohortId);
    }

    if (!cohort) return cohortId;

    return (
      <CompoundBadge
        parts={
          cohort.name
            ? [cohortCode, cohort.name]
            : [cohortCode, cohort.majorSpeciality, cohort.minorSpeciality]
        }
      />
    );
  };
  const renderSelectedCohortContent = (cohortId: string) =>
    cohortId !== 'current-cohort' && renderSelectedCohortBadge
      ? renderSelectedCohortBadge(cohortId)
      : renderCohortContent(cohortId);
  const canEditCohorts = Boolean(onCohortsChange) && !readOnly && !user.isAdmin;
  const showCohortList =
    cohortRows.length > 0 ||
    Boolean(institutionalEmail) ||
    Boolean(onInstitutionalEmailChange) ||
    canEditCohorts;
  const cohortGroups = cohortRows.reduce<
    { schoolName: string; cohortIds: string[]; institutionalEmail?: string; emailDomain: string }[]
  >((groups, cohortId) => {
    const groupSchoolName =
      (cohortId !== 'current-cohort' ? getCohortSchoolName?.(cohortId) : undefined) ||
      schoolName ||
      ic('school');
    const groupEmail =
      (cohortId !== 'current-cohort' ? getCohortInstitutionalEmail?.(cohortId) : undefined) ||
      institutionalEmail;
    const groupEmailDomain =
      (cohortId !== 'current-cohort' ? getCohortInstitutionalEmailDomain?.(cohortId) : undefined) ||
      fixedInstitutionalDomain;
    const existingGroup = groups.find((group) => group.schoolName === groupSchoolName);

    if (existingGroup) {
      existingGroup.cohortIds.push(cohortId);
      existingGroup.institutionalEmail ||= groupEmail;
      return groups;
    }

    groups.push({
      schoolName: groupSchoolName,
      cohortIds: [cohortId],
      institutionalEmail: groupEmail,
      emailDomain: groupEmailDomain,
    });

    return groups;
  }, []);
  const displayedCohortGroups =
    cohortGroups.length > 0
      ? cohortGroups
      : showCohortList
        ? [
            {
              schoolName: schoolName || ic('school'),
              cohortIds: [],
              institutionalEmail,
              emailDomain: fixedInstitutionalDomain,
            },
          ]
        : [];
  const primaryCohortId = cohortRows[0];
  const primaryCohortGroup = displayedCohortGroups[0];
  const addCohort = (nextCohort?: string) => {
    if (!nextCohort || !onCohortsChange) return;
    onCohortsChange([...selectedCohortValues, nextCohort]);
    setCohortSchoolDraft(null);
  };
  const removeCohort = (cohortId: string) => {
    if (!onCohortsChange) return;
    onCohortsChange(selectedCohortValues.filter((selectedCohortId) => selectedCohortId !== cohortId));
  };
  const showRoleBadge = !resolvedHideRoleBadge;
  const showRoleHeaderBadge = showRoleBadge && !resolvedUseRoleRibbon;
  const showBadgeHeader = showRoleHeaderBadge || Boolean(primaryCohortId);

  return (
    <EditableFieldContext.Provider value={{ showPencil: !readOnly }}>
      <div
        className={cn(
          'card bg-gaming-card shadow-xl border border-gaming-border max-w-3xl w-full mx-auto font-body relative overflow-visible',
          variantClassNameMap[variant],
          className
        )}
      >
        {showRoleBadge && resolvedUseRoleRibbon ? (
          <CornerRibbon
            position="top-left"
            size="md"
            ribbonClassName={user.isAdmin ? 'bg-primary' : 'bg-status-quest'}
            textClassName="text-[0.55rem] tracking-[0.04em]"
          >
            {roleLabel}
          </CornerRibbon>
        ) : null}
        {!resolvedUseRoleRibbon && cohortRibbonLabel ? (
          <CornerRibbon position="top-left" size="md" colorSeed={cohortRibbonColorSeed || cohortRibbonLabel}>
            {cohortRibbonLabel}
          </CornerRibbon>
        ) : null}

        {showBadgeHeader && (
          <div
            className={cn(
              'flex items-center border-b border-gaming-border bg-gaming-base/40 px-4 py-2 sm:px-5',
              (cohortRibbonLabel || resolvedUseRoleRibbon) && !showRoleHeaderBadge && 'justify-end'
            )}
          >
            <div className="badge badge-outline min-h-0 max-w-full gap-0 overflow-visible rounded-xl border-gaming-border bg-gaming-card p-0 text-xs font-semibold text-text-secondary shadow-sm">
              {showRoleHeaderBadge && (
                <span className="inline-flex min-w-0 items-center px-3 py-1.5">
                  {onRoleChange && !readOnly ? (
                    <BadgeDropdown
                      options={[ic('studentRole'), ic('adminRole')]}
                      value={[roleLabel]}
                      onChange={(next) => {
                        const nextRole = next[0];
                        if (!nextRole) return;
                        onRoleChange(nextRole === ic('adminRole'));
                      }}
                      multiple={false}
                      placeholder={roleLabel}
                      searchPlaceholder={ic('filterRole')}
                      removeLabel={ic('removeRole')}
                      emptyFilterHint={ic('chooseRole')}
                      badgeClassName={cn(
                        'h-auto min-h-0 border-0 bg-transparent px-0 py-0 text-xs font-semibold shadow-none',
                        user.isAdmin ? 'text-primary' : 'text-text-secondary'
                      )}
                      selectedMaxWidth="max-w-[10rem]"
                    />
                  ) : (
                    <span className={cn(user.isAdmin ? 'text-primary' : 'text-text-secondary')}>
                      {roleLabel}
                    </span>
                  )}
                </span>
              )}

              {showRoleHeaderBadge && primaryCohortId && (
                <span className="h-5 w-px shrink-0 bg-gaming-border" aria-hidden />
              )}

              {primaryCohortId && (
                <span className="inline-flex min-w-0 items-center px-3 py-1.5">
                  {renderSelectedCohortContent(primaryCohortId)}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="card-body gap-4 p-4 sm:p-5">
          <div className="flex gap-4 items-start">
            <div className="w-[5.5rem] shrink-0">
              <EditableAvatar
                src={currentUser.avatarUrl || currentUser.githubAvatarUrl || ''}
                githubFallbackSrc={user.githubAvatarUrl || ''}
                isEditing={!readOnly}
                size={AVATAR_SIZE}
                onUpload={async (file) => {
                  if (onUploadAvatar) await onUploadAvatar(file);
                }}
                onReset={async () => {
                  if (onResetAvatar) await onResetAvatar();
                  else if (onUpdateProfile)
                    await onUpdateProfile({ avatarUrl: user.githubAvatarUrl });
                }}
              />
            </div>

            <div className="flex-1 min-w-0 flex flex-col gap-2 pt-0.5">
              <div className="flex items-baseline gap-2 min-w-0 w-full">
                <div className="min-w-0 flex-1 overflow-hidden">
                  {readOnly ? (
                    <span className="block truncate text-xl font-display font-bold leading-tight text-text-primary sm:text-2xl">
                      {collapsedName || ic('emptyValue')}
                    </span>
                  ) : (
                    <SplitEditableText
                      displayText={collapsedName}
                      className="text-xl sm:text-2xl font-display font-bold text-text-primary leading-tight"
                      emptyLabel={ic('clickToEdit')}
                      fields={[
                        {
                          key: 'displayName',
                          label: ic('displayName'),
                          placeholder: ic('displayName'),
                          emptyHint: firstLastHint,
                        },
                        {
                          key: 'firstName',
                          label: ic('firstName'),
                          placeholder: ic('firstName'),
                        },
                        {
                          key: 'lastName',
                          label: ic('lastName'),
                          placeholder: ic('lastName'),
                        },
                      ]}
                      values={{
                        displayName: currentUser.displayName || '',
                        firstName: currentUser.firstName || '',
                        lastName: currentUser.lastName || '',
                      }}
                      onChange={(key, value) => setNameDraft((prev) => ({ ...prev, [key]: value }))}
                      onCollapse={saveNameDraft}
                    />
                  )}
                </div>
                {!resolvedStackPronouns && (
                  <span
                    className={cn(
                      metaMuted,
                      'ml-auto flex flex-nowrap items-center justify-end gap-0.5 min-w-0 overflow-visible max-w-[48%] sm:max-w-[42%]'
                    )}
                  >
                    <span className="select-none shrink-0" aria-hidden>
                      (
                    </span>
                    {readOnly ? (
                      <span>{displayPronouns(currentUser.pronouns)}</span>
                    ) : (
                      <EditablePronouns
                        value={currentUser.pronouns || ''}
                        onChange={(v) => persistField('pronouns', v)}
                        options={PRONOUN_OPTION_IDS}
                        placeholder={ic('addPronounsShort')}
                        searchPlaceholder={ic('filterPronouns')}
                        removeLabel={ic('removePronoun')}
                        emptyFilterHint={ic('pressEnterToAddPronoun')}
                        t={t}
                        className={metaMuted}
                      />
                    )}
                    <span className="select-none shrink-0" aria-hidden>
                      )
                    </span>
                  </span>
                )}
              </div>

              {resolvedStackPronouns && (
                <div className={cn(metaMuted, 'flex min-w-0 items-center')}>
                  {readOnly ? (
                    <span>{displayPronouns(currentUser.pronouns)}</span>
                  ) : (
                    <EditablePronouns
                      value={currentUser.pronouns || ''}
                      onChange={(v) => persistField('pronouns', v)}
                      options={PRONOUN_OPTION_IDS}
                      placeholder={ic('addPronounsShort')}
                      searchPlaceholder={ic('filterPronouns')}
                      removeLabel={ic('removePronoun')}
                      emptyFilterHint={ic('pressEnterToAddPronoun')}
                      t={t}
                      className={metaMuted}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 min-w-0">
            {user.githubUsername && (
              <div className="badge badge-outline flex h-10 min-w-20 shrink-0 items-center justify-center gap-1 rounded-lg border-gaming-border bg-gaming-base px-3 text-xs font-medium text-text-secondary">
                <Github size={12} aria-hidden />
                {user.githubUsername}
              </div>
            )}
            {readOnly ? (
              <span className="min-w-0 max-w-full flex-1 truncate text-sm text-text-muted">
                {currentUser.email || ic('emptyValue')}
              </span>
            ) : (
              <EditableText
                value={currentUser.email || ''}
                onChange={(v) => persistField('email', v)}
                placeholder={ic('addEmail')}
                inputType="email"
                className="text-sm text-text-muted min-w-0 flex-1 max-w-full"
              />
            )}
          </div>

          {showCohortList && (
            <div className="min-w-0">
              {primaryCohortGroup && (
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="badge badge-outline flex h-10 min-w-20 shrink-0 items-center justify-center rounded-lg border-gaming-border bg-gaming-card px-3 text-text-secondary">
                    <SchoolLogoBadge
                      name={primaryCohortGroup.schoolName}
                      logoUrl={schoolLogoUrl}
                      className="h-5 max-h-full w-auto max-w-[5rem] object-contain"
                    />
                  </span>

                  <div className="min-w-0 flex-1">
                    {onInstitutionalEmailChange && !readOnly ? (
                      <EditableText
                        value={getInstitutionalEmailLocalPart(
                          primaryCohortGroup.institutionalEmail,
                          primaryCohortGroup.emailDomain
                        )}
                        onChange={(value) =>
                          onInstitutionalEmailChange(
                            value.trim() ? `${value.trim()}@${primaryCohortGroup.emailDomain}` : '',
                            primaryCohortGroup.cohortIds[0]
                          )
                        }
                        placeholder={suggestedInstitutionalEmailLocalPart || ic('institutionalEmail')}
                        variant="field"
                        suffix={`@${primaryCohortGroup.emailDomain}`}
                        truncate={false}
                        className="text-sm text-text-muted min-w-0 flex-1 max-w-full"
                      />
                    ) : (
                      <span className="block break-all text-sm text-text-muted">
                        {primaryCohortGroup.institutionalEmail || ic('emptyValue')}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {canEditCohorts && (
                <div className="border-t border-gaming-border p-2.5">
                  <EditableList
                    items={selectedCohortValues}
                    getKey={(cohortId) => cohortId}
                    renderItem={(cohortId) => (
                      <div className="flex min-w-0 items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate">
                          {renderSelectedCohortContent(cohortId)}
                        </span>
                        <span className="shrink-0 text-xs text-text-muted">
                          {getCohortSchoolName?.(cohortId) || schoolName || ic('school')}
                        </span>
                      </div>
                    )}
                    onRemove={(cohortId) => removeCohort(cohortId)}
                    removeLabel={ic('removeCohort')}
                    emptyState={ic('chooseCohort')}
                    addControl={
                      <div className="flex flex-col gap-1.5">
                      <BadgeDropdown
                          options={addableSchoolOptions}
                          value={cohortSchoolDraft ? [cohortSchoolDraft] : []}
                          onChange={(next) => setCohortSchoolDraft(next[0] || null)}
                          multiple={false}
                          placeholder="+"
                          searchPlaceholder={ic('filterSchool')}
                          emptyFilterHint={ic('chooseSchool')}
                          className="w-full"
                          badgeClassName="btn btn-xs btn-outline h-6 min-h-0 w-full border-gaming-border bg-gaming-base/30 px-2 text-text-secondary hover:border-primary hover:bg-primary hover:text-primary-content"
                          selectedMaxWidth="max-w-full"
                          fullWidth
                          renderBadge={(school) =>
                            renderCohortSchoolBadge ? renderCohortSchoolBadge(school) : school
                          }
                          showArrow={false}
                        />

                        {cohortSchoolDraft && (
                          <BadgeDropdown
                            options={addableCohortOptions}
                            value={[]}
                            onChange={(next) => addCohort(next[0])}
                            multiple={false}
                            placeholder={ic('cohort')}
                            searchPlaceholder={ic('filterCohorts')}
                            emptyFilterHint={ic('chooseCohort')}
                            className="w-full"
                            badgeClassName="btn btn-xs btn-outline h-6 min-h-0 w-full border-gaming-border bg-gaming-base/30 px-2 text-text-secondary hover:border-primary hover:bg-primary hover:text-primary-content"
                            selectedMaxWidth="max-w-full"
                            fullWidth
                            renderBadge={renderSelectedCohortBadge || renderCohortBadge}
                            showArrow={false}
                          />
                        )}
                      </div>
                    }
                    itemClassName="bg-gaming-card/40"
                      />
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-1.5 min-w-0 w-full max-w-[14rem]">
            <Cake size={14} className="shrink-0 text-text-muted" aria-hidden />
            {readOnly ? (
              <span className={cn(metaMuted, 'min-w-0 flex-1 truncate text-xs leading-tight')}>
                {currentUser.birthDate || ic('emptyValue')}
              </span>
            ) : (
              <EditableText
                value={currentUser.birthDate || ''}
                onChange={(v) => persistField('birthDate', v)}
                placeholder={ic('birthDate')}
                inputType="date"
                truncate={false}
                className={cn(metaMuted, 'text-xs leading-tight flex-1 min-w-0 whitespace-nowrap')}
              />
            )}
          </div>

          <div className="flex gap-2.5 border-l-4 border-primary/35 pl-3 sm:pl-4 min-w-0">
            <Quote size={28} className="shrink-0 text-text-muted/60 mt-0.5" aria-hidden />
            {readOnly ? (
              <p className="min-h-[2.75rem] w-full min-w-0 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
                {currentUser.bio || ic('emptyValue')}
              </p>
            ) : (
              <EditableText
                multiline
                value={currentUser.bio || ''}
                onChange={(v) => persistField('bio', v)}
                placeholder={ic('writeBio')}
                truncate={false}
                className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap w-full min-h-[2.75rem] min-w-0"
              />
            )}
          </div>
        </div>
      </div>
    </EditableFieldContext.Provider>
  );
}
