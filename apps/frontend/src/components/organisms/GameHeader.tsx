import { useRef, useEffect } from 'react';
import { Server } from 'lucide-react';
import { useGameStore } from '../../features/game/gameStore';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../utils/cn';

interface GameHeaderProps {
  apiSource: 'database' | 'mock' | 'offline';
  loading: boolean;
  onRefresh: () => void;
}

export function GameHeader({ apiSource, loading, onRefresh }: GameHeaderProps) {
  const { student, character } = useGameStore();
  const { t, locale, setLocale } = useTranslation();
  const progressBarRef = useRef<HTMLDivElement>(null);

  const currentXp = character?.stats.xp || 0;
  const xpNeeded = (character?.currentLevel || 1) * 100;
  const xpPercentage = Math.min(100, Math.floor((currentXp / xpNeeded) * 100));

  useEffect(() => {
    if (progressBarRef.current) {
      progressBarRef.current.style.width = `${xpPercentage}%`;
    }
  }, [xpPercentage]);

  if (!student || !character) return null;

  const serverIconColor = cn(
    apiSource === 'database' ? 'text-status-completed' : 'text-status-campfire'
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Barre de Navigation et Status Unifiée (Premium HUD) */}
      <div className="flex flex-col lg:flex-row justify-between items-center bg-gaming-card border border-gaming-border rounded-lg p-4 gap-4 text-xs shadow-md">
        {/* Partie Gauche : Logo & Version */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-status-quest to-status-boss flex items-center justify-center font-bold text-gaming-base shadow-md font-display">
            EQ
          </div>
          <h1 className="text-lg font-bold font-display tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-text-primary to-text-secondary">
            {t('layout.title')}{' '}
            <span className="text-xs text-status-boss font-normal">{t('layout.alpha')}</span>
          </h1>
        </div>

        {/* Partie Centrale : Status de l'API */}
        <div className="flex items-center gap-4 bg-gaming-base/60 border border-gaming-border px-3 py-2 rounded-sm text-text-muted">
          <div className="flex items-center gap-2">
            <Server size={14} className={serverIconColor} />
            <span>
              {t('common.apiSource')} :{' '}
              <strong className="uppercase text-text-secondary">{apiSource}</strong>
            </span>
          </div>
          <button
            className="btn btn-xs btn-outline btn-secondary"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? t('header.reconnecting') : t('header.checkConnection')}
          </button>
        </div>

        {/* Partie Droite : Onglets Jeu / GM & Langue */}
        <div className="flex gap-3 items-center">
          <nav className="flex gap-1">
            <button className="btn btn-neutral">{t('layout.tabPlay')}</button>
            <button className="btn btn-ghost">{t('layout.tabGm')}</button>
          </nav>

          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as any)}
            className="select select-bordered"
          >
            <option value="fr">🇫🇷 FR</option>
            <option value="en">🇬🇧 EN</option>
          </select>
        </div>
      </div>

      {/* HUD - Profil du Joueur */}
      <div className="bg-gaming-card border border-gaming-border p-6 rounded-lg flex flex-col md:flex-row justify-between gap-6 items-center shadow-lg">
        <div className="flex items-center gap-4">
          <div className="avatar online">
            <div className="w-16 rounded-lg border border-status-boss/30">
              <img src={student.photoUrl} alt="Avatar" />
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
