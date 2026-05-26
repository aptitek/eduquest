import { useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../../utils/cn';

export type AdaptiveTooltipBadgeMode = 'compact' | 'dot';

export interface AdaptiveTooltipBadgeProps {
  label: ReactNode;
  compactLabel?: ReactNode;
  mode?: AdaptiveTooltipBadgeMode;
  className?: string;
  badgeClassName?: string;
  tooltipClassName?: string;
}

export function AdaptiveTooltipBadge({
  label,
  compactLabel,
  mode = 'compact',
  className,
  badgeClassName,
  tooltipClassName,
}: AdaptiveTooltipBadgeProps) {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const renderedCompactLabel = compactLabel ?? label;
  const showTooltip = mode === 'dot' && isTooltipOpen;

  return (
    <span
      className={cn('group/adaptive-tooltip relative inline-flex h-5 w-5 items-center justify-center', className)}
      onMouseEnter={() => setIsTooltipOpen(true)}
      onMouseLeave={() => setIsTooltipOpen(false)}
      onFocus={() => setIsTooltipOpen(true)}
      onBlur={() => setIsTooltipOpen(false)}
    >
      {mode === 'compact' ? (
        <span
          className={cn(
            'flex h-5 min-w-5 items-center justify-center overflow-hidden rounded-full border border-gaming-border/70 bg-gaming-card/80 px-1 text-[0.55rem] font-black uppercase tracking-wide text-text-muted shadow-marker backdrop-blur transition-all group-hover/adaptive-tooltip:z-20 group-hover/adaptive-tooltip:min-w-16 group-hover/adaptive-tooltip:px-2 group-hover/adaptive-tooltip:bg-gaming-card/95 group-hover/adaptive-tooltip:text-text-primary group-hover/adaptive-tooltip:shadow-xl',
            badgeClassName
          )}
        >
          <span className="group-hover/adaptive-tooltip:hidden">{renderedCompactLabel}</span>
          <span className="hidden whitespace-nowrap group-hover/adaptive-tooltip:inline">{label}</span>
        </span>
      ) : (
        <>
          <span
            className={cn(
              'h-4 w-4 rounded-full border border-gaming-border/80 bg-gaming-card/35 shadow-marker backdrop-blur-sm transition group-hover/adaptive-tooltip:scale-125 group-hover/adaptive-tooltip:bg-gaming-card/70',
              badgeClassName
            )}
          />
          {showTooltip ? (
            <span
              className={cn(
                'pointer-events-none absolute bottom-full left-1/2 z-[100] mb-1 w-max max-w-32 -translate-x-1/2 rounded-xl border border-gaming-border/70 bg-gaming-card/95 px-2 py-1 text-center text-[0.65rem] font-bold text-text-primary opacity-100 shadow-xl backdrop-blur',
                tooltipClassName
              )}
            >
              {label}
            </span>
          ) : null}
        </>
      )}
    </span>
  );
}

export default AdaptiveTooltipBadge;
