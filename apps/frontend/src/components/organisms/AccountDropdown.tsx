import { useState, useRef, useEffect } from 'react';
import { LogOut, ChevronDown, Languages, Check, Moon, Sun } from 'lucide-react';
import { BACKEND_BASE_URL, useAuth } from '../../features/auth/useAuth';
import { useGameStore } from '../../features/game/gameStore';
import { reconcileProfileUser } from '../../features/auth/reconcileProfileUser';
import { useTranslation } from '../../hooks/useTranslation';
import { StatusIndicator } from '../atoms/StatusIndicator';
import { InstitutionalProfileCard } from './InstitutionalProfileCard/InstitutionalProfileCard';
import { CohortMembership, GameCharacter, Student, User } from '@eduquest/shared';
import { cn } from '../../utils/cn';
import { formatUserDisplayName } from '../../utils/displayName';
import { uploadAsset } from '../../features/assets/api';
import { useErrorReporter } from '../../features/errors/notifications';

import { motion, AnimatePresence } from 'framer-motion';

type ProfileResponse = {
  success?: boolean;
  error?: string;
  errorKey?: string;
  token?: string;
  user?: Partial<User>;
  student?: Student | null;
  character?: GameCharacter | null;
};

type ProfileUpdate = Partial<User> & {
  institutionalEmail?: string;
  institutionalSchoolId?: string;
};

type ThemeMode = 'dark' | 'light';

const THEME_STORAGE_KEY = 'eduquest_theme';

function getInitialTheme(): ThemeMode {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;

  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function getLatestCohortMembership(memberships?: CohortMembership[]) {
  if (!memberships || memberships.length === 0) return undefined;
  return [...memberships].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  })[0];
}

