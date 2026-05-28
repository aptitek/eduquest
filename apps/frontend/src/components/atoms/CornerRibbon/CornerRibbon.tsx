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
  sm: 'h-14 w-32',
  md: 'h-16 w-40',
  lg: 'h-20 w-52',
};

const ribbonPositionClassMap: Record<CornerRibbonSize, Record<CornerRibbonPosition, string>> = {
  sm: {
    'top-left': 'left-0 top-0 -translate-x-1/2 -rotate-45',
    'top-right': 'right-0 top-0 translate-x-1/2 rotate-45',
  },
  md: {
    'top-left': 'left-0 top-0 -translate-x-1/2 -rotate-45',
    'top-right': 'right-0 top-0 translate-x-1/2 rotate-45',
  },
  lg: {
    'top-left': 'left-0 top-0 -translate-x-1/2 -rotate-45',
    'top-right': 'right-0 top-0 translate-x-1/2 rotate-45',
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
    'top-left': '',
    'top-right': '',
  },
  md: {
    'top-left': '',
    'top-right': '',
  },
  lg: {
    'top-left': '',
    'top-right': '',
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
        "absolute z-[60] flex origin-top flex-col items-center justify-center gap-0.5 overflow-visible bg-status-quest px-2 pb-0.5 pt-1 text-center font-bold uppercase leading-none text-solarized-base3 shadow-md before:absolute before:left-1/2 before:top-0 before:block before:h-3 before:w-8 before:-translate-x-1/2 before:-translate-y-1/2 before:bg-inherit before:content-['']",
        icon && 'drop-shadow-md',
        interactiveClass,
        containerClassMap[size],
        ribbonPositionClassMap[size][position],
        backgroundClassName,
        ribbonClassName,
        className
      )}
    >
      {icon ? (
        <span
          className={cn(
            'flex shrink-0 items-center justify-center drop-shadow-sm',
            iconCornerPositionClassMap[size][position],
            iconSizeClassMap[size]
          )}
          aria-hidden
        >
          {icon}
        </span>
      ) : null}
      <span
        className={cn(
          'flex max-w-full items-center justify-center whitespace-nowrap text-center drop-shadow-sm',
          contentInteractive && 'pointer-events-auto',
          textClassMap[size][textFit],
          textClassName
        )}
      >
        {hasContent ? children : null}
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
