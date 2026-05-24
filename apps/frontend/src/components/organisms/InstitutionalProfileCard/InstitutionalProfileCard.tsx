import { useState, useEffect, useMemo } from 'react';
import { EditableText, EditableFieldContext } from '../../atoms/EditableText';
import { CompoundBadge } from '../../atoms/CompoundBadge';
import { HoldToConfirmButton } from '../../atoms/HoldToConfirmButton';
import { EditableAvatar } from '../../molecules/EditableAvatar';
import { SplitEditableText } from '../../molecules/SplitEditableText';
import { EditablePronouns } from '../../molecules/EditablePronouns';
import { BadgeDropdown } from '../../molecules/BadgeDropdown/BadgeDropdown';
import { useTranslation } from '../../../hooks/useTranslation';
import { en } from '../../../locales/en';
import { fr } from '../../../locales/fr';
import { Cohort, User } from '@eduquest/shared';
import { Github, Cake, Quote, Trash2 } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface InstitutionalProfileCardProps {
  user: User;
  onUpdateProfile?: (data: Partial<User>) => Promise<void>;
  onUploadAvatar?: (file: File) => Promise<void>;
  onResetAvatar?: () => Promise<void>;
  onRoleChange?: (isAdmin: boolean) => void;
  readOnly?: boolean;
  schoolName?: string;
  schoolOptions?: string[];
  onSchoolChange?: (schoolName: string) => void;
  institutionalEmail?: string;
  institutionalEmailDomain?: string;
  onInstitutionalEmailChange?: (email: string, cohortId?: string) => Promise<void> | void;
  cohort?: Pick<Cohort, 'grade' | 'level' | 'name' | 'majorSpeciality' | 'minorSpeciality'>;
  hideRoleBadge?: boolean;
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

const AVATAR_SIZE = 88;

export function InstitutionalProfileCard({
  user,
  onUpdateProfile,
  onUploadAvatar,
  onResetAvatar,
  onRoleChange,
  readOnly,
  schoolName,
  institutionalEmail,
  institutionalEmailDomain,
  onInstitutionalEmailChange,
  cohort,
  hideRoleBadge,
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
  const { t, locale } = useTranslation();
  const ic = (key: string) => t(`profile.institutionalCard.${key}`);

  const pronounOptions =
    locale === 'fr'
      ? fr.profile.institutionalCard.pronounOptions
      : en.profile.institutionalCard.pronounOptions;

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

  const collapsedName = currentUser.displayName?.trim()
    ? currentUser.displayName.trim()
    : [currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ').trim() ||
      currentUser.githubUsername ||
      '';

  const firstLastHint =
    currentUser.firstName && currentUser.lastName
      ? `${currentUser.firstName} ${currentUser.lastName}`
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
  const cohortRows =
    selectedCohortValues.length > 0 ? selectedCohortValues : cohort ? ['current-cohort'] : [];
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
  const canEditCohorts = Boolean(onCohortsChange) && !readOnly;
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
  const addCohort = (nextCohort?: string) => {
    if (!nextCohort || !onCohortsChange) return;
    onCohortsChange([...selectedCohortValues, nextCohort]);
    setCohortSchoolDraft(null);
  };
  const removeCohort = (cohortId: string) => {
    if (!onCohortsChange || cohortId === 'current-cohort') return;
    onCohortsChange(selectedCohortValues.filter((current) => current !== cohortId));
  };

  return (
    <EditableFieldContext.Provider value={{ showPencil: !readOnly }}>
      <div
        className={cn(
          'card bg-gaming-card shadow-xl border border-gaming-border max-w-3xl w-full mx-auto font-body relative overflow-visible',
          className
        )}
      >
        {!hideRoleBadge && onRoleChange && !readOnly ? (
          <div className="absolute top-0 left-0 z-20 rounded-br-xl bg-gaming-card shadow-md">
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
                'rounded-none rounded-br-xl border-0 px-3 py-2 text-xs font-semibold shadow-md',
                user.isAdmin ? 'badge-primary' : 'badge-ghost'
              )}
              selectedMaxWidth="max-w-[10rem]"
            />
          </div>
        ) : !hideRoleBadge ? (
          <div
            className={cn(
              'badge absolute top-0 left-0 z-10 rounded-none rounded-br-xl border-0 px-3 py-2 text-xs font-semibold shadow-md',
              user.isAdmin ? 'badge-primary' : 'badge-ghost'
            )}
          >
            {roleLabel}
          </div>
        ) : null}

        <div className={cn('card-body gap-4 p-4 sm:p-5', hideRoleBadge ? 'pt-4' : 'pt-7')}>
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
                {!stackPronouns && (
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
                      <span>{currentUser.pronouns || ic('emptyValue')}</span>
                    ) : (
                      <EditablePronouns
                        value={currentUser.pronouns || ''}
                        onChange={(v) => persistField('pronouns', v)}
                        options={pronounOptions}
                        placeholder={ic('addPronounsShort')}
                        searchPlaceholder={ic('filterPronouns')}
                        removeLabel={ic('removePronoun')}
                        emptyFilterHint={ic('pressEnterToAddPronoun')}
                        className={metaMuted}
                      />
                    )}
                    <span className="select-none shrink-0" aria-hidden>
                      )
                    </span>
                  </span>
                )}
              </div>

              {stackPronouns && (
                <div className={cn(metaMuted, 'flex min-w-0 items-center')}>
                  {readOnly ? (
                    <span>{currentUser.pronouns || ic('emptyValue')}</span>
                  ) : (
                    <EditablePronouns
                      value={currentUser.pronouns || ''}
                      onChange={(v) => persistField('pronouns', v)}
                      options={pronounOptions}
                      placeholder={ic('addPronounsShort')}
                      searchPlaceholder={ic('filterPronouns')}
                      removeLabel={ic('removePronoun')}
                      emptyFilterHint={ic('pressEnterToAddPronoun')}
                      className={metaMuted}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 min-w-0">
            {user.githubUsername && (
              <div className="badge badge-outline bg-gaming-base border-gaming-border text-text-secondary gap-1 text-xs py-2 px-2 font-medium shrink-0">
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
            <div className="min-w-0 overflow-hidden rounded-xl border border-gaming-border bg-gaming-base/20">
              {displayedCohortGroups.map((group) => (
                <div
                  key={group.schoolName}
                  className="border-b border-gaming-border p-3 last:border-b-0"
                >
                  <div className="flex flex-col gap-3">
                    <div
                      className="flex h-8 w-16 shrink-0 items-center justify-center rounded-lg border border-gaming-border bg-gaming-card px-2"
                      title={group.schoolName}
                    >
                      {renderCohortSchoolBadge ? (
                        renderCohortSchoolBadge(group.schoolName)
                      ) : (
                        <span className="truncate text-xs font-semibold text-text-secondary">
                          {group.schoolName}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="min-w-0">
                        {onInstitutionalEmailChange && !readOnly ? (
                          <EditableText
                            value={getInstitutionalEmailLocalPart(
                              group.institutionalEmail,
                              group.emailDomain
                            )}
                            onChange={(value) =>
                              onInstitutionalEmailChange(
                                value.trim() ? `${value.trim()}@${group.emailDomain}` : '',
                                group.cohortIds[0]
                              )
                            }
                            placeholder={
                              suggestedInstitutionalEmailLocalPart || ic('institutionalEmail')
                            }
                            variant="field"
                            suffix={`@${group.emailDomain}`}
                            truncate={false}
                            className="text-sm text-text-muted"
                          />
                        ) : (
                          <span className="block break-all text-sm text-text-muted">
                            {group.institutionalEmail || ic('emptyValue')}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex min-w-0 flex-col gap-2">
                        {group.cohortIds.map((cohortId) => (
                          <div key={cohortId} className="flex min-w-0 items-center gap-2">
                            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                              {renderSelectedCohortContent(cohortId)}
                            </div>

                            {canEditCohorts && cohortId !== 'current-cohort' && (
                              <HoldToConfirmButton
                                onConfirm={() => removeCohort(cohortId)}
                                holdDuration={900}
                                className="btn-xs min-h-0 shrink-0 px-2"
                                variant="btn-ghost text-error hover:bg-error/10"
                              >
                                <Trash2 size={13} aria-hidden />
                              </HoldToConfirmButton>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {canEditCohorts && (
                <div className="border-t border-gaming-border p-3">
                  <div className="flex flex-col gap-2">
                    <BadgeDropdown
                      options={addableSchoolOptions}
                      value={cohortSchoolDraft ? [cohortSchoolDraft] : []}
                      onChange={(next) => setCohortSchoolDraft(next[0] || null)}
                      multiple={false}
                      placeholder="+"
                      searchPlaceholder={ic('filterSchool')}
                      emptyFilterHint={ic('chooseSchool')}
                      className="w-full"
                      badgeClassName="btn btn-sm btn-outline h-8 min-h-0 w-full border-gaming-border bg-gaming-base/30 px-3 text-text-secondary hover:border-primary hover:bg-primary hover:text-primary-content"
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
                        badgeClassName="btn btn-sm btn-outline h-8 min-h-0 w-full border-gaming-border bg-gaming-base/30 px-3 text-text-secondary hover:border-primary hover:bg-primary hover:text-primary-content"
                        selectedMaxWidth="max-w-full"
                        fullWidth
                        renderBadge={renderSelectedCohortBadge || renderCohortBadge}
                        showArrow={false}
                      />
                    )}
                  </div>
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
