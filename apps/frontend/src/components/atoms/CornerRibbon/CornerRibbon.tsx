import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../../../utils/cn';

export type CornerRibbonPosition = 'top-left' | 'top-right';
export type CornerRibbonSize = 'sm' | 'md' | 'lg';

export interface CornerRibbonProps {
  children: ReactNode;
  position?: CornerRibbonPosition;
  size?: CornerRibbonSize;
  color?: CSSProperties['backgroundColor'];
  className?: string;
  ribbonClassName?: string;
  textClassName?: string;
}

const containerClassMap: Record<CornerRibbonSize, string> = {
  sm: 'h-20 w-20',
  md: 'h-24 w-24',
  lg: 'h-28 w-28',
};

const ribbonClassMap: Record<CornerRibbonSize, string> = {
  sm: 'top-4 w-28 py-1 text-[0.55rem] tracking-[0.14em]',
  md: 'top-6 w-36 py-1.5 text-[0.625rem] tracking-[0.16em]',
  lg: 'top-7 w-44 py-2 text-xs tracking-[0.18em]',
};

const ribbonPositionClassMap: Record<CornerRibbonSize, Record<CornerRibbonPosition, string>> = {
  sm: {
    'top-left': '-left-8 -rotate-45',
    'top-right': '-right-8 rotate-45',
  },
  md: {
    'top-left': '-left-9 -rotate-45',
    'top-right': '-right-9 rotate-45',
  },
  lg: {
    'top-left': '-left-11 -rotate-45',
    'top-right': '-right-11 rotate-45',
  },
};

export function CornerRibbon({
  children,
  position = 'top-right',
  size = 'md',
  color,
  className,
  ribbonClassName,
  textClassName,
}: CornerRibbonProps) {
  return (
    <span
      className={cn(
        'pointer-events-none absolute top-0 z-10 block overflow-hidden',
        position === 'top-left' ? 'left-0' : 'right-0',
        containerClassMap[size],
        className
      )}
    >
      <span
        className={cn(
          'absolute block bg-status-quest text-center font-bold uppercase leading-none text-white shadow-md',
          ribbonClassMap[size],
          ribbonPositionClassMap[size][position],
          ribbonClassName
        )}
        style={color ? { backgroundColor: color } : undefined}
      >
        <span className={cn('block truncate px-2 drop-shadow-sm', textClassName)}>{children}</span>
      </span>
    </span>
  );
}

export default CornerRibbon;
