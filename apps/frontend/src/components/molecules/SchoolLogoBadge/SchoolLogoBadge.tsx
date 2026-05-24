import aptitekLogoUrl from '../../../assets/logo.svg';
import { cn } from '../../../utils/cn';

export function SchoolLogoBadge({
  name,
  logoUrl,
  className,
}: {
  name: string;
  logoUrl?: string;
  className?: string;
}) {
  const resolvedLogoUrl = logoUrl || (name === 'Aptitek' ? aptitekLogoUrl : undefined);

  if (resolvedLogoUrl) {
    return (
      <img
        src={resolvedLogoUrl}
        alt={name}
        title={name}
        className={cn('h-4 w-auto max-w-none object-contain', className)}
      />
    );
  }

  return (
    <span className="max-w-[8rem] truncate text-xs font-semibold" title={name}>
      {name}
    </span>
  );
}
