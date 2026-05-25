import { useEffect, useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { AccountDropdown } from '../molecules/AccountDropdown';
import { StatusIndicator } from '../atoms/StatusIndicator';
import { useAuth } from '../../features/auth/useAuth';
import { cn } from '../../utils/cn';
import { Map, Settings } from 'lucide-react';
import iconUrl from '../../assets/icon.svg';

interface GameHeaderProps {
  currentView?: 'map' | 'management';
}

export function GameHeader({ currentView = 'map' }: GameHeaderProps) {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  return (
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
        {!isOnline && (
          <div className="tooltip tooltip-left" data-tip={t('header.connectionLost')}>
            <StatusIndicator status="error" isPulsing={true} />
          </div>
        )}
        <AccountDropdown />
      </div>
    </div>
  );
}

export default GameHeader;
