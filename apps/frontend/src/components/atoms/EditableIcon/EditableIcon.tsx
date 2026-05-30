import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pencil } from 'lucide-react';
import { renderLucideIcon } from '../../../features/game/lucideIconCatalog';
import { cn } from '../../../utils/cn';

const LucideIconSelector = lazy(() =>
  import('../LucideIconSelector').then((module) => ({
    default: module.LucideIconSelector,
  }))
);

export interface EditableIconProps {
  value: string;
  onChange: (iconId: string) => void;
  size?: number;
  label?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  iconClassName?: string;
  panelClassName?: string;
  searchPlaceholder?: string;
  defaultIconIds?: string[];
  limit?: number;
}

const PANEL_WIDTH = 320;
const PANEL_MARGIN = 16;

export function EditableIcon({
  value,
  onChange,
  size = 24,
  label = 'Change icon',
  disabled = false,
  className,
  buttonClassName,
  iconClassName,
  panelClassName,
  searchPlaceholder,
  defaultIconIds,
  limit,
}: EditableIconProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: PANEL_MARGIN });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      const left = Math.min(
        window.innerWidth - PANEL_WIDTH - PANEL_MARGIN,
        Math.max(PANEL_MARGIN, rect.left + rect.width / 2 - PANEL_WIDTH / 2)
      );
      const fitsBelow = rect.bottom + 12 + 300 < window.innerHeight;
      const top = fitsBelow ? rect.bottom + 12 : Math.max(PANEL_MARGIN, rect.top - 312);

      setPanelPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleChange = (iconId: string) => {
    onChange(iconId);
    setIsOpen(false);
  };

  return (
    <span className={cn('relative inline-flex', className)}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((current) => !current);
        }}
        className={cn(
          'group/editable-icon relative inline-flex items-center justify-center rounded-2xl outline-none transition',
          'hover:bg-gaming-base/50 focus-visible:ring-2 focus-visible:ring-status-quest/70',
          disabled && 'cursor-not-allowed opacity-60',
          buttonClassName
        )}
      >
        {renderLucideIcon(value, size, iconClassName)}
        {!disabled ? (
          <span className="pointer-events-none absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-gaming-border bg-gaming-card text-text-muted opacity-0 shadow-lg transition-opacity group-hover/editable-icon:opacity-100 group-focus-visible/editable-icon:opacity-100">
            <Pencil size={11} aria-hidden />
          </span>
        ) : null}
      </button>

      {isOpen
        ? createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-label={label}
              className={cn(
                'fixed z-[120] w-80 rounded-2xl border border-gaming-border bg-gaming-card/98 p-3 text-text-primary shadow-2xl backdrop-blur',
                panelClassName
              )}
              style={{ top: panelPosition.top, left: panelPosition.left }}
            >
              <Suspense
                fallback={
                  <div className="rounded-xl border border-gaming-border bg-gaming-base px-3 py-4 text-sm text-text-muted">
                    Loading icon selector…
                  </div>
                }
              >
                <LucideIconSelector
                  value={value}
                  onChange={handleChange}
                  searchPlaceholder={searchPlaceholder}
                  defaultIconIds={defaultIconIds}
                  limit={limit}
                />
              </Suspense>
            </div>,
            document.body
          )
        : null}
    </span>
  );
}

export default EditableIcon;
