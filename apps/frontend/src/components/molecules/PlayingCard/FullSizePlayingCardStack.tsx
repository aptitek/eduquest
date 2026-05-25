import { cn } from '../../../utils/cn';
import { CardSpread } from '../CardSpread';
import type { CardSpreadShape } from '../CardSpread';
import { FullSizePlayingCard } from './FullSizePlayingCard';
import type { FullSizePlayingCardProps } from './FullSizePlayingCard';

export type FullSizePlayingCardStackVariant = 'arc' | 'fan' | 'horizontal' | 'vertical';

export interface FullSizePlayingCardStackItem extends FullSizePlayingCardProps {
  id?: string;
}

export interface FullSizePlayingCardStackProps {
  cards: readonly [FullSizePlayingCardStackItem, ...FullSizePlayingCardStackItem[]];
  variant?: FullSizePlayingCardStackVariant;
  visibleCardCount?: number;
  expanded?: boolean;
  expandOnHover?: boolean;
  activeCardIndex?: number;
  mainCardIndex?: number;
  ariaLabel?: string;
  className?: string;
  cardClassName?: string;
  mainCardClassName?: string;
}

const MAX_DEFAULT_VISIBLE_CARDS = 5;

export function FullSizePlayingCardStack({
  cards,
  variant = 'fan',
  visibleCardCount = MAX_DEFAULT_VISIBLE_CARDS,
  expanded = false,
  expandOnHover = true,
  activeCardIndex,
  mainCardIndex,
  ariaLabel = 'Playing card hand',
  className,
  cardClassName,
  mainCardClassName,
}: FullSizePlayingCardStackProps) {
  const visibleCards = cards.slice(0, Math.max(1, visibleCardCount));
  const spreadShape = resolveSpreadShape(variant);

  return (
    <CardSpread
      items={visibleCards as [FullSizePlayingCardStackItem, ...FullSizePlayingCardStackItem[]]}
      shape={spreadShape}
      emphasisIndex={mainCardIndex}
      activeIndex={activeCardIndex}
      visibleSpreadCount={visibleCards.length}
      expanded={expanded}
      expandOnHover={expandOnHover}
      ariaLabel={ariaLabel}
      className={cn(
        'h-[31rem] min-h-[28rem] w-full max-w-7xl [perspective:1600px]',
        className
      )}
      emphasisClassName={cn(
        'z-40 w-72 rounded-[1.4rem] duration-500 md:w-80',
        'hover:!z-50 hover:-translate-y-5 hover:scale-[1.03] hover:drop-shadow-2xl focus-within:!z-50 focus-within:-translate-y-5 focus-within:scale-[1.03] focus-within:drop-shadow-2xl',
        mainCardClassName
      )}
      spreadCardClassName={cn(
        'w-72 rounded-[1.4rem] duration-500 md:w-80',
        mainCardIndex !== undefined && spreadShape === 'arc' && 'left-[62%]',
      )}
      activeCardClassName="drop-shadow-2xl ring-2 ring-status-campfire ring-offset-4 ring-offset-gaming-base"
      renderItem={({ item: card, isEmphasis }) => (
        <FullSizePlayingCard
          {...card}
          className={cn('min-h-0 w-full max-w-none', card.className, cardClassName, isEmphasis && 'shadow-glow-primary')}
        />
      )}
    />
  );
}

function resolveSpreadShape(variant: FullSizePlayingCardStackVariant): CardSpreadShape {
  if (variant === 'fan') return 'arc';
  return variant;
}

export default FullSizePlayingCardStack;
