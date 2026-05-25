import { useEffect, useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { AccountDropdown } from '../molecules/AccountDropdown';
import { StatusIndicator } from '../atoms/StatusIndicator';
import { useAuth } from '../../features/auth/useAuth';
import {
  HeaderNotificationArea,
  HeaderNotificationButton,
  type HeaderNotification,
} from './HeaderNotificationArea';
import { cn } from '../../utils/cn';
import { Coins, Gift, Map, Settings, Sparkles } from 'lucide-react';
import iconUrl from '../../assets/icon.svg';

interface GameHeaderProps {
  currentView?: 'map' | 'management';
}

export function GameHeader({ currentView = 'map' }: GameHeaderProps) {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(true);
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

  const dashboardNotifications: HeaderNotification[] = [
    {
      id: 'cohort-quest',
      title: 'Quest window opened',
      description: 'New cohort quest available on the map.',
      meta: '2 min ago',
      tone: 'info',
      icon: <Map size={18} />,
      action: {
        label: 'Open map',
        onSelect: () => {
          window.location.hash = '';
        },
      },
    },
    {
      id: 'cohort-campfire',
      title: 'Campfire milestone',
      description: 'The warm-up milestone is now complete.',
      meta: '12 min ago',
      tone: 'success',
      icon: <Sparkles size={18} />,
      action: { label: 'Acknowledge' },
    },
    {
      id: 'reward-gold',
      title: '+120 guild gold',
      description: 'Crimson Compilers gained gold from a completed quest.',
      meta: 'Just now',
      tone: 'warning',
      icon: <Coins size={18} />,
      action: { label: 'Collect' },
    },
    {
      id: 'reward-spend',
      title: 'Reward unlocked',
      description: 'Deadline +24h entered the reward pool.',
      meta: '8 min ago',
      tone: 'neutral',
      icon: <Gift size={18} />,
      action: { label: 'Review' },
    },
  ];
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

        {/* Partie Droite : Account Dropdown */}
        <div className="flex items-center gap-3 px-4">
          <HeaderNotificationButton
            count={activeNotifications.length}
            isOpen={isNotificationDrawerOpen}
            onClick={() => setIsNotificationDrawerOpen((current) => !current)}
          />
          {!isOnline && (
            <div className="tooltip tooltip-left" data-tip={t('header.connectionLost')}>
              <StatusIndicator status="error" isPulsing={true} />
            </div>
          )}
          <AccountDropdown />
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

export default GameHeader;
