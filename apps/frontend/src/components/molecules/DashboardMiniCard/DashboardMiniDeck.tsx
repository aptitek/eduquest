import { cn } from '../../../utils/cn';
import { CardSpread } from '../CardSpread';
import type { CardSpreadSide } from '../CardSpread';
import { DashboardMiniCard } from './DashboardMiniCard';
import type { DashboardMiniCardProps } from './DashboardMiniCard';

export type DashboardMiniDeckVariant = 'horizontal' | 'vertical';
export type DashboardMiniDeckStackSide = CardSpreadSide;

export interface DashboardMiniDeckProps {
  cards: readonly [DashboardMiniCardProps, ...DashboardMiniCardProps[]];
  variant?: DashboardMiniDeckVariant;
  stackSide?: DashboardMiniDeckStackSide;
  revealedCardCount?: number;
  expandOnHover?: boolean;
  visibleStackCount?: number;
  className?: string;
  cardClassName?: string;
  stackCardClassName?: string;
  onCardSelect?: (card: DashboardMiniCardProps, index: number) => void;
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
    <CardSpread
      items={cards}
      shape={variant}
      side={stackSide}
      visibleSpreadCount={revealedCardCount ?? visibleStackCount}
      emphasisIndex={0}
      expandOnHover={expandOnHover}
      className={cn('h-56 w-56', className)}
      renderItem={({ item: card, index, isEmphasis }) => {
        return (
          <DashboardMiniCard
            {...card}
            interactive={isEmphasis ? card.interactive : Boolean(onCardSelect)}
            onClick={isEmphasis ? (onCardSelect ? () => onCardSelect(card, 0) : card.onClick) : onCardSelect ? () => onCardSelect(card, index) : undefined}
            className={cn(card.className, 'translate-y-0', isEmphasis ? cardClassName : stackCardClassName)}
          />
        );
      }}
    />
  );
}

export default DashboardMiniDeck;
