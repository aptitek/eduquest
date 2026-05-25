import type { GameCharacterClass, Guild } from '@eduquest/shared';
import { Shield } from 'lucide-react';
import type { CornerRibbonPosition } from '../../atoms/CornerRibbon';
import { CornerRibbon } from '../../atoms/CornerRibbon';
import { cn } from '../../../utils/cn';

export type DashboardMiniCardAccent =
  | 'scholar'
  | 'champion'
  | 'guide'
  | 'specialist'
  | 'quest'
  | 'campfire'
  | 'completed'
  | 'boss'
  | 'danger'
  | 'neutral';

const CHARACTER_CLASS_ACCENTS: Record<GameCharacterClass, DashboardMiniCardAccent> = {
  scholar: 'scholar',
  champion: 'champion',
  guide: 'guide',
  specialist: 'specialist',
};

const CARD_SURFACE_CLASS =
  'group relative aspect-[5/7] w-32 translate-y-[52%] overflow-hidden rounded-[1.4rem] border bg-gaming-card shadow-2xl outline-none transition duration-300 ease-out hover:-translate-y-1 hover:scale-105 focus-visible:-translate-y-1 focus-visible:scale-105 focus-visible:ring-2 sm:w-36';
const CARD_ART_CLASS =
  'absolute inset-x-3 top-3 bottom-12 overflow-hidden rounded-[1rem] border border-gaming-border bg-gaming-base';
const CARD_FOOTER_CLASS =
  'absolute inset-x-0 bottom-0 border-t bg-gaming-card/95 px-3 py-2 transition duration-300 group-hover:translate-y-0 group-focus-visible:translate-y-0';

const ACCENT_STYLES: Record<
  DashboardMiniCardAccent,
  {
    border: string;
    borderSubtle: string;
    text: string;
    bgSubtle: string;
    bgSolid: string;
    ring: string;
  }
> = {
  scholar: {
    border: 'border-accent-scholar/60',
    borderSubtle: 'border-accent-scholar/40',
    text: 'text-accent-scholar',
    bgSubtle: 'bg-accent-scholar/10',
    bgSolid: 'bg-accent-scholar/70',
    ring: 'focus-visible:ring-accent-scholar',
  },
  champion: {
    border: 'border-accent-champion/60',
    borderSubtle: 'border-accent-champion/40',
    text: 'text-accent-champion',
    bgSubtle: 'bg-accent-champion/10',
    bgSolid: 'bg-accent-champion/70',
    ring: 'focus-visible:ring-accent-champion',
  },
  guide: {
    border: 'border-accent-guide/60',
    borderSubtle: 'border-accent-guide/40',
    text: 'text-accent-guide',
    bgSubtle: 'bg-accent-guide/10',
    bgSolid: 'bg-accent-guide/70',
    ring: 'focus-visible:ring-accent-guide',
  },
  specialist: {
    border: 'border-accent-specialist/60',
    borderSubtle: 'border-accent-specialist/40',
    text: 'text-accent-specialist',
    bgSubtle: 'bg-accent-specialist/10',
    bgSolid: 'bg-accent-specialist/70',
    ring: 'focus-visible:ring-accent-specialist',
  },
  quest: {
    border: 'border-status-quest/60',
    borderSubtle: 'border-status-quest/40',
    text: 'text-status-quest',
    bgSubtle: 'bg-status-quest/10',
    bgSolid: 'bg-status-quest/70',
    ring: 'focus-visible:ring-status-quest',
  },
  campfire: {
    border: 'border-status-campfire/60',
    borderSubtle: 'border-status-campfire/40',
    text: 'text-status-campfire',
    bgSubtle: 'bg-status-campfire/10',
    bgSolid: 'bg-status-campfire/70',
    ring: 'focus-visible:ring-status-campfire',
  },
  completed: {
    border: 'border-status-completed/60',
    borderSubtle: 'border-status-completed/40',
    text: 'text-status-completed',
    bgSubtle: 'bg-status-completed/10',
    bgSolid: 'bg-status-completed/70',
    ring: 'focus-visible:ring-status-completed',
  },
  boss: {
    border: 'border-status-boss/60',
    borderSubtle: 'border-status-boss/40',
    text: 'text-status-boss',
    bgSubtle: 'bg-status-boss/10',
    bgSolid: 'bg-status-boss/70',
    ring: 'focus-visible:ring-status-boss',
  },
  danger: {
    border: 'border-status-danger/60',
    borderSubtle: 'border-status-danger/40',
    text: 'text-status-danger',
    bgSubtle: 'bg-status-danger/10',
    bgSolid: 'bg-status-danger/70',
    ring: 'focus-visible:ring-status-danger',
  },
  neutral: {
    border: 'border-accent-neutral/60',
    borderSubtle: 'border-accent-neutral/40',
    text: 'text-accent-neutral',
    bgSubtle: 'bg-accent-neutral/10',
    bgSolid: 'bg-accent-neutral/70',
    ring: 'focus-visible:ring-accent-neutral',
  },
};

