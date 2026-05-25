import type { CSSProperties, ReactNode } from 'react';
import { isValidElement } from 'react';
import { Shield } from 'lucide-react';
import { CornerRibbon } from '../../atoms/CornerRibbon';
import type { CornerRibbonPosition } from '../../atoms/CornerRibbon';
import { cn } from '../../../utils/cn';
import { PlayingCard } from './PlayingCard';
import { RadarGraph } from '../RadarGraph';
import type { RadarGraphAxis, RadarGraphDataset } from '../RadarGraph';

export interface PlayingCardStat {
  id: string;
  label: string;
  value: number;
  max?: number;
}

export interface FullSizePlayingCardSideProps {
  title: string;
  description: string;
  color?: CSSProperties['color'];
  illustrationUrl?: string;
  illustrationAlt?: string;
  illustration?: ReactNode;
  ribbonText?: string;
  ribbonPosition?: CornerRibbonPosition;
  stats?: PlayingCardStat[];
  statsLabel?: string;
  footer?: ReactNode;
  className?: string;
}

export type FullSizePlayingCardBack = ReactNode | FullSizePlayingCardSideProps;

export interface FullSizePlayingCardProps {
  front: FullSizePlayingCardSideProps;
  back?: FullSizePlayingCardBack;
  backSvgUrl?: string;
  backSvgAlt?: string;
  flipLabel?: string;
  className?: string;
  auraClassName?: string;
  sideClassName?: string;
}

type AccentStyle = CSSProperties & {
  '--playing-card-accent': string;
};

const DEFAULT_CARD_COLOR = 'var(--color-status-quest)';

export function FullSizePlayingCard({
  front,
  back,
  backSvgUrl,
  backSvgAlt,
  flipLabel = 'Flip card',
  className,
  auraClassName,
  sideClassName,
}: FullSizePlayingCardProps) {
  return (
    <PlayingCard
      flipLabel={flipLabel}
      recto={<FullSizePlayingCardSide {...front} className={cn(sideClassName, front.className)} />}
      verso={resolveBackContent({ back, backSvgUrl, backSvgAlt, sideClassName })}
      className={cn('aspect-[5/7] min-h-0 w-full max-w-sm', className)}
      innerClassName={cn('min-h-0', auraClassName)}
      faceClassName="overflow-hidden rounded-[1.4rem] border-0 bg-transparent shadow-none"
    />
  );
}

