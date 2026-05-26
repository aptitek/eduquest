import { Gift, Trophy } from 'lucide-react';
import { DashboardMiniDeck } from '../../molecules/DashboardMiniCard';
import type { DashboardMiniDeckProps } from '../../molecules/DashboardMiniCard';
import type { PlayingCardData } from '../../molecules/PlayingCard';
import { cn } from '../../../utils/cn';

type DeckCards = readonly [PlayingCardData, ...PlayingCardData[]];

export interface FlipDeckProps extends Omit<DashboardMiniDeckProps, 'cards'> {
  frontCards: DeckCards;
  backCards: DeckCards;
  flipped: boolean;
  onFlip: () => void;
  frontLabel: string;
  backLabel: string;
  wrapperClassName?: string;
}

export function FlipDeck({
  frontCards,
  backCards,
  flipped,
  onFlip,
  frontLabel,
  backLabel,
  wrapperClassName,
  ...deckProps
}: FlipDeckProps) {
  return (
    <div className={cn('relative shrink-0 overflow-visible', wrapperClassName)}>
      <DashboardMiniDeck cards={flipped ? backCards : frontCards} {...deckProps} />
      <button
        type="button"
        aria-pressed={flipped}
        aria-label={flipped ? frontLabel : backLabel}
        onClick={onFlip}
        className="absolute bottom-[-0.1rem] right-[-2.65rem] z-40 flex h-12 w-12 items-center justify-center rounded-full border border-status-campfire/60 bg-gaming-card text-status-campfire shadow-xl transition hover:translate-x-1 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-status-campfire"
      >
        {flipped ? <Trophy size={18} aria-hidden /> : <Gift size={18} aria-hidden />}
      </button>
    </div>
  );
}
