import { useEffect, useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { AccountDropdown } from './AccountDropdown';
import { StatusIndicator } from '../atoms/StatusIndicator';
import { PlayingCard } from '../molecules/PlayingCard';
import { useAuth } from '../../features/auth/useAuth';
import { useCohortProgressData } from '../../features/game/useCohortProgressData';
import {
  HeaderNotificationArea,
  HeaderNotificationButton,
  type HeaderNotification,
} from './HeaderNotificationArea';
import { cn } from '../../utils/cn';
import { formatUserDisplayName } from '../../utils/displayName';
import {
  formatRewardNotificationDescription,
  formatRewardNotificationTitle,
} from '../../features/game/formatRewardNotification';
import { Coins, Gift, GraduationCap, Map, Settings, Sparkles, Users } from 'lucide-react';
import iconUrl from '../../assets/icon.svg';

interface GameHeaderProps {
  currentView?: 'map' | 'management' | 'guild' | 'class' | 'progress' | 'character';
}

export function GameHeader({ currentView = 'map' }: GameHeaderProps) {
  const { user, character } = useAuth();
  const dashboardData = useCohortProgressData();
  const { t } = useTranslation();

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<Set<string>>(
    () => new Set()
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const dashboardNotifications: HeaderNotification[] = dashboardData?.notifications.length
    ? dashboardData.notifications.map((notification) => ({
        id: notification.id,
        title:
          notification.context?.type === 'reward'
            ? formatRewardNotificationTitle(notification.context, t)
            : t(notification.titleI18nKey),
        description:
          notification.context?.type === 'reward'
            ? formatRewardNotificationDescription(notification.context, t)
            : notification.descriptionI18nKey
              ? t(notification.descriptionI18nKey)
              : undefined,
        tone: notification.tone,
        icon: getNotificationIcon(notification.icon),
        action: notification.actionLabelI18nKey
          ? {
              label: t(notification.actionLabelI18nKey),
              onSelect: () => runNotificationAction(notification.actionTarget),
            }
          : undefined,
      }))
    : [];
  const activeNotifications = dashboardNotifications.filter(
    (notification) => !dismissedNotificationIds.has(notification.id)
  );

  const dismissNotification = (id: string) => {
    setDismissedNotificationIds((current) => new Set(current).add(id));
  };

  return (
    <header className="relative z-50 flex w-full flex-col gap-2">
      <div className="flex min-h-16 flex-wrap justify-between gap-y-2 rounded-lg border border-gaming-border bg-gaming-card text-xs shadow-md lg:flex-nowrap">
        {/* Partie Gauche : Logo & Version */}
        <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto">
          <div className="flex items-center gap-3 px-4">
            <div className="w-8 h-8 rounded-lg bg-gaming-base flex items-center justify-center shadow-md overflow-hidden p-1 border border-gaming-border">
              <img src={iconUrl} alt={t('layout.appIconAlt')} className="w-full h-full object-contain" />
            </div>
            <h1 className="text-lg font-bold font-display tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-text-primary to-text-secondary">
              {t('layout.title')}{' '}
              <span className="text-xs text-status-boss font-normal">{t('layout.alpha')}</span>
            </h1>
          </div>

          <nav className="flex min-w-max border-l border-gaming-border" aria-label={t('layout.primaryNav')}>
            <button
              type="button"
              aria-current={currentView === 'map' ? 'page' : undefined}
              onClick={() => {
                window.location.hash = '';
              }}
              className={cn(
                'flex flex-col items-center justify-center gap-1 border-r border-gaming-border px-5 font-display font-bold uppercase tracking-[0.18em] text-text-secondary transition hover:bg-gaming-base hover:text-text-primary',
                currentView === 'map' && 'bg-gaming-base text-status-quest'
              )}
            >
              <Map size={16} aria-hidden />
              {t('map.nav')}
            </button>

            <button
              type="button"
              aria-current={currentView === 'guild' ? 'page' : undefined}
              onClick={() => {
                window.location.hash = 'guild';
              }}
              className={cn(
                'flex flex-col items-center justify-center gap-1 border-r border-gaming-border px-5 font-display font-bold uppercase tracking-[0.18em] text-text-secondary transition hover:bg-gaming-base hover:text-text-primary',
                currentView === 'guild' && 'bg-gaming-base text-status-quest'
              )}
            >
              <Users size={16} aria-hidden />
              {t('guild.nav')}
            </button>

            <button
              type="button"
              aria-current={currentView === 'class' ? 'page' : undefined}
              onClick={() => {
                window.location.hash = 'class';
              }}
              className={cn(
                'flex flex-col items-center justify-center gap-1 border-r border-gaming-border px-5 font-display font-bold uppercase tracking-[0.18em] text-text-secondary transition hover:bg-gaming-base hover:text-text-primary',
                currentView === 'class' && 'bg-gaming-base text-status-quest'
              )}
            >
              <GraduationCap size={16} aria-hidden />
              {t('class.nav')}
            </button>

            <button
              type="button"
              aria-current={currentView === 'progress' ? 'page' : undefined}
              onClick={() => {
                window.location.hash = 'progress';
              }}
              className={cn(
                'flex flex-col items-center justify-center gap-1 border-r border-gaming-border px-5 font-display font-bold uppercase tracking-[0.18em] text-text-secondary transition hover:bg-gaming-base hover:text-text-primary',
                currentView === 'progress' && 'bg-gaming-base text-status-quest'
              )}
            >
              <Gift size={16} aria-hidden />
              {t('progress.nav')}
            </button>

            {user?.isAdmin && (
              <button
                type="button"
                aria-current={currentView === 'management' ? 'page' : undefined}
                onClick={() => {
                  window.location.hash = 'management';
                }}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 border-r border-gaming-border px-5 font-display font-bold uppercase tracking-[0.18em] text-text-secondary transition hover:bg-gaming-base hover:text-text-primary',
                  currentView === 'management' && 'bg-gaming-base text-status-quest'
                )}
              >
                <Settings size={16} aria-hidden />
                {t('management.nav')}
              </button>
            )}
          </nav>
        </div>

        {/* Partie Droite : Character, Account & Notifications */}
        <div className="flex shrink-0 items-center gap-3 px-4">
          {!isOnline && (
            <div className="tooltip tooltip-left" data-tip={t('header.connectionLost')}>
              <StatusIndicator status="error" isPulsing={true} />
            </div>
          )}
          {user && character ? (
            <div className="relative h-12 w-[2.15rem] overflow-visible">
              <PlayingCard
                size="nano"
                kind="character"
                title={formatUserDisplayName(user)}
                ribbonLabel={t(`game.classes.${character.characterClass}`)}
                characterClass={character.characterClass}
                illustrationUrl={user.avatarUrl || user.githubAvatarUrl}
                illustrationAlt={formatUserDisplayName(user)}
                interactive
                onClick={() => {
                  window.location.hash = 'character';
                }}
                className="absolute left-1/2 top-0 -translate-x-1/2"
              />
            </div>
          ) : null}
          <AccountDropdown />
          <HeaderNotificationButton
            count={activeNotifications.length}
            isOpen={isNotificationDrawerOpen}
            onClick={() => setIsNotificationDrawerOpen((current) => !current)}
          />
        </div>
      </div>

      <HeaderNotificationArea
        notifications={activeNotifications}
        isOpen={isNotificationDrawerOpen}
        isExpanded
        onDismiss={dismissNotification}
        onAction={dismissNotification}
        className="sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-[28rem] sm:max-w-full"
      />
    </header>
  );
}

function getNotificationIcon(icon?: string) {
  if (icon === 'map') return <Map size={18} />;
  if (icon === 'sparkles') return <Sparkles size={18} />;
  if (icon === 'coins') return <Coins size={18} />;
  if (icon === 'gift') return <Gift size={18} />;
  return undefined;
}

function runNotificationAction(actionTarget?: string) {
  if (actionTarget === 'map') {
    window.location.hash = '';
  }
}

export default GameHeader;
