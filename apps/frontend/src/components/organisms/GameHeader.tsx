import { useEffect, useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { AccountDropdown } from './AccountDropdown';
import { StatusIndicator } from '../atoms/StatusIndicator';
import { PlayingCard } from '../molecules/PlayingCard';
import { useAuth } from '../../features/auth/useAuth';
import { useDashboardData } from '../../features/game/useDashboardData';
import {
  HeaderNotificationArea,
  HeaderNotificationButton,
  type HeaderNotification,
} from './HeaderNotificationArea';
import { cn } from '../../utils/cn';
import { formatUserDisplayName } from '../../utils/displayName';
import { Coins, Gift, GraduationCap, Map, Settings, Sparkles, Users } from 'lucide-react';
import iconUrl from '../../assets/icon.svg';

interface GameHeaderProps {
  currentView?: 'map' | 'management' | 'guild' | 'class' | 'progress';
}

export function GameHeader({ currentView = 'map' }: GameHeaderProps) {
  const { user, character } = useAuth();
  const dashboardData = useDashboardData();
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

  const fallbackNotifications: HeaderNotification[] = [
    {
      id: 'cohort-quest',
      title: t('dashboard.notifications.cohortQuest.title'),
      description: t('dashboard.notifications.cohortQuest.description'),
      meta: t('dashboard.notifications.cohortQuest.meta'),
      tone: 'info',
      icon: <Map size={18} />,
      action: {
        label: t('dashboard.notifications.cohortQuest.action'),
        onSelect: () => {
          window.location.hash = '';
        },
      },
    },
    {
      id: 'cohort-campfire',
      title: t('dashboard.notifications.cohortCampfire.title'),
      description: t('dashboard.notifications.cohortCampfire.description'),
      meta: t('dashboard.notifications.cohortCampfire.meta'),
      tone: 'success',
      icon: <Sparkles size={18} />,
      action: { label: t('dashboard.notifications.cohortCampfire.action') },
    },
    {
      id: 'reward-gold',
      title: t('dashboard.notifications.rewardGold.title'),
      description: t('dashboard.notifications.rewardGold.description'),
      meta: t('dashboard.notifications.rewardGold.meta'),
      tone: 'warning',
      icon: <Coins size={18} />,
      action: { label: t('dashboard.notifications.rewardGold.action') },
    },
    {
      id: 'reward-spend',
      title: t('dashboard.notifications.rewardSpend.title'),
      description: t('dashboard.notifications.rewardSpend.description'),
      meta: t('dashboard.notifications.rewardSpend.meta'),
      tone: 'neutral',
      icon: <Gift size={18} />,
      action: { label: t('dashboard.notifications.rewardSpend.action') },
    },
  ];
  const dashboardNotifications: HeaderNotification[] = dashboardData?.notifications.length
    ? dashboardData.notifications.map((notification) => ({
        id: notification.id,
        title: t(notification.titleI18nKey),
        description: notification.descriptionI18nKey ? t(notification.descriptionI18nKey) : undefined,
        meta: notification.metaI18nKey ? t(notification.metaI18nKey) : undefined,
        tone: notification.tone,
        icon: getNotificationIcon(notification.icon),
        action: notification.actionLabelI18nKey
          ? {
              label: t(notification.actionLabelI18nKey),
              onSelect: () => runNotificationAction(notification.actionTarget),
            }
          : undefined,
      }))
    : fallbackNotifications;
  const activeNotifications = dashboardNotifications.filter(
    (notification) => !dismissedNotificationIds.has(notification.id)
  );

  const dismissNotification = (id: string) => {
    setDismissedNotificationIds((current) => new Set(current).add(id));
  };

  return (
    <header className="relative z-50 flex w-full flex-col gap-2">
      <div className="flex min-h-16 justify-between rounded-lg border border-gaming-border bg-gaming-card text-xs shadow-md">
        {/* Partie Gauche : Logo & Version */}
        <div className="flex min-w-0 items-stretch">
          <div className="flex items-center gap-3 px-4">
            <div className="w-8 h-8 rounded-lg bg-gaming-base flex items-center justify-center shadow-md overflow-hidden p-1 border border-gaming-border">
              <img src={iconUrl} alt="Aptipiou Icon" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-lg font-bold font-display tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-text-primary to-text-secondary">
              {t('layout.title')}{' '}
              <span className="text-xs text-status-boss font-normal">{t('layout.alpha')}</span>
            </h1>
          </div>

          <nav className="flex border-l border-gaming-border" aria-label="Primary">
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
        <div className="flex items-center gap-3 px-4">
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
                ribbonLabel={`LVL ${character.currentLevel}`}
                characterClass={character.characterClass}
                illustrationUrl={user.avatarUrl || user.githubAvatarUrl}
                illustrationAlt={formatUserDisplayName(user)}
                interactive={false}
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
