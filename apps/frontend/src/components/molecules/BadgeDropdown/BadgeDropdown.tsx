import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties, ReactNode } from 'react';
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
  getOptionText?: (item: string) => string;
  normalizeInput?: (item: string) => string;
}

const DEFAULT_BADGE_CLASS =
  'badge badge-outline bg-gaming-base border-gaming-border text-text-secondary gap-1 text-xs py-2 px-2 font-medium';
const PANEL_WIDTH = 320;
const PANEL_MARGIN = 16;

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
  getOptionText,
  normalizeInput,
}: BadgeDropdownProps) {
  const { showPencil } = useEditableFieldContext();
  const showArrow = showArrowProp ?? showPencil;
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeOptionIndex, setActiveOptionIndex] = useState(0);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const listboxId = useId();
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
    return catalog.filter((item) =>
      (getOptionText ? getOptionText(item) : item).toLowerCase().includes(normalizedQuery)
    );
  }, [catalog, getOptionText, query]);

  const selected = value.filter(Boolean);
  const activeOption = visibleOptions[activeOptionIndex];

  useEffect(() => {
    if (!isOpen) return;

    const updatePanelPosition = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;

      const width = Math.min(PANEL_WIDTH, window.innerWidth - PANEL_MARGIN * 2);
      const left = Math.min(
        Math.max(PANEL_MARGIN, rect.right - width),
        window.innerWidth - width - PANEL_MARGIN
      );
      const shouldOpenUp = rect.bottom + 328 > window.innerHeight && rect.top > 328;

      setPanelStyle({
        position: 'fixed',
        top: shouldOpenUp ? rect.top - 4 : rect.bottom + 4,
        left,
        width,
        transform: shouldOpenUp ? 'translateY(-100%)' : undefined,
      });
    };

    updatePanelPosition();
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);

    return () => {
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    setActiveOptionIndex(0);
  }, [query, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
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
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const commitSelection = (item: string) => {
    const trimmed = (normalizeInput ? normalizeInput(item) : item).trim();
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
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveOptionIndex((current) =>
        visibleOptions.length === 0 ? 0 : Math.min(current + 1, visibleOptions.length - 1)
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveOptionIndex((current) =>
        visibleOptions.length === 0 ? 0 : Math.max(current - 1, 0)
      );
      return;
    }

    if (event.key !== 'Enter') return;
    event.preventDefault();

    if (activeOption) {
      commitSelection(activeOption);
      return;
    }

    const trimmed = query.trim();
    if (!trimmed) return;
    const existing = catalog.find((item) => {
      const optionText = getOptionText ? getOptionText(item) : item;
      return (
        item.toLowerCase() === trimmed.toLowerCase() ||
        optionText.toLowerCase() === trimmed.toLowerCase()
      );
    });
    commitSelection(existing || trimmed);
  };

  const dropdownPanel =
    isOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={panelRef}
            onMouseDown={(event) => event.stopPropagation()}
            className="z-[80] max-h-80 max-w-[calc(100vw-2rem)] rounded-lg border border-gaming-border bg-gaming-card p-2 shadow-2xl"
            style={panelStyle}
            role="listbox"
            id={listboxId}
            aria-multiselectable={multiple}
          >
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
              role="combobox"
              aria-controls={listboxId}
              aria-expanded={isOpen}
              aria-activedescendant={
                activeOption ? `${listboxId}-option-${activeOptionIndex}` : undefined
              }
              placeholder={searchPlaceholder}
              className="input input-bordered input-xs mb-2 h-8 min-h-0 w-full bg-gaming-base border-gaming-border text-sm text-text-primary"
            />

            <div className="flex max-h-64 flex-wrap gap-1 overflow-y-auto">
              {visibleOptions.length > 0 ? (
                visibleOptions.map((item, optionIndex) => {
                  const isSelected = selected.includes(item);
                  return (
                    <button
                      key={item}
                      id={`${listboxId}-option-${optionIndex}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => commitSelection(item)}
                      onMouseEnter={() => setActiveOptionIndex(optionIndex)}
                      className={cn(
                        badgeClass,
                        'cursor-pointer transition-colors hover:badge-primary hover:text-primary-content hover:border-primary',
                        activeOptionIndex === optionIndex &&
                          'badge-primary border-primary text-primary-content',
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
        )
      : null;

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
        aria-controls={listboxId}
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
      {dropdownPanel}
    </div>
  );
}

export default BadgeDropdown;
