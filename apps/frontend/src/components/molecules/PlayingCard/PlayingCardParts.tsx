import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { EditableText } from '../../atoms/EditableText';
import { CornerRibbon } from '../../atoms/CornerRibbon';
import type { CornerRibbonPosition } from '../../atoms/CornerRibbon';
import { RadarGraph } from '../RadarGraph';
import type { RadarGraphAxis, RadarGraphDataset } from '../RadarGraph';
import { cn } from '../../../utils/cn';
import { useTranslation } from '../../../hooks/useTranslation';

export const PLAYING_CARD_TRANSITION = {
  layout: { duration: 0.68, ease: [0.22, 1, 0.36, 1] },
};

export interface PlayingCardIllustrationProps {
  title: string;
  illustrationUrl?: string;
  illustrationAlt?: string;
  illustration?: ReactNode;
  iconSize: number;
  layoutId?: string;
}

export function PlayingCardIllustration({
  title,
  illustrationUrl,
  illustrationAlt,
  illustration,
  iconSize,
  layoutId,
}: PlayingCardIllustrationProps) {
  if (illustration) {
    return (
      <motion.div layoutId={layoutId} transition={PLAYING_CARD_TRANSITION} className="h-full w-full">
        {illustration}
      </motion.div>
    );
  }

  if (illustrationUrl) {
    return (
      <motion.img
        layoutId={layoutId}
        transition={PLAYING_CARD_TRANSITION}
        src={illustrationUrl}
        alt={illustrationAlt || title}
        className="h-full w-full object-cover object-center transition duration-300 group-hover:scale-110 group-focus-visible:scale-110"
      />
    );
  }

  return (
    <motion.div
      layoutId={layoutId}
      transition={PLAYING_CARD_TRANSITION}
      className="flex h-full w-full items-center justify-center text-[color:var(--playing-card-accent)]"
    >
      <Shield size={iconSize} aria-hidden />
    </motion.div>
  );
}

export interface PlayingCardArtFrameProps {
  children: ReactNode;
  size: 'mini' | 'full';
  layoutId?: string;
  className?: string;
  gradientClassName?: string;
}

export function PlayingCardArtFrame({
  children,
  size,
  layoutId,
  className,
  gradientClassName,
}: PlayingCardArtFrameProps) {
  return (
    <motion.div
      layoutId={layoutId}
      transition={PLAYING_CARD_TRANSITION}
      className={cn(
        'overflow-hidden border border-gaming-border bg-gaming-base',
        size === 'full'
          ? 'relative mx-1 mt-1 min-h-0 flex-1 rounded-[0.9rem]'
          : 'absolute inset-x-3 bottom-12 top-3 rounded-[1rem]',
        className
      )}
    >
      {children}
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-gaming-card to-transparent',
          size === 'full' ? 'h-32 via-gaming-card/75' : 'h-16',
          gradientClassName
        )}
      />
    </motion.div>
  );
}

export interface PlayingCardTitleBlockProps {
  title: string;
  subtitle?: string;
  size: 'mini' | 'full';
  layoutId?: string;
  editable?: boolean;
  onTitleChange?: (title: string) => void;
  className?: string;
}

export function PlayingCardTitleBlock({
  title,
  subtitle,
  size,
  layoutId,
  editable,
  onTitleChange,
  className,
}: PlayingCardTitleBlockProps) {
  const { t } = useTranslation();

  if (size === 'full') {
    return (
      <motion.div
        layoutId={layoutId}
        transition={PLAYING_CARD_TRANSITION}
        className={cn('pointer-events-none absolute inset-x-0 bottom-0 z-20 p-4', className)}
      >
        <h3
          className={cn(
            'pr-10 font-display text-xl font-bold leading-tight text-text-primary drop-shadow-lg',
            editable && 'pointer-events-auto'
          )}
        >
          {editable && onTitleChange ? (
            <EditableText
              value={title}
              onChange={onTitleChange}
              placeholder={t('playingCard.placeholders.title')}
              className="font-display text-xl font-bold leading-tight text-text-primary drop-shadow-lg"
              truncate={false}
            />
          ) : (
            title
          )}
        </h3>
        <div className="mt-2 h-1 w-14 rounded-full bg-[color:var(--playing-card-accent)]" />
      </motion.div>
    );
  }

  return (
    <motion.div
      layoutId={layoutId}
      transition={PLAYING_CARD_TRANSITION}
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-0 z-20 border-t border-[color:var(--playing-card-accent)] bg-gaming-card/95 px-3 py-2 transition duration-300 group-hover:translate-y-0 group-focus-visible:translate-y-0',
        className
      )}
    >
      <div className="mx-auto mb-1 h-1 w-8 rounded-full bg-[color:var(--playing-card-accent)]" />
      <h3 className="truncate text-center font-display text-sm font-bold text-text-primary">{title}</h3>
      {subtitle ? (
        <p className="mt-0.5 truncate text-center text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-text-muted opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
          {subtitle}
        </p>
      ) : null}
    </motion.div>
  );
}

export interface PlayingCardRibbonProps {
  children?: ReactNode;
  icon?: ReactNode;
  size: 'sm' | 'md';
  color: string;
  position?: CornerRibbonPosition;
  ribbonClassName?: string;
  layoutId?: string;
  onClick?: () => void;
  ariaLabel?: string;
}

export function PlayingCardRibbon({
  children,
  icon,
  size,
  color,
  position = 'top-right',
  ribbonClassName,
  layoutId,
  onClick,
  ariaLabel,
}: PlayingCardRibbonProps) {
  return (
    <motion.div layoutId={layoutId} transition={PLAYING_CARD_TRANSITION} className="contents">
      <CornerRibbon
        icon={icon}
        position={position}
        size={size}
        color={color}
        ribbonClassName={ribbonClassName}
        onClick={onClick}
        ariaLabel={ariaLabel}
      >
        {children}
      </CornerRibbon>
    </motion.div>
  );
}

export interface PlayingCardStatPanelProps {
  axes: RadarGraphAxis[];
  datasets: RadarGraphDataset[];
  layoutId?: string;
  editable?: boolean;
  onValueChange?: (axisId: string, value: number) => void;
}

export function PlayingCardStatPanel({
  axes,
  datasets,
  layoutId,
  editable,
  onValueChange,
}: PlayingCardStatPanelProps) {
  return (
    <motion.div
      layoutId={layoutId}
      transition={PLAYING_CARD_TRANSITION}
      className="w-40 shrink-0 self-start rounded-[1rem] border border-gaming-border bg-gaming-base/60 p-1"
    >
      <RadarGraph
        axes={axes}
        datasets={datasets}
        editable={editable}
        onValueChange={onValueChange}
        className="mx-auto"
      />
    </motion.div>
  );
}