export function FullSizePlayingCardSide({
  title,
  description,
  color = DEFAULT_CARD_COLOR,
  illustrationUrl,
  illustrationAlt,
  illustration,
  ribbonText,
  ribbonPosition = 'top-right',
  stats,
  statsLabel,
  footer,
  className,
}: FullSizePlayingCardSideProps) {
  const accentStyle: AccentStyle = {
    '--playing-card-accent': color,
  };
  const radarGraph = buildRadarGraph(stats, statsLabel || title);

  return (
    <article
      aria-label={title}
      style={accentStyle}
      className={cn(
        'relative flex h-full min-h-0 flex-col overflow-hidden rounded-[1.4rem] border border-[color:var(--playing-card-accent)] bg-gaming-card p-2 shadow-2xl',
        className
      )}
    >
      <div className="absolute inset-0 bg-[color:var(--playing-card-accent)] opacity-10" />
      {ribbonText ? (
        <CornerRibbon position={ribbonPosition} size="md" color={color}>
          {ribbonText}
        </CornerRibbon>
      ) : null}

      <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[1rem] border border-gaming-border bg-gaming-card/95">
        <div className="relative mx-1 mt-1 min-h-0 flex-1 overflow-hidden rounded-[0.9rem] border border-gaming-border bg-gaming-base">
          {illustration ? (
            <div className="h-full w-full">{illustration}</div>
          ) : illustrationUrl ? (
            <img
              src={illustrationUrl}
              alt={illustrationAlt || title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[color:var(--playing-card-accent)]">
              <Shield size={72} aria-hidden />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-gaming-card via-gaming-card/75 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4">
            <h3 className="pr-10 font-display text-xl font-bold leading-tight text-text-primary drop-shadow-lg">
              {title}
            </h3>
            <div className="mt-2 h-1 w-14 rounded-full bg-[color:var(--playing-card-accent)]" />
          </div>
        </div>

        <section className="relative flex max-h-[43%] shrink-0 gap-3 border-t border-gaming-border bg-gaming-card/95 p-4">
          <div className="min-w-0 flex-1 text-left">
            <p className="line-clamp-6 text-sm leading-relaxed text-text-secondary">{description}</p>
            {footer ? <div className="mt-3 text-sm text-text-secondary">{footer}</div> : null}
          </div>

          {radarGraph ? (
            <div className="w-40 shrink-0 self-start rounded-[1rem] border border-gaming-border bg-gaming-base/60 p-1">
              <RadarGraph
                axes={radarGraph.axes}
                datasets={radarGraph.datasets}
                className="mx-auto"
              />
            </div>
          ) : null}
        </section>
      </div>
    </article>
  );
}

function resolveBackContent({
  back,
  backSvgUrl,
  backSvgAlt,
  sideClassName,
}: Pick<FullSizePlayingCardProps, 'back' | 'backSvgUrl' | 'backSvgAlt' | 'sideClassName'>) {
  if (isPlayingCardSideProps(back)) {
    return <FullSizePlayingCardSide {...back} className={cn(sideClassName, back.className)} />;
  }

  if (back) {
    return back;
  }

  return <DefaultPlayingCardBack svgUrl={backSvgUrl} svgAlt={backSvgAlt} className={sideClassName} />;
}

function isPlayingCardSideProps(value: FullSizePlayingCardBack | undefined): value is FullSizePlayingCardSideProps {
  return Boolean(value && typeof value === 'object' && !isValidElement(value) && 'title' in value);
}

function buildRadarGraph(stats: PlayingCardStat[] | undefined, label: string) {
  if (!stats?.length) return null;

  const axes: RadarGraphAxis[] = stats.map((stat) => ({
    id: stat.id,
    label: stat.label,
    max: stat.max,
  }));
  const values = stats.reduce<Record<string, number>>((accumulator, stat) => {
    accumulator[stat.id] = stat.value;
    return accumulator;
  }, {});
  const datasets: RadarGraphDataset[] = [
    {
      id: 'stats',
      label,
      values,
      color: 'var(--playing-card-accent)',
    },
  ];

  return { axes, datasets };
}

interface DefaultPlayingCardBackProps {
  svgUrl?: string;
  svgAlt?: string;
  className?: string;
}

function DefaultPlayingCardBack({ svgUrl, svgAlt = 'Card back', className }: DefaultPlayingCardBackProps) {
  return (
    <div
      className={cn(
        'relative flex h-full min-h-0 items-center justify-center overflow-hidden rounded-[1.4rem] border border-gaming-border bg-gaming-card p-2 shadow-2xl',
        className
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--color-status-quest)_0,transparent_62%)] opacity-20" />
      <div className="relative flex h-full w-full items-center justify-center rounded-[1rem] border border-gaming-border bg-gaming-base/90 p-4">
        {svgUrl ? (
          <img src={svgUrl} alt={svgAlt} className="h-full max-h-full w-auto max-w-full object-contain" />
        ) : (
          <svg viewBox="0 0 160 224" role="img" aria-label={svgAlt} className="h-full max-h-full w-auto max-w-full">
            <rect x="10" y="10" width="140" height="204" rx="18" className="fill-gaming-base stroke-gaming-border" />
            <path
              d="M80 44 115 64v40c0 32-15 55-35 72-20-17-35-40-35-72V64l35-20Z"
              className="fill-status-quest/20 stroke-status-quest"
              strokeWidth="4"
            />
            <path
              d="M80 70 98 81v24c0 16-7 29-18 40-11-11-18-24-18-40V81l18-11Z"
              className="fill-status-campfire/30 stroke-status-campfire"
              strokeWidth="3"
            />
            <path d="M35 36h24M101 188h24" className="stroke-text-muted" strokeLinecap="round" strokeWidth="4" />
          </svg>
        )}
      </div>
    </div>
  );
}

export default FullSizePlayingCard;
