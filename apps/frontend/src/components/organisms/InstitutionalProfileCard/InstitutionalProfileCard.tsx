import { useState, useEffect, useMemo } from 'react';
import { EditableText, EditableFieldContext } from '../../atoms/EditableText';
import { EditableAvatar } from '../../molecules/EditableAvatar';
import { SplitEditableText } from '../../molecules/SplitEditableText';
import { EditablePronouns } from '../../molecules/EditablePronouns';
import { useTranslation } from '../../../hooks/useTranslation';
import { en } from '../../../locales/en';
import { fr } from '../../../locales/fr';
import { User } from '@eduquest/shared';
import { Github, Cake, Quote } from 'lucide-react';
import { cn } from '../../../utils/cn';
import logoUrl from '../../../assets/logo.svg';

export interface InstitutionalProfileCardProps {
  user: User;
  onUpdateProfile: (data: Partial<User>) => Promise<void>;
  onUploadAvatar?: (file: File) => Promise<void>;
  onResetAvatar?: () => Promise<void>;
  className?: string;
}

type NameFields = Pick<User, 'displayName' | 'firstName' | 'lastName'>;

const AVATAR_SIZE = 88;

export function InstitutionalProfileCard({
  user,
  onUpdateProfile,
  onUploadAvatar,
  onResetAvatar,
  className,
}: InstitutionalProfileCardProps) {
  const { t, locale } = useTranslation();
  const ic = (key: string) => t(`profile.institutionalCard.${key}`);

  const pronounOptions =
    locale === 'fr'
      ? fr.profile.institutionalCard.pronounOptions
      : en.profile.institutionalCard.pronounOptions;

  const [nameDraft, setNameDraft] = useState<Partial<NameFields>>({});

  useEffect(() => {
    setNameDraft({});
  }, [user]);

  const currentUser = useMemo(() => ({ ...user, ...nameDraft }), [user, nameDraft]);

  const persistField = async (key: keyof User, value: string) => {
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
    if (Object.keys(nameDraft).length === 0) return;
    await onUpdateProfile(nameDraft);
    setNameDraft({});
  };

  const metaMuted = 'text-sm text-text-muted';
  const roleLabel = user.isAdmin ? ic('adminRole') : ic('studentRole');

  return (
    <EditableFieldContext.Provider value={{ showPencil: true }}>
    <div
      className={cn(
        'card bg-gaming-card shadow-xl border border-gaming-border max-w-3xl w-full mx-auto font-body relative overflow-hidden',
        className
      )}
    >
      <div
        className={cn(
          'badge absolute top-0 right-0 z-10 rounded-none rounded-bl-xl border-0 px-3 py-2 text-xs font-semibold shadow-md',
          user.isAdmin ? 'badge-primary' : 'badge-ghost'
        )}
      >
        {roleLabel}
      </div>

      <div className="card-body gap-3 p-4 sm:p-5 pt-7">
        <div className="flex gap-3 items-start">
          <div className="shrink-0" style={{ width: AVATAR_SIZE }}>
            <EditableAvatar
              src={currentUser.avatarUrl || currentUser.githubAvatarUrl || ''}
              githubFallbackSrc={user.githubAvatarUrl || ''}
              isEditing
              size={AVATAR_SIZE}
              onUpload={async (file) => {
                if (onUploadAvatar) await onUploadAvatar(file);
              }}
              onReset={async () => {
                if (onResetAvatar) await onResetAvatar();
                else await onUpdateProfile({ avatarUrl: user.githubAvatarUrl });
              }}
            />
          </div>

          <div className="flex-1 min-w-0 flex flex-col gap-1 pt-0.5">
            <div className="flex items-baseline gap-2 min-w-0 w-full">
              <div className="min-w-0 flex-1 overflow-hidden">
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
                  onChange={(key, value) =>
                    setNameDraft((prev) => ({ ...prev, [key]: value }))
                  }
                  onCollapse={saveNameDraft}
                />
              </div>
              <span
                className={cn(
                  metaMuted,
                  'ml-auto flex flex-nowrap items-center justify-end gap-0.5 min-w-0 overflow-visible max-w-[48%] sm:max-w-[42%]'
                )}
              >
                <span className="select-none shrink-0" aria-hidden>
                  (
                </span>
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
                <span className="select-none shrink-0" aria-hidden>
                  )
                </span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
              {user.githubUsername && (
                <div className="badge badge-outline bg-gaming-base border-gaming-border text-text-secondary gap-1 text-xs py-2 px-2 font-medium shrink-0">
                  <Github size={12} aria-hidden />
                  {user.githubUsername}
                </div>
              )}
              <EditableText
                value={currentUser.email || ''}
                onChange={(v) => persistField('email', v)}
                placeholder={ic('addEmail')}
                inputType="email"
                className="text-sm text-text-muted min-w-0 flex-1 max-w-full"
              />
            </div>

            <div className="badge badge-outline px-2 py-1 bg-gaming-card w-fit h-auto" title={ic('school')}>
              <img src={logoUrl} alt={ic('school')} className="h-4 w-auto max-w-none object-contain" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 min-w-0 w-full max-w-[14rem]">
          <Cake
            size={14}
            className="shrink-0 text-text-muted"
            aria-hidden
          />
          <EditableText
            value={currentUser.birthDate || ''}
            onChange={(v) => persistField('birthDate', v)}
            placeholder={ic('birthDate')}
            inputType="date"
            truncate={false}
            className={cn(metaMuted, 'text-xs leading-tight flex-1 min-w-0 whitespace-nowrap')}
          />
        </div>

        <div className="flex gap-2.5 border-l-4 border-primary/35 pl-3 sm:pl-4 min-w-0">
          <Quote
            size={28}
            className="shrink-0 text-text-muted/60 mt-0.5"
            aria-hidden
          />
          <EditableText
            multiline
            value={currentUser.bio || ''}
            onChange={(v) => persistField('bio', v)}
            placeholder={ic('writeBio')}
            truncate={false}
            className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap w-full min-h-[2.75rem] min-w-0"
          />
        </div>
      </div>
    </div>
    </EditableFieldContext.Provider>
  );
}
