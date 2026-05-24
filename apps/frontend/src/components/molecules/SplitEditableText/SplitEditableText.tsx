import { useState, useRef, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { useEditableFieldContext } from '../../atoms/EditableText/EditableFieldContext';

export interface SplitEditableField {
  key: string;
  label: string;
  placeholder?: string;
  emptyHint?: string;
}

export interface SplitEditableTextProps {
  displayText: string;
  fields: SplitEditableField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onCollapse?: () => void;
  emptyLabel?: string;
  className?: string;
  showPencil?: boolean;
}

const inlineInputBase =
  'bg-transparent border-0 outline-none p-0 m-0 shadow-none ring-0 ' +
  'focus:ring-1 focus:ring-primary/25 rounded-sm min-w-[2ch]';

export function SplitEditableText({
  displayText,
  fields,
  values,
  onChange,
  onCollapse,
  emptyLabel = 'Click to edit',
  className,
  showPencil: showPencilProp,
}: SplitEditableTextProps) {
  const { showPencil: showPencilContext } = useEditableFieldContext();
  const showPencil = showPencilProp ?? showPencilContext;

  const [isExpanded, setIsExpanded] = useState(false);
  const panelRef = useRef<HTMLSpanElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const collapse = () => {
    setIsExpanded(false);
    onCollapse?.();
  };

  useEffect(() => {
    if (!isExpanded) return;
    firstInputRef.current?.focus();
  }, [isExpanded]);

  useEffect(() => {
    if (!isExpanded) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        collapse();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') collapse();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded]);

  const pencil = showPencil ? (
    <Pencil size={12} className="shrink-0 text-text-muted/70 pointer-events-none" aria-hidden />
  ) : null;

  const surfaceClass = cn(
    className,
    'cursor-text rounded-sm transition-[box-shadow,background-color]',
    'hover:bg-gaming-base/40 focus-visible:outline focus-visible:outline-1 focus-visible:outline-gaming-border/60'
  );

  const inputClass = (value: string, placeholder?: string) =>
    cn(surfaceClass, inlineInputBase, !value && placeholder && 'italic opacity-60');

  if (!isExpanded) {
    const isEmpty = !displayText;
    return (
      <span className="inline-flex items-baseline gap-1 max-w-full">
        <span
          role="button"
          tabIndex={0}
          onClick={() => setIsExpanded(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsExpanded(true);
            }
          }}
          className={cn(
            surfaceClass,
            isEmpty && 'italic opacity-60',
            'max-w-full truncate overflow-hidden text-ellipsis whitespace-nowrap inline-block align-bottom'
          )}
          title={displayText || undefined}
        >
          {displayText || emptyLabel}
        </span>
        {pencil}
      </span>
    );
  }

  return (
    <span ref={panelRef} className="inline-flex items-baseline flex-wrap gap-x-1 max-w-full">
      {fields.map((field, index) => {
        const value = values[field.key] ?? '';
        const placeholder = field.placeholder ?? (!value ? field.emptyHint : undefined);

        return (
          <span key={field.key} className="inline-flex items-baseline">
            {index > 0 && (
              <span className={cn(surfaceClass, 'select-none pointer-events-none')} aria-hidden>
                {' '}
              </span>
            )}
            <input
              ref={index === 0 ? firstInputRef : undefined}
              type="text"
              value={value}
              placeholder={placeholder}
              aria-label={field.label}
              onChange={(e) => onChange(field.key, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') collapse();
              }}
              className={cn(inputClass(value, placeholder), 'w-auto min-w-[3ch] max-w-full')}
            />
          </span>
        );
      })}
      {pencil}
    </span>
  );
}
