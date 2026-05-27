import { ChevronDown, ChevronUp } from 'lucide-react';
import { HoldToConfirmButton } from '../../atoms/HoldToConfirmButton';
import { StepValueDisplay } from '../../atoms/StepValueDisplay';
import { cn } from '../../../utils/cn';

export interface StepSelectorProps {
  value: number;
  label: string;
  decrementLabel?: string;
  incrementLabel?: string;
  min?: number;
  disabled?: boolean;
  onChange: (nextValue: number) => void;
  className?: string;
}

export function StepSelector({
  value,
  label,
  decrementLabel = 'Previous step',
  incrementLabel = 'Next step',
  min = 0,
  disabled = false,
  onChange,
  className,
}: StepSelectorProps) {
  const canDecrement = !disabled && value > min;

  return (
    <div
      className={cn(
        'flex h-48 w-24 shrink-0 flex-col items-center justify-end gap-1.5 overflow-visible sm:w-28 lg:h-52 xl:w-32',
        className
      )}
    >
      <HoldToConfirmButton
        onConfirm={() => onChange(value + 1)}
        holdDuration={800}
        shape="round"
        variant="btn-primary"
        disabled={disabled}
        className="h-11 w-11 min-h-0 border-primary/40 bg-primary text-primary-content shadow-glow-primary lg:h-12 lg:w-12"
      >
        <span className="sr-only">{incrementLabel}</span>
        <ChevronUp size={20} aria-hidden />
      </HoldToConfirmButton>

      <StepValueDisplay label={label} value={value} className="h-16 w-16 rounded-2xl lg:h-20 lg:w-20 [&>span:last-child]:text-3xl" />

      <HoldToConfirmButton
        onConfirm={() => onChange(Math.max(min, value - 1))}
        holdDuration={800}
        shape="round"
        variant="btn-secondary"
        disabled={!canDecrement}
        className="h-11 w-11 min-h-0 border-gaming-border bg-gaming-card text-text-primary lg:h-12 lg:w-12"
      >
        <span className="sr-only">{decrementLabel}</span>
        <ChevronDown size={20} aria-hidden />
      </HoldToConfirmButton>
    </div>
  );
}

export default StepSelector;
