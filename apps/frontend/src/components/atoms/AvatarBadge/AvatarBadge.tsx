import { cn } from '../../../utils/cn';

export interface AvatarBadgeProps {
  name: string;
  src?: string;
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
  color = 'var(--color-gaming-border)',
  size = 'md',
  className,
}: AvatarBadgeProps) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-gaming-base font-black text-text-primary shadow-lg',
        SIZE_CLASS_NAMES[size],
        className
      )}
      style={{
        borderColor: color,
        boxShadow: `0 0 12px color-mix(in srgb, ${color} 36%, transparent)`,
      }}
      aria-label={name}
    >
      {src ? (
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
