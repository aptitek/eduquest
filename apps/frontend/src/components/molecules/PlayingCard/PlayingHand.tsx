import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { StackLayout } from '../StackLayout';
import type { StackLayoutOrder, StackLayoutOrientation, StackLayoutSide } from '../StackLayout';
import { cn } from '../../../utils/cn';
import { PlayingCard } from './PlayingCard';
import type { PlayingCardData } from './PlayingCard';
import type { PlayingCardPresentation } from './types';

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
  stackSide?: StackLayoutSide;
  arcRadius?: number;
  messiness?: number;
  order?: StackLayoutOrder;
  expandOnHover?: boolean;
  ariaLabel?: string;
  className?: string;
  cardClassName?: string;
  stackCardClassName?: string;
  mainCardClassName?: string;
  cardPresentation?: PlayingCardPresentation;
  stackCardPresentation?: PlayingCardPresentation;
  mainCardPresentation?: PlayingCardPresentation;
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
  cardPresentation?: PlayingCardPresentation;
  onCardSelect?: (card: PlayingCardData, index: number) => void;
}

const MAX_DEFAULT_VISIBLE_CARDS = 5;
const PLAYING_HAND_PANEL_LAYOUT_TRANSITION = { layout: { duration: 0.68, ease: [0.22, 1, 0.36, 1] } };

export function PlayingHand({
  hand,
  mode = 'mini',
  visibleCardCount = mode === 'full' ? hand.cards.length : MAX_DEFAULT_VISIBLE_CARDS,
  variant = hand.variant || (mode === 'full' ? 'fan' : 'horizontal'),
  stackSide = 'right',
  arcRadius,
  messiness = 0,
  order,
  expandOnHover = mode === 'mini',
  ariaLabel = hand.title || 'Playing card hand',
  className,
  cardClassName,
  stackCardClassName,
  mainCardClassName,
  cardPresentation,
  stackCardPresentation,
  mainCardPresentation,
  onCardSelect,
}: PlayingHandProps) {
  const visibleCards = hand.cards.slice(0, Math.max(1, visibleCardCount)) as [
    PlayingCardData,
    ...PlayingCardData[],
  ];
  const expanded = mode === 'full';
  const stackOrientation = resolveStackOrientation(variant);
  const resolvedArcRadius = arcRadius ?? (!expanded && (variant === 'arc' || variant === 'fan') ? 1 : 0);

  return (
    <StackLayout
      items={visibleCards}
      orientation={expanded ? 'horizontal' : stackOrientation}
      side={stackSide}
      order={order}
      arcRadius={resolvedArcRadius}
      messiness={messiness}
      spacing={expanded ? 'wide' : 'default'}
      emphasisIndex={hand.mainCardIndex || 0}
      activeIndex={hand.activeCardIndex}
      visibleStackCount={visibleCards.length}
      expanded={expanded}
      expandOnHover={expandOnHover}
      deferHoverForeground={mode === 'mini'}
      ariaLabel={ariaLabel}
      className={cn(
        mode === 'full'
          ? 'h-[31rem] min-h-[28rem] w-full max-w-7xl [perspective:1600px]'
          : 'h-56 w-56',
        className
      )}
      emphasisClassName={cn(
        mode === 'full' ? 'z-40 rounded-[1.4rem] duration-500' : 'duration-500',
        mainCardClassName
      )}
      stackItemClassName={cn(
        mode === 'full' ? 'rounded-[1.4rem] duration-500' : 'duration-500',
        stackCardClassName
      )}
      renderItem={({ item: card, index, isEmphasis }) => (
        <PlayingCard
          {...card}
          size={mode === 'full' ? 'full' : 'mini'}
          presentation={resolveHandCardPresentation({
            mode,
            isEmphasis,
            cardPresentation,
            mainCardPresentation,
            stackCardPresentation,
          })}
          interactive={isEmphasis ? card.interactive : Boolean(onCardSelect)}
          onClick={resolveCardSelectHandler(card, index, isEmphasis, onCardSelect)}
          className={cn(
            card.className,
            mode === 'full' ? 'min-h-0' : undefined,
            isEmphasis ? mainCardClassName || cardClassName : stackCardClassName || cardClassName
          )}
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
  cardPresentation,
  onCardSelect,
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
        cardClassName={cardClassName}
        cardPresentation={cardPresentation || { emphasis: 'glow' }}
        onCardSelect={onCardSelect}
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

function resolveStackOrientation(variant: PlayingHandVariant): StackLayoutOrientation {
  if (variant === 'vertical') return 'vertical';
  return 'horizontal';
}

function resolveHandCardPresentation({
  mode,
  isEmphasis,
  cardPresentation,
  mainCardPresentation,
  stackCardPresentation,
}: {
  mode: PlayingHandMode;
  isEmphasis: boolean;
  cardPresentation?: PlayingCardPresentation;
  mainCardPresentation?: PlayingCardPresentation;
  stackCardPresentation?: PlayingCardPresentation;
}): PlayingCardPresentation {
  const base: PlayingCardPresentation =
    mode === 'full'
      ? { width: 'handFull', emphasis: isEmphasis ? 'handEmphasis' : 'handStack' }
      : { emphasis: 'dockHover' };
  const itemPresentation = isEmphasis ? mainCardPresentation : stackCardPresentation;

  return {
    ...base,
    ...cardPresentation,
    ...itemPresentation,
  };
}

export default PlayingHand;
