import { useState } from 'react';
import type { ReactNode } from 'react';
import { RotateCw } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface PlayingCardProps {
  recto: ReactNode;
  verso: ReactNode;
  flipLabel: string;
  className?: string;
  innerClassName?: string;
  faceClassName?: string;
}

export function PlayingCard({ recto, verso, flipLabel, className, innerClassName, faceClassName }: PlayingCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className={cn('relative min-h-[22rem] rounded-[1.4rem] [perspective:1000px]', className)}>
      <div
        className={cn(
          'relative h-full min-h-[22rem] w-full rounded-[1.4rem] transition-transform duration-500 [transform-style:preserve-3d]',
          isFlipped && '[transform:rotateY(180deg)]',
          innerClassName
        )}
      >
        <div
          className={cn(
            'absolute inset-0 overflow-x-hidden overflow-y-auto rounded-[1.4rem] border border-gaming-border bg-gaming-card shadow-xl [backface-visibility:hidden]',
            faceClassName
          )}
        >
          {recto}
        </div>
        <div
          className={cn(
            'absolute inset-0 overflow-x-hidden overflow-y-auto rounded-[1.4rem] border border-gaming-border bg-gaming-card shadow-xl [backface-visibility:hidden] [transform:rotateY(180deg)]',
            faceClassName
          )}
        >
          {verso}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsFlipped((current) => !current)}
        aria-label={flipLabel}
        title={flipLabel}
        className="absolute bottom-3 right-3 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-gaming-border bg-gaming-base/95 text-text-secondary shadow-xl transition hover:scale-110 hover:border-status-quest hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-status-quest"
      >
        <RotateCw size={24} aria-hidden />
      </button>
    </div>
  );
}

export default PlayingCard;
