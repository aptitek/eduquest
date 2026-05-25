import type { CSSProperties } from 'react';
import { cn } from '../../../utils/cn';
import { DashboardMiniCard } from './DashboardMiniCard';
import type { DashboardMiniCardProps } from './DashboardMiniCard';

type PodiumPlacement = 'first' | 'second' | 'third';

export interface DashboardMiniPodiumProps {
  cards: readonly [DashboardMiniCardProps, DashboardMiniCardProps, DashboardMiniCardProps];
  className?: string;
  cardClassName?: string;
}

export function DashboardMiniPodium({ cards, className, cardClassName }: DashboardMiniPodiumProps) {
  const maxSpentPoints = Math.max(...cards.map(getSpentPoints), 1);
  const podiumItems = [
    { card: cards[1], placement: 'second' },
    { card: cards[0], placement: 'first' },
    { card: cards[2], placement: 'third' },
  ] as const;

  return (
    <div
      className={cn('grid w-full max-w-xl grid-cols-3 items-end gap-0 overflow-visible', className)}
    >
      {podiumItems.map(({ card, placement }) => {
        const style = getPodiumCardStyle(card, placement, maxSpentPoints);

        return (
          <div
            key={`${placement}-${card.title || card.guild?.name || card.characterClass || 'card'}`}
            className={cn(
              'flex min-w-0 items-end justify-center overflow-visible',
              placement === 'first' && 'z-30 -mx-4',
              placement === 'second' && 'z-20 -mr-3',
              placement === 'third' && 'z-10 -ml-3'
            )}
          >
            <DashboardMiniCard
              {...card}
              style={style}
              className={cn('w-full origin-bottom translate-y-0', cardClassName)}
            />
          </div>
        );
      })}
    </div>
  );
}

function getSpentPoints(card: DashboardMiniCardProps) {
  return card.guild?.totalPoints || 0;
}

function getPodiumCardStyle(
  card: DashboardMiniCardProps,
  placement: PodiumPlacement,
  maxSpentPoints: number
): CSSProperties {
  const spentRatio = getSpentPoints(card) > 0 ? getSpentPoints(card) / maxSpentPoints : 0;
  const fallbackRatio = placement === 'first' ? 1 : placement === 'second' ? 0.68 : 0.48;
  const ratio = Math.max(spentRatio, fallbackRatio);
  const rankBonus = placement === 'first' ? 1.75 : placement === 'second' ? 0.65 : 0;

  return {
    width: `${8.75 + ratio * 2.75 + rankBonus}rem`,
  };
}

export default DashboardMiniPodium;
