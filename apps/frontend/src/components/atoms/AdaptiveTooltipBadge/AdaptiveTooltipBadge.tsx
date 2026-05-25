import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const containerRef = useRef<HTMLSpanElement>(null);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const [tooltipAnchor, setTooltipAnchor] = useState<{ x: number; y: number } | null>(null);
  const renderedCompactLabel = compactLabel ?? label;
  const showPortalTooltip = mode === 'dot' && isTooltipOpen && tooltipAnchor && typeof document !== 'undefined';

  useLayoutEffect(() => {
    if (mode !== 'dot' || !isTooltipOpen) return undefined;

    const updateAnchor = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      setTooltipAnchor({
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    };

    updateAnchor();
    window.addEventListener('scroll', updateAnchor, true);
    window.addEventListener('resize', updateAnchor);

    return () => {
      window.removeEventListener('scroll', updateAnchor, true);
      window.removeEventListener('resize', updateAnchor);
    };
  }, [isTooltipOpen, mode]);

  return (
    <span
      ref={containerRef}
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
          {showPortalTooltip
            ? createPortal(
                <span
                  className={cn(
                    'pointer-events-none fixed z-[100] w-max max-w-32 -translate-x-1/2 -translate-y-full rounded-xl border border-gaming-border/70 bg-gaming-card/95 px-2 py-1 text-center text-[0.65rem] font-bold text-text-primary opacity-100 shadow-xl backdrop-blur',
                    tooltipClassName
                  )}
                  style={{ left: tooltipAnchor.x, top: tooltipAnchor.y - 6 }}
                >
                  {label}
                </span>,
                document.body
              )
            : null}
        </>
      )}
    </span>
  );
}

export default AdaptiveTooltipBadge;
