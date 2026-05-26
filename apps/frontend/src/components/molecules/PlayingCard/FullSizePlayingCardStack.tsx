import { PlayingHand } from './PlayingHand';
import type { PlayingHandVariant } from './PlayingHand';
import type { PlayingCardData } from './PlayingCard';
import type { FullSizePlayingCardProps } from './FullSizePlayingCard';

export type FullSizePlayingCardStackVariant = PlayingHandVariant;

export interface FullSizePlayingCardStackItem extends PlayingCardData, FullSizePlayingCardProps {
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
  return (
    <PlayingHand
      hand={{
        id: ariaLabel,
        cards,
        activeCardIndex,
        mainCardIndex,
        variant,
      }}
      mode={expanded ? 'full' : 'mini'}
      visibleCardCount={Math.max(1, visibleCardCount || MAX_DEFAULT_VISIBLE_CARDS)}
      expandOnHover={expandOnHover}
      ariaLabel={ariaLabel}
      className={className}
      cardClassName={cardClassName}
      mainCardClassName={mainCardClassName}
    />
  );
}

export default FullSizePlayingCardStack;
