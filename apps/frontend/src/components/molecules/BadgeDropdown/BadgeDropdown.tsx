import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { useEditableFieldContext } from '../../atoms/EditableText/EditableFieldContext';

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
  selectedMaxWidth?: string;
  selectedWrap?: boolean;
  fullWidth?: boolean;
  showArrow?: boolean;
  renderBadge?: (item: string) => ReactNode;
}

const DEFAULT_BADGE_CLASS =
  'badge badge-outline bg-gaming-base border-gaming-border text-text-secondary gap-1 text-xs py-2 px-2 font-medium';

export function BadgeDropdown({
  options,
  value,
  onChange,
  multiple = true,
  placeholder = '+',
  searchPlaceholder = 'Search…',
  emptyFilterHint = 'Press Enter to add',
  className,
  badgeClassName,
  selectedMaxWidth = 'max-w-[11rem]',
  selectedWrap,
  fullWidth,
  showArrow: showArrowProp,
  renderBadge,
}: BadgeDropdownProps) {
  const { showPencil } = useEditableFieldContext();
  const showArrow = showArrowProp ?? showPencil;
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const badgeClass = cn(DEFAULT_BADGE_CLASS, badgeClassName);

  const catalog = useMemo(() => {
    const cleanOptions = options.map((option) => option.trim()).filter(Boolean);
    const customValues = value.filter((item) => item.trim() && !cleanOptions.includes(item));
    return [...cleanOptions, ...customValues];
  }, [options, value]);

  const visibleOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return catalog;
    return catalog.filter((item) => item.toLowerCase().includes(normalizedQuery));
  }, [catalog, query]);

  const selected = value.filter(Boolean);
  const updateDropdownPosition = useCallback(() => {
    const anchor = rootRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const menuWidth = Math.min(320, Math.max(224, rect.width));
    const left = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8);
    const availableBelow = window.innerHeight - rect.bottom - 12;
    const availableAbove = rect.top - 12;
    const opensAbove = availableBelow < 180 && availableAbove > availableBelow;

    setDropdownStyle({
      position: 'fixed',
      left,
      top: opensAbove ? undefined : rect.bottom + 4,
      bottom: opensAbove ? window.innerHeight - rect.top + 4 : undefined,
      width: menuWidth,
      maxHeight: Math.max(160, Math.min(320, opensAbove ? availableAbove : availableBelow)),
      zIndex: 1000,
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updateDropdownPosition();
    requestAnimationFrame(() => inputRef.current?.focus());

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setIsOpen(false);
        setQuery('');
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [isOpen, updateDropdownPosition]);

  const commitSelection = (item: string) => {
    const trimmed = item.trim();
    if (!trimmed) return;

    if (!multiple) {
      onChange([trimmed]);
      setIsOpen(false);
      setQuery('');
      return;
    }

    onChange(
      selected.includes(trimmed)
        ? selected.filter((current) => current !== trimmed)
        : [...selected, trimmed]
    );
    setQuery('');
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();

    const trimmed = query.trim();
    if (!trimmed) return;
    const existing = catalog.find((item) => item.toLowerCase() === trimmed.toLowerCase());
    commitSelection(existing || trimmed);
  };

  return (
    <div
      ref={rootRef}
      className={cn(
        'relative min-w-0 max-w-full',
        fullWidth ? 'flex w-full' : 'inline-flex',
        className
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={cn(
          'inline-flex max-w-full items-center gap-1 rounded-sm transition-[background-color,box-shadow]',
          'hover:bg-gaming-base/40 focus-visible:outline focus-visible:outline-1 focus-visible:outline-gaming-border/60',
          fullWidth && 'w-full justify-between'
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span
          className={cn(
            'inline-flex min-w-0 max-w-full items-center gap-1 overflow-hidden',
            selectedWrap ? 'flex-wrap' : 'flex-nowrap',
            fullWidth && 'flex-1',
            selectedMaxWidth
          )}
        >
          {selected.length > 0 ? (
            selected.map((item) => (
              <span key={item} className={cn(badgeClass, 'shrink-0')}>
                {renderBadge ? renderBadge(item) : item}
              </span>
            ))
          ) : (
            <span className={cn(badgeClass, 'opacity-70')}>{placeholder}</span>
          )}
        </span>
        {showArrow && (
          <ChevronDown
            size={12}
            className={cn(
              'shrink-0 text-text-muted/70 transition-transform',
              isOpen && 'rotate-180'
            )}
            aria-hidden
          />
        )}
      </button>

      {isOpen &&
        dropdownStyle &&
        createPortal(
          <div
            ref={panelRef}
            className="rounded-lg border border-gaming-border bg-gaming-card p-2 shadow-2xl"
            style={dropdownStyle}
            role="listbox"
            aria-multiselectable={multiple}
          >
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={searchPlaceholder}
              className="input input-bordered input-xs mb-2 h-8 min-h-0 w-full bg-gaming-base border-gaming-border text-sm text-text-primary"
            />

            <div
              className="flex flex-wrap gap-1 overflow-y-auto"
              style={{ maxHeight: 'calc(100% - 2.5rem)' }}
            >
              {visibleOptions.length > 0 ? (
                visibleOptions.map((item) => {
                  const isSelected = selected.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => commitSelection(item)}
                      className={cn(
                        badgeClass,
                        'cursor-pointer transition-colors hover:badge-primary hover:text-primary-content hover:border-primary',
                        isSelected && 'badge-primary border-primary text-primary-content'
                      )}
                    >
                      {renderBadge ? renderBadge(item) : item}
                      {isSelected && <Check size={11} aria-hidden />}
                    </button>
                  );
                })
              ) : (
                <p className="w-full px-1 py-1 text-xs text-text-muted">
                  {query.trim() ? emptyFilterHint : '—'}
                </p>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default BadgeDropdown;
