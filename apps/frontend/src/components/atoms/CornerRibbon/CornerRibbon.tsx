import type { CSSProperties, ReactNode } from 'react';
import { getSeededBackgroundClass } from '../../../utils/colorHash';
import { cn } from '../../../utils/cn';
import { resolveColorBackgroundClassName } from '../../../styles/colorTokens';

export type CornerRibbonPosition = 'top-left' | 'top-right';
export type CornerRibbonSize = 'sm' | 'md' | 'lg';

export interface CornerRibbonProps {
  children?: ReactNode;
  icon?: ReactNode;
  position?: CornerRibbonPosition;
  size?: CornerRibbonSize;
  color?: CSSProperties['backgroundColor'];
  colorSeed?: string;
  className?: string;
  ribbonClassName?: string;
  textClassName?: string;
  contentInteractive?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
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

const iconSizeClassMap: Record<CornerRibbonSize, string> = {
  sm: '[&>svg]:h-4 [&>svg]:w-4',
  md: '[&>svg]:h-5 [&>svg]:w-5',
  lg: '[&>svg]:h-6 [&>svg]:w-6',
};

const iconCornerPositionClassMap: Record<CornerRibbonSize, Record<CornerRibbonPosition, string>> = {
  sm: {
    'top-left': 'left-1.5 top-1.5 -rotate-45',
    'top-right': 'right-1.5 top-1.5 rotate-45',
  },
  md: {
    'top-left': 'left-2 top-2 -rotate-45',
    'top-right': 'right-2 top-2 rotate-45',
  },
  lg: {
    'top-left': 'left-2.5 top-2.5 -rotate-45',
    'top-right': 'right-2.5 top-2.5 rotate-45',
  },
};

export function CornerRibbon({
  children,
  icon,
  position = 'top-right',
  size = 'md',
  color,
  colorSeed,
  className,
  ribbonClassName,
  textClassName,
  contentInteractive = false,
  onClick,
  ariaLabel,
}: CornerRibbonProps) {
  const textLength = getTextLength(children);
  const textFit = textLength > 14 ? 'long' : textLength > 7 ? 'medium' : 'short';
  const backgroundClassName = color
    ? resolveColorBackgroundClassName(color)
    : colorSeed
      ? getSeededBackgroundClass(colorSeed)
      : 'bg-status-quest';
  const hasContent = children !== undefined && children !== null && children !== '';
  const interactiveClass = onClick
    ? 'pointer-events-auto cursor-pointer focus:outline-none'
    : 'pointer-events-none';

  const innerRibbon = (
    <span
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      onClick={(event) => {
        if (!onClick) return;
        event.stopPropagation();
        onClick();
      }}
      onKeyDown={(event) => {
        if (!onClick || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        'absolute top-0 z-[60] block overflow-hidden',
        icon && 'drop-shadow-md',
        interactiveClass,
        position === 'top-left' ? 'left-0' : 'right-0',
        containerClassMap[size],
        className
      )}
    >
      {icon ? (
        <span
          className={cn(
            'absolute inset-0 z-0 block bg-status-quest',
            position === 'top-left'
              ? '[clip-path:polygon(0_0,100%_0,0_100%)]'
              : '[clip-path:polygon(0_0,100%_0,100%_100%)]',
            backgroundClassName,
            ribbonClassName
          )}
        />
      ) : null}
      {icon ? (
        <span
          className={cn(
            'absolute z-10 flex items-center justify-center text-solarized-base3 drop-shadow-sm',
            iconCornerPositionClassMap[size][position],
            iconSizeClassMap[size],
            ribbonClassName
          )}
          aria-hidden
        >
          {icon}
        </span>
      ) : null}
      <span
        className={cn(
          'absolute z-10 block bg-status-quest text-center font-bold uppercase leading-none text-solarized-base3',
          ribbonClassMap[size],
          ribbonPositionClassMap[size][position],
          icon ? 'shadow-none' : 'shadow-md',
          backgroundClassName,
          ribbonClassName
        )}
      >
        {hasContent ? (
          <span
            className={cn(
              'block whitespace-nowrap px-2 drop-shadow-sm',
              contentInteractive && 'pointer-events-auto',
              textClassMap[size][textFit],
              textClassName
            )}
          >
            {children}
          </span>
        ) : null}
      </span>
    </span>
  );

  return innerRibbon;
}

function getTextLength(children: ReactNode) {
  if (typeof children === 'string' || typeof children === 'number') return String(children).length;
  return 0;
}

export default CornerRibbon;
