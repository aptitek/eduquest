import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { useTranslation } from '../../../hooks/useTranslation';
import {
  kebabCaseFromIconId,
  LUCIDE_ICON_IDS,
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
  'Gift',
  'Shield',
  'Hammer',
  'Sparkles',
  'Trophy',
  'Castle',
  'Map',
];

let dynamicIconIdsPromise: Promise<string[]> | null = null;

function loadDynamicLucideIconIds() {
  dynamicIconIdsPromise ??= import('../../../features/game/DynamicLucideIcon').then((module) =>
    module.getAllDynamicLucideIconIds()
  );
  return dynamicIconIdsPromise;
}

export function LucideIconSelector({
  value,
  onChange,
  className,
  searchPlaceholder,
  defaultIconIds = DEFAULT_ICON_IDS,
  limit = 72,
}: LucideIconSelectorProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [dynamicIconIds, setDynamicIconIds] = useState<string[] | null>(null);
  const resolvedSearchPlaceholder = searchPlaceholder || t('activityCard.iconSearchPlaceholder');
  const searchableIconIds = useMemo(
    () =>
      dynamicIconIds
        ? Array.from(new Set([...LUCIDE_ICON_IDS, ...dynamicIconIds])).sort((a, b) => a.localeCompare(b))
        : LUCIDE_ICON_IDS,
    [dynamicIconIds]
  );
  const visibleIconIds = useMemo(() => {
    if (!query.trim()) return defaultIconIds.slice(0, limit);
    return filterIconIds(searchableIconIds, query, limit);
  }, [defaultIconIds, limit, query, searchableIconIds]);

  useEffect(() => {
    if (!query.trim() || dynamicIconIds) return undefined;

    let isMounted = true;
    loadDynamicLucideIconIds().then((iconIds) => {
      if (isMounted) setDynamicIconIds(iconIds);
    });

    return () => {
      isMounted = false;
    };
  }, [dynamicIconIds, query]);

  return (
    <div className={cn('space-y-3', className)}>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={resolvedSearchPlaceholder}
          className="w-full rounded-xl border border-gaming-border bg-gaming-base py-2 pl-9 pr-3 text-sm outline-none transition focus:border-status-quest focus:ring-2 focus:ring-status-quest/30"
        />
      </label>

      <div className="grid grid-cols-6 gap-1.5">
        {visibleIconIds.map((iconId) => (
          <button
            key={iconId}
            type="button"
            onClick={() => onChange(iconId)}
            aria-label={t('activityCard.useIcon').replace('{icon}', iconId)}
            aria-pressed={value === iconId}
            title={iconId}
            className={cn(
              'flex aspect-square min-w-0 items-center justify-center rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-status-quest',
              value === iconId
                ? 'border-status-quest bg-status-quest/15 text-status-quest shadow-glow-primary'
                : 'border-gaming-border bg-gaming-base text-text-secondary hover:border-status-quest hover:text-status-quest'
            )}
          >
            {renderLucideIcon(iconId, 20)}
          </button>
        ))}
      </div>
    </div>
  );
}

function filterIconIds(iconIds: string[], query: string, limit: number) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return iconIds.slice(0, limit);

  return iconIds.filter((iconId) => {
    const kebab = kebabCaseFromIconId(iconId);
    return iconId.toLowerCase().includes(normalized) || kebab.includes(normalized);
  }).slice(0, limit);
}

export default LucideIconSelector;
