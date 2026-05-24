import { cn } from '../../../utils/cn';

export interface CompoundBadgeProps {
  parts: (string | number | undefined | null | false)[];
  className?: string;
}

export function CompoundBadge({ parts, className }: CompoundBadgeProps) {
  const visibleParts = parts.filter((part) => part !== undefined && part !== null && part !== false && part !== '');

  if (visibleParts.length === 0) return null;

  return (
    <span
      className={cn(
        'inline-flex overflow-hidden rounded-full border border-gaming-border bg-gaming-base text-xs font-semibold text-text-secondary shadow-sm',
        className
      )}
    >
      {visibleParts.map((part, index) => (
        <span
          key={`${part}-${index}`}
          className={cn('px-2 py-1', index > 0 && 'border-l border-gaming-border')}
        >
          {part}
        </span>
      ))}
    </span>
  );
}

export default CompoundBadge;
