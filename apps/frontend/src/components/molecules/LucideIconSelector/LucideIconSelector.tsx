import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../../utils/cn';
import {
  filterLucideIconIds,
  renderLucideIcon,
} from '../../../features/game/lucideIconCatalog';

export interface LucideIconSelectorProps {
  value: string;
  onChange: (iconId: string) => void;
  className?: string;
  searchPlaceholder?: string;
  defaultIconIds?: string[];
  limit?: number;
}

const DEFAULT_ICON_IDS = [
  'TreePine',
  'ScrollText',
  'Swords',
  'Flame',
  'Compass',
  'BookOpen',
  'Shield',
  'Hammer',
  'Sparkles',
  'Trophy',
  'Castle',
  'Map',
];

export function LucideIconSelector({
  value,
  onChange,
  className,
  searchPlaceholder = 'Search icons, e.g. sword, book, flame...',
  defaultIconIds = DEFAULT_ICON_IDS,
  limit = 72,
}: LucideIconSelectorProps) {
  const [query, setQuery] = useState('');
  const visibleIconIds = useMemo(() => {
    if (!query.trim()) return defaultIconIds.slice(0, limit);
    return filterLucideIconIds(query, limit);
  }, [defaultIconIds, limit, query]);

  return (
    <div className={cn('space-y-3', className)}>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-xl border border-gaming-border bg-gaming-base py-2 pl-9 pr-3 text-sm outline-none transition focus:border-status-quest focus:ring-2 focus:ring-status-quest/30"
        />
      </label>

      <div className="grid grid-cols-4 gap-2">
        {visibleIconIds.map((iconId) => (
          <button
            key={iconId}
            type="button"
            onClick={() => onChange(iconId)}
            title={iconId}
            className={cn(
              'flex h-14 flex-col items-center justify-center rounded-xl border text-[0.62rem] transition hover:border-status-quest hover:bg-status-quest/10 focus:outline-none focus:ring-2 focus:ring-status-quest',
              value === iconId
                ? 'border-status-quest bg-status-quest/15 text-status-quest'
                : 'border-gaming-border bg-gaming-base text-text-secondary'
            )}
          >
            {renderLucideIcon(iconId, 18)}
            <span className="mt-1 max-w-full truncate px-1">{iconId}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default LucideIconSelector;
