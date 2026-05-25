import { cn } from '../../../utils/cn';
import { DashboardMiniCard } from './DashboardMiniCard';
import type { DashboardMiniCardProps } from './DashboardMiniCard';
import {
  getFrontCardClassName,
  getStackCardClassName,
  type DashboardMiniDeckStackSide,
  type DashboardMiniDeckVariant,
} from './dashboardMiniDeckLayout';

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
}: DashboardMiniDeckProps) {
  const [frontCard, ...stackCards] = cards;
  const visibleStackCards = stackCards.slice(0, revealedCardCount ?? visibleStackCount);

  return (
    <div
      tabIndex={expandOnHover ? 0 : undefined}
      className={cn(
        'relative h-56 w-56 overflow-visible',
        expandOnHover && 'group transition-[width] duration-300',
        className
      )}
    >
      {visibleStackCards.map((card, index) => {
        const stackDepth = index + 1;

        return (
          <DashboardMiniCard
            key={`${card.kind}-${card.title || card.guild?.name || card.characterClass || 'card'}-${index}`}
            {...card}
            interactive={false}
            className={cn(
              getStackCardClassName({
                depth: stackDepth,
                variant,
                stackSide,
                expandOnHover,
              }),
              stackCardClassName
            )}
          />
        );
      })}

      <DashboardMiniCard
        {...frontCard}
        className={cn(getFrontCardClassName({ variant, stackSide, expandOnHover }), cardClassName)}
      />
    </div>
  );
}

export default DashboardMiniDeck;
