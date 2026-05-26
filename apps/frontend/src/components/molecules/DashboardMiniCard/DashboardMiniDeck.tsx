import { cn } from '../../../utils/cn';
import type { CardSpreadSide } from '../CardSpread';
import { PlayingHand } from '../PlayingCard';
import type { PlayingCardData } from '../PlayingCard';

export type DashboardMiniDeckVariant = 'horizontal' | 'vertical';
export type DashboardMiniDeckStackSide = CardSpreadSide;

export interface DashboardMiniDeckProps {
  cards: readonly [PlayingCardData, ...PlayingCardData[]];
  variant?: DashboardMiniDeckVariant;
  stackSide?: DashboardMiniDeckStackSide;
  revealedCardCount?: number;
  expandOnHover?: boolean;
  visibleStackCount?: number;
  className?: string;
  cardClassName?: string;
  stackCardClassName?: string;
  onCardSelect?: (card: PlayingCardData, index: number) => void;
}

export function DashboardMiniDeck({
  cards,
  variant = 'horizontal',
  stackSide = 'right',
  revealedCardCount,
  expandOnHover = false,
  visibleStackCount = 3,
  className,
  cardClassName,
  stackCardClassName,
  onCardSelect,
}: DashboardMiniDeckProps) {
  return (
    <PlayingHand
      hand={{
        id: 'dashboard-mini-deck',
        cards,
        mainCardIndex: 0,
        variant,
      }}
      mode="mini"
      stackSide={stackSide}
      visibleCardCount={revealedCardCount ?? visibleStackCount}
      expandOnHover={expandOnHover}
      className={cn('h-56 w-56', className)}
      cardClassName={cardClassName}
      stackCardClassName={stackCardClassName}
      onCardSelect={onCardSelect}
    />
  );
}

export default DashboardMiniDeck;
