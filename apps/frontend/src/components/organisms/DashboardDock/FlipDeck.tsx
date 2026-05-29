import { Gift, Trophy } from 'lucide-react';
import { PlayingHand } from '../../molecules/PlayingCard';
import type { PlayingCardData, PlayingHandMode, PlayingHandVariant } from '../../molecules/PlayingCard';
import type { StackLayoutSide } from '../../molecules/StackLayout';
import { cn } from '../../../utils/cn';

type DeckCards = readonly [PlayingCardData, ...PlayingCardData[]];

export interface FlipDeckProps {
  frontCards: DeckCards;
  backCards: DeckCards;
  flipped: boolean;
  onFlip: () => void;
  frontLabel: string;
  backLabel: string;
  variant?: 'horizontal' | 'vertical';
  stackSide?: StackLayoutSide;
  revealedCardCount?: number;
  expandOnHover?: boolean;
  visibleStackCount?: number;
  mode?: PlayingHandMode;
  className?: string;
  cardClassName?: string;
  stackCardClassName?: string;
  onCardSelect?: (card: PlayingCardData, index: number) => void;
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
  variant = 'horizontal',
  stackSide = 'right',
  revealedCardCount,
  expandOnHover = false,
  visibleStackCount = 3,
  mode = 'mini',
  className,
  cardClassName,
  stackCardClassName,
  onCardSelect,
}: FlipDeckProps) {
  const cards = flipped ? backCards : frontCards;

  return (
    <div className={cn('relative shrink-0 overflow-visible', wrapperClassName)}>
      <PlayingHand
        hand={{
          id: 'dashboard-flip-deck',
          cards,
          mainCardIndex: 0,
          variant: variant as PlayingHandVariant,
        }}
        mode={mode}
        stackSide={stackSide}
        visibleCardCount={revealedCardCount ?? visibleStackCount}
        expandOnHover={expandOnHover}
        className={cn('h-56 w-56', className)}
        cardClassName={cardClassName}
        stackCardClassName={stackCardClassName}
        onCardSelect={onCardSelect}
      />
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
