import type { ReactNode } from 'react';
import { cn } from '../../../utils/cn';

export type GaugeIndicatorTone = 'neutral' | 'gold';

export interface GaugeIndicatorProps {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  tone?: GaugeIndicatorTone;
  className?: string;
}

export function GaugeIndicator({
  label,
  value,
  icon,
  tone = 'neutral',
  className,
}: GaugeIndicatorProps) {
  const isGold = tone === 'gold';

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-2xl border px-3 py-2 text-left shadow-xl backdrop-blur-md',
        isGold
          ? 'border-solarized-yellow/50 bg-solarized-yellow/10 text-solarized-yellow'
          : 'border-gaming-border/70 bg-gaming-card/90 text-text-muted',
        className
      )}
    >
      {icon ? (
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border',
            isGold
              ? 'border-solarized-yellow/50 bg-solarized-yellow/20 shadow-[0_0_22px_rgba(181,137,0,0.35)]'
              : 'border-gaming-border bg-gaming-base/70'
          )}
        >
          {icon}
        </span>
      ) : null}
      <span className="min-w-0">
        <span className="mt-0.5 block font-display text-lg font-black leading-none text-text-primary">
          {value}
        </span>
        <span className="mt-1 block text-[0.55rem] font-bold uppercase tracking-[0.2em]">{label}</span>
      </span>
    </div>
  );
}

export default GaugeIndicator;
