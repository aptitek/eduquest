import { Coins } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface GoldPileProps {
  amount: number;
  label?: string;
  className?: string;
}

export function GoldPile({ amount, label = 'Guild gold', className }: GoldPileProps) {
  return (
    <div
      aria-label={`${label}: ${amount}`}
      className={cn(
        'relative flex h-28 w-20 flex-col items-center justify-end overflow-hidden rounded-t-2xl border-x border-t border-solarized-yellow/50 bg-gaming-card px-2 pb-3 shadow-2xl',
        className
      )}
    >
      <div className="absolute inset-x-2 bottom-8 h-10 rounded-full bg-solarized-yellow/20 blur-xl" />
      <div className="relative mb-1 flex -space-x-2 text-solarized-yellow">
        <Coins size={24} className="drop-shadow" aria-hidden />
        <Coins size={30} className="drop-shadow" aria-hidden />
        <Coins size={24} className="drop-shadow" aria-hidden />
      </div>
      <span className="relative font-display text-lg font-black text-solarized-yellow">
        {amount}
      </span>
      <span className="relative text-[0.58rem] font-bold uppercase tracking-[0.18em] text-text-muted">
        gold
      </span>
    </div>
  );
}

export default GoldPile;
