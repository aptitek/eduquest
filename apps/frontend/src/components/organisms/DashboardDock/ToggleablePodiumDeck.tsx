import { Gift, Trophy } from 'lucide-react';
import { DashboardMiniDeck } from '../../molecules/DashboardMiniCard';
import type { DashboardMiniCardProps } from '../../molecules/DashboardMiniCard';

export interface ToggleablePodiumDeckProps {
  cards: readonly [DashboardMiniCardProps, ...DashboardMiniCardProps[]];
  showBonusCards: boolean;
  onToggle: () => void;
  variant?: 'horizontal' | 'vertical';
  stackSide: 'left' | 'right';
  revealedCardCount: number;
  expandOnHover?: boolean;
  className?: string;
  cardClassName?: string;
  stackCardClassName?: string;
}

export function ToggleablePodiumDeck({
  cards,
  showBonusCards,
  onToggle,
  variant = 'horizontal',
  stackSide,
  revealedCardCount,
  expandOnHover,
  className,
  cardClassName,
  stackCardClassName,
}: ToggleablePodiumDeckProps) {
  return (
    <div className="relative shrink-0 overflow-visible">
      <DashboardMiniDeck
        cards={cards}
        variant={variant}
        stackSide={stackSide}
        revealedCardCount={revealedCardCount}
        expandOnHover={expandOnHover}
        className={className}
        cardClassName={cardClassName}
        stackCardClassName={stackCardClassName}
      />
      <button
        type="button"
        aria-pressed={showBonusCards}
        aria-label={showBonusCards ? 'Show podium cards' : 'Show bonus cards'}
        onClick={onToggle}
        className="absolute bottom-[-0.35rem] right-[-1.85rem] z-20 flex h-12 w-12 items-center justify-center rounded-full border border-solarized-yellow/60 bg-gaming-card text-solarized-yellow shadow-xl transition hover:translate-x-1 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-solarized-yellow"
      >
        {showBonusCards ? <Trophy size={18} aria-hidden /> : <Gift size={18} aria-hidden />}
      </button>
    </div>
  );
}
