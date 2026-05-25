import type { GameCharacter, User } from '@eduquest/shared';
import type { ReactNode } from 'react';
import { Shield } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { cn } from '../../../utils/cn';
import { formatUserDisplayName } from '../../../utils/displayName';
import { RadarGraph } from '../RadarGraph';
import type { RadarGraphAxis, RadarGraphDataset } from '../RadarGraph';

export interface CharacterPlayingCardProps {
  user: User;
  character: GameCharacter;
  illustrationUrl?: string;
  name?: string;
  description?: string;
  radarAxes?: RadarGraphAxis[];
  radarDatasets?: RadarGraphDataset[];
  children?: ReactNode;
  className?: string;
}

export function CharacterPlayingCard({
  user,
  character,
  illustrationUrl,
  name,
  description,
  radarAxes,
  radarDatasets,
  children,
  className,
}: CharacterPlayingCardProps) {
  const { t } = useTranslation();
  const displayName = name || formatUserDisplayName(user) || t('game.classCard.fallbackName');
  const imageUrl = illustrationUrl || user.avatarUrl || user.githubAvatarUrl || '';
  const classLabel = t(`game.classes.${character.characterClass}`);
  const shortDescription = description || user.bio || classLabel;
  const hasRadarGraph = Boolean(radarAxes?.length && radarDatasets?.length);

  return (
    <div
      className={cn(
        'relative aspect-[5/7] w-full overflow-hidden rounded-[1.5rem] border border-gaming-border bg-gaming-base p-2 shadow-2xl',
        className
      )}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-[1.15rem] border border-primary/30 bg-gradient-to-br from-gaming-card via-gaming-base to-gaming-card p-3">
        <header className="flex shrink-0 items-start justify-between gap-3 rounded-xl border border-gaming-border bg-gaming-base/80 px-3 py-2 shadow-inner">
          <div className="min-w-0">
            <p className="text-[0.62rem] font-display font-bold uppercase tracking-[0.22em] text-text-muted">
              {t('game.classCard.eyebrow')}
            </p>
            <h3 className="truncate text-lg font-display font-bold text-text-primary">{displayName}</h3>
          </div>
          <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
            LVL {character.currentLevel}
          </span>
        </header>

        <div className="relative mt-3 aspect-[4/3] shrink-0 overflow-hidden rounded-xl border border-gaming-border bg-gaming-base shadow-inner">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`${t('game.classCard.avatarAlt')} ${displayName}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-text-muted">
              <Shield size={56} aria-hidden />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-gaming-base to-transparent" />
        </div>

        <section className="mt-3 flex min-h-0 flex-1 flex-col rounded-xl border border-gaming-border bg-gaming-card/90 p-3 shadow-lg">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2">
            <span className="text-[0.62rem] font-bold uppercase tracking-widest text-text-muted">
              {t('game.classCard.classLabel')}
            </span>
            <span className="truncate text-sm font-display font-bold text-primary">{classLabel}</span>
          </div>

          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-text-secondary">
            {shortDescription}
          </p>

          <div className="mt-auto min-h-12 rounded-lg border border-dashed border-gaming-border/80 bg-gaming-base/40 p-2">
            {hasRadarGraph && radarAxes && radarDatasets ? (
              <RadarGraph axes={radarAxes} datasets={radarDatasets} className="mx-auto max-h-28 max-w-28" />
            ) : (
              children
            )}
          </div>
        </section>

        <div className="mt-3 flex shrink-0 items-center justify-between gap-2 text-[0.62rem] font-display font-bold uppercase tracking-[0.2em] text-text-muted">
          <span>{classLabel}</span>
          <span>#{character.currentLevel.toString().padStart(2, '0')}</span>
        </div>
      </div>
    </div>
  );
}

export default CharacterPlayingCard;
