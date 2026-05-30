import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Palette } from 'lucide-react';
import { SOLARIZED_SWATCH_OPTIONS } from '../../../styles/colorTokens';
import { cn } from '../../../utils/cn';
import { useTranslation } from '../../../hooks/useTranslation';

export interface ColorSwatchPickerProps {
  value?: string;
  onChange: (value: string) => void;
  variant?: 'inline' | 'popover' | 'grid';
  buttonClassName?: string;
  panelClassName?: string;
  className?: string;
  ariaLabel?: string;
  useColorLabelKey?: string;
  disabled?: boolean;
}

const PANEL_WIDTH = 160;
const PANEL_MARGIN = 16;

export function ColorSwatchPicker({
  value,
  onChange,
  variant = 'grid',
  buttonClassName,
  panelClassName,
  className,
  ariaLabel,
  useColorLabelKey,
  disabled,
}: ColorSwatchPickerProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: PANEL_MARGIN });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const selectedValue = value || SOLARIZED_SWATCH_OPTIONS[5].value;
  const resolvedAriaLabel = ariaLabel || t('activityCard.cardColor');
  const grid = (
    <ColorSwatchGrid
      value={selectedValue}
      onChange={(nextValue) => {
        onChange(nextValue);
        setIsOpen(false);
      }}
      useColorLabelKey={useColorLabelKey}
    />
  );

  useEffect(() => {
    if (!isOpen) return undefined;

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      setPanelPosition({
        top: rect.bottom + 8,
        left: Math.min(
          window.innerWidth - PANEL_WIDTH - PANEL_MARGIN,
          Math.max(PANEL_MARGIN, rect.left + rect.width / 2 - PANEL_WIDTH / 2)
        ),
      });
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
    if (!isOpen) return undefined;

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

  if (variant === 'inline' || variant === 'grid') {
    return <div className={cn('grid grid-cols-9 gap-1.5', className)}>{grid}</div>;
  }

  return (
    <span className={cn('relative inline-flex', className)}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((current) => !current);
        }}
        className={cn(
          'inline-flex h-8 w-8 items-center justify-center rounded-full border border-gaming-border shadow-lg transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-status-quest disabled:cursor-not-allowed disabled:opacity-60',
          SOLARIZED_SWATCH_OPTIONS.find((option) => option.value === selectedValue)?.className,
          buttonClassName
        )}
        aria-label={resolvedAriaLabel}
        aria-expanded={isOpen}
        title={resolvedAriaLabel}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/50 bg-gaming-base/90 text-white shadow-md backdrop-blur-sm">
          <Palette size={20} aria-hidden />
        </span>
      </button>

      {isOpen
        ? createPortal(
            <div
              ref={panelRef}
              className={cn(
                'fixed z-[120] grid w-40 grid-cols-3 gap-2 rounded-2xl border border-gaming-border bg-gaming-card/95 p-3 shadow-2xl backdrop-blur',
                panelClassName
              )}
              style={{ top: panelPosition.top, left: panelPosition.left }}
            >
              {grid}
            </div>,
            document.body
          )
        : null}
    </span>
  );
}

function ColorSwatchGrid({
  value,
  onChange,
  useColorLabelKey,
}: {
  value: string;
  onChange: (value: string) => void;
  useColorLabelKey?: string;
}) {
  const { t } = useTranslation();

  return (
    <>
      {SOLARIZED_SWATCH_OPTIONS.map((option) => {
        const isSelected = value === option.value;
        const label = t(option.labelKey);
        const ariaLabel = useColorLabelKey
          ? t(useColorLabelKey).replace('{color}', label)
          : label;

        return (
          <button
            key={option.value}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onChange(option.value);
            }}
            className={cn(
              'h-7 rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-status-quest',
              isSelected
                ? 'border-text-primary bg-gaming-card p-0.5 shadow-glow-primary'
                : 'border-gaming-border bg-gaming-base p-1 hover:border-status-quest'
            )}
            aria-label={ariaLabel}
            aria-pressed={isSelected}
            title={label}
          >
            <span className={cn('block h-full w-full rounded-md shadow-sm', option.className)} aria-hidden />
          </button>
        );
      })}
    </>
  );
}

export default ColorSwatchPicker;