export interface DashboardMiniCardProps {
  kind: 'character' | 'guild';
  illustrationUrl?: string;
  illustrationAlt?: string;
  title?: string;
  subtitle?: string;
  guild?: Pick<Guild, 'name' | 'color' | 'iconUrl' | 'totalPoints'>;
  characterClass?: GameCharacterClass;
  accentToken?: DashboardMiniCardAccent;
  interactive?: boolean;
  faceDown?: boolean;
  ribbonLabel?: string;
  ribbonPosition?: CornerRibbonPosition;
  ribbonClassName?: string;
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
  accentToken,
  interactive = true,
  faceDown = false,
  ribbonLabel,
  ribbonPosition = 'top-right',
  ribbonClassName,
  className,
}: DashboardMiniCardProps) {
  const resolvedIllustrationUrl = illustrationUrl || guild?.iconUrl;
  const resolvedTitle =
    title || guild?.name || (characterClass ? formatCharacterClass(characterClass) : kind);
  const accent = resolveAccentToken(accentToken || guild?.color, characterClass);
  const accentStyles = ACCENT_STYLES[accent];

  return (
    <article
      tabIndex={interactive ? 0 : -1}
      aria-hidden={interactive ? undefined : true}
      aria-label={interactive ? resolvedTitle : undefined}
      className={cn(CARD_SURFACE_CLASS, accentStyles.border, accentStyles.ring, className)}
    >
      <div className={cn('absolute inset-0', accentStyles.bgSubtle)} />
      {ribbonLabel ? (
        <CornerRibbon position={ribbonPosition} size="sm" ribbonClassName={ribbonClassName}>
          {ribbonLabel}
        </CornerRibbon>
      ) : null}
      {faceDown ? (
        <div className={cn(CARD_ART_CLASS, 'p-2')}>
          <div
            className={cn(
              'flex h-full w-full items-center justify-center rounded-[0.75rem] border border-dashed bg-gaming-base/80',
              accentStyles.border,
              accentStyles.text
            )}
          >
            <Shield size={38} aria-hidden />
          </div>
        </div>
      ) : (
        <>
          <div className={CARD_ART_CLASS}>
            {resolvedIllustrationUrl ? (
              <img
                src={resolvedIllustrationUrl}
                alt={illustrationAlt || resolvedTitle}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-110 group-focus-visible:scale-110"
              />
            ) : (
              <div className={cn('flex h-full w-full items-center justify-center', accentStyles.text)}>
                <Shield size={42} aria-hidden />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-gaming-card to-transparent" />
          </div>

          <div className={cn(CARD_FOOTER_CLASS, accentStyles.borderSubtle)}>
            <div className={cn('mx-auto mb-1 h-1 w-8 rounded-full', accentStyles.bgSolid)} />
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

function resolveAccentToken(
  value: string | undefined,
  characterClass?: GameCharacterClass
): DashboardMiniCardAccent {
  if (value && value in ACCENT_STYLES) return value as DashboardMiniCardAccent;
  if (characterClass) return CHARACTER_CLASS_ACCENTS[characterClass];
  return 'quest';
}

export default DashboardMiniCard;
