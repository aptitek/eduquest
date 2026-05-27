import type { ReactNode } from 'react';
import { cn } from '../../../utils/cn';
import { resolveColorBorderClassName } from '../../../styles/colorTokens';

export interface AvatarBadgeProps {
  name: string;
  src?: string;
  icon?: ReactNode;
  color?: string;
  size?: 'sm' | 'md';
  className?: string;
}

const SIZE_CLASS_NAMES = {
  sm: 'h-8 w-8 text-[0.6rem]',
  md: 'h-10 w-10 text-xs',
};

export function AvatarBadge({
  name,
  src,
  icon,
  color = 'var(--color-gaming-border)',
  size = 'md',
  className,
}: AvatarBadgeProps) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-gaming-base font-black text-text-primary shadow-marker',
        SIZE_CLASS_NAMES[size],
        resolveColorBorderClassName(color, 'neutral'),
        className
      )}
      aria-label={name}
    >
      {icon ? (
        icon
      ) : src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export default AvatarBadge;
