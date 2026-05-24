import { cn } from '../../../utils/cn';

export function TruncatedText({
  value,
  className,
}: {
  value: string | number | undefined | null;
  className?: string;
}) {
  const displayValue = value ?? '-';

  return (
    <span className={cn('block max-w-full truncate whitespace-nowrap', className)}>
      {displayValue}
    </span>
  );
}
