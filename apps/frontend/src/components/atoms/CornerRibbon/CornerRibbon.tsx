import type { CSSProperties, ReactNode } from 'react';
import { getSeededBackgroundColor } from '../../../utils/colorHash';
import { cn } from '../../../utils/cn';

export type CornerRibbonPosition = 'top-left' | 'top-right';
export type CornerRibbonSize = 'sm' | 'md' | 'lg';

export interface CornerRibbonProps {
  children: ReactNode;
  position?: CornerRibbonPosition;
  size?: CornerRibbonSize;
  color?: CSSProperties['backgroundColor'];
  colorSeed?: string;
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
  sm: 'top-4 w-28 py-1',
  md: 'top-6 w-36 py-1.5',
  lg: 'top-7 w-44 py-2',
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

const textClassMap: Record<CornerRibbonSize, { short: string; medium: string; long: string }> = {
  sm: {
    short: 'text-xs tracking-[0.14em]',
    medium: 'text-[0.625rem] tracking-[0.1em]',
    long: 'text-[0.5rem] tracking-[0.04em]',
  },
  md: {
    short: 'text-xs tracking-[0.16em]',
    medium: 'text-[0.625rem] tracking-[0.1em]',
    long: 'text-[0.55rem] tracking-[0.04em]',
  },
  lg: {
    short: 'text-sm tracking-[0.18em]',
    medium: 'text-xs tracking-[0.1em]',
    long: 'text-[0.625rem] tracking-[0.03em]',
  },
};

export function CornerRibbon({
  children,
  position = 'top-right',
  size = 'md',
  color,
  colorSeed,
  className,
  ribbonClassName,
  textClassName,
}: CornerRibbonProps) {
  const textLength = getTextLength(children);
  const textFit = textLength > 14 ? 'long' : textLength > 7 ? 'medium' : 'short';
  const backgroundColor = color || (colorSeed ? getSeededBackgroundColor(colorSeed) : undefined);

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
        style={backgroundColor ? { backgroundColor } : undefined}
      >
        <span
          className={cn(
            'block whitespace-nowrap px-2 drop-shadow-sm',
            textClassMap[size][textFit],
            textClassName
          )}
        >
          {children}
        </span>
      </span>
    </span>
  );
}

function getTextLength(children: ReactNode) {
  if (typeof children === 'string' || typeof children === 'number') return String(children).length;
  return 0;
}

export default CornerRibbon;
