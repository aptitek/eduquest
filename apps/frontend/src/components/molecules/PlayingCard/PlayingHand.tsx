import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { CardSpread } from '../CardSpread';
import type { CardSpreadShape, CardSpreadSide } from '../CardSpread';
import { cn } from '../../../utils/cn';
import { PlayingCard } from './PlayingCard';
import type { PlayingCardData } from './PlayingCard';

export type PlayingHandMode = 'mini' | 'full';
export type PlayingHandVariant = 'arc' | 'fan' | 'horizontal' | 'vertical';

export interface PlayingHandData {
  id: string;
  title?: string;
  description?: string;
  cards: readonly [PlayingCardData, ...PlayingCardData[]];
  activeCardIndex?: number;
  mainCardIndex?: number;
  variant?: PlayingHandVariant;
}

export interface PlayingHandProps {
  hand: PlayingHandData;
  mode?: PlayingHandMode;
  visibleCardCount?: number;
  variant?: PlayingHandVariant;
  stackSide?: CardSpreadSide;
  expandOnHover?: boolean;
  ariaLabel?: string;
  className?: string;
  cardClassName?: string;
  stackCardClassName?: string;
  mainCardClassName?: string;
  onCardSelect?: (card: PlayingCardData, index: number) => void;
}

export interface PlayingHandPanelProps {
  hand: PlayingHandData;
  id?: string;
  rank?: number;
  badges?: ReactNode;
  ariaLabel?: string;
  className?: string;
  handClassName?: string;
  cardClassName?: string;
}

const MAX_DEFAULT_VISIBLE_CARDS = 5;
const PLAYING_HAND_PANEL_LAYOUT_TRANSITION = { layout: { duration: 0.68, ease: [0.22, 1, 0.36, 1] } };

export function PlayingHand({
  hand,
  mode = 'mini',
  visibleCardCount = mode === 'full' ? hand.cards.length : MAX_DEFAULT_VISIBLE_CARDS,
  variant = hand.variant || (mode === 'full' ? 'fan' : 'horizontal'),
  stackSide = 'right',
  expandOnHover = mode === 'mini',
  ariaLabel = hand.title || 'Playing card hand',
  className,
  cardClassName,
  stackCardClassName,
  mainCardClassName,
  onCardSelect,
}: PlayingHandProps) {
  const visibleCards = hand.cards.slice(0, Math.max(1, visibleCardCount)) as [
    PlayingCardData,
    ...PlayingCardData[],
  ];
  const expanded = mode === 'full';
  const spreadShape = expanded ? 'horizontal' : resolveSpreadShape(variant);

  return (
    <CardSpread
      items={visibleCards}
      shape={spreadShape}
      side={stackSide}
      spacing={expanded ? 'wide' : 'default'}
      emphasisIndex={hand.mainCardIndex || 0}
      activeIndex={hand.activeCardIndex}
      visibleSpreadCount={visibleCards.length}
      expanded={expanded}
      expandOnHover={expandOnHover}
      ariaLabel={ariaLabel}
      className={cn(
        mode === 'full'
          ? 'h-[31rem] min-h-[28rem] w-full max-w-7xl [perspective:1600px]'
          : 'h-56 w-56',
        className
      )}
      emphasisClassName={cn(
        mode === 'full'
          ? 'z-40 w-72 rounded-[1.4rem] duration-500 md:w-80 hover:!z-50 hover:-translate-y-5 hover:scale-[1.03] hover:drop-shadow-2xl focus-within:!z-50 focus-within:-translate-y-5 focus-within:scale-[1.03] focus-within:drop-shadow-2xl'
          : 'duration-300',
        mainCardClassName || cardClassName
      )}
      spreadCardClassName={cn(
        mode === 'full' ? 'w-72 rounded-[1.4rem] duration-500 md:w-80' : 'duration-300',
        hand.mainCardIndex !== undefined && spreadShape === 'arc' && mode === 'full' && 'left-[62%]',
        stackCardClassName || cardClassName
      )}
      renderItem={({ item: card, index, isEmphasis }) => (
        <PlayingCard
          {...card}
          size={mode === 'full' ? 'full' : 'mini'}
          interactive={isEmphasis ? card.interactive : Boolean(onCardSelect)}
          onClick={resolveCardSelectHandler(card, index, isEmphasis, onCardSelect)}
          className={cn(
            card.className,
            mode === 'full' ? 'min-h-0 w-full max-w-none' : 'translate-y-0',
            isEmphasis ? mainCardClassName || cardClassName : stackCardClassName || cardClassName
          )}
          auraClassName={cn(mode === 'full' && isEmphasis && 'shadow-glow-primary')}
        />
      )}
    />
  );
}

export function PlayingHandPanel({
  hand,
  id,
  rank,
  badges,
  ariaLabel = hand.title,
  className,
  handClassName,
  cardClassName,
}: PlayingHandPanelProps) {
  return (
    <motion.section
      layout
      layoutId={`${hand.id}-panel`}
      transition={PLAYING_HAND_PANEL_LAYOUT_TRANSITION}
      id={id}
      aria-label={ariaLabel}
      className={cn(
        'relative overflow-visible rounded-3xl border border-gaming-border bg-gaming-base/40 p-4 shadow-lg',
        className
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        {rank ? (
          <span className="rounded-full bg-status-campfire px-2 py-0.5 text-xs font-black text-gaming-base">
            #{rank}
          </span>
        ) : null}
        {badges}
        {hand.title ? <h4 className="truncate font-display text-lg font-bold">{hand.title}</h4> : null}
      </div>

      <PlayingHand
        hand={hand}
        mode="full"
        visibleCardCount={hand.cards.length}
        expandOnHover={false}
        className={cn('mx-auto h-[28rem] min-h-0 max-w-7xl md:h-[30rem]', handClassName)}
        cardClassName={cn('shadow-glow-primary', cardClassName)}
      />
    </motion.section>
  );
}

function resolveCardSelectHandler(
  card: PlayingCardData,
  index: number,
  isEmphasis: boolean,
  onCardSelect?: (card: PlayingCardData, index: number) => void
) {
  if (onCardSelect) return () => onCardSelect(card, index);
  if (isEmphasis) return card.onClick;
  return undefined;
}

function resolveSpreadShape(variant: PlayingHandVariant): CardSpreadShape {
  if (variant === 'fan') return 'arc';
  return variant;
}

export default PlayingHand;
