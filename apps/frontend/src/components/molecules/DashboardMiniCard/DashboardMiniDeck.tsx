import { cn } from '../../../utils/cn';
import { DashboardMiniCard } from './DashboardMiniCard';
import type { DashboardMiniCardProps } from './DashboardMiniCard';

export interface DashboardMiniDeckProps {
  cards: readonly [DashboardMiniCardProps, ...DashboardMiniCardProps[]];
  variant?: 'horizontal' | 'vertical';
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
  const stacksOnLeft = stackSide === 'left';
  const stacksVertically = variant === 'vertical';

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
              stacksVertically ? 'left-0' : stacksOnLeft ? 'right-14' : 'left-14',
              stacksVertically &&
                stackDepth === 1 &&
                'z-10 -translate-y-14 rotate-[-4deg] scale-95',
              stacksVertically &&
                stackDepth === 2 &&
                'z-[9] -translate-y-24 rotate-[4deg] scale-90',
              stacksVertically &&
                stackDepth >= 3 &&
                'z-[8] -translate-y-32 rotate-[-8deg] scale-[0.85]',
              !stacksVertically &&
                stackDepth === 1 &&
                (stacksOnLeft
                  ? 'z-10 -translate-x-2 rotate-[-7deg] scale-95'
                  : 'z-10 translate-x-2 rotate-[7deg] scale-95'),
              !stacksVertically &&
                stackDepth === 2 &&
                (stacksOnLeft
                  ? 'z-[9] -translate-x-5 rotate-[-11deg] scale-90'
                  : 'z-[9] translate-x-5 rotate-[11deg] scale-90'),
              !stacksVertically &&
                stackDepth >= 3 &&
                (stacksOnLeft
                  ? 'z-[8] -translate-x-8 rotate-[-15deg] scale-[0.85]'
                  : 'z-[8] translate-x-8 rotate-[15deg] scale-[0.85]'),
              !stacksVertically &&
                expandOnHover &&
                stackDepth === 1 &&
                (stacksOnLeft
                  ? 'group-hover:-translate-x-16 group-hover:rotate-[-4deg] group-hover:scale-100 group-focus-within:-translate-x-16 group-focus-within:rotate-[-4deg] group-focus-within:scale-100'
                  : 'group-hover:translate-x-20 group-hover:rotate-[4deg] group-hover:scale-100 group-focus-within:translate-x-20 group-focus-within:rotate-[4deg] group-focus-within:scale-100'),
              !stacksVertically &&
                expandOnHover &&
                stackDepth === 2 &&
                (stacksOnLeft
                  ? 'group-hover:-translate-x-28 group-hover:rotate-[-8deg] group-hover:scale-95 group-focus-within:-translate-x-28 group-focus-within:rotate-[-8deg] group-focus-within:scale-95'
                  : 'group-hover:translate-x-36 group-hover:rotate-[8deg] group-hover:scale-95 group-focus-within:translate-x-36 group-focus-within:rotate-[8deg] group-focus-within:scale-95'),
              !stacksVertically &&
                expandOnHover &&
                stackDepth >= 3 &&
                (stacksOnLeft
                  ? 'group-hover:-translate-x-40 group-hover:rotate-[-12deg] group-hover:scale-90 group-focus-within:-translate-x-40 group-focus-within:rotate-[-12deg] group-focus-within:scale-90'
                  : 'group-hover:translate-x-52 group-hover:rotate-[12deg] group-hover:scale-90 group-focus-within:translate-x-52 group-focus-within:rotate-[12deg] group-focus-within:scale-90'),
              !stacksVertically &&
                expandOnHover &&
                stackDepth === 1 &&
                (stacksOnLeft
                  ? 'hover:!z-40 hover:!-translate-x-24 hover:!rotate-[-2deg] hover:!scale-105'
                  : 'hover:!z-40 hover:!translate-x-28 hover:!rotate-[2deg] hover:!scale-105'),
              !stacksVertically &&
                expandOnHover &&
                stackDepth === 2 &&
                (stacksOnLeft
                  ? 'hover:!z-40 hover:!-translate-x-36 hover:!rotate-[-4deg] hover:!scale-105'
                  : 'hover:!z-40 hover:!translate-x-44 hover:!rotate-[4deg] hover:!scale-105'),
              !stacksVertically &&
                expandOnHover &&
                stackDepth >= 3 &&
                (stacksOnLeft
                  ? 'hover:!z-40 hover:!-translate-x-48 hover:!rotate-[-6deg] hover:!scale-105'
                  : 'hover:!z-40 hover:!translate-x-60 hover:!rotate-[6deg] hover:!scale-105'),
              stackCardClassName
            )}
          />
        );
      })}

      <DashboardMiniCard
        {...frontCard}
        className={cn(
          'absolute bottom-0 z-30 origin-bottom translate-y-0',
          stacksVertically ? 'left-0' : stacksOnLeft ? 'right-0' : 'left-0',
          expandOnHover &&
            'group-hover:scale-110 group-focus-within:scale-110 group-hover:-translate-y-2 group-focus-within:-translate-y-2',
          cardClassName
        )}
      />
    </div>
  );
}

export default DashboardMiniDeck;
