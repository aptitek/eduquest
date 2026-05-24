import aptitekLogoUrl from '../../../assets/logo.svg';

export function SchoolLogoBadge({ name, logoUrl }: { name: string; logoUrl?: string }) {
  const resolvedLogoUrl = logoUrl || (name === 'Aptitek' ? aptitekLogoUrl : undefined);

  if (resolvedLogoUrl) {
    return <img src={resolvedLogoUrl} alt={name} title={name} className="h-4 w-auto max-w-none object-contain" />;
  }

  return (
    <span className="max-w-[8rem] truncate text-xs font-semibold" title={name}>
      {name}
    </span>
  );
}
