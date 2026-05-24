import { useRef, useEffect, useState } from 'react';
import { useGameStore } from '../../features/game/gameStore';
import { useTranslation } from '../../hooks/useTranslation';
import { AccountDropdown } from '../molecules/AccountDropdown';
import { StatusIndicator } from '../atoms/StatusIndicator';
import { useAuth } from '../../features/auth/useAuth';
import { Settings } from 'lucide-react';
import iconUrl from '../../assets/icon.svg';

interface GameHeaderProps {
  currentView?: 'map' | 'management';
}

export function GameHeader({ currentView = 'map' }: GameHeaderProps) {
  const { student, character } = useGameStore();
  const { user } = useAuth();
  const { t } = useTranslation();
  const progressBarRef = useRef<HTMLDivElement>(null);

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

  const currentXp = character?.stats.xp || 0;
  const xpNeeded = (character?.currentLevel || 1) * 100;
  const xpPercentage = Math.min(100, Math.floor((currentXp / xpNeeded) * 100));

  useEffect(() => {
    if (progressBarRef.current) {
      progressBarRef.current.style.width = `${xpPercentage}%`;
    }
  }, [xpPercentage]);

  if (!student || !character) return null;

  return (
    <div className="flex flex-col gap-6">
      {/* Barre de Navigation et Status Unifiée (Premium HUD) */}
      <div className="flex justify-between items-center bg-gaming-card border border-gaming-border rounded-lg p-4 gap-4 text-xs shadow-md">
        {/* Partie Gauche : Logo & Version */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gaming-base flex items-center justify-center shadow-md overflow-hidden p-1 border border-gaming-border">
            <img src={iconUrl} alt="Aptipiou Icon" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-lg font-bold font-display tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-text-primary to-text-secondary">
            {t('layout.title')}{' '}
            <span className="text-xs text-status-boss font-normal">{t('layout.alpha')}</span>
          </h1>
        </div>

        {/* Partie Droite : Navigation & Account Dropdown */}
        <div className="flex gap-3 items-center">
          {user?.isAdmin && (
            <button
              type="button"
              onClick={() => {
                window.location.hash = currentView === 'management' ? '' : 'management';
              }}
              className="btn btn-sm btn-ghost border border-gaming-border bg-gaming-base/40 text-text-secondary hover:text-text-primary hover:bg-gaming-base gap-2 font-display"
            >
              <Settings size={14} />
              <span className="hidden sm:inline">
                {currentView === 'management' ? t('management.backToMap') : t('management.nav')}
              </span>
            </button>
          )}
          {!isOnline && (
            <div className="tooltip tooltip-left" data-tip={t('header.connectionLost')}>
              <StatusIndicator status="error" isPulsing={true} />
            </div>
          )}
          <AccountDropdown />
        </div>
      </div>

      {/* HUD - Profil du Joueur */}
      <div className="bg-gaming-card border border-gaming-border p-6 rounded-lg flex flex-col md:flex-row justify-between gap-6 items-center shadow-lg">
        <div className="flex items-center gap-4">
          <div className="avatar online">
            <div className="w-16 rounded-lg border border-status-boss/30">
              <img src={user?.avatarUrl || user?.githubAvatarUrl} alt="Avatar" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-text-primary font-display">
                {t('header.apprenticeCoder')}
              </h2>
              <span className="px-2 py-1 rounded bg-gaming-base text-xs text-text-secondary uppercase tracking-widest border border-gaming-border">
                {character.characterClass}
              </span>
            </div>
            <p className="text-sm text-text-secondary">
              {t('header.guildLabel')} :{' '}
              <span className="text-status-boss font-semibold">{t('header.guildName')}</span>
            </p>
          </div>
        </div>

        {/* Progression du niveau */}
        <div className="flex-1 max-w-md w-full">
          <div className="flex justify-between text-xs font-semibold mb-1">
            <span className="text-status-boss">
              {t('common.level')} {character.currentLevel}
            </span>
            <span className="text-text-muted">
              {currentXp} / {xpNeeded} {t('common.xp')}
            </span>
          </div>
          <div className="w-full h-3 bg-gaming-base rounded-full border border-gaming-border overflow-hidden">
            <div
              ref={progressBarRef}
              className="h-full bg-gradient-to-r from-status-quest to-status-boss transition-all duration-500"
            ></div>
          </div>
        </div>

        {/* Fiche de statistiques JDR */}
        <div className="grid grid-cols-4 gap-3 bg-gaming-base/60 p-3 rounded-lg border border-gaming-border">
          <div className="text-center px-2">
            <div className="text-xs text-text-muted uppercase">STR</div>
            <div className="text-sm font-bold text-text-secondary">{character.stats.str}</div>
          </div>
          <div className="text-center px-2">
            <div className="text-xs text-text-muted uppercase">DEX</div>
            <div className="text-sm font-bold text-text-secondary">{character.stats.dex}</div>
          </div>
          <div className="text-center px-2">
            <div className="text-xs text-text-muted uppercase">INT</div>
            <div className="text-sm font-bold text-status-boss">{character.stats.int}</div>
          </div>
          <div className="text-center px-2">
            <div className="text-xs text-text-muted uppercase">CHA</div>
            <div className="text-sm font-bold text-text-secondary">{character.stats.cha}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameHeader;
