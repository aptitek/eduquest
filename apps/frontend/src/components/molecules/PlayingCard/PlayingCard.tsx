import { useState } from 'react';
import type { ReactNode } from 'react';
import { RotateCw } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface PlayingCardProps {
  recto: ReactNode;
  verso: ReactNode;
  flipLabel: string;
  className?: string;
}

export function PlayingCard({ recto, verso, flipLabel, className }: PlayingCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className={cn('relative min-h-[22rem] [perspective:1000px]', className)}>
      <div
        className={cn(
          'relative h-full min-h-[22rem] w-full transition-transform duration-500 [transform-style:preserve-3d]',
          isFlipped && '[transform:rotateY(180deg)]'
        )}
      >
        <div className="absolute inset-0 overflow-hidden rounded-2xl border border-gaming-border bg-gaming-card p-5 shadow-xl [backface-visibility:hidden]">
          {recto}
        </div>
        <div className="absolute inset-0 overflow-hidden rounded-2xl border border-gaming-border bg-gaming-card p-5 shadow-xl [backface-visibility:hidden] [transform:rotateY(180deg)]">
          {verso}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsFlipped((current) => !current)}
        aria-label={flipLabel}
        title={flipLabel}
        className="absolute bottom-0 right-0 z-10 flex h-14 w-14 items-end justify-end rounded-br-2xl text-text-secondary transition hover:text-text-primary"
      >
        <span className="absolute inset-0 rounded-br-2xl bg-gaming-base shadow-lg [clip-path:polygon(100%_0,100%_100%,0_100%)]" />
        <span className="relative p-2">
          <RotateCw size={16} />
        </span>
      </button>
    </div>
  );
}

export default PlayingCard;
