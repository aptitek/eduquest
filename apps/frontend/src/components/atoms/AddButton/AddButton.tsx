import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../../../utils/cn';

type AddButtonShape = 'default' | 'round';

export interface AddButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> {
  children?: ReactNode;
  className?: string;
  iconSize?: number;
  shape?: AddButtonShape;
}

const ADD_BUTTON_TOKEN_CLASS_NAME =
  'border-status-completed/50 bg-status-completed text-gaming-base hover:border-status-completed hover:bg-status-completed/90 hover:text-gaming-base focus:outline-none focus:ring-2 focus:ring-status-completed/60 disabled:border-status-completed/30 disabled:bg-status-completed/40 disabled:text-gaming-base/70';

export function AddButton({
  children,
  className,
  iconSize,
  shape,
  type = 'button',
  ...buttonProps
}: AddButtonProps) {
  const resolvedShape = shape ?? (children ? 'default' : 'round');

  return (
    <button
      type={type}
      className={cn(
        'btn min-h-0 transition hover:shadow-lg',
        resolvedShape === 'round' && 'btn-circle rounded-full p-0',
        !children && 'h-8 w-8 shrink-0',
        children && 'gap-2 font-display font-black uppercase tracking-[0.14em]',
        className,
        ADD_BUTTON_TOKEN_CLASS_NAME
      )}
      {...buttonProps}
    >
      <Plus size={iconSize ?? (children ? 16 : 14)} strokeWidth={3} aria-hidden />
      {children}
    </button>
  );
}

