import type { ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { HoldToConfirmButton, type HoldToConfirmButtonProps } from '../HoldToConfirmButton';
import { cn } from '../../../utils/cn';

type DeleteButtonProps = Omit<HoldToConfirmButtonProps, 'children' | 'variant'> & {
  children?: ReactNode;
  iconSize?: number;
};

const DELETE_BUTTON_TOKEN_CLASS_NAME =
  'border-status-danger/50 bg-status-danger text-gaming-base hover:border-status-danger hover:bg-status-danger/90 hover:text-gaming-base focus:outline-none focus:ring-2 focus:ring-status-danger/60 disabled:border-status-danger/30 disabled:bg-status-danger/40 disabled:text-gaming-base/70';

export function DeleteButton({
  children,
  className,
  holdDuration = 1000,
  iconSize,
  shape,
  ...buttonProps
}: DeleteButtonProps) {
  const resolvedShape = shape ?? (children ? 'default' : 'round');

  return (
    <HoldToConfirmButton
      holdDuration={holdDuration}
      shape={resolvedShape}
      variant=""
      className={cn(
        !children && 'h-8 w-8 shrink-0',
        children && 'gap-2',
        className,
        DELETE_BUTTON_TOKEN_CLASS_NAME
      )}
      {...buttonProps}
    >
      <Trash2 size={iconSize ?? (children ? 16 : 14)} aria-hidden />
      {children}
    </HoldToConfirmButton>
  );
}

