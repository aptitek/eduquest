import type { CSSProperties, ReactNode } from 'react';
import { EditableIcon } from '../EditableIcon';
import type { EditableIconProps } from '../EditableIcon';
import { EditableText } from '../EditableText';
import type { EditableTextProps } from '../EditableText';
import { cn } from '../../../utils/cn';
import { getSeededBackgroundClass } from '../../../utils/colorHash';
import { resolveColorBackgroundClassName } from '../../../styles/colorTokens';

export type CornerRibbonPosition = 'top-left' | 'top-right';
export type CornerRibbonSize = 'sm' | 'md' | 'lg';

export type CornerRibbonEditableTextProps = Pick<
  EditableTextProps,
  'value' | 'onChange' | 'placeholder' | 'showPencil' | 'truncate' | 'inputClassName'
> & {
  className?: string;
};

export type CornerRibbonEditableIconProps = Pick<
  EditableIconProps,
  'value' | 'onChange' | 'label' | 'searchPlaceholder' | 'defaultIconIds' | 'limit'
> & {
  className?: string;
  buttonClassName?: string;
  iconClassName?: string;
};

export interface CornerRibbonProps {
  children?: ReactNode;
  icon?: ReactNode;
  editableText?: CornerRibbonEditableTextProps;
  editableIcon?: CornerRibbonEditableIconProps;
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

const iconOnlySizeClassMap: Record<CornerRibbonSize, string> = {
  sm: '[&>svg]:h-6 [&>svg]:w-6',
  md: '[&>svg]:h-8 [&>svg]:w-8',
  lg: '[&>svg]:h-10 [&>svg]:w-10',
};

const iconOnlyButtonClassMap: Record<CornerRibbonSize, string> = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-14 w-14',
};

const iconOnlyPixelSizeMap: Record<CornerRibbonSize, number> = {
  sm: 24,
  md: 32,
  lg: 40,
};

const textSlotClassMap: Record<CornerRibbonSize, { withIcon: string; withoutIcon: string }> = {
  sm: {
    withIcon: 'w-24',
    withoutIcon: 'w-28',
  },
  md: {
    withIcon: 'w-28',
    withoutIcon: 'w-36',
  },
  lg: {
    withIcon: 'w-36',
    withoutIcon: 'w-48',
  },
};

export function CornerRibbon({
  children,
  icon,
  editableText,
  editableIcon,
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
  const textLength = getTextLength(editableText?.value ?? children);
  const textFit = textLength > 14 ? 'long' : textLength > 7 ? 'medium' : 'short';
  const backgroundClassName = color
    ? resolveColorBackgroundClassName(color)
    : colorSeed
      ? getSeededBackgroundClass(colorSeed)
      : 'bg-status-quest';
  const hasContent =
    Boolean(editableText) || (children !== undefined && children !== null && children !== '');
  const hasIcon = Boolean(editableIcon || icon);
  const isIconOnly = hasIcon && !hasContent;
  const isInteractive = Boolean(onClick || contentInteractive || editableText || editableIcon);

  if (!hasContent && !hasIcon) return null;

  return (
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
        hasIcon && 'drop-shadow-md',
        isInteractive ? 'pointer-events-auto' : 'pointer-events-none',
        onClick && 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
        containerClassMap[size],
        ribbonPositionClassMap[size][position],
        backgroundClassName,
        ribbonClassName,
        className
      )}
      aria-hidden={!onClick && !ariaLabel ? undefined : false}
    >
      {editableIcon ? (
        <span
          className={cn(
            'flex shrink-0 items-center justify-center overflow-visible text-current drop-shadow-sm',
            isIconOnly ? iconOnlyButtonClassMap[size] : 'h-6',
            isIconOnly ? iconOnlySizeClassMap[size] : iconSizeClassMap[size]
          )}
        >
          <EditableIcon
            value={editableIcon.value}
            onChange={editableIcon.onChange}
            label={editableIcon.label}
            searchPlaceholder={editableIcon.searchPlaceholder}
            defaultIconIds={editableIcon.defaultIconIds}
            limit={editableIcon.limit}
            size={isIconOnly ? iconOnlyPixelSizeMap[size] : size === 'lg' ? 20 : size === 'md' ? 18 : 16}
            className={cn('shrink-0 text-current', editableIcon.className)}
            buttonClassName={cn(
              'rounded-md text-current hover:bg-solarized-base3/15 focus-visible:ring-solarized-base3/50',
              isIconOnly ? iconOnlyButtonClassMap[size] : 'h-6 w-6',
              editableIcon.buttonClassName
            )}
            iconClassName={cn('text-current', editableIcon.iconClassName)}
          />
        </span>
      ) : icon ? (
        <span
          className={cn(
            'flex shrink-0 items-center justify-center overflow-visible text-current drop-shadow-sm',
            isIconOnly ? iconOnlyButtonClassMap[size] : 'h-6',
            isIconOnly ? iconOnlySizeClassMap[size] : iconSizeClassMap[size]
          )}
          aria-hidden
        >
          {icon}
        </span>
      ) : null}

      {editableText ? (
        <span
          className={cn(
            'flex max-w-full shrink-0 items-center justify-center overflow-hidden whitespace-nowrap text-center drop-shadow-sm',
            contentInteractive && 'pointer-events-auto',
            textSlotClassMap[size][hasIcon ? 'withIcon' : 'withoutIcon'],
            textClassMap[size][textFit],
            textClassName
          )}
        >
          <EditableText
            value={editableText.value}
            onChange={editableText.onChange}
            placeholder={editableText.placeholder}
            showPencil={editableText.showPencil ?? false}
            truncate={editableText.truncate ?? false}
            className={cn(
              'block w-full min-w-0 overflow-hidden truncate text-center text-inherit',
              editableText.className
            )}
            inputClassName={cn(
              'block w-full min-w-0 max-w-full truncate text-center',
              editableText.inputClassName
            )}
          />
        </span>
      ) : hasContent ? (
        <span
          className={cn(
            'flex max-w-full shrink-0 items-center justify-center overflow-hidden whitespace-nowrap text-center drop-shadow-sm',
            contentInteractive && 'pointer-events-auto',
            textSlotClassMap[size][hasIcon ? 'withIcon' : 'withoutIcon'],
            textClassMap[size][textFit],
            textClassName
          )}
        >
          {children}
        </span>
      ) : null}
    </span>
  );
}

function getTextLength(children: ReactNode) {
  if (typeof children === 'string' || typeof children === 'number') return String(children).length;
  return 0;
}

export default CornerRibbon;
