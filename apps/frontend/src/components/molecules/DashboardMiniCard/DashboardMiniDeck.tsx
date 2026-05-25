import { cn } from '../../../utils/cn';
import { DashboardMiniCard } from './DashboardMiniCard';
import type { DashboardMiniCardProps } from './DashboardMiniCard';

export interface DashboardMiniDeckProps {
  cards: readonly [DashboardMiniCardProps, ...DashboardMiniCardProps[]];
  stackSide?: 'left' | 'right';
  revealedCardCount?: number;
  expandOnHover?: boolean;
  visibleStackCount?: number;
  className?: string;
  cardClassName?: string;
  stackCardClassName?: string;
}

export function DashboardMiniDeck({
  cards,
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
  const stacksOnLeft = stackSide === 'left';

  return (
    <div
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
              'absolute bottom-0 origin-bottom translate-y-0 shadow-xl',
              'transition-transform duration-300',
              stacksOnLeft ? 'right-14' : 'left-14',
              stackDepth === 1 &&
                (stacksOnLeft
                  ? 'z-10 -translate-x-2 rotate-[-7deg] scale-95'
                  : 'z-10 translate-x-2 rotate-[7deg] scale-95'),
              stackDepth === 2 &&
                (stacksOnLeft
                  ? 'z-[9] -translate-x-5 rotate-[-11deg] scale-90'
                  : 'z-[9] translate-x-5 rotate-[11deg] scale-90'),
              stackDepth >= 3 &&
                (stacksOnLeft
                  ? 'z-[8] -translate-x-8 rotate-[-15deg] scale-[0.85]'
                  : 'z-[8] translate-x-8 rotate-[15deg] scale-[0.85]'),
              expandOnHover &&
                stackDepth === 1 &&
                (stacksOnLeft
                  ? 'group-hover:-translate-x-36 group-hover:rotate-0 group-hover:scale-100 group-focus-within:-translate-x-36 group-focus-within:rotate-0 group-focus-within:scale-100'
                  : 'group-hover:translate-x-36 group-hover:rotate-0 group-hover:scale-100 group-focus-within:translate-x-36 group-focus-within:rotate-0 group-focus-within:scale-100'),
              expandOnHover &&
                stackDepth === 2 &&
                (stacksOnLeft
                  ? 'group-hover:-translate-x-64 group-hover:rotate-0 group-hover:scale-100 group-focus-within:-translate-x-64 group-focus-within:rotate-0 group-focus-within:scale-100'
                  : 'group-hover:translate-x-64 group-hover:rotate-0 group-hover:scale-100 group-focus-within:translate-x-64 group-focus-within:rotate-0 group-focus-within:scale-100'),
              expandOnHover &&
                stackDepth >= 3 &&
                (stacksOnLeft
                  ? 'group-hover:-translate-x-[24rem] group-hover:rotate-0 group-hover:scale-100 group-focus-within:-translate-x-[24rem] group-focus-within:rotate-0 group-focus-within:scale-100'
                  : 'group-hover:translate-x-[24rem] group-hover:rotate-0 group-hover:scale-100 group-focus-within:translate-x-[24rem] group-focus-within:rotate-0 group-focus-within:scale-100'),
              stackCardClassName
            )}
          />
        );
      })}

      <DashboardMiniCard
        {...frontCard}
        className={cn(
          'absolute bottom-0 z-20 origin-bottom translate-y-0',
          stacksOnLeft ? 'right-0' : 'left-0',
          cardClassName
        )}
      />
    </div>
  );
}

export default DashboardMiniDeck;
