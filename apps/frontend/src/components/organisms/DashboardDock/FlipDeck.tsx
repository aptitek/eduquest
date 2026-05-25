import { Gift, Trophy } from 'lucide-react';
import { DashboardMiniDeck } from '../../molecules/DashboardMiniCard';
import type { DashboardMiniDeckProps } from '../../molecules/DashboardMiniCard';
import type { DashboardMiniCardProps } from '../../molecules/DashboardMiniCard';

type DeckCards = readonly [DashboardMiniCardProps, ...DashboardMiniCardProps[]];

export interface FlipDeckProps extends Omit<DashboardMiniDeckProps, 'cards'> {
  frontCards: DeckCards;
  backCards: DeckCards;
  flipped: boolean;
  onFlip: () => void;
  frontLabel: string;
  backLabel: string;
}

export function FlipDeck({
  frontCards,
  backCards,
  flipped,
  onFlip,
  frontLabel,
  backLabel,
  ...deckProps
}: FlipDeckProps) {
  return (
    <div className="relative shrink-0 overflow-visible">
      <DashboardMiniDeck cards={flipped ? backCards : frontCards} {...deckProps} />
      <button
        type="button"
        aria-pressed={flipped}
        aria-label={flipped ? frontLabel : backLabel}
        onClick={onFlip}
        className="absolute bottom-[-0.35rem] right-[-1.85rem] z-20 flex h-12 w-12 items-center justify-center rounded-full border border-solarized-yellow/60 bg-gaming-card text-solarized-yellow shadow-xl transition hover:translate-x-1 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-solarized-yellow"
      >
        {flipped ? <Trophy size={18} aria-hidden /> : <Gift size={18} aria-hidden />}
      </button>
    </div>
  );
}