export function AccountDropdown() {
  const { user, student, logout } = useAuth();
  const patchUser = useGameStore((s) => s.patchUser);
  const { t, locale, setLocale } = useTranslation();
  const reportError = useErrorReporter();
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [institutionalEmailOverride, setInstitutionalEmailOverride] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const latestCohortMembership = getLatestCohortMembership(student?.cohortMemberships);
  const latestCohort = user?.isAdmin ? undefined : latestCohortMembership?.cohort;
  const latestSchool = latestCohort?.school;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    setInstitutionalEmailOverride(null);
  }, [latestCohortMembership?.institutionalEmail]);

  useEffect(() => {
    const openProfileDropdown = () => setIsOpen(true);
    window.addEventListener('eduquest:open-profile-dropdown', openProfileDropdown);
    return () => window.removeEventListener('eduquest:open-profile-dropdown', openProfileDropdown);
  }, []);

  if (!user) return null;

  const username = formatUserDisplayName(user);
  const avatarUrl =
    user.avatarUrl ||
    user.githubAvatarUrl ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';
  const chevronClass = cn(
    'text-text-muted transition-transform duration-300',
    isOpen && 'rotate-180'
  );
  const localeButtonClass = (targetLocale: 'fr' | 'en') =>
    cn(
      'btn btn-xs py-1.5 px-3 h-auto min-h-0 font-bold font-display flex items-center justify-center gap-1 transition-all cursor-pointer border-gaming-border',
      locale === targetLocale
        ? 'btn-primary text-primary-content shadow-sm'
        : 'btn-ghost bg-gaming-base/40 text-text-muted hover:text-text-secondary'
    );
  const showErrorToast = (messageKey: string, fallback?: string) => {
    reportError(fallback || messageKey, {
      messageKey,
      fallback,
      id: messageKey,
      includeDetail: Boolean(fallback),
    });
  };

  const updateProfile = async (data: ProfileUpdate, shouldThrow = false) => {
    if (!user) {
      if (shouldThrow) throw new Error('profile.errors.updateFailed');
      return;
    }

    const snapshot = { ...user };
    patchUser(data);

    const token = localStorage.getItem('eduquest_token');
    if (!token) {
      patchUser(snapshot);
      showErrorToast('profile.errors.unauthorized');
      if (shouldThrow) throw new Error('profile.errors.unauthorized');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const json = (await response.json().catch(() => ({}))) as ProfileResponse;

      if (!response.ok || !json.success) {
        const messageKey = json.errorKey || 'profile.errors.updateFailed';
        patchUser(snapshot);
        showErrorToast(messageKey, json.error || t('profile.errors.updateFailed'));
        if (shouldThrow) throw new Error(messageKey);
        return;
      }

      if (json.token) {
        localStorage.setItem('eduquest_token', json.token);
      }

      const store = useGameStore.getState();
      const optimistic = store.user!;
      const reconciled = reconcileProfileUser(optimistic, data, json.user);
      if ('student' in json || 'character' in json) {
        store.setUserSession(
          reconciled,
          json.student ?? store.student,
          json.character ?? store.character,
          store.activityCompletions
        );
      } else {
        patchUser(reconciled);
      }
      window.dispatchEvent(new Event('eduquest:onboarding-state-updated'));
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('profile.errors.')) {
        if (shouldThrow) throw error;
        return;
      }

      const messageKey = 'profile.errors.network';
      patchUser(snapshot);
      showErrorToast(messageKey);
      if (shouldThrow) throw new Error(messageKey);
    }
  };

  const handleUpdateProfile = (data: Partial<User>) => updateProfile(data);

  const handleUploadAvatar = async (file: File) => {
    const token = localStorage.getItem('eduquest_token');
    if (!token) throw new Error('profile.errors.network');

    const asset = await uploadAsset(token, 'avatar', file);
    await updateProfile({ avatarUrl: asset.url }, true);
  };

  const handleInstitutionalEmailChange = async (institutionalEmail: string) => {
    const snapshot = institutionalEmailOverride;
    setInstitutionalEmailOverride(institutionalEmail);
    try {
      await updateProfile({ institutionalEmail, institutionalSchoolId: latestSchool?.id }, true);
    } catch {
      setInstitutionalEmailOverride(snapshot);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-ghost hover:bg-gaming-base/40 border border-gaming-border hover:border-solarized-blue/50 flex items-center gap-2.5 h-auto min-h-0 py-1.5 px-3 rounded-xl transition-all select-none cursor-pointer focus:outline-none normal-case"
      >
        {/* Avatar with Status Indicator */}
        <div className="relative">
          <div className="avatar">
            <div className="w-8 rounded-full ring ring-solarized-blue/20 ring-offset-2 ring-offset-gaming-base">
              <img src={avatarUrl} alt={username} />
            </div>
          </div>
          <StatusIndicator
            status="success"
            className="absolute -bottom-0.5 -right-0.5 border-2 border-gaming-base w-3.5 h-3.5"
          />
        </div>
        <span className="hidden sm:block text-xs font-semibold text-text-primary font-display max-w-[120px] truncate">
          {username}
        </span>
        <ChevronDown size={14} className={chevronClass} />
      </button>

      {/* Dropdown Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-[500px] max-w-[90vw] bg-gaming-card border border-gaming-border rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Editable Profile Card Area */}
            <div className="flex-1 max-h-[70vh] overflow-y-auto">
              <InstitutionalProfileCard
                user={user}
                variant="dropdown"
                onUpdateProfile={handleUpdateProfile}
                onUploadAvatar={handleUploadAvatar}
                institutionalEmail={
                  institutionalEmailOverride ??
                  latestCohortMembership?.institutionalEmail
                }
                institutionalEmailDomain={latestSchool?.emailDomain || 'school.edu'}
                onInstitutionalEmailChange={handleInstitutionalEmailChange}
                schoolName={latestSchool?.name}
                schoolLogoUrl={latestSchool?.logoUrl}
                cohort={latestCohort}
              />
            </div>

            {/* Footer: Language Selector & Disconnect */}
            <div className="p-3 bg-gaming-base/20 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-text-muted font-display font-semibold uppercase tracking-wider">
                  <Languages size={14} />
                  <span>{t('common.language')}</span>
                </div>
                <div className="flex gap-2">
                  <div className="tooltip tooltip-top">
                    <span className="tooltip-content z-50">{t('common.languageFrench')}</span>
                    <button onClick={() => setLocale('fr')} className={localeButtonClass('fr')}>
                      <span>FR</span>
                      {locale === 'fr' && <Check size={12} />}
                    </button>
                  </div>
                  <div className="tooltip tooltip-top">
                    <span className="tooltip-content z-50">{t('common.languageEnglish')}</span>
                    <button onClick={() => setLocale('en')} className={localeButtonClass('en')}>
                      <span>EN</span>
                      {locale === 'en' && <Check size={12} />}
                    </button>
                  </div>
                  <div className="tooltip tooltip-top">
                    <span className="tooltip-content z-50">
                      {theme === 'dark'
                        ? t('common.switchToLightTheme')
                        : t('common.switchToDarkTheme')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
                      aria-label={
                        theme === 'dark'
                          ? t('common.switchToLightTheme')
                          : t('common.switchToDarkTheme')
                      }
                      className="btn btn-xs btn-ghost py-1.5 px-2 h-auto min-h-0 bg-gaming-base/40 border border-gaming-border text-text-muted hover:text-text-secondary"
                    >
                      {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="divider my-0"></div>

              <button
                onClick={() => {
                  setIsOpen(false);
                  logout();
                }}
                className="w-full btn btn-sm btn-ghost text-status-campfire hover:bg-status-boss/10 flex items-center justify-center gap-2 transition-colors font-display font-semibold"
              >
                <LogOut size={16} />
                <span>{t('auth.logout')}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AccountDropdown;
