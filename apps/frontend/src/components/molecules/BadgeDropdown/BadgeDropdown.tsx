import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '../../../utils/cn';

export interface BadgeDropdownProps {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  removeLabel?: string;
  emptyFilterHint?: string;
  className?: string;
  badgeClassName?: string;
  /** Max width of the selected-badges row before ellipsis + hover tooltip */
  selectedMaxWidth?: string;
}

const DEFAULT_SELECTED_BADGE =
  'badge badge-sm badge-outline gap-1 font-normal text-text-secondary';

export function BadgeDropdown({
  options,
  value,
  onChange,
  multiple = true,
  placeholder = '+',
  searchPlaceholder = 'Search…',
  removeLabel = 'Remove',
  emptyFilterHint = 'Press Enter to add',
  className,
  badgeClassName,
  selectedMaxWidth = 'max-w-[9rem] sm:max-w-[11rem]',
}: BadgeDropdownProps) {
  const [open, setOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [expandedSelected, setExpandedSelected] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);
  const selectedContainerRef = useRef<HTMLDivElement>(null);
  const selectedMeasureRef = useRef<HTMLDivElement>(null);

  const selectedBadgeClass = cn(DEFAULT_SELECTED_BADGE, badgeClassName);
  const poolBadgeClass = cn(
    'badge badge-sm badge-outline font-normal hover:badge-primary hover:text-primary-content hover:border-primary cursor-pointer transition-colors',
    badgeClassName
  );

  const catalog = useMemo(() => {
    const fromOptions = options.filter((o) => o.trim());
    const customs = value.filter((v) => !fromOptions.includes(v));
    return [...fromOptions, ...customs];
  }, [options, value]);

  const available = useMemo(() => {
    const pool = catalog.filter((o) => !value.includes(o));
    const q = filterQuery.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter((o) => o.toLowerCase().includes(q));
  }, [catalog, value, filterQuery]);

  const summary = value.join(', ');

  const checkOverflow = useCallback(() => {
    const container = selectedContainerRef.current;
    const measure = selectedMeasureRef.current;
    if (!container || !measure || value.length === 0) {
      setIsOverflowing(false);
      return;
    }
    const nextOverflowing = measure.scrollWidth > container.clientWidth;
    setIsOverflowing(nextOverflowing);
  }, [value]);

  useEffect(() => {
    checkOverflow();
    const container = selectedContainerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(checkOverflow);
    ro.observe(container);
    return () => ro.disconnect();
  }, [checkOverflow, value, selectedMaxWidth]);

  const add = (item: string) => {
    const trimmed = item.trim();
    if (!trimmed || value.includes(trimmed)) return;
    if (multiple) {
      onChange([...value, trimmed]);
    } else {
      onChange([trimmed]);
      setOpen(false);
    }
    setFilterQuery('');
  };

  const remove = (item: string) => {
    const next = value.filter((v) => v !== item);
    onChange(next);
  };

  const togglePanel = (showSelected = false) => {
    setOpen((current) => {
      const nextOpen = showSelected ? true : !current;
      setExpandedSelected(showSelected && nextOpen);
      if (!nextOpen) setFilterQuery('');
      return nextOpen;
    });
  };

  const handleFilterKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const trimmed = filterQuery.trim();
    if (!trimmed) return;

    const exact = available.find((o) => o.toLowerCase() === trimmed.toLowerCase());
    if (exact) {
      add(exact);
      return;
    }
    add(trimmed);
  };

  useEffect(() => {
    if (!open) return;
    filterRef.current?.focus();

    const handlePointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setExpandedSelected(false);
        setFilterQuery('');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setExpandedSelected(false);
        setFilterQuery('');
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const selectedBadges = value.map((item) => (
    <span key={item} className={cn(selectedBadgeClass, 'relative shrink-0', multiple && 'pr-5')}>
      {item}
      {multiple && (
        <button
          type="button"
          onClick={() => remove(item)}
          aria-label={`${removeLabel}: ${item}`}
          className="btn btn-circle btn-xs absolute right-0.5 top-1/2 h-3.5 w-3.5 min-h-0 -translate-y-1/2 p-0 bg-gaming-card border border-gaming-border text-text-muted hover:text-status-boss hover:border-status-boss/50 shadow-sm"
        >
          <Trash2 size={8} strokeWidth={2.5} />
        </button>
      )}
    </span>
  ));

  const expandedSelectedBadges = value.map((item) => (
    <span key={item} className={cn(selectedBadgeClass, 'relative shrink-0', multiple && 'pr-5')}>
      {item}
      {multiple && (
        <button
          type="button"
          onClick={() => remove(item)}
          aria-label={`${removeLabel}: ${item}`}
          className="btn btn-circle btn-xs absolute right-0.5 top-1/2 h-3.5 w-3.5 min-h-0 -translate-y-1/2 p-0 bg-gaming-card border border-gaming-border text-text-muted hover:text-status-boss hover:border-status-boss/50 shadow-sm"
        >
          <Trash2 size={8} strokeWidth={2.5} />
        </button>
      )}
    </span>
  ));

  return (
    <div
      ref={rootRef}
      className={cn('inline-flex items-center gap-1 min-w-0 max-w-full', className)}
    >
      {value.length > 0 && (
        <div className={cn('relative min-w-0', selectedMaxWidth)}>
          <div
            ref={selectedContainerRef}
            className={cn('relative min-w-0 w-full overflow-hidden', selectedMaxWidth)}
          >
            <div
              ref={selectedMeasureRef}
              className="absolute left-0 top-0 flex flex-nowrap gap-1 invisible h-px overflow-hidden pointer-events-none"
              aria-hidden
            >
              {selectedBadges}
            </div>
            {isOverflowing ? (
              <button
                type="button"
                onClick={() => togglePanel(true)}
                className={cn(
                  'badge badge-sm badge-outline w-full max-w-full cursor-pointer justify-start truncate font-normal text-text-secondary',
                  badgeClassName
                )}
                title={summary}
              >
                {summary}
                <span aria-hidden>…</span>
              </button>
            ) : (
              <div className="flex flex-nowrap items-center gap-1">{selectedBadges}</div>
            )}
          </div>
        </div>
      )}

      <div className="relative inline-flex shrink-0">
        <button
          type="button"
          onClick={() => togglePanel(false)}
          aria-expanded={open}
          aria-haspopup="listbox"
          className={cn(
            'badge badge-sm badge-ghost font-normal cursor-pointer hover:badge-ghost hover:bg-gaming-base/60',
            value.length === 0 && 'opacity-70'
          )}
        >
          {value.length === 0 ? (
            <span>{placeholder}</span>
          ) : (
            <Plus size={12} aria-hidden />
          )}
        </button>

        {open && (
          <div
            className="absolute right-0 top-full z-50 mt-1 w-[14rem] max-w-[min(14rem,90vw)] rounded-lg border border-gaming-border bg-gaming-card shadow-lg p-2"
            role="listbox"
            aria-multiselectable={multiple}
          >
            {expandedSelected && value.length > 0 && (
              <div className="mb-2 flex max-h-28 flex-wrap gap-1 overflow-y-auto border-b border-gaming-border pb-2">
                {expandedSelectedBadges}
              </div>
            )}
            <input
              ref={filterRef}
              type="text"
              value={filterQuery}
              placeholder={searchPlaceholder}
              onChange={(e) => setFilterQuery(e.target.value)}
              onKeyDown={handleFilterKeyDown}
              className="input input-bordered input-xs w-full h-8 min-h-0 mb-2 text-sm"
            />
            <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
              {available.length === 0 ? (
                <p className="text-xs text-text-muted px-1 py-1 w-full">
                  {filterQuery.trim() ? emptyFilterHint : '—'}
                </p>
              ) : (
                available.map((item) => (
                  <button
                    key={item}
                    type="button"
                    role="option"
                    onClick={() => add(item)}
                    className={poolBadgeClass}
                  >
                    {item}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
