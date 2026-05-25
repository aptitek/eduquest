import type { CSSProperties } from 'react';
import type { GameCharacterClass, Guild } from '@eduquest/shared';
import { Shield } from 'lucide-react';
import { cn } from '../../../utils/cn';

const CHARACTER_CLASS_COLORS: Record<GameCharacterClass, string> = {
  scholar: '#268bd2',
  champion: '#dc322f',
  guide: '#859900',
  specialist: '#6c71c4',
};

type DashboardMiniCardStyle = CSSProperties & {
  '--dashboard-mini-card-accent': string;
};

export interface DashboardMiniCardProps {
  kind: 'character' | 'guild';
  illustrationUrl?: string;
  illustrationAlt?: string;
  title?: string;
  subtitle?: string;
  guild?: Pick<Guild, 'name' | 'color' | 'iconUrl' | 'totalPoints'>;
  characterClass?: GameCharacterClass;
  accentColor?: string;
  interactive?: boolean;
  faceDown?: boolean;
  style?: CSSProperties;
  className?: string;
}

export function DashboardMiniCard({
  kind,
  illustrationUrl,
  illustrationAlt,
  title,
  subtitle,
  guild,
  characterClass,
  accentColor,
  interactive = true,
  faceDown = false,
  style: externalStyle,
  className,
}: DashboardMiniCardProps) {
  const resolvedIllustrationUrl = illustrationUrl || guild?.iconUrl;
  const resolvedTitle =
    title || guild?.name || (characterClass ? formatCharacterClass(characterClass) : kind);
  const resolvedAccentColor =
    accentColor ||
    guild?.color ||
    (characterClass ? CHARACTER_CLASS_COLORS[characterClass] : undefined) ||
    '#268bd2';
  const style: DashboardMiniCardStyle = {
    ...externalStyle,
    '--dashboard-mini-card-accent': resolvedAccentColor,
  };

  return (
    <article
      tabIndex={interactive ? 0 : -1}
      aria-hidden={interactive ? undefined : true}
      aria-label={interactive ? resolvedTitle : undefined}
      style={style}
      className={cn(
        'group relative aspect-[5/7] w-32 translate-y-[52%] overflow-hidden rounded-t-[1.4rem] border-x border-t border-[color:var(--dashboard-mini-card-accent)]/60 bg-gaming-card shadow-2xl outline-none transition duration-300 ease-out hover:-translate-y-1 hover:scale-105 focus-visible:-translate-y-1 focus-visible:scale-105 focus-visible:ring-2 focus-visible:ring-[color:var(--dashboard-mini-card-accent)] sm:w-36',
        className
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,color-mix(in_srgb,var(--dashboard-mini-card-accent)_34%,transparent),transparent_55%)]" />
      {faceDown ? (
        <div className="absolute inset-3 rounded-t-[1rem] border border-[color:var(--dashboard-mini-card-accent)]/50 bg-gaming-base p-2">
          <div className="flex h-full w-full items-center justify-center rounded-t-[0.75rem] border border-dashed border-[color:var(--dashboard-mini-card-accent)]/50 bg-[repeating-linear-gradient(135deg,color-mix(in_srgb,var(--dashboard-mini-card-accent)_20%,transparent)_0_8px,transparent_8px_16px)]">
            <Shield
              size={38}
              className="text-[color:var(--dashboard-mini-card-accent)]"
              aria-hidden
            />
          </div>
        </div>
      ) : (
        <>
          <div className="absolute inset-x-3 top-3 bottom-12 overflow-hidden rounded-t-[1rem] border border-gaming-border bg-gaming-base">
            {resolvedIllustrationUrl ? (
              <img
                src={resolvedIllustrationUrl}
                alt={illustrationAlt || resolvedTitle}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-110 group-focus-visible:scale-110"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[color:var(--dashboard-mini-card-accent)]">
                <Shield size={42} aria-hidden />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-gaming-card to-transparent" />
          </div>

          <div className="absolute inset-x-0 bottom-0 translate-y-4 border-t border-[color:var(--dashboard-mini-card-accent)]/40 bg-gaming-card/95 px-3 py-2 transition duration-300 group-hover:translate-y-0 group-focus-visible:translate-y-0">
            <div className="mx-auto mb-1 h-1 w-8 rounded-full bg-[color:var(--dashboard-mini-card-accent)]/70" />
            <h3 className="truncate text-center font-display text-sm font-bold text-text-primary">
              {resolvedTitle}
            </h3>
            {subtitle ? (
              <p className="mt-0.5 truncate text-center text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-text-muted opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                {subtitle}
              </p>
            ) : null}
          </div>
        </>
      )}
    </article>
  );
}

function formatCharacterClass(characterClass: GameCharacterClass) {
  return characterClass.charAt(0).toUpperCase() + characterClass.slice(1);
}

export default DashboardMiniCard;
