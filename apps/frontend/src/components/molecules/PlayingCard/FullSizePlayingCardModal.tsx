import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { FullSizePlayingCardStack } from './FullSizePlayingCardStack';
import type { FullSizePlayingCardStackItem, FullSizePlayingCardStackVariant } from './FullSizePlayingCardStack';

export interface FullSizePlayingCardHand {
  id: string;
  title?: string;
  description?: string;
  cards: readonly [FullSizePlayingCardStackItem, ...FullSizePlayingCardStackItem[]];
  activeCardIndex?: number;
  variant?: FullSizePlayingCardStackVariant;
  mainCardIndex?: number;
}

export interface FullSizePlayingCardModalProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  closeLabel: string;
  hands: readonly FullSizePlayingCardHand[];
  onClose: () => void;
  className?: string;
}

export function FullSizePlayingCardModal({
  isOpen,
  title,
  subtitle,
  closeLabel,
  hands,
  onClose,
  className,
}: FullSizePlayingCardModalProps) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Playing card hand'}
      className={cn('pointer-events-none fixed inset-0 z-[70] overflow-hidden text-text-primary', className)}
    >
      <div className="absolute inset-0 bg-gaming-base/95 md:hidden" />

      <div className="pointer-events-auto absolute inset-x-0 bottom-0 h-full overflow-visible md:h-[58vh]">
        {subtitle ? <span className="sr-only">{subtitle}</span> : null}
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="absolute right-4 top-4 z-[90] flex h-11 w-11 items-center justify-center rounded-full border border-gaming-border bg-gaming-card/90 text-text-secondary shadow-xl backdrop-blur transition hover:-translate-y-0.5 hover:border-status-quest hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-status-quest md:right-8"
        >
          <X size={20} aria-hidden />
        </button>

        <div className="h-full min-h-0 overflow-y-auto overflow-x-hidden px-4 pb-8 pt-16 md:overflow-visible md:px-8 md:pb-0 md:pt-0 lg:px-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 md:h-full md:justify-end">
            {hands.map((hand) => (
              <section key={hand.id} aria-label={hand.title || title || 'Card hand'} className="overflow-visible">
                {hand.description ? <span className="sr-only">{hand.description}</span> : null}
                <FullSizePlayingCardStack
                  cards={hand.cards}
                  variant={hand.variant}
                  activeCardIndex={hand.activeCardIndex}
                  mainCardIndex={hand.mainCardIndex}
                  visibleCardCount={hand.cards.length}
                  expanded
                  expandOnHover={false}
                  className="mx-auto h-[calc(100vh-5rem)] max-w-7xl md:h-[54vh]"
                  cardClassName="shadow-glow-primary"
                />
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default FullSizePlayingCardModal;
