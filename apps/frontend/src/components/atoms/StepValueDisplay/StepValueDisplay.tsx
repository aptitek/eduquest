import { cn } from '../../../utils/cn';

export interface StepValueDisplayProps {
  label: string;
  value: number;
  className?: string;
}

export function StepValueDisplay({ label, value, className }: StepValueDisplayProps) {
  return (
    <div
      className={cn(
        'flex h-24 w-24 flex-col items-center justify-center rounded-3xl border border-gaming-border bg-gaming-card text-center shadow-xl',
        className
      )}
    >
      <span className="font-display text-[0.65rem] font-black uppercase tracking-[0.2em] text-text-muted">
        {label}
      </span>
      <span className="font-display text-4xl font-black text-text-primary">{value}</span>
    </div>
  );
}

export default StepValueDisplay;
