import { cn } from '../../../utils/cn';
import { DashboardMiniCard } from './DashboardMiniCard';
import type { DashboardMiniCardProps } from './DashboardMiniCard';

export interface DashboardMiniDeckProps {
  cards: readonly [DashboardMiniCardProps, ...DashboardMiniCardProps[]];
  visibleStackCount?: number;
  className?: string;
  cardClassName?: string;
  stackCardClassName?: string;
}

export function DashboardMiniDeck({
  cards,
  visibleStackCount = 3,
  className,
  cardClassName,
  stackCardClassName,
}: DashboardMiniDeckProps) {
  const [frontCard, ...stackCards] = cards;
  const visibleStackCards = stackCards.slice(0, visibleStackCount);

  return (
    <div className={cn('relative h-56 w-56 overflow-visible', className)}>
      {visibleStackCards.map((card, index) => {
        const stackDepth = index + 1;

        return (
          <DashboardMiniCard
            key={`${card.kind}-${card.title || card.guild?.name || card.characterClass || 'card'}-${index}`}
            {...card}
            interactive={false}
            className={cn(
              'absolute bottom-0 left-14 origin-bottom translate-y-0 shadow-xl',
              'transition-transform duration-300',
              stackDepth === 1 && 'z-10 translate-x-2 rotate-[7deg] scale-95',
              stackDepth === 2 && 'z-[9] translate-x-5 rotate-[11deg] scale-90',
              stackDepth >= 3 && 'z-[8] translate-x-8 rotate-[15deg] scale-[0.85]',
              stackCardClassName
            )}
          />
        );
      })}

      <DashboardMiniCard
        {...frontCard}
        className={cn('absolute bottom-0 left-0 z-20 origin-bottom translate-y-0', cardClassName)}
      />
    </div>
  );
}

export default DashboardMiniDeck;
